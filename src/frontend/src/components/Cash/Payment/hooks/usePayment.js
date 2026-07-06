import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const usePayment = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);

  const api = window.api;

  const refetch = useCallback(async () => {
    if (!api) {
      setActionError(t("errors.apiUnavailable"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      let payment = await api.getPayments();

      setPayments(payment || []);
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setActionError(
        err?.message || t("errors.createFailed", { field: t("ui.fund") }),
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const deletePayment = async (payment) => {
    // setSaving(true);
    try {
      console.log(payment);

      await api.deletePayment(payment.id);
      await refetch();
    } finally {
      //   setSaving(false);
    }
  };

  const handleDeletePayment = async (payment) => {
    try {
      await deletePayment(payment);
      setActionError("");
    } catch (err) {
      console.error("Failed to delete Payment:", err);
      toast.error(t("errors.deleteFailed", { field: t("ui.payment") }));
    }
  };

  return {
    payments,
    loading,
    actionError,
    refetch,
    deletePayment,
    handleDeletePayment,
  };
};

export default usePayment;
