import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const usePayment = () => {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const api = window.api;

  const refetch = useCallback(async () => {
    if (!api) {
      setActionError(t("errors.apiUnavailable"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      let res = await api.getPayments({ page, limit });

      setPayments(res.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setActionError(
        err?.message || t("errors.createFailed", { field: t("ui.fund") }),
      );
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const deletePayment = async (payment) => {
    // setSaving(true);
    try {
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
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
  };
};

export default usePayment;
