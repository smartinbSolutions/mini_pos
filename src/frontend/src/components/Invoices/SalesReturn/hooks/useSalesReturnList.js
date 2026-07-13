import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const useSalesReturnList = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [salesReturns, setSalesReturns] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiNotAvailable"));
      return;
    }

    try {
      setLoading(true);

      const res = await api.getSalesReturns({
        page,
        limit,
      });

      setSalesReturns(res?.data || []);
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

  const deleteSalesReturn = async (id) => {
    try {
      setSaving(true);

      await api.deleteSalesReturn(id);

      await refetch();
    } catch (err) {
      setError(
        err?.message ||
          t("errors.deleteFailed", {
            field: t("ui.salesReturn"),
          }),
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    salesReturns,

    loading,
    saving,
    error,

    refetch,
    deleteSalesReturn,

    page,
    setPage,

    limit,
    setLimit,

    total,
    totalPages,

    selectedInvoice,
    setSelectedInvoice,

    openPaymentModel,
    setOpenPaymentModel,
  };
};

export default useSalesReturnList;
