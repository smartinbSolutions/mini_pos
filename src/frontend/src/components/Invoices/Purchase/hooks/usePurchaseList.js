import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const usePurchaseList = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
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
      const res = await api.getPurchaseInvoices();
      setPurchaseInvoices(res || []);
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

  const deletePurchase = async (id) => {
    try {
      setSaving(true);
      await api.deletePurchaseInvoice(id);
      setPurchaseInvoices((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(
        err?.message || t("errors.deleteFailed", { field: t("ui.invoice") })
      );
    } finally {
      setSaving(false);
    }
  };
  console.log(purchaseInvoices);
  return {
    purchaseInvoices,
    loading,
    saving,
    error,
    refetch,
    deletePurchase,
    selecteInvoice,
    setSelecteInvoice,
    openPaymentModel,
    setOpenPaymentModel,
  };
};

export default usePurchaseList;
