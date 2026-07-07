import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const useTransferFundtoFund = ({ isOpen, onClose, refetchList }) => {
  const api = window.api;
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [funds, setFunds] = useState([]);

  const [form, setForm] = useState({
    from_fund_id: "",
    to_fund_id: "",
    amount: "", // deduct amount, in source fund's currency
    receive_amount: "", // editable, in destination fund's currency
    note: "",
  });

  const sourceFund = useMemo(
    () => funds.find((f) => f.id === Number(form.from_fund_id)),
    [funds, form.from_fund_id]
  );

  const targetFund = useMemo(
    () => funds.find((f) => f.id === Number(form.to_fund_id)),
    [funds, form.to_fund_id]
  );

  const refetch = useCallback(async () => {
    if (!api) return;

    try {
      const res = await api.getFunds();
      setFunds(res || []);
    } catch (err) {
      console.error(err);
    }
  }, [api]);

  useEffect(() => {
    if (!isOpen) return;

    refetch();

    setForm({
      from_fund_id: "",
      to_fund_id: "",
      amount: "",
      receive_amount: "",
      note: "",
    });

    setMessage("");
  }, [isOpen, refetch]);

  const handleSourceFundChange = (e) => {
    const id = Number(e.target.value);

    setForm((prev) => ({
      ...prev,
      from_fund_id: id,
      to_fund_id: prev.to_fund_id === id ? "" : prev.to_fund_id,
    }));
  };

  const sourceRate = Number(sourceFund?.currency_exchangeRate || 1);
  const targetRate = Number(targetFund?.currency_exchangeRate || 1);

  // Same fund-currency cross-rate the backend computes server-side —
  // shown here only for display, never sent as truth to the backend.
  const nominalRate = useMemo(() => {
    if (!sourceRate) return 1;
    return targetRate / sourceRate;
  }, [sourceRate, targetRate]);

  useEffect(() => {
    const amount = Number(form.amount || 0);

    if (!amount || !sourceFund || !targetFund) {
      setForm((prev) => ({ ...prev, receive_amount: "" }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      receive_amount: Number((amount * nominalRate).toFixed(4)),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominalRate, sourceFund, targetFund]);

  const isCrossCurrency = sourceFund && targetFund && nominalRate !== 1;

  // Recompute the nominal receive amount whenever the deduct amount or
  // either fund changes. This is the "auto-calculated" value shown before
  // any manual override.
  const nominalReceiveAmount = useMemo(() => {
    const amount = Number(form.amount || 0);
    if (!amount || !sourceFund || !targetFund) return 0;
    return amount * nominalRate;
  }, [form.amount, sourceFund, targetFund, nominalRate]);

  // Same pattern as AddPayment's amount_in_base / collected_amount:
  // changing the deduct amount resets receive_amount to the freshly
  // computed nominal value (overwriting any prior manual edit), while
  // editing receive_amount directly is a separate, independent action.
  const handleAmountChange = (val) => {
    const amount = val === "" ? "" : Number(val || 0);
    const receive =
      amount === "" || !sourceFund || !targetFund
        ? ""
        : Number((amount * nominalRate).toFixed(4));

    setForm((prev) => ({
      ...prev,
      amount,
      receive_amount: receive,
    }));
  };

  const handleReceiveAmountChange = (val) => {
    setForm((prev) => ({
      ...prev,
      receive_amount: val === "" ? "" : Number(val || 0),
    }));
  };

  // What the transfer will actually record, once both amounts are known —
  // can differ from nominalRate if receive_amount was manually adjusted.
  const effectiveRate = useMemo(() => {
    const amount = Number(form.amount || 0);
    const receive = Number(form.receive_amount || 0);
    if (!amount) return nominalRate;
    return receive / amount;
  }, [form.amount, form.receive_amount, nominalRate]);

  const submit = async () => {
    if (!form.from_fund_id || !form.to_fund_id) {
      setMessage("Please select both source and destination funds.");
      return;
    }

    if (Number(form.amount) <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    if (Number(form.receive_amount) <= 0) {
      setMessage("Please enter a valid receive amount.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        from_fund_id: Number(form.from_fund_id),
        to_fund_id: Number(form.to_fund_id),
        deduct_amount: Number(form.amount),
        receive_amount: Number(form.receive_amount),
        note:
          form.note ||
          `Internal transfer from ${sourceFund?.name} to ${targetFund?.name}`,
      };

      const res = await api.transferFundToFund(payload);

      if (!res.success) {
        throw new Error(res.message);
      }

      if (refetchList) {
        await refetchList();
      }

      onClose();
    } catch (err) {
      setMessage(err.message || "An error occurred during transfer.");
    } finally {
      setLoading(false);
    }
  };

  return {
    funds,
    form,
    setForm,
    sourceFund,
    targetFund,
    sourceRate,
    targetRate,
    nominalRate,
    nominalReceiveAmount,
    isCrossCurrency,
    effectiveRate,
    loading,
    message,
    handleSourceFundChange,
    handleAmountChange,
    handleReceiveAmountChange,
    submit,
    t,
  };
};

export default useTransferFundtoFund;
