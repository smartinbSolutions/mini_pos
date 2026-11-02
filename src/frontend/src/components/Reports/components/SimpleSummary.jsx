import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BarChart3, FileText, Package, TrendingUp } from "lucide-react";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import useSalesSummary, { periodRange } from "../../../Global/useSalesSummary";
import { formatNumber } from "../../../Global/FormatNumber";
import SalesSummaryCards from "../../../Global/ui/SalesSummaryCards";
import EmptyState from "../../../Global/ui/EmptyState";

const PERIODS = ["today", "week", "month"];

export default function SimpleSummary() {
  const { t } = useTranslation();
  const { money } = usePrimaryCurrency();
  const [period, setPeriod] = useState("today");

  const range = useMemo(() => periodRange(period), [period]);
  const summary = useSalesSummary(range);
  const top = summary.topProducts || [];
  const topMax = Math.max(1, ...top.map((p) => Number(p.quantity || 0)));

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-ink sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <h1 className="flex items-center gap-3 text-3xl font-black">
            <BarChart3 size={34} className="text-brand" />
            {t("simple.summary.title")}
          </h1>
          <p className="mt-1 text-lg text-ink-muted">
            {t("simple.summary.subtitle")}
          </p>
        </header>

        {/* PERIOD */}
        <div
          role="radiogroup"
          className="grid grid-cols-3 gap-1.5 rounded-2xl bg-white p-1.5 shadow-sm sm:inline-grid"
        >
          {PERIODS.map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={period === key}
              onClick={() => setPeriod(key)}
              className={`min-h-[52px] rounded-xl px-5 text-lg font-bold transition ${
                period === key
                  ? "bg-brand text-white shadow"
                  : "text-ink-soft hover:bg-slate-100"
              }`}
            >
              {t(`simple.summary.${key}`)}
            </button>
          ))}
        </div>

        <SalesSummaryCards summary={summary} money={money} />

        {/* BEST SELLERS */}
        {!summary.error && (
          <section className="ui-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
              <TrendingUp size={24} className="text-ok" />
              {t("simple.summary.topProducts")}
            </h2>
            {summary.loading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : top.length === 0 ? (
              <EmptyState icon={Package} title={t("simple.summary.noSales")} />
            ) : (
              <ol className="space-y-4">
                {top.map((product, index) => (
                  <li key={product.product_id ?? product.name}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-lg">
                      <span className="flex min-w-0 items-center gap-3 font-bold">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base">
                          {index + 1}
                        </span>
                        <span className="truncate">{product.name}</span>
                      </span>
                      <span className="shrink-0 text-base font-bold text-ink-muted">
                        {t("simple.summary.pieces", {
                          count: formatNumber(product.quantity, 2),
                        })}{" "}
                        · <span dir="ltr">{money(product.revenue)}</span>
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-ok"
                        style={{
                          width: `${(Number(product.quantity || 0) / topMax) * 100}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* DETAILED REPORTS */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-ink-soft">
            {t("simple.summary.detailedReports")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link to="/reports/sales" className="ui-btn ui-btn-soft justify-start">
              <FileText size={20} />
              {t("navigation.salesReport")}
            </Link>
            <Link
              to="/reports/profit-loss"
              className="ui-btn ui-btn-soft justify-start"
            >
              <FileText size={20} />
              {t("navigation.profitLoss")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
