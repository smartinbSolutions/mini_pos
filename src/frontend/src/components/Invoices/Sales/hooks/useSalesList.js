import { useCallback, useEffect, useState } from "react";

const useSalesList = () => {
  const api = window.api;

  const [salesInvoices, setSalesInvoices] = useState([]);
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
      const res = await api.getSalesInvoices();
      setSalesInvoices(res || []);
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

  const deleteSales = async (id) => {
    try {
      setSaving(true);
      await api.deleteSalesInvoice(id);
      setSalesInvoices((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      setError(err?.message || "Delete failed");
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
  };
};

export default useSalesList;
