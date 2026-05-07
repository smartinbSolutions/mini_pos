import { useCallback, useEffect, useState } from "react";

const usePurchaseList = () => {
  const api = window.api;

  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    if (!api) {
      setError("API not available");
      return;
    }

    try {
      setLoading(true);
      const res = await api.getPurchaseInvoices();
      setPurchaseInvoices(res || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load purchases");
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
      setError(err?.message || "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  return {
    purchaseInvoices,
    loading,
    saving,
    error,
    refetch,
    deletePurchase,
  };
};

export default usePurchaseList;
