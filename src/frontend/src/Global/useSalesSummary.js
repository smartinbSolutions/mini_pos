import { useCallback, useEffect, useState } from "react";

// Local calendar date as YYYY-MM-DD (the reports filter on date(column)).
export const toLocalDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function periodRange(period) {
  const today = new Date();
  const end = toLocalDate(today);
  if (period === "week") {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: toLocalDate(start), endDate: end };
  }
  if (period === "month") {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { startDate: toLocalDate(start), endDate: end };
  }
  return { startDate: end, endDate: end };
}

const sum = (rows, key) =>
  (rows || []).reduce((total, row) => total + Number(row?.[key] || 0), 0);

// Plain-language sales numbers for a date range, built only from the
// existing report APIs (sales report, profit & loss, daily POS report).
export default function useSalesSummary({ startDate, endDate }) {
  const [state, setState] = useState({ loading: true, error: false });

  const load = useCallback(async () => {
    const api = window.api;
    setState((s) => ({ ...s, loading: true, error: false }));

    const isToday = startDate === endDate && endDate === toLocalDate();

    try {
      const [sales, profit, daily] = await Promise.all([
        api.getSalesReport({ startDate, endDate, productLimit: null }),
        api.getProfitLossReport({ startDate, endDate }),
        isToday ? api.getDailyPosReport({ date: endDate, limit: 1 }) : null,
      ]);

      if (sales?.success === false || profit?.success === false) {
        throw new Error(sales?.error || profit?.error);
      }

      const byProduct = sales?.byProduct || [];

      setState({
        loading: false,
        error: false,
        sold: Number(sales?.summary?.netSales || 0),
        returns: Number(sales?.summary?.returnsTotal || 0),
        count: Number(sales?.summary?.invoiceCount || 0),
        items: sum(byProduct, "quantity"),
        profit: Number(profit?.current?.profitLoss?.grossProfit || 0),
        topProducts: [...byProduct]
          .sort((a, b) => Number(b.quantity || 0) - Number(a.quantity || 0))
          .slice(0, 5),
        received: daily
          ? sum(daily?.stats?.fundIn, "amount") -
            sum(daily?.stats?.fundOut, "amount")
          : null,
      });
    } catch (err) {
      console.error("Failed to load sales summary:", err);
      setState({ loading: false, error: true });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, reload: load };
}
