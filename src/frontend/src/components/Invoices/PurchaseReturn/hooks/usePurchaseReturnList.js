import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const usePurchaseReturnList = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selecteInvoice, setSelecteInvoice] = useState(null);

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiNotAvailable"));
      return;
    }

    try {
      setLoading(true);

      const res = await api.getPurchaseReturns({ page, limit });

      setPurchaseReturns(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setError("");
    } catch (err) {
      setError(err?.message || t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const deletePurchaseReturn = async (id) => {
    try {
      setSaving(true);

      await api.deletePurchaseReturn(id);

      await refetch();
    } catch (err) {
      setError(
        err?.message ||
          t("errors.deleteFailed", {
            field: t("ui.purchaseReturn"),
          }),
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    purchaseReturns,
    loading,
    saving,
    error,

    refetch,
    deletePurchaseReturn,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,

    selecteInvoice,
    setSelecteInvoice,

    openPaymentModel,
    setOpenPaymentModel,
  };
};

export default usePurchaseReturnList;
