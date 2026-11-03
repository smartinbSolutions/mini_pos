import { ChevronLeft } from "lucide-react";

// Page footer for the sales screen, kept to three things: Previous,
// "Page 1 of 2", Next. Docked to the bottom edge (not floating over the
// products) and hidden when everything fits on one page.
export default function POSPagination({
  t,
  page,
  totalPages,
  onPageChange,
}) {
  if (totalPages <= 1) return null;

  const button =
    "ui-btn ui-btn-soft w-full min-h-[52px] px-3 disabled:hover:border-slate-200 disabled:hover:bg-white";

  return (
    <nav
      aria-label={t("simple.pos.pages")}
      className="sticky bottom-[6.25rem] z-10 -mx-4 mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t-2 border-slate-200 bg-white px-4 py-2.5 lg:-mb-4 lg:bottom-0"
    >
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className={button}
      >
        <ChevronLeft size={22} className="rtl:rotate-180" />
        {t("simple.pos.prevPage")}
      </button>

      <p
        aria-live="polite"
        className="px-2 text-center text-lg font-black text-ink"
      >
        {t("simple.pos.pageOf", { page, total: totalPages })}
      </p>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className={button}
      >
        {t("simple.pos.nextPage")}
        <ChevronLeft size={22} className="rotate-180 rtl:rotate-0" />
      </button>
    </nav>
  );
}
