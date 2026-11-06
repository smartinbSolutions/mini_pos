import React from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

const LIMIT_OPTIONS = [5, 10, 20, 50, 100];

// Shared pagination matching POSPagination's clear, touch-friendly style:
// Previous / Page X of Y / Next.
// Also supports limit selector when onLimitChange is passed.
export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}) {
  const { t } = useTranslation();

  if (!total && totalPages <= 1) return null;

  const prevText = t("simple.pos.prevPage", "Previous");
  const nextText = t("simple.pos.nextPage", "Next");
  const pageOfText = t("simple.pos.pageOf", {
    page,
    total: totalPages,
    defaultValue: `Page ${page} of ${totalPages}`,
  });

  return (
    <nav
      aria-label={t("simple.pos.pages", "Pages")}
      className="flex flex-col gap-3 border-t-2 border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-ink-muted">
              {t("common.perPage", "Per page")}
            </span>
            <select
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              aria-label={t("common.perPage", "Per page")}
              className="h-11 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-bold text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-100"
            >
              {LIMIT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:flex sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="ui-btn ui-btn-soft min-h-[48px] px-4 disabled:hover:border-slate-200 disabled:hover:bg-white"
          >
            <ChevronLeft size={20} className="rtl:rotate-180" />
            <span>{prevText}</span>
          </button>

          <p
            aria-live="polite"
            className="px-2 text-center text-base font-black text-ink whitespace-nowrap"
          >
            {pageOfText}
          </p>

          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="ui-btn ui-btn-soft min-h-[48px] px-4 disabled:hover:border-slate-200 disabled:hover:bg-white"
          >
            <span>{nextText}</span>
            <ChevronLeft size={20} className="rotate-180 rtl:rotate-0" />
          </button>
        </div>
      )}
    </nav>
  );
}
