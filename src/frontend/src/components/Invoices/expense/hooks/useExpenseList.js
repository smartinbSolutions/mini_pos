import React, { useCallback, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import useListParams from "../../../../Global/useListParams";

const LIST_DEFAULTS = {
  page: 1,
  limit: 10,
  search: "",
  status: null,
  supplier_id: null,
  startDate: null,
  endDate: null,
  minTotal: null,
  maxTotal: null,
  category_id: null,
  taxIds: [],
  tagIds: [],
};

const useExpenseList = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [expenses, setExpenses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [allTags, setAllTags] = useState([]);
  const [tagsByExpense, setTagsByExpense] = useState({});

  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selecteInvoice, setSelecteInvoice] = useState(null);

  const [params, setParams] = useListParams(LIST_DEFAULTS);
  const { page, limit } = params;
  const [search, setSearch] = useState(params.search);

  // Same shape as before (arrays null when empty) so consumers don't change
  const filters = useMemo(
    () => ({
      status: params.status,
      supplier_id: params.supplier_id,
      startDate: params.startDate,
      endDate: params.endDate,
      minTotal: params.minTotal,
      maxTotal: params.maxTotal,
      category_id: params.category_id,
      taxIds: params.taxIds.length ? params.taxIds : null,
      tagIds: params.tagIds.length ? params.tagIds : null,
    }),
    [
      params.status,
      params.supplier_id,
      params.startDate,
      params.endDate,
      params.minTotal,
      params.maxTotal,
      params.category_id,
      params.taxIds.join(","),
      params.tagIds.join(","),
    ],
  );

  const setPage = (p) => setParams({ page: p });
  const setLimit = (l) => setParams({ limit: l, page: 1 });
  const setFilters = (patch) => setParams({ ...patch, page: 1 });
  const clearFilters = () =>
    setParams({
      status: null,
      supplier_id: null,
      startDate: null,
      endDate: null,
      minTotal: null,
      maxTotal: null,
      category_id: null,
      taxIds: [],
      tagIds: [],
      page: 1,
    });

  useEffect(() => {
    if (api?.getSuppliers) {
      api
        .getSuppliers({ page: 1, limit: 1000 })
        .then((res) => setSuppliers(res?.data || res || []))
        .catch(() => setSuppliers([]));
    }
  }, [api]);

  useEffect(() => {
    if (api?.getExpensesCategory) {
      api
        .getExpensesCategory()
        .then((res) =>
          setCategories(Array.isArray(res) ? res : res?.data || []),
        )
        .catch(() => setCategories([]));
    }
  }, [api]);

  useEffect(() => {
    if (api?.getTaxes) {
      api
        .getTaxes()
        .then((res) => setTaxes(res || []))
        .catch(() => setTaxes([]));
    }
  }, [api]);

  useEffect(() => {
    if (api?.listTags) {
      api
        .listTags("expense")
        .then((res) => setAllTags(res.success ? res.data : []))
        .catch(() => setAllTags([]));
    }
  }, [api]);

  // Search is server-side so it covers every page, not just the loaded one.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      if (next !== params.search) setParams({ search: next, page: 1 });
    }, 250);
    return () => clearTimeout(timer);
  }, [search, params.search, setParams]);

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
        search: params.search || undefined,
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
        taxIds: filters.taxIds || undefined,
        tagIds: filters.tagIds || undefined,
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
  }, [api, page, limit, filters, params.search, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!api?.getEntitiesTags) return;

    if (expenses.length === 0) {
      setTagsByExpense({});
      return;
    }
    const ids = expenses.map((e) => e.id);
    api.getEntitiesTags("expense", ids).then((res) => {
      if (res.success) setTagsByExpense(res.data);
    });
  }, [expenses, api]);

  // Maps known backend error codes to a translated, user-facing message.
  const mapErrorCode = useCallback(
    (code) => {
      switch (code) {
        case "CANNOT_DELETE_PAID_EXPENSE":
          return t("errors.cannotDeletePaidInvoice");
        default:
          return null;
      }
    },
    [t],
  );

  const handleDelete = async (id) => {
    try {
      setActionError("");
      const res = await window.api.deleteExpense(id);

      if (!res?.success) {
        throw new Error(
          mapErrorCode(res?.error) ||
            res?.error ||
            t("screens.expenses.deleteFailed"),
        );
      }

      await refetch();
    } catch (err) {
      console.error("Failed to delete expense:", err);
      setActionError(err?.message || t("screens.expenses.deleteFailed"));
    }
  };

  return {
    expenses,
    suppliers,
    categories,
    taxes,
    loading,
    saving,
    error,
    actionError,
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

    search,
    setSearch,

    allTags,
    tagsByExpense,
  };
};

export default useExpenseList;
