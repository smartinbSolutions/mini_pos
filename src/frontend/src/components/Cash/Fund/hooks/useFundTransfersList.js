import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useListParams from "../../../../Global/useListParams";

const DEFAULT_FILTERS = { fundId: null, dateFrom: null, dateTo: null };
const LIST_DEFAULTS = { page: 1, limit: 10, search: "", ...DEFAULT_FILTERS };
const FILTER_KEYS = Object.keys(DEFAULT_FILTERS);

const useFundTransfersList = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [funds, setFunds] = useState([]);

  // List state lives in the URL: Back / refresh / RouteMemory restore it
  const [params, setParams] = useListParams(LIST_DEFAULTS);
  const { page, limit } = params;
  // Input stays local so typing is instant; the URL gets the debounced value
  const [search, setSearch] = useState(params.search);

  const filtersKey = JSON.stringify(FILTER_KEYS.map((k) => params[k]));
  const filters = useMemo(
    () => Object.fromEntries(FILTER_KEYS.map((k) => [k, params[k]])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtersKey],
  );

  const setPage = (p) => setParams({ page: p });
  const setLimit = (l) => setParams({ limit: l, page: 1 });
  const setFilters = (patch) => setParams({ ...patch, page: 1 });
  const clearFilters = () => setParams({ ...DEFAULT_FILTERS, page: 1 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      // Only reset to page 1 when the search actually changed — not on mount
      if (next !== params.search) setParams({ search: next, page: 1 });
    }, 250);
    return () => clearTimeout(timer);
  }, [search, params.search, setParams]);

  // Full fund list for the filter dropdown
  useEffect(() => {
    if (!api?.getFunds) return;
    api
      .getFunds()
      .then((res) => setFunds(res?.data || res || []))
      .catch(() => setFunds([]));
  }, [api]);

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiUnavailable"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const result = await api.getFundTransfers({
        page,
        limit,
        search: params.search || undefined,
        fundId: filters.fundId || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      });

      setTransfers(result?.data || []);
      setTotal(result?.total || 0);
      setTotalPages(result?.totalPages || 1);
      setError("");
    } catch (err) {
      console.error("Failed to load fund transfers:", err);
      setError(
        err?.message ||
          t("errors.loadFailed", { field: t("screens.transfer.title") }),
      );
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, params.search, filters, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleDeleteTransfer = async (transfer) => {
    setSaving(true);
    try {
      const res = await api.deleteFundTransfer(transfer.id);

      if (!res?.success) throw new Error(res?.error || res?.message);
      setActionError("");
      await refetch();
    } catch (err) {
      console.error("Failed to delete transfer:", err);
      setActionError(
        err?.message ||
          t("errors.deleteHasData", { field: t("screens.transfer.title") }),
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    transfers,
    loading,
    error,
    actionError,
    saving,

    handleDeleteTransfer,
    refetch,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,

    search,
    setSearch,
    filters,
    setFilters,
    clearFilters,
    funds,

    t,
  };
};

export default useFundTransfersList;
