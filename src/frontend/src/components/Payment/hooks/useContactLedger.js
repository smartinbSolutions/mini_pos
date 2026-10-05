import { useCallback, useEffect, useMemo, useState } from "react";

const DEFAULT_LIMIT = 10;
const EMPTY_SUMMARY = {
  total_increase: 0,
  total_decrease: 0,
  total_invoice: 0,
  total_return: 0,
  total_payment: 0,
  sales_total: 0,
  sales_returns_total: 0,
  purchases_total: 0,
  purchase_returns_total: 0,
  opening_balance: 0,
};

export default function useContactLedger(contactId) {
  const api = window.api;

  const [contact, setContact] = useState(null);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimitState] = useState(DEFAULT_LIMIT);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFrom, setDateFromState] = useState("");
  const [dateTo, setDateToState] = useState("");

  const setLimit = (n) => {
    setLimitState(n);
    setPage(1);
  };
  const setDateFrom = (v) => {
    setDateFromState(v);
    setPage(1);
  };
  const setDateTo = (v) => {
    setDateToState(v);
    setPage(1);
  };

  const loadContact = useCallback(async () => {
    if (!contactId) return;
    const res = await api.getContact(contactId);
    setContact(res?.success ? res.data : null);
  }, [api, contactId]);

  useEffect(() => {
    loadContact();
  }, [loadContact]);

  // Which legacy row the existing ledger handler is called with.
  const ledgerKey = useMemo(() => {
    if (!contact) return null;
    if (contact.legacy_customer_id)
      return { partyType: "customer", partyId: contact.legacy_customer_id };
    if (contact.legacy_supplier_id)
      return { partyType: "supplier", partyId: contact.legacy_supplier_id };
    return null;
  }, [contact]);

  const fetchLedger = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const res = await api.getPartyHistoryLedger({
        contactId,
        page,
        limit,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
      });
      setRows(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setSummary(res?.summary || EMPTY_SUMMARY);
    } catch (err) {
      console.error("Ledger error:", err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [api, contactId, page, limit, dateFrom, dateTo]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  return {
    contact,
    ledgerKey,
    rows,
    summary,
    loading: loading || !contact,
    refetch: () => Promise.all([loadContact(), fetchLedger()]),
    page,
    setPage,
    total,
    totalPages,
    limit,
    setLimit,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  };
}
