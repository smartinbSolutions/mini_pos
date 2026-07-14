import { useEffect, useState } from "react";

const LIMIT = 50;

export default function usePartyLedger(partyId, partyType) {
  const api = window.api;

  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    total_increase: 0,
    total_decrease: 0,
    total_invoice: 0,
    total_return: 0,
    total_payment: 0,
    opening_balance: 0,
  });
  const [loading, setLoading] = useState(false);
  const [party, setParty] = useState(null);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchData = async () => {
    if (!partyId || !partyType) return;

    setLoading(true);

    try {
      const {
        data: rows,
        total: totalCount,
        totalPages: pages,
        summary: summaryData,
      } = await api.getPartyHistoryLedger({
        partyId,
        partyType,
        page,
        limit: LIMIT,
      });

      if (partyType === "customer") {
        const customer = await api.getCustomer(partyId);
        setParty(customer);
      } else if (partyType === "supplier") {
        const supplier = await api.getSupplier(partyId);
        setParty(supplier);
      } else if (partyType === "partner") {
        const partner = await api.getPartner(partyId);
        setParty(partner);
      }

      setData(rows);
      setTotal(totalCount);
      setTotalPages(pages);
      setSummary(summaryData);
    } catch (err) {
      console.error("Ledger Error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, partyType, page]);

  useEffect(() => {
    setPage(1);
  }, [partyId, partyType]);

  return {
    data,
    summary,
    loading,
    refetch: fetchData,
    party,
    page,
    setPage,
    total,
    totalPages,
    limit: LIMIT,
  };
}
