import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const TONES = {
  ok: "bg-ok-50 text-ok-700",
  brand: "bg-brand-50 text-brand-700",
  warn: "bg-warn-50 text-warn-700",
  danger: "bg-danger-50 text-danger-700",
  slate: "bg-slate-100 text-ink-soft",
};

const TREND = {
  up: { Icon: TrendingUp, className: "bg-ok-50 text-ok-700" },
  down: { Icon: TrendingDown, className: "bg-danger-50 text-danger-700" },
  same: { Icon: Minus, className: "bg-slate-100 text-ink-soft" },
};

// A big number with a plain question/label above it. `trend` is
// { direction: "up" | "down" | "same", text } — arrow + words, not colour alone.
export default function StatCard({
  icon: Icon,
  label,
  value,
  note,
  trend,
  tone = "brand",
  loading = false,
}) {
  const trendStyle = trend ? TREND[trend.direction] || TREND.same : null;

  return (
    <div className="ui-card flex h-full items-start gap-4 p-5">
      {Icon && (
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${TONES[tone]}`}
        >
          <Icon size={28} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-base font-bold text-ink-muted">{label}</p>
        {loading ? (
          <div className="mt-2 h-9 w-32 animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <p className="mt-1 truncate text-3xl font-black tabular-nums text-ink">
            <span dir="ltr">{value}</span>
          </p>
        )}
        {!loading && trendStyle && (
          <p
            className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${trendStyle.className}`}
          >
            <trendStyle.Icon size={16} className="shrink-0" />
            {trend.text}
          </p>
        )}
        {note && !loading && (
          <p className="mt-1 text-sm font-semibold text-ink-muted">{note}</p>
        )}
      </div>
    </div>
  );
}
