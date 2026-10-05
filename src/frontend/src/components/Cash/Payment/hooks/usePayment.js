import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useAuth } from "../../../../Global/AuthContext";
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

const usePayment = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    income_count: 0,
    income_total: 0,
    expense_count: 0,
    expense_total: 0,
  });
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const api = window.api;

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
  const setFilters = (newFilters) => setParams({ ...newFilters, page: 1 });

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      // Only reset to page 1 when the search actually changed — not on mount
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

      const res = await api.getPayments({
        page,
        limit,
        ...filters,
        search: params.search || undefined,
      });

      // A settlement writes two payment rows (income + expense, fund_id
      // NULL) sharing settlement_id. Collapse each pair into one entry
      // for display — the list shows one settlement, not two payments.
      const raw = res?.data || [];
      const settlementIds = [
        ...new Set(
          raw.filter((p) => p.settlement_id).map((p) => p.settlement_id),
        ),
      ];
      const bySettlement = new Map();
      for (const id of settlementIds) bySettlement.set(id, []);
      for (const p of raw) {
        if (p.settlement_id) bySettlement.get(p.settlement_id).push(p);
      }

      const collapsed = [];
      const seenSettlements = new Set();
      for (const p of raw) {
        if (!p.settlement_id) {
          collapsed.push(p);
          continue;
        }
        if (seenSettlements.has(p.settlement_id)) continue;
        seenSettlements.add(p.settlement_id);

        const pair = bySettlement.get(p.settlement_id);
        const receipt = pair.find((x) => x.type === "income") || p;
        const payment = pair.find((x) => x.type === "expense") || p;

        collapsed.push({
          ...p,
          isSettlement: true,
          settlement_id: p.settlement_id,
          amount: Number(receipt.amount || payment.amount || 0),
          receiptPartyName: receipt.party_name,
          paymentPartyName: payment.party_name,
          date: p.date,
        });
      }

      setPayments(collapsed);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setSummary(
        res?.summary || {
          income_count: 0,
          income_total: 0,
          expense_count: 0,
          expense_total: 0,
        },
      );
    } catch (err) {
      console.error("Failed to load payments:", err);
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

  const deletePayment = async (payment) => {
    const res = await api.deletePayment(payment.id, user?.id);
    if (!res?.success) throw new Error(res?.error || "DELETE_FAILED");
    await refetch();
  };

  const handleDeletePayment = async (payment) => {
    try {
      await deletePayment(payment);
      setActionError("");
    } catch (err) {
      console.error("Failed to delete Payment:", err);
      toast.error(t("errors.deleteFailed", { field: t("ui.payment") }));
    }
  };

  return {
    payments,
    summary,
    loading,
    actionError,
    refetch,
    deletePayment,
    handleDeletePayment,
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

export default usePayment;
