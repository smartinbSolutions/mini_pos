import { Banknote, Coins, Package, ReceiptText, RefreshCw, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import StatCard from "./StatCard";
import { formatNumber } from "../FormatNumber";

// "12% more than yesterday" — or nothing, when there is no fair comparison.
function getTrend(summary, t) {
  if (!summary.compare || summary.prevSold === null || summary.prevSold === undefined) {
    return null;
  }
  const { sold, prevSold } = summary;
  if (prevSold <= 0) {
    return sold > 0 ? { direction: "same", text: t("simple.compare.none") } : null;
  }

  const pct = ((sold - prevSold) / prevSold) * 100;
  if (Math.abs(pct) < 0.5) {
    return { direction: "same", text: t("simple.compare.same") };
  }

  const than = t(`simple.compare.${summary.compare}`);
  const shown = Math.round(Math.abs(pct));
  return pct > 0
    ? { direction: "up", text: t("simple.compare.up", { pct: shown, than }) }
    : { direction: "down", text: t("simple.compare.down", { pct: shown, than }) };
}

// The few plain questions a shop owner asks, answered with one big number
// each. `labels` lets the home page say "today".
//
// Layout: money cards share the first row, the two counts the second, on a
// 6-column grid so a row is never left with one lonely card.
export default function SalesSummaryCards({ summary, money, labels = {} }) {
  const { t } = useTranslation();
  const { loading, error, reload } = summary;
  const trend = getTrend(summary, t);

  if (error) {
    return (
      <div
        role="alert"
        className="ui-card flex flex-wrap items-center justify-between gap-3 border-danger-100 bg-danger-50 p-5"
      >
        <p className="text-lg font-bold text-danger-700">
          {t("simple.summary.loadError")}
        </p>
        <button type="button" onClick={reload} className="ui-btn ui-btn-soft">
          <RefreshCw size={20} />
          {t("simple.summary.tryAgain")}
        </button>
      </div>
    );
  }

  const showReceived = summary.received !== null && summary.received !== undefined;
  // static class names so Tailwind keeps them
  const moneySpan = showReceived ? "lg:col-span-2" : "lg:col-span-3";
  const countSpan = "lg:col-span-3";
  // with five cards the last one fills the row on two-column screens
  const lastSpan = showReceived ? "sm:col-span-2 lg:col-span-3" : countSpan;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
      <div className={moneySpan}>
        <StatCard
          icon={Coins}
          tone="ok"
          loading={loading}
          label={labels.sold || t("simple.summary.howMuchSold")}
          value={money(summary.sold)}
          trend={trend}
          note={
            summary.returns > 0
              ? t("simple.summary.returnsNote", { amount: money(summary.returns) })
              : null
          }
        />
      </div>
      {showReceived && (
        <div className={moneySpan}>
          <StatCard
            icon={Banknote}
            tone="ok"
            loading={loading}
            label={t("simple.summary.howMuchReceived")}
            value={money(summary.received)}
            note={t("simple.summary.receivedNote")}
          />
        </div>
      )}
      <div className={moneySpan}>
        <StatCard
          icon={TrendingUp}
          tone={summary.profit < 0 ? "danger" : "brand"}
          loading={loading}
          label={labels.profit || t("simple.summary.howMuchProfit")}
          value={money(summary.profit)}
          note={t("simple.summary.profitNote")}
        />
      </div>
      <div className={countSpan}>
        <StatCard
          icon={ReceiptText}
          tone="slate"
          loading={loading}
          label={labels.count || t("simple.summary.howManySales")}
          value={formatNumber(summary.count, 0)}
        />
      </div>
      <div className={lastSpan}>
        <StatCard
          icon={Package}
          tone="warn"
          loading={loading}
          label={labels.items || t("simple.summary.howManyItems")}
          value={formatNumber(summary.items, 2)}
        />
      </div>
    </div>
  );
}
