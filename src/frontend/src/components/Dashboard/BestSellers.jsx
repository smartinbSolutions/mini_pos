import { useTranslation } from "react-i18next";
import { Package, Trophy } from "lucide-react";
import EmptyState from "../../Global/ui/EmptyState";

const SHOWN = 3;

// Today's top products by quantity sold. `summary` is the object from
// useSalesSummary — the data is already loaded for the number cards.
export default function BestSellers({ summary, money }) {
  const { t } = useTranslation();
  const top = (summary.topProducts || []).slice(0, SHOWN);
  const max = Math.max(1, ...top.map((product) => Number(product.quantity || 0)));

  return (
    <section className="ui-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
        <Trophy size={24} className="text-warn" />
        {t("simple.best.title")}
      </h2>

      {summary.loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : summary.error || top.length === 0 ? (
        <EmptyState icon={Package} title={t("simple.best.empty")} />
      ) : (
        <ol className="space-y-4">
          {top.map((product, index) => (
            <li key={product.product_id ?? product.name}>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <span className="flex min-w-0 items-center gap-3 text-base font-bold">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-warn-50 text-base font-black text-warn-700">
                    {index + 1}
                  </span>
                  <span className="truncate">{product.name}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-ink-muted">
                  {t("simple.summary.pieces", {
                    count: Number(product.quantity || 0),
                  })}
                  {" · "}
                  <span dir="ltr">{money(product.revenue)}</span>
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-ok"
                  style={{
                    width: `${(Number(product.quantity || 0) / max) * 100}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
