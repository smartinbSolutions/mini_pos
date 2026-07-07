import { useEffect, useState } from "react";

const LIMIT = 50;

export default function usePartyLedger(partyId, partyType, page = 1) {
  const api = window.api;

  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({
    total_invoice: 0,
    total_payment: 0,
    total_deposit: 0,
    total_withdrawal: 0,
  });
  const [loading, setLoading] = useState(false);
  const [party, setParty] = useState("");

  const fetchData = async () => {
    if (!partyId || !partyType) return;

    setLoading(true);

    try {
      const offset = (page - 1) * LIMIT;

      const { rows, summary } = await api.getPartyHistoryLedger({
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
      } else if (partyType === "partner") {
        const partner = await api.getPartner(partyId);
        setParty(partner);
      }

      setData(rows);
      setSummary(summary);
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

  return { data, summary, loading, refetch: fetchData, party };
}
