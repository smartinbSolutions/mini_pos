import React, { useCallback, useEffect, useMemo, useState } from "react";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
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
    amount: "",
    note: "",
  });

  const sourceFund = useMemo(
    () => funds.find((f) => f.id === Number(form.from_fund_id)),
    [funds, form.from_fund_id],
  );

  const targetFund = useMemo(
    () => funds.find((f) => f.id === Number(form.to_fund_id)),
    [funds, form.to_fund_id],
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

  const receiveAmount = useMemo(() => {
    if (!sourceFund || !targetFund) return 0;

    const amount = Number(form.amount || 0);

    if (!amount) return 0;

    const baseAmount = amount / sourceRate;

    return baseAmount * targetRate;
  }, [form.amount, sourceFund, targetFund, sourceRate, targetRate]);

  const submit = async () => {
    if (!form.from_fund_id || !form.to_fund_id) {
      setMessage("Please select both source and destination funds.");
      return;
    }

    if (Number(form.amount) <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const payload = {
        from_fund_id: Number(form.from_fund_id),
        to_fund_id: Number(form.to_fund_id),

        deduct_amount: Number(form.amount),

        receive_amount: Number(receiveAmount),

        note:
          form.note ||
          `Internal transfer from ${sourceFund?.name} to ${targetFund?.name}`,
      };

      const res = await api.transferFundToFund(payload);

      if (!res.success) {
        throw new Error(res.message);
      }

      refetchList?.();
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
    receiveAmount,
    loading,
    message,
    handleSourceFundChange,
    submit,
    t,
  };
};

export default useTransferFundtoFund;
