import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useListParams from "../../../../Global/useListParams";

const DEFAULT_FILTERS = {
  type: null,
  party_type: null,
  invoice_type: null,
  fund_id: null,
  dateFrom: null,
  dateTo: null,
};
const LIST_DEFAULTS = { page: 1, limit: 20, search: "", ...DEFAULT_FILTERS };
const FILTER_KEYS = Object.keys(DEFAULT_FILTERS);
// Separate URL keys from usePayment — both hooks run on the same page
const PARAMS_OPTIONS = { prefix: "d_" };

const useDeletedPayments = () => {
  const { t } = useTranslation();
  const [deletedPayments, setDeletedPayments] = useState([]);
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const api = window.api;

  const [params, setParams] = useListParams(LIST_DEFAULTS, PARAMS_OPTIONS);
  const { page, limit } = params;
  const [search, setSearch] = useState(params.search);

  const filtersKey = JSON.stringify(FILTER_KEYS.map((k) => params[k]));
  const filters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, params[k]])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtersKey],
  );

  const setPage = (p) => setParams({ page: p });
  const setLimit = (l) => setParams({ limit: l, page: 1 });
  const setFilters = (newFilters) => setParams({ ...newFilters, page: 1 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      if (next !== params.search) setParams({ search: next, page: 1 });
    }, 250);
    return () => clearTimeout(timer);
  }, [search, params.search, setParams]);

  const refetch = useCallback(async () => {
    if (!api) {
      setActionError(t("errors.apiUnavailable"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const res = await api.getDeletedPayments({
        page,
        limit,
        ...filters,
        search: params.search || undefined,
      });

      setDeletedPayments(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load deleted payments:", err);
      setActionError(
        err?.message || t("errors.loadFailed", { field: t("ui.payment") }),
      );
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, filters, params.search, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    deletedPayments,
    loading,
    actionError,
    refetch,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    filters,
    setFilters,
    search,
    setSearch,
  };
};

export default useDeletedPayments;
