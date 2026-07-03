import { useEffect, useState } from "react";

const LIMIT = 50;

export default function usePartyLedger(partyId, partyType, page = 1) {
  const api = window.api;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [party, setParty] = useState("");

  const fetchData = async () => {
    if (!partyId || !partyType) return;

    setLoading(true);

    try {
      const offset = (page - 1) * LIMIT;

      const rows = await api.getPartyHistoryLedger({
        partyId,
        partyType,
        limit: LIMIT,
        offset,
      });

      if (partyType === "customer") {
        const customer = await api.getCustomer(partyId);
        setParty(customer);
      } else if (partyType === "supplier") {
        const supplier = await api.getSupplier(partyId);
        setParty(supplier);
      }
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

  return { data, loading, refetch: fetchData, party };
}
