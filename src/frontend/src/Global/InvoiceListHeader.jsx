import React, { useState } from "react";
import { RefreshCw, Search, Filter, X } from "lucide-react";

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
  // Filter support — generic so Expense/Purchase/Sales can each pass their own fields
  filters,
  onFilterChange,
  onClearFilters,
  filterFields = [],
  clearLabel = "Clear",
}) {
  const [showFilters, setShowFilters] = useState(false);

  const gridColsClass =
    stats.length >= 4
      ? "grid-cols-4"
      : stats.length === 3
        ? "grid-cols-3"
        : "grid-cols-2";

  const hasActiveFilters =
    filters &&
    Object.values(filters).some(
      (v) => v !== null && v !== undefined && v !== ""
    );

  const filterGridColsClass =
    filterFields.length >= 5
      ? "md:grid-cols-3 lg:grid-cols-5"
      : filterFields.length === 4
        ? "md:grid-cols-2 lg:grid-cols-4"
        : "md:grid-cols-2 lg:grid-cols-3";

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

        {filterFields.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition ${
                showFilters || hasActiveFilters
                  ? "border-[#4663ff] bg-[#eef3ff] text-[#4663ff]"
                  : "border-[#dbe4ff] bg-white text-slate-600 hover:bg-[#eef3ff] hover:text-[#4663ff]"
              }`}
            >
              <Filter size={16} />
              {hasActiveFilters && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4663ff] text-[10px] font-black text-white">
                  {
                    Object.values(filters).filter(
                      (v) => v !== null && v !== undefined && v !== ""
                    ).length
                  }
                </span>
              )}
            </button>

            {hasActiveFilters && onClearFilters && (
              <button
                onClick={onClearFilters}
                className="inline-flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
              >
                <X size={14} />
                {clearLabel}
              </button>
            )}
          </div>
        )}

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

      {showFilters && filterFields.length > 0 && (
        <div
          className={`grid grid-cols-2 gap-3 border-t border-[#e5ebff] bg-white/60 p-5 ${filterGridColsClass}`}
        >
          {filterFields.map((field) => {
            if (field.type === "date") {
              return (
                <input
                  key={field.name}
                  type="date"
                  value={filters?.[field.name] || ""}
                  onChange={(e) => onFilterChange(field.name, e.target.value)}
                  placeholder={field.label}
                  className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
                />
              );
            }

            // select
            return (
              <select
                key={field.name}
                value={filters?.[field.name] || ""}
                onChange={(e) => onFilterChange(field.name, e.target.value)}
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              >
                <option value="">{field.label}</option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            );
          })}
        </div>
      )}
    </section>
  );
}
