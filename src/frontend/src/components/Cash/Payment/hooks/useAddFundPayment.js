import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useAuth } from "../../../../Global/AuthContext";
import { formatMoney } from "../../../../Global/FormatNumber";
import usePaymentAllocationPreview from "./usePaymentAllocationPreview";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Warn (never block) when the typed rate drifts this far from the fund's
// reference rate — catches typos like 3.45 instead of 34.5.
const RATE_WARNING_THRESHOLD = 0.1;

const emptyForm = (fundId = "") => ({
  fund_id: fundId,
  party_id: "",
  party_name: "",
  fund_exchangeRate: 1, // reference rate snapshot: 1 base = X fund
  rate: "", // rate actually used — editable, defaults to reference
  collected_amount: "", // amount in FUND currency — the primary input
  currency_code: "",
  currency_symbol: "",
  note: "",
});

// Fund-derived fields, applied on select and on locked-fund load.
const fundFields = (fund) => {
  const ref = Number(fund?.currency_exchangeRate || 1);
  return {
    fund_id: fund ? fund.id : "",
    fund_exchangeRate: ref,
    rate: String(ref),
    currency_code: fund?.currency_code || "",
    currency_symbol: fund?.currency_symbol || "",
  };
};

const useAddFundPayment = ({
  isOpen,
  onClose,
  mode, // "in" or "out"
  initialFundId,
  refetchList,
}) => {
  const { t } = useTranslation();
  const api = window.api;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("error"); // error | success
  const [funds, setFunds] = useState([]);
  const [partiesList, setPartiesList] = useState([]);
  const { money } = usePrimaryCurrency();

  // Fund is locked whenever this modal is opened from a specific fund's row
  // (e.g. FundList's expense/deposit icon on a given fund), same pattern as
  // FundTransferModal's isSourceLocked.
  const isFundLocked = Boolean(initialFundId);

  const [partyType, setPartyType] = useState(
    mode === "out" ? "supplier" : "customer",
  );
  const { user } = useAuth();

  const [form, setForm] = useState(emptyForm());

  // Tracks whether the person has manually typed their own note — once they
  // have, auto-generation stops overwriting it on every field change.
  const [noteEdited, setNoteEdited] = useState(false);

  const handleChange = (key, value) => {
    if (key === "note") setNoteEdited(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showError = (text) => {
    setMessageTone("error");
    setMessage(text);
  };

  const selectedFund = useMemo(
    () => funds.find((f) => f.id === Number(form.fund_id)),
    [funds, form.fund_id],
  );

  // Falls back to the stored name — after a search, the picked party may no
  // longer be in partiesList, and the auto-note still needs its name.
  const selectedParty = useMemo(
    () =>
      partiesList.find((p) => p.id === Number(form.party_id)) ||
      (form.party_id
        ? { id: Number(form.party_id), name: form.party_name }
        : undefined),
    [partiesList, form.party_id, form.party_name],
  );

  // ---- Amounts: fund amount + rate are inputs, base is always derived ----

  // Reference rate of 1 is reserved for the primary currency, so any other
  // rate means the fund holds a foreign currency.
  const isForeign =
    Boolean(selectedFund) && Number(form.fund_exchangeRate) !== 1;

  const referenceRate = Number(form.fund_exchangeRate) || 1;
  const effectiveRate = isForeign ? Number(form.rate) || 0 : 1;
  const fundAmount = Number(form.collected_amount) || 0;
  const baseAmount = effectiveRate > 0 ? round2(fundAmount / effectiveRate) : 0;

  const rateChanged =
    isForeign && effectiveRate > 0 && effectiveRate !== referenceRate;
  const rateWarning =
    isForeign &&
    effectiveRate > 0 &&
    Math.abs(effectiveRate - referenceRate) / referenceRate >
      RATE_WARNING_THRESHOLD;

  const handleAmountChange = (val) => {
    // raw string — keeps "5." intact while typing
    setForm((prev) => ({ ...prev, collected_amount: val }));
  };

  const handleRateChange = (val) => {
    setForm((prev) => ({ ...prev, rate: val }));
  };

  const resetRate = () => {
    setForm((prev) => ({ ...prev, rate: String(prev.fund_exchangeRate) }));
  };

  const fetchFunds = useCallback(async () => {
    if (!api) return;
    try {
      const res = await api.getFunds();
      setFunds(res || []);
    } catch (err) {
      console.error("Error fetching funds:", err);
    }
  }, [api]);

  const fetchParties = useCallback(
    async (search = "") => {
      if (!api) return;
      const params = { search, limit: 50 };
      try {
        let res = [];
        if (partyType === "customer") {
          res = (await api.getCustomers?.(params)) || [];
        } else if (partyType === "supplier") {
          res = (await api.getSuppliers?.(params)) || [];
        } else if (partyType === "partner") {
          res = (await api.getPartners(params)) || [];
        }
        setPartiesList(res?.data || res || []);
      } catch (err) {
        console.error("Error fetching parties:", err);
      }
    },
    [api, partyType],
  );

  const partySearchTimer = useRef(null);

  const searchParties = useCallback(
    (query) => {
      clearTimeout(partySearchTimer.current);
      partySearchTimer.current = setTimeout(() => fetchParties(query), 250);
    },
    [fetchParties],
  );

  useEffect(() => () => clearTimeout(partySearchTimer.current), []);

  const handlePartyChange = (option) => {
    setForm((prev) => ({
      ...prev,
      party_id: option.id,
      party_name: option.name,
    }));
  };

  useEffect(() => {
    if (isOpen) {
      fetchFunds();
      setForm(emptyForm(initialFundId || ""));
      setPartyType(mode === "out" ? "supplier" : "customer");
      setNoteEdited(false);
      setMessage("");
    }
  }, [isOpen, fetchFunds, initialFundId, mode]);

  useEffect(() => {
    if (isOpen) {
      fetchParties();
      setForm((prev) => ({ ...prev, party_id: "", party_name: "" }));
    }
  }, [partyType, isOpen, fetchParties]);

  useEffect(() => {
    if (isOpen && initialFundId && funds.length > 0) {
      const fund = funds.find((f) => f.id === Number(initialFundId));
      if (fund) {
        setForm((prev) => ({ ...prev, ...fundFields(fund) }));
      }
    }
  }, [isOpen, initialFundId, funds]);

  // Switching to a fund in a different currency clears the amount — the
  // number typed meant something in the old currency, not the new one.
  const handleFundChange = (e) => {
    const fund = funds.find((f) => f.id === Number(e.target.value));
    setForm((prev) => {
      const next = fundFields(fund);
      return {
        ...prev,
        ...next,
        collected_amount:
          next.currency_code === prev.currency_code
            ? prev.collected_amount
            : "",
      };
    });
  };

  // Auto-generated note — regenerates whenever the underlying facts change,
  // unless the person has taken over the field themselves.
  const autoNote = useMemo(() => {
    if (!fundAmount || !selectedFund) return "";

    const amountLabel = isForeign
      ? `${formatMoney(fundAmount, selectedFund)} (${money(baseAmount)})`
      : money(baseAmount);

    const partyLabel = selectedParty?.name || t(`ui.${partyType}`);
    const fundLabel = selectedFund?.name || "";

    return mode === "in"
      ? t("screens.payments.auto_note_in", {
          amount: amountLabel,
          party: partyLabel,
          fund: fundLabel,
          defaultValue: `Received ${amountLabel} from ${partyLabel} into ${fundLabel}`,
        })
      : t("screens.payments.auto_note_out", {
          amount: amountLabel,
          party: partyLabel,
          fund: fundLabel,
          defaultValue: `Paid ${amountLabel} to ${partyLabel} from ${fundLabel}`,
        });
  }, [
    fundAmount,
    baseAmount,
    isForeign,
    selectedFund,
    selectedParty,
    partyType,
    mode,
    money,
    t,
  ]);

  useEffect(() => {
    if (!noteEdited && autoNote) {
      setForm((prev) => ({ ...prev, note: autoNote }));
    }
  }, [autoNote, noteEdited]);

  // Only the "normal" direction for each party type closes open documents —
  // a customer paying you (in), or you paying a supplier (out). Partner has
  // no invoices to close. A reversed movement (e.g. refunding a customer
  // via cash-out) isn't a closing event, so no preview is fetched for it.
  const allocationDirection =
    (partyType === "customer" && mode === "in") ||
    (partyType === "supplier" && mode === "out")
      ? mode
      : null;

  const {
    allocationLines,
    allocationLoading,
    allocationTotal,
    allocationLeftover,
    updateAllocationLine,
  } = usePaymentAllocationPreview({
    api,
    active: Boolean(form.party_id) && Boolean(allocationDirection),
    partyType,
    partyId: form.party_id ? Number(form.party_id) : null,
    direction: allocationDirection,
    amount: baseAmount,
  });

  const submit = async () => {
    if (!form.fund_id) {
      showError(t("screens.payments.please_select_fund_first"));
      return;
    }
    if (!form.party_id) {
      showError(t("screens.payments.please_select_linked_account"));
      return;
    }
    if (isForeign && !(effectiveRate > 0)) {
      showError(
        t("screens.payments.invalidRate", "Enter a valid exchange rate."),
      );
      return;
    }
    if (fundAmount <= 0 || baseAmount <= 0) {
      showError(t("screens.payments.please_enter_valid_amount"));
      return;
    }
    if (allocationLeftover < -0.005) {
      showError(
        t(
          "screens.payments.allocationExceedsAmount",
          "The allocated amounts add up to more than the payment.",
        ),
      );
      return;
    }

    const paymentData = {
      type: mode === "in" ? "income" : "expense",
      party_type: partyType,
      party_id: Number(form.party_id),
      fund_id: Number(form.fund_id),
      amount: baseAmount, // derived: fund amount ÷ rate used
      collected_amount: fundAmount, // exactly what moved in the fund
      exchange_rate: referenceRate, // system rate snapshot
      effective_rate: effectiveRate, // rate actually used
      currency_code: form.currency_code,
      currency_symbol: form.currency_symbol,
      note: form.note || autoNote,
      mode: partyType,
      created_by: user.id,
    };

    if (allocationTotal > 0) {
      paymentData.allocations = allocationLines
        .filter((l) => Number(l.allocate) > 0)
        .map((l) => ({
          invoice_type: l.invoice_type,
          invoice_id: l.invoice_id,
          amount: Number(l.allocate),
        }));
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await api.createPayment({
        ...paymentData,
        invoiceId: null,
      });

      if (!res.success) throw new Error(res.message);

      setMessageTone("success");
      setMessage(t("screens.payments.receipt_saved_successfully"));

      if (refetchList) {
        await refetchList();
      }

      setTimeout(() => onClose(), 800);
    } catch (err) {
      showError(err.message || t("screens.payments.unexpected_error_posting"));
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    funds,
    partiesList,
    searchParties,
    handlePartyChange,
    partyType,
    setPartyType,
    loading,
    message,
    messageTone,
    isFundLocked,
    selectedFund,
    selectedParty,

    isForeign,
    fundAmount,
    baseAmount,
    referenceRate,
    effectiveRate,
    rateChanged,
    rateWarning,

    handleChange,
    handleFundChange,
    handleAmountChange,
    handleRateChange,
    resetRate,
    submit,
    money,
    t,

    allocationLines,
    allocationLoading,
    allocationLeftover,
    updateAllocationLine,
  };
};

export default useAddFundPayment;
