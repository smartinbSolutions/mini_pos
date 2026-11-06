import React, { useState } from "react";
import { RefreshCw, Search, Filter, X, SlidersHorizontal } from "lucide-react";
import NumberInput from "./NumberInput";
import SearchableSelect from "./SearchableSelect";
import { useTranslation } from "react-i18next";

const VARIANTS = {
  blue: {
    border: "border-brand-100",
    bg: "bg-brand-50/50",
    icon: "text-brand-600",
    value: "text-ink",
  },
  amber: {
    border: "border-warn-100",
    bg: "bg-warn-50/50",
    icon: "text-warn-600",
    value: "text-ink",
  },
  violet: {
    border: "border-purple-100",
    bg: "bg-purple-50/50",
    icon: "text-purple-600",
    value: "text-ink",
  },
  brand: {
    border: "border-brand-100",
    bg: "bg-brand-50",
    icon: "text-brand-600",
    value: "text-brand-700",
  },
};

function isFieldActive(rawValue) {
  if (Array.isArray(rawValue)) return rawValue.length > 0;
  return rawValue !== null && rawValue !== undefined && rawValue !== "";
}

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
  filters,
  onFilterChange,
  onClearFilters,
  filterFields = [],
  clearLabel,
  extraActions,
}) {
  const { t } = useTranslation();
  const [showFilters, setShowFilters] = useState(false);

  const gridColsClass =
    stats.length >= 4
      ? "grid-cols-4"
      : stats.length === 3
        ? "grid-cols-3"
        : "grid-cols-2";

  const activeEntries = filterFields
    .map((field) => {
      const rawValue = filters?.[field.name];
      if (!isFieldActive(rawValue)) return null;

      let displayValue = rawValue;

      if (field.type === "select") {
        const match = field.options.find(
          (opt) => String(opt.value) === String(rawValue),
        );
        displayValue = match?.label ?? rawValue;
      }

      if (field.type === "search") {
        displayValue = field.selectedLabel || rawValue;
      }

      if (field.type === "multiselect") {
        const selectedLabels = (rawValue || []).map((v) => {
          const match = field.options.find(
            (opt) => String(opt.value) === String(v),
          );
          return match?.label ?? v;
        });
        displayValue =
          selectedLabels.length > 2
            ? `${selectedLabels.slice(0, 2).join(", ")} +${selectedLabels.length - 2}`
            : selectedLabels.join(", ");
      }

      return {
        name: field.name,
        label: field.label,
        value: displayValue,
        isMultiselect: field.type === "multiselect",
        onClear: field.onClear,
      };
    })
    .filter(Boolean);

  const hasActiveFilters = activeEntries.length > 0;

  const filterGridColsClass =
    filterFields.length >= 5
      ? "md:grid-cols-3 lg:grid-cols-5"
      : filterFields.length === 4
        ? "md:grid-cols-2 lg:grid-cols-4"
        : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-4 p-5 lg:grid-cols-2 lg:items-center">
        <div>
          {badgeLabel && (
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1">
              {BadgeIcon && <BadgeIcon size={14} className="text-brand" />}
              <span className="text-sm font-bold text-brand">
                {badgeLabel}
              </span>
            </div>
          )}
          <h1 className="text-2xl font-black leading-tight text-ink">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 max-w-md text-sm leading-6 text-ink-muted">
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
                className={`rounded-2xl border ${variant.border} ${variant.bg} p-3`}
              >
                {StatIcon ? (
                  <StatIcon size={16} className={`mb-1.5 ${variant.icon}`} />
                ) : (
                  <div
                    className={`mb-1.5 text-sm font-bold ${variant.icon}`}
                  >
                    {stat.eyebrow}
                  </div>
                )}
                <div
                  className={`text-lg font-black tabular-nums ${variant.value}`}
                >
                  {stat.value}
                </div>
                <div className="text-sm font-semibold text-ink-muted">
                  {stat.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t-2 border-slate-100 bg-slate-50/50 p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 rtl:left-auto rtl:right-3.5"
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="min-h-[48px] w-full rounded-2xl border-2 border-slate-200 bg-white px-4 pl-10 pr-4 text-base font-medium text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand-100 rtl:pl-4 rtl:pr-10"
            placeholder={searchPlaceholder}
          />
        </div>

        {filterFields.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFilters((prev) => !prev)}
            aria-label={t("ui.filters", "Filters")}
            className={`inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-2xl border-2 px-4 text-sm font-bold transition ${
              showFilters || hasActiveFilters
                ? "border-brand bg-brand-50 text-brand"
                : "border-slate-200 bg-white text-ink-soft hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={18} />
            <span className="hidden sm:inline">{t("ui.filters", "Filters")}</span>
            {hasActiveFilters && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand text-sm font-black text-white">
                {activeEntries.length}
              </span>
            )}
          </button>
        )}

        {extraActions}

        <button
          type="button"
          onClick={onRefresh}
          aria-label={t("common.refresh", "Refresh")}
          className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-bold text-ink-soft transition hover:bg-slate-50 hover:text-ink"
        >
          <RefreshCw size={18} />
        </button>

        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="ui-btn ui-btn-brand min-h-[48px] px-5"
          >
            {AddIcon && <AddIcon size={18} />}
            <span>{addLabel}</span>
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 border-t-2 border-slate-100 bg-white px-4 py-3">
          <Filter size={16} className="shrink-0 text-slate-400" />
          {activeEntries.map((entry) => (
            <span
              key={entry.name}
              className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-ink shadow-sm"
            >
              <span className="text-ink-muted">{entry.label}:</span>
              <span className="font-bold text-brand">{entry.value}</span>
              <button
                type="button"
                onClick={() => {
                  onFilterChange(entry.name, entry.isMultiselect ? [] : "");
                  entry.onClear?.();
                }}
                className="ms-1 flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 transition hover:bg-danger-50 hover:text-danger"
              >
                <X size={14} />
              </button>
            </span>
          ))}

          {onClearFilters && (
            <button
              type="button"
              onClick={onClearFilters}
              className="ms-2 inline-flex min-h-[36px] items-center gap-1 text-sm font-bold text-danger transition hover:underline"
            >
              <X size={14} />
              {clearLabel || t("common.clear")}
            </button>
          )}
        </div>
      )}

      {showFilters && filterFields.length > 0 && (
        <div
          className={`grid grid-cols-1 gap-3.5 border-t-2 border-slate-100 bg-slate-50/70 p-4 sm:grid-cols-2 ${filterGridColsClass}`}
        >
          {filterFields.map((field) => {
            const isActive = isFieldActive(filters?.[field.name]);

            const fieldWrapperClass = "flex flex-col gap-1.5";
            const labelClass = `text-sm font-bold ${
              isActive ? "text-brand" : "text-ink-soft"
            }`;
            const inputBaseClass = `min-h-[48px] rounded-2xl border-2 bg-white px-3 text-sm font-semibold outline-none transition focus:ring-4 focus:ring-brand-100 ${
              isActive
                ? "border-brand bg-brand-50/30 text-ink"
                : "border-slate-200 text-ink focus:border-brand"
            }`;

            if (field.type === "date") {
              return (
                <div key={field.name} className={fieldWrapperClass}>
                  <label className={labelClass}>{field.label}</label>
                  <input
                    type="date"
                    value={filters?.[field.name] || ""}
                    onChange={(e) => onFilterChange(field.name, e.target.value)}
                    className={inputBaseClass}
                  />
                </div>
              );
            }

            if (field.type === "number") {
              return (
                <div key={field.name} className={fieldWrapperClass}>
                  <label className={labelClass}>{field.label}</label>
                  <NumberInput
                    value={filters?.[field.name] ?? ""}
                    onChange={(val) => onFilterChange(field.name, val)}
                    placeholder="0"
                    className={inputBaseClass}
                  />
                </div>
              );
            }

            if (field.type === "search") {
              return (
                <div key={field.name} className={fieldWrapperClass}>
                  <label className={labelClass}>{field.label}</label>
                  <SearchableSelect
                    placeholder={field.placeholder || field.label}
                    options={field.options || []}
                    selectedValue={filters?.[field.name] || ""}
                    selectedLabel={field.selectedLabel}
                    onChange={(option) => {
                      onFilterChange(field.name, option.id);
                      field.onSelect?.(option);
                    }}
                    onInputChange={field.onInputChange}
                  />
                </div>
              );
            }

            if (field.type === "multiselect") {
              const selectedValues = filters?.[field.name] || [];

              const selectedOptions = selectedValues
                .map((v) =>
                  field.options.find((opt) => String(opt.value) === String(v)),
                )
                .filter(Boolean);

              const addOption = (optionValue) => {
                if (!optionValue) return;
                const exists = selectedValues.some(
                  (v) => String(v) === String(optionValue),
                );
                if (exists) return;
                onFilterChange(field.name, [...selectedValues, optionValue]);
              };

              const removeOption = (optionValue) => {
                onFilterChange(
                  field.name,
                  selectedValues.filter(
                    (v) => String(v) !== String(optionValue),
                  ),
                );
              };

              return (
                <div key={field.name} className={fieldWrapperClass}>
                  <label className={labelClass}>{field.label}</label>
                  <div
                    className={`flex min-h-[48px] flex-wrap items-center gap-1.5 rounded-2xl border-2 bg-white px-2 py-1.5 ${
                      isActive
                        ? "border-brand bg-brand-50/20"
                        : "border-slate-200"
                    }`}
                  >
                    {selectedOptions.map((opt) => (
                      <span
                        key={opt.value}
                        className="inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded-xl border border-brand-100 bg-brand-50 px-2.5 py-0.5 text-sm font-bold text-brand"
                      >
                        {opt.label}
                        <button
                          type="button"
                          onClick={() => removeOption(opt.value)}
                          className="flex h-5 w-5 items-center justify-center rounded-lg text-brand/70 transition hover:bg-white hover:text-danger"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}

                    <select
                      value=""
                      onChange={(e) => addOption(e.target.value)}
                      className="min-h-[36px] min-w-[6rem] flex-1 rounded-xl border-none bg-transparent px-2 text-sm font-semibold text-ink-muted outline-none focus:ring-0"
                    >
                      <option value="">
                        {selectedOptions.length > 0
                          ? "+"
                          : field.allLabel || field.label}
                      </option>
                      {field.options
                        .filter(
                          (opt) =>
                            !selectedValues.some(
                              (v) => String(v) === String(opt.value),
                            ),
                        )
                        .map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              );
            }

            return (
              <div key={field.name} className={fieldWrapperClass}>
                <label className={labelClass}>{field.label}</label>
                <select
                  value={filters?.[field.name] || ""}
                  onChange={(e) => onFilterChange(field.name, e.target.value)}
                  className={inputBaseClass}
                >
                  <option value="">{field.allLabel || field.label}</option>
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
