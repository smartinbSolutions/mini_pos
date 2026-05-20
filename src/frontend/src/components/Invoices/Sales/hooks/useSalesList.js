import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const useSalesList = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [salesInvoices, setSalesInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selecteInvoice, setSelecteInvoice] = useState(null);

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiNotAvailable"));
      return;
    }

    try {
      setLoading(true);
      const res = await api.getSalesInvoices();
      setSalesInvoices(res || []);
      setError("");
    } catch (err) {
      setError(err?.message || t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const deleteSales = async (id) => {
    try {
      setSaving(true);
      await api.deleteSalesInvoice(id);
      setSalesInvoices((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err?.message || t("errors.deleteFailed", { field: t("ui.invoice") }));
    } finally {
      setSaving(false);
    }
  };

  return {
    salesInvoices,
    loading,
    saving,
    error,
    refetch,
    deleteSales,
    selecteInvoice,
    setSelecteInvoice,
    openPaymentModel,
    setOpenPaymentModel,
  };
};

export default useSalesList;
