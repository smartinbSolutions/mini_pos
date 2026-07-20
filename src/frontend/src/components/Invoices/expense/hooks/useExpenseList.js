import React, { useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const useExpenseList = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selecteInvoice, setSelecteInvoice] = useState(null);

  const [filters, setFiltersState] = useState({
    status: null,
    supplier_id: null,
    startDate: null,
    endDate: null,
    minTotal: null,
    maxTotal: null,
    category_id: null,
  });

  const setFilters = (patch) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
    setPage(1); // reset to page 1 whenever filters change, same as changing limit
  };

  const clearFilters = () => {
    setFiltersState({
      status: null,
      supplier_id: null,
      startDate: null,
      endDate: null,
      minTotal: null,
      maxTotal: null,
      category_id: null,
    });
    setPage(1);
  };

  useEffect(() => {
    if (api?.getSuppliers) {
      api
        .getSuppliers()
        .then((res) => setSuppliers(res?.data || res || []))
        .catch(() => setSuppliers([]));
    }
  }, [api]);

  // Bare array response (not { data: [...] }) — different shape than
  // getSuppliers, confirmed against the actual IPC handler.
  useEffect(() => {
    if (api?.getExpensesCategory) {
      api
        .getExpensesCategory()
        .then((res) =>
          setCategories(Array.isArray(res) ? res : res?.data || [])
        )
        .catch(() => setCategories([]));
    }
  }, [api]);

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiNotAvailable"));
      return;
    }

    try {
      setLoading(true);
      const res = await api.getExpenses({
        page,
        limit,
        status: filters.status || undefined,
        supplier_id: filters.supplier_id || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        minTotal:
          filters.minTotal !== null && filters.minTotal !== ""
            ? filters.minTotal
            : undefined,
        maxTotal:
          filters.maxTotal !== null && filters.maxTotal !== ""
            ? filters.maxTotal
            : undefined,
        category_id: filters.category_id || undefined,
      });

      setExpenses(res?.data || []);
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

  const handleDelete = async (id) => {
    try {
      setActionError("");
      await window.api.deleteExpense(id);
      await refetch();
    } catch (err) {
      setActionError(t("screens.expenses.deleteFailed"));
    }
  };

  return {
    expenses,
    suppliers,
    categories,
    loading,
    saving,
    error,
    refetch,
    handleDelete,

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
    setFilters,
    clearFilters,
  };
};

export default useExpenseList;
