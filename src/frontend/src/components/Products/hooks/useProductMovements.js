import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

export default function useProductMovements() {
  const { t } = useTranslation();
  const api = window.api;

  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeMovementsProduct, setActiveMovementsProduct] = useState(null);

  const openMovements = useCallback(
    async (product) => {
      setActiveMovementsProduct(product);
      setLoading(true);
      setError("");

      try {
        const result = await api.getProductMovements(product.id);
        setMovements(result || []);
      } catch (err) {
        console.error("Failed to load product movements:", err);
        setError(err?.message || t("errors.loadError"));
        setMovements([]);
      } finally {
        setLoading(false);
      }
    },
    [api, t]
  );

  const closeMovements = () => {
    setActiveMovementsProduct(null);
    setMovements([]);
    setError("");
  };

  return {
    movements,
    loading,
    error,
    activeMovementsProduct,
    openMovements,
    closeMovements,
  };
}
