import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { friendlyError } from "../../../Global/friendlyError";

export default function useProductMovements(productId) {
  const { t } = useTranslation();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const api = window.api;

  const fetchMovements = useCallback(async () => {
    if (!api || !productId) return;

    try {
      setLoading(true);
      setError("");

      const res = await api.getProductMovements({
        product_id: productId,
        page,
        limit,
      });

      setMovements(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load product movements:", err);
      setError(friendlyError(t, err, "errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, productId, page, limit, t]);

  return {
    movements,
    loading,
    error,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    fetchMovements,
  };
}
