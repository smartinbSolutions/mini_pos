import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";

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
  const [funds, setFunds] = useState([]);
  const { money } = usePrimaryCurrency();

  const isPurchase = mode === "purchase";
  const isExpense = mode === "expense";
  const isSales = mode === "sales";
  const isPartner = mode === "partner";
  const isCustomer = mode === "customer";
  const isSupplier = mode === "supplier";
  const isCollectorMode = !invoice;

  // Initial calculated base amount from invoice or totalAmount prop
  const initialBaseAmount = invoice
    ? Number(invoice.remaining_amount || 0)
    : Number(invoice?.net_total || 0);

  const [form, setForm] = useState({
    fund_id: "",
    fund_exchangeRate: 1, // Fund's nominal exchange rate
    amount_in_base: 0, // Editable base currency amount
    collected_amount: 0, // Editable fund currency amount
    currency_code: "",
    currency_symbol: "",
    note: "",
    partner_transaction_type: "",
  });

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const refetch = useCallback(async () => {
    if (!api) return;
    const res = await api.getFunds();
    setFunds(res || []);
  }, [api]);

  useEffect(() => {
    if (isOpen) {
      refetch();

      let defaultNote = "";
      if (isPurchase) {
        defaultNote = t("screens.payments.paymentForPurchase", {
          id: invoice?.id,
        });
      } else if (isSales) {
        defaultNote = t("screens.payments.paymentForSales", {
          id: invoice?.id,
        });
      } else if (isExpense) {
        defaultNote = t("screens.payments.paymentForExpense", {
          id: invoice?.id,
        });
      } else if (isCustomer) {
        defaultNote = `Payment receipt from customer: ${partyName}`;
      } else if (isSupplier) {
        defaultNote = `Payment settlement to supplier: ${partyName}`;
      } else {
        defaultNote = t("screens.payments.partnerTransaction", {
          name: partyName,
        });
      }

      setForm({
        fund_id: "",
        fund_exchangeRate: 1,
        amount_in_base: initialBaseAmount,
        collected_amount: initialBaseAmount,
        currency_code: "",
        currency_symbol: "",
        note: defaultNote,
        partner_transaction_type: "income",
      });

      setMessage("");
    }
  }, [
    isOpen,
    refetch,
    invoice,
    isPurchase,
    isExpense,
    isSales,
    isPartner,
    isCustomer,
    isSupplier,
    partyName,
    initialBaseAmount,
    t,
  ]);

  const handleFundChange = (e) => {
    const fundId = Number(e.target.value);
    const fund = funds.find((f) => f.id === fundId);
    const rate = fund?.currency_exchangeRate || 1;
    const currentBase = form.amount_in_base || initialBaseAmount;

    setForm((prev) => ({
      ...prev,
      fund_id: fundId,
      fund_exchangeRate: rate,
      amount_in_base: currentBase,
      collected_amount: rate === 1 ? currentBase : currentBase * rate,
      currency_code: fund?.currency_code || "",
      currency_symbol: fund?.currency_symbol || "",
    }));
  };

  const handleBaseAmountChange = (val) => {
    const baseVal = Number(val || 0);
    setForm((prev) => ({
      ...prev,
      amount_in_base: baseVal,
      collected_amount:
        prev.fund_exchangeRate === 1
          ? baseVal
          : baseVal * prev.fund_exchangeRate,
    }));
  };

  const effectiveRate = useMemo(() => {
    if (!form.amount_in_base) return form.fund_exchangeRate;
    return Number(form.collected_amount || 0) / Number(form.amount_in_base);
  }, [form.collected_amount, form.amount_in_base, form.fund_exchangeRate]);

  const submit = async () => {
    if (!form.fund_id) {
      setMessage(t("ui.selectFundRequired") || "Please select a fund first");
      return;
    }
    if (Number(form.amount_in_base) <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    const paymentType =
      isPurchase || isExpense || isSupplier
        ? "expense"
        : isSales || isCustomer
          ? "income"
          : form.partner_transaction_type;

    const partyType =
      isPurchase || isExpense || isSupplier
        ? "supplier"
        : isSales || isCustomer
          ? "customer"
          : "partner";

    const paymentData = {
      type: paymentType,
      party_type: partyType,
      party_id: party,
      fund_id: form.fund_id,
      amount: Number(form.amount_in_base),
      exchange_rate: form.fund_exchangeRate,
      collected_amount: Number(form.collected_amount || 0),
      effective_rate: effectiveRate,
      currency_code: form.currency_code,
      currency_symbol: form.currency_symbol,
      note: form.note,
      mode,
    };

    if (isCollectorMode && onSubmit) {
      onSubmit?.(paymentData);
      onClose();
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await api.createPayment({
        ...paymentData,
        invoiceId: invoice?.id || null,
      });
      if (!res.success) throw new Error(res.message);

      setMessage(t("screens.payments.saved") || "Saved successfully");
      setTimeout(() => onClose(), 700);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !isCollectorMode && refetchList) {
      refetchList();
    }
  }, [loading, isOpen, isCollectorMode, refetchList]);

  return {
    form,
    funds,
    loading,
    message,
    effectiveRate,
    handleChange,
    handleFundChange,
    handleBaseAmountChange,
    submit,
    isPartner,
    isPurchase,
    isExpense,
    isSales,
    isCustomer,
    isSupplier,
    isCollectorMode,
    initialBaseAmount,
    t,
    money,
  };
};

export default useAddPayment;
