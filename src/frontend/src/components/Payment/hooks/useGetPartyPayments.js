import { useEffect, useState } from "react";

const LIMIT = 50;

export default function usePartyLedger(partyId, partyType, page = 1) {
  const api = window.api;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!partyId || !partyType) return;

    setLoading(true);

    try {
      const offset = (page - 1) * LIMIT;

      const rows = await api.getPartyLedger({
        partyId,
        partyType,
        limit: LIMIT,
        offset,
      });

      setData(rows);
    } catch (err) {
      console.log("Ledger Error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [partyId, partyType, page]);

  return { data, loading, refetch: fetchData };
}
