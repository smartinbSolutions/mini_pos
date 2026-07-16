import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const DEFAULT_FILTERS = {
  dateFrom: "",
  dateTo: "",
  supplierId: "",
  status: "",
  returnStatus: "",
  minTotal: "",
  maxTotal: "",
};

const usePurchaseList = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [purchaseInvoices, setPurchaseInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [suppliers, setSuppliers] = useState([]);

  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selecteInvoice, setSelecteInvoice] = useState(null);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPage(1);
  };

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiNotAvailable"));
      return;
    }

    try {
      setLoading(true);
      const res = await api.getPurchaseInvoices({
        page,
        limit,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        supplierId: filters.supplierId || undefined,
        status: filters.status || undefined,
        returnStatus: filters.returnStatus || undefined,
        minTotal: filters.minTotal !== "" ? filters.minTotal : undefined,
        maxTotal: filters.maxTotal !== "" ? filters.maxTotal : undefined,
      });

      setPurchaseInvoices(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setError("");
    } catch (err) {
      setError(err?.message || t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, filters, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Loaded once for the filter dropdown — full list, not paginated.
  useEffect(() => {
    if (!api?.getSuppliers) return;
    api
      .getSuppliers({ page: 1, limit: 1000 })
      .then((res) => setSuppliers(res?.data || res || []))
      .catch(() => setSuppliers([]));
  }, [api]);

  const deletePurchase = async (id) => {
    try {
      setSaving(true);
      await api.deletePurchaseInvoice(id);
      await refetch();
    } catch (err) {
      setError(
        err?.message || t("errors.deleteFailed", { field: t("ui.invoice") })
      );
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

    filters,
    handleFilterChange,
    clearFilters,
    suppliers,
  };
};

export default usePurchaseList;
