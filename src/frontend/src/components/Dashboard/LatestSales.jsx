import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Receipt,
  RotateCcw,
} from "lucide-react";
import EmptyState from "../../Global/ui/EmptyState";

// Sales dates are stored as "YYYY-MM-DD HH:MM:SS" (POS) or just a date.
function parseWhen(value) {
  if (!value) return null;
  const text = String(value).trim();
  const hasTime = text.length > 10;
  const date = new Date(hasTime ? text.replace(" ", "T") : `${text}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : { date, hasTime };
}

function whenLabel(value, lang) {
  const parsed = parseWhen(value);
  if (!parsed) return "";
  const { date, hasTime } = parsed;
  const sameDay = date.toDateString() === new Date().toDateString();

  if (sameDay && hasTime) {
    return date.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
  }
  const day = date.toLocaleDateString(lang, { day: "numeric", month: "short" });
  return hasTime
    ? `${day} · ${date.toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" })}`
    : day;
}

const STATUS = {
  paid: { Icon: CheckCircle2, className: "bg-ok-50 text-ok-700", key: "latest.paid" },
  partial: { Icon: Clock, className: "bg-warn-50 text-warn-700", key: "latest.partial" },
  unpaid: { Icon: Clock, className: "bg-warn-50 text-warn-700", key: "latest.unpaid" },
};

// The last few invoices from every channel, one tap from the full view.
//   sales: array | null (null = still loading)
export default function LatestSales({ sales, money }) {
  const { t, i18n } = useTranslation();
  const Arrow = i18n.dir() === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <section className="ui-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Receipt size={24} className="text-brand" />
          {t("simple.latest.title")}
        </h2>
        <Link
          to="/sales"
          className="inline-flex items-center gap-1.5 text-base font-bold text-brand-700 hover:underline"
        >
          {t("simple.latest.all")}
          <Arrow size={18} />
        </Link>
      </div>

      {sales === null ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : sales.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t("simple.latest.empty")}
          hint={t("simple.latest.emptyHint")}
        />
      ) : (
        <ul className="space-y-2.5">
          {sales.map((sale) => {
            const status = STATUS[sale.status] || STATUS.paid;
            const returned =
              sale.return_status === "full"
                ? t("simple.latest.returnedFull")
                : sale.return_status === "partial"
                  ? t("simple.latest.returnedPartial")
                  : null;
            const owes = Number(sale.remaining_amount || 0);

            return (
              <li key={sale.id}>
                <Link
                  to={`/view-sales/${sale.id}`}
                  className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-3 transition hover:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-black text-ink">
                        #{sale.invoice_name || sale.id}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold ${status.className}`}
                      >
                        <status.Icon size={14} className="shrink-0" />
                        {t(`simple.${status.key}`)}
                      </span>
                      {returned && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger-50 px-2.5 py-0.5 text-sm font-bold text-danger-700">
                          <RotateCcw size={14} className="shrink-0" />
                          {returned}
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-sm font-semibold text-ink-muted">
                      {whenLabel(sale.date, i18n.language)}
                      {" · "}
                      {sale.customer_name || t("simple.latest.walkIn")}
                      {sale.status !== "paid" && owes > 0 && (
                        <>
                          {" · "}
                          {t("simple.latest.remaining")}{" "}
                          <span dir="ltr">{money(owes)}</span>
                        </>
                      )}
                    </span>
                  </span>

                  <span className="shrink-0 text-lg font-black tabular-nums text-ink">
                    <span dir="ltr">{money(sale.net_total || 0)}</span>
                  </span>
                  <span className="shrink-0 text-base font-bold text-brand-700">
                    {t("simple.latest.view")}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
