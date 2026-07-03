import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function useFundHistory(fundId) {
  const { t } = useTranslation();
  const api = window.api;

  const [history, setHistory] = useState([]);
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    if (!api || !fundId) return;

    setLoading(true);
    setError("");

    try {
      const [fundResult, historyResult] = await Promise.all([
        api.getFund(fundId),
        api.getFundHistory({ fundId }),
      ]);

      setFund(fundResult || null);
      setHistory(historyResult || []);
    } catch (err) {
      console.error("Failed to load fund history:", err);
      setError(err?.message || t("errors.loadError"));
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [api, fundId, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { history, fund, loading, error, refetch };
}
