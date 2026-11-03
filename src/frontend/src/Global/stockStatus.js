import { useEffect, useState } from "react";

// Stock status shown to cashiers as a plain word + colour.
// The threshold is the company's "Minimum Stock Threshold" setting
// (quantity at or below it = running low; 0 disables the warning).
export function getStockStatus(product, lowLevel = 0) {
  if (!product || product.type === "service") return null;
  const qty = Number(product.quantity || 0);
  if (qty <= 0) return "out";
  if (Number(lowLevel) > 0 && qty <= Number(lowLevel)) return "low";
  return "available";
}

export function useLowStockLevel() {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    let alive = true;
    window.api
      ?.getCompanySetting?.()
      .then((res) => {
        if (alive) setLevel(Number(res?.settings?.minimum_stock ?? 0) || 0);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return level;
}
