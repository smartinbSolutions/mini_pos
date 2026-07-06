import React from "react";
import { RefreshCw, Search } from "lucide-react";

const VARIANTS = {
  blue: {
    border: "border-[#e5ebff]",
    bg: "bg-[#f8faff]",
    icon: "text-[#4663ff]",
    value: "text-slate-950",
  },
  amber: {
    border: "border-amber-100",
    bg: "bg-amber-50/50",
    icon: "text-amber-600",
    value: "text-slate-950",
  },
  violet: {
    border: "border-violet-100",
    bg: "bg-violet-50/50",
    icon: "text-violet-600",
    value: "text-slate-950",
  },
  brand: {
    border: "border-[#4663ff]/20",
    bg: "bg-[#4663ff]/[0.06]",
    icon: "text-[#4663ff]",
    value: "text-[#4663ff]",
  },
};

export default function InvoiceListHeader({
  badgeLabel,
  badgeIcon: BadgeIcon,
  title,
  subtitle,
  stats = [],
  search,
  onSearchChange,
  searchPlaceholder,
  onRefresh,
  addLabel,
  addIcon: AddIcon,
  onAdd,
}) {
  const gridColsClass =
    stats.length >= 4
      ? "grid-cols-4"
      : stats.length === 3
        ? "grid-cols-3"
        : "grid-cols-2";

  return (
    <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
      <div className="grid gap-6 p-7 lg:grid-cols-[1fr_460px] lg:items-center">
        <div>
          {badgeLabel && (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-3 py-1">
              {BadgeIcon && <BadgeIcon size={12} className="text-[#4663ff]" />}
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                {badgeLabel}
              </span>
            </div>
          )}
          <h1 className="text-4xl font-black leading-tight text-slate-950">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`grid gap-2.5 ${gridColsClass}`}>
          {stats.map((stat, i) => {
            const variant = VARIANTS[stat.variant || "blue"];
            const StatIcon = stat.icon;
            return (
              <div
                key={i}
                className={`rounded-2xl border ${variant.border} ${variant.bg} px-3 py-3.5`}
              >
                {StatIcon ? (
                  <StatIcon size={16} className={`mb-2 ${variant.icon}`} />
                ) : (
                  <div className={`mb-2 text-xs font-black ${variant.icon}`}>
                    {stat.eyebrow}
                  </div>
                )}
                <div
                  className={`text-xl font-black tabular-nums ${variant.value}`}
                >
                  {stat.value}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#e5ebff] bg-white/60 p-5 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 pl-11 pr-4 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10"
            placeholder={searchPlaceholder}
          />
        </div>

        <button
          onClick={onRefresh}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-[#cbd7ff] hover:bg-[#eef3ff] hover:text-[#4663ff]"
        >
          <RefreshCw size={16} />
        </button>

        {onAdd && (
          <button
            onClick={onAdd}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4663ff] px-5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/25 transition hover:bg-[#3854e8]"
          >
            {AddIcon && <AddIcon size={16} />}
            {addLabel}
          </button>
        )}
      </div>
    </section>
  );
}
