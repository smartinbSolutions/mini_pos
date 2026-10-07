import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useAuth } from "../../../../Global/AuthContext";
import usePaymentAllocationPreview from "./usePaymentAllocationPreview";

const todayStr = () => new Date().toISOString().slice(0, 10);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const round6 = (n) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;

// Warn (never block) when the typed rate drifts this far from the fund's
// reference rate — catches typos like 3.45 instead of 34.5.
const RATE_WARNING_THRESHOLD = 0.1;

const useAddPayment = ({
  isOpen,
  onClose,
  onSubmit,
  invoice,
  totalAmount,
  party,
  partyName,
  mode,
  refetchList,
  confirmLabel,
}) => {
  const { t } = useTranslation();
  const api = window.api;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("error");
  const [funds, setFunds] = useState([]);
  const { money } = usePrimaryCurrency();
  const { user } = useAuth();

  const isPurchase = mode === "purchase";
  const isExpense = mode === "expense";
  const isPurchaseReturn = mode === "purchase_return";
  const isSalesReturn = mode === "sales_return";
  const isSales = mode === "sales";
  const isPartner = mode === "partner";
  const isCustomer = mode === "customer";
  const isSupplier = mode === "supplier";
  const isCollectorMode = !invoice;

  // Invoice-type modes settle a fixed base amount (the invoice's remaining
  // or the new invoice's total) — no partial payments from this modal.
  // Party modes (customer/supplier/partner) take any amount.
  const isInvoiceMode =
    isPurchase || isSales || isExpense || isPurchaseReturn || isSalesReturn;

  // Embedded in an invoice-creation form: payment date follows the invoice's
  // own date once it's created, so no picker is shown here at all.
  const isEmbeddedInCreation = isCollectorMode && !!onSubmit;
  // Direct party-ledger payment with no invoice attached (customer/supplier/
  // partner collection) — floor is the party's opening balance / earliest entry.
  const isDirectCollection = isCollectorMode && !onSubmit;

  const partyType =
    isPurchase || isExpense || isSupplier || isPurchaseReturn
      ? "supplier"
      : isSales || isCustomer || isSalesReturn
        ? "customer"
        : "partner";

  const initialBaseAmount = invoice
    ? Number(invoice.remaining_amount || 0)
    : Number(totalAmount || 0);

  const lockedBase = round2(initialBaseAmount);

  const [form, setForm] = useState({
    fund_id: "",
    fund_exchangeRate: 1, // reference rate snapshot: 1 base = X fund
    rate: "", // rate actually used — editable, defaults to reference
    collected_amount: "", // amount in FUND currency
    amount_in_base: 0, // only typed directly when paying from credit
    currency_code: "",
    currency_symbol: "",
    note: "",
    partner_transaction_type: "",
    date: todayStr(),
  });

  const [availableCredit, setAvailableCredit] = useState(0);
  const [useCredit, setUseCredit] = useState(false);
  const [minDate, setMinDate] = useState(null);

  const [collectionDirection, setCollectionDirection] = useState(
    partyType === "supplier" ? "out" : "in",
  );

  const showDatePicker = !isEmbeddedInCreation && !useCredit;

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const showError = (text) => {
    setMessageTone("error");
    setMessage(text);
  };

  const refetch = useCallback(async () => {
    if (!api) return;
    const res = await api.getFunds();
    setFunds(res || []);
  }, [api]);

  const refetchCredit = useCallback(async () => {
    if (!api || !party || partyType === "partner" || isDirectCollection) {
      setAvailableCredit(0);
      return;
    }
    try {
      const res =
        partyType === "supplier"
          ? await api.getSupplierCredit(party)
          : await api.getCustomerCredit(party);
      setAvailableCredit(res?.totalAvailable || 0);
    } catch (err) {
      setAvailableCredit(0);
    }
  }, [api, party, partyType, isDirectCollection]);

  // Determine the earliest allowed date for this payment.
  const refetchMinDate = useCallback(async () => {
    if (isEmbeddedInCreation) {
      setMinDate(null);
      return;
    }
    if (invoice?.date) {
      setMinDate(invoice.date.slice(0, 10));
      return;
    }
    if (isDirectCollection && api && party) {
      try {
        const res = await api.getPartyEarliestDate({
          partyId: party,
          partyType,
        });
        setMinDate(res?.minDate ? res.minDate.slice(0, 10) : null);
      } catch {
        setMinDate(null);
      }
      return;
    }
    setMinDate(null);
  }, [
    api,
    invoice,
    party,
    partyType,
    isEmbeddedInCreation,
    isDirectCollection,
  ]);

  useEffect(() => {
    if (isOpen) {
      refetch();
      refetchCredit();
      refetchMinDate();
      setUseCredit(false);

      setForm({
        fund_id: "",
        fund_exchangeRate: 1,
        rate: "",
        collected_amount: "",
        amount_in_base: initialBaseAmount,
        currency_code: "",
        currency_symbol: "",
        note: "",
        partner_transaction_type: "income",
        date: invoice?.date ? invoice.date.slice(0, 10) : todayStr(),
      });
      setCollectionDirection(partyType === "supplier" ? "out" : "in");
      setMessage("");
    }
  }, [
    isOpen,
    refetch,
    refetchCredit,
    refetchMinDate,
    invoice,
    initialBaseAmount,
  ]);

  // If the floor arrives after the form's default date was set (async fetch),
  // and the current date would violate it, clamp forward.
  useEffect(() => {
    if (minDate && form.date && form.date < minDate) {
      setForm((prev) => ({ ...prev, date: minDate }));
    }
  }, [minDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedFund = useMemo(
    () => funds.find((f) => f.id === Number(form.fund_id)),
    [funds, form.fund_id],
  );

  // ---- Amounts ----
  // Invoice modes: base is locked, so fund amount and rate are linked —
  //   typing one derives the other (only one degree of freedom).
  // Party modes: fund amount + rate are independent inputs, base derived.
  // Credit: base typed directly, no fund, no conversion.

  // Reference rate of 1 is reserved for the primary currency, so any other
  // rate means the fund holds a foreign currency.
  const referenceRate = Number(form.fund_exchangeRate) || 1;
  const isForeign = !useCredit && Boolean(form.fund_id) && referenceRate !== 1;
  const rateValue = Number(form.rate) || 0;
  const effectiveRate = isForeign ? rateValue : 1;
  const fundAmount = Number(form.collected_amount) || 0;

  const baseAmount = useCredit
    ? Number(form.amount_in_base) || 0
    : isInvoiceMode
      ? lockedBase
      : isForeign
        ? rateValue > 0
          ? round2(fundAmount / rateValue)
          : 0
        : fundAmount;

  // What actually moves in the fund — equals base when same currency.
  const collectedAmount = isForeign ? fundAmount : baseAmount;

  const rateChanged = isForeign && rateValue > 0 && rateValue !== referenceRate;
  const rateWarning =
    isForeign &&
    rateValue > 0 &&
    Math.abs(rateValue - referenceRate) / referenceRate >
      RATE_WARNING_THRESHOLD;

  const handleFundChange = (e) => {
    const fund = funds.find((f) => f.id === Number(e.target.value));
    const ref = Number(fund?.currency_exchangeRate || 1);
    const code = fund?.currency_code || "";

    setForm((prev) => ({
      ...prev,
      fund_id: fund ? fund.id : "",
      fund_exchangeRate: ref,
      rate: String(ref),
      currency_code: code,
      currency_symbol: fund?.currency_symbol || "",
      // Invoice modes pre-fill the fund amount at the reference rate.
      // Party modes keep the typed amount only if the currency didn't change.
      collected_amount: isInvoiceMode
        ? String(round2(lockedBase * ref))
        : code === prev.currency_code
          ? prev.collected_amount
          : "",
    }));
  };

  const isReversibleCollection =
    isDirectCollection && (isCustomer || isSupplier);
  const allocationDirection = isReversibleCollection
    ? collectionDirection
    : partyType === "customer"
      ? "in"
      : partyType === "supplier"
        ? "out"
        : null;

  const {
    allocationLines,
    allocationLoading,
    allocationTotal,
    allocationLeftover,
    updateAllocationLine,
  } = usePaymentAllocationPreview({
    api,
    active: isDirectCollection && Boolean(allocationDirection),
    partyType,
    partyId: party,
    direction: allocationDirection,
    amount: baseAmount,
  });

  const handleFundAmountChange = (val) => {
    setForm((prev) => {
      const next = { ...prev, collected_amount: val };
      const foreign = prev.fund_id && Number(prev.fund_exchangeRate) !== 1;
      const n = Number(val);
      if (isInvoiceMode && foreign && n > 0 && lockedBase > 0) {
        next.rate = String(round6(n / lockedBase));
      }
      return next;
    });
  };

  const handleRateChange = (val) => {
    setForm((prev) => {
      const next = { ...prev, rate: val };
      const r = Number(val);
      if (isInvoiceMode && r > 0) {
        next.collected_amount = String(round2(lockedBase * r));
      }
      return next;
    });
  };

  const resetRate = () => {
    setForm((prev) => {
      const ref = Number(prev.fund_exchangeRate) || 1;
      return {
        ...prev,
        rate: String(ref),
        ...(isInvoiceMode
          ? { collected_amount: String(round2(lockedBase * ref)) }
          : {}),
      };
    });
  };

  const handleCreditAmountChange = (val) => {
    setForm((prev) => ({ ...prev, amount_in_base: val }));
  };

  const toggleUseCredit = () => {
    setUseCredit((prev) => {
      const next = !prev;
      if (next) {
        const capped = Math.min(
          availableCredit,
          initialBaseAmount || availableCredit,
        );
        setForm((f) => ({
          ...f,
          fund_id: "",
          fund_exchangeRate: 1,
          rate: "",
          collected_amount: "",
          currency_code: "",
          currency_symbol: "",
          amount_in_base: capped,
        }));
      }
      return next;
    });
  };

  const submit = async () => {
    if (!useCredit && !form.fund_id) {
      showError(t("ui.selectFundRequired"));
      return;
    }
    if (isForeign && !(rateValue > 0)) {
      showError(
        t("screens.payments.invalidRate", "Enter a valid exchange rate."),
      );
      return;
    }
    if (baseAmount <= 0 || (isForeign && fundAmount <= 0)) {
      showError(t("errors.validAmount"));
      return;
    }
    if (useCredit && baseAmount > availableCredit) {
      showError(t("errors.creditExceeded"));
      return;
    }
    if (isDirectCollection && allocationLeftover < -0.005) {
      showError(
        t(
          "screens.payments.allocationExceedsAmount",
          "The allocated amounts add up to more than the payment.",
        ),
      );
      return;
    }
    if (showDatePicker) {
      if (!form.date) {
        showError(t("errors.dateRequired"));
        return;
      }
      if (minDate && form.date < minDate) {
        showError(t("errors.dateBeforeMin", { date: minDate }));
        return;
      }
    }

    const paymentType = isReversibleCollection
      ? collectionDirection === "in"
        ? "income"
        : "expense"
      : isPurchase || isExpense || isSupplier || isSalesReturn
        ? "expense"
        : isSales || isCustomer || isPurchaseReturn
          ? "income"
          : form.partner_transaction_type;

    const paymentData = {
      type: paymentType,
      party_type: partyType,
      party_id: party,
      fund_id: useCredit ? null : form.fund_id,
      amount: baseAmount, // settles the invoice / party account
      collected_amount: collectedAmount, // exactly what moved in the fund
      exchange_rate: useCredit ? 1 : referenceRate, // system rate snapshot
      effective_rate: effectiveRate, // rate actually used
      currency_code: form.currency_code,
      currency_symbol: form.currency_symbol,
      note: form.note,
      mode,
      source: useCredit ? "credit" : "new",
      created_by: user.id,
      date: showDatePicker ? form.date : undefined,
    };

    if (isDirectCollection && allocationTotal > 0) {
      paymentData.allocations = allocationLines
        .filter((l) => Number(l.allocate) > 0)
        .map((l) => ({
          invoice_type: l.invoice_type,
          invoice_id: l.invoice_id,
          amount: Number(l.allocate),
        }));
    }

    if (isCollectorMode && onSubmit) {
      onSubmit?.(paymentData);
      onClose();
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      let res;
      if (useCredit) {
        res = await api.applyInvoiceCredit({
          partyId: party,
          partyType,
          invoiceId: invoice?.id,
          invoiceType: mode,
          amount: baseAmount,
          created_by: user.id,
        });
        if (!res.success) throw new Error(res.error);
      } else {
        res = await api.createPayment({
          ...paymentData,
          invoiceId: invoice?.id || null,
        });
        if (!res.success) throw new Error(res.message);
      }

      setMessageTone("success");
      setMessage(t("screens.payments.saved"));

      if (refetchList) {
        await refetchList();
      }

      setTimeout(() => onClose(), 700);
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return {
    form,
    funds,
    loading,
    message,
    messageTone,
    handleChange,
    handleFundChange,
    handleFundAmountChange,
    handleRateChange,
    resetRate,
    handleCreditAmountChange,
    submit,
    isPartner,
    isPurchase,
    isExpense,
    isSales,
    isCustomer,
    isSupplier,
    isCollectorMode,
    isInvoiceMode,
    initialBaseAmount,
    t,
    isPurchaseReturn,
    isSalesReturn,
    money,
    availableCredit,
    useCredit,
    toggleUseCredit,
    showDatePicker,
    minDate,

    selectedFund,
    isForeign,
    baseAmount,
    fundAmount,
    referenceRate,
    effectiveRate,
    rateChanged,
    rateWarning,
    isDirectCollection,
    allocationLines,
    allocationLoading,
    allocationLeftover,
    updateAllocationLine,

    collectionDirection,
    setCollectionDirection,
    isReversibleCollection,
  };
};

export default useAddPayment;
