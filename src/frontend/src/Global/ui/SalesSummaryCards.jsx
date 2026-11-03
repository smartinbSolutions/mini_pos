import { Banknote, Coins, Package, ReceiptText, RefreshCw, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import StatCard from "./StatCard";
import { formatNumber } from "../FormatNumber";

// The four (or five) plain questions a shop owner asks, answered with
// one big number each. `labels` lets the home page say "today".
export default function SalesSummaryCards({ summary, money, labels = {} }) {
  const { t } = useTranslation();
  const { loading, error, reload } = summary;

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

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Coins}
        tone="ok"
        loading={loading}
        label={labels.sold || t("simple.summary.howMuchSold")}
        value={money(summary.sold)}
        note={
          summary.returns > 0
            ? t("simple.summary.returnsNote", { amount: money(summary.returns) })
            : null
        }
      />
      <StatCard
        icon={TrendingUp}
        tone={summary.profit < 0 ? "danger" : "brand"}
        loading={loading}
        label={labels.profit || t("simple.summary.howMuchProfit")}
        value={money(summary.profit)}
        note={t("simple.summary.profitNote")}
      />
      <StatCard
        icon={ReceiptText}
        tone="slate"
        loading={loading}
        label={labels.count || t("simple.summary.howManySales")}
        value={formatNumber(summary.count, 0)}
      />
      <StatCard
        icon={Package}
        tone="warn"
        loading={loading}
        label={labels.items || t("simple.summary.howManyItems")}
        value={formatNumber(summary.items, 2)}
      />
      {showReceived && (
        <StatCard
          icon={Banknote}
          tone="ok"
          loading={loading}
          label={t("simple.summary.howMuchReceived")}
          value={money(summary.received)}
          note={t("simple.summary.receivedNote")}
        />
      )}
    </div>
  );
}
