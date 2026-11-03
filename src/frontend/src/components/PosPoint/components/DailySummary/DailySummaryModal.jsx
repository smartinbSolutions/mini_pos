import { useCallback, useEffect, useState } from "react";
import { X, ArrowRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import TodayInvoicesList from "./TodayInvoicesList";
import InvoiceDetailsModal from "./InvoiceDetailsModal";
import InvoiceReturnModal from "./InvoiceReturnModal";
import ReturnInvoiceDetails from "./ReturnInvoiceDetails";
import { toLocalDate } from "../../../../Global/useSalesSummary";
import { normalizeDigits } from "../../../../Global/FormatNumber";

// Upper bound when a filter needs the full day at once (a single
// shop-day of POS invoices stays far below this).
const WHOLE_DAY_LIMIT = 1000;

// Arabic digits → 0-9; for a number-like query ("#1,250") also drop the
// "#" and separators. Product names are passed through as typed.
function cleanQuery(query) {
  const q = normalizeDigits(query.trim());
  return /^[#\d.,\s]+$/.test(q) ? q.replace(/[#,\s]/g, "") : q;
}

export default function DailySummaryModal({
  isOpen,
  onClose,
  t,
  money,
  funds,
}) {
  const api = window.api;
  const { i18n } = useTranslation();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceMode, setInvoiceMode] = useState("view");

  const [invoices, setInvoices] = useState([]);
  const [salesInvoicesItem, setSalesInvoicesItem] = useState([]);
  const [stats, setStats] = useState(null);

  const [filter, setFilter] = useState("all"); // all | sale | return
  const [date, setDate] = useState(() => toLocalDate());
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // The report API only filters by day, so type/search filtering happens
  // here — load the whole day while one is active, otherwise matches on
  // other pages would be missed.
  const filtering = filter !== "all" || search.trim() !== "";

  // Search runs in the database (products aren't in the list rows), so
  // wait until typing pauses before asking.
  const [appliedSearch, setAppliedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setAppliedSearch(cleanQuery(search)), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiNotAvailable"));
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await api.getDailyPosReport({
        date,
        search: appliedSearch,
        page: filtering ? 1 : page,
        limit: filtering ? WHOLE_DAY_LIMIT : limit,
      });

      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setInvoices(res?.data || []);
      setStats(res?.stats || null);
    } catch (err) {
      console.error(err);
      setError(err?.message || t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, date, appliedSearch, filtering, page, limit, t]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedInvoice(null);
      setInvoiceMode("view");
      setSalesInvoicesItem([]);
      setInvoices([]);
      setStats(null);
      setFilter("all");
      setDate(toLocalDate());
      setSearch("");
      setPage(1);
      setTotal(0);
      setTotalPages(1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      refetch();
    }
  }, [isOpen, refetch]);

  const handleSelectSalesInvoice = async (select, mode = "view") => {
    setSelectedInvoice(select);
    setInvoiceMode(select.type === "return" ? "view" : mode);

    try {
      setDetailsLoading(true);

      if (select.type === "return") {
        const data = await api.getSalesReturnById(select.id);
        setSalesInvoicesItem(data?.items || data || []);
        // Same gap as the sale branch below — `select` is the summary row
        // from getDailyPosReport, the full return record (with its own
        // tax/discount detail) only exists in `data`. Merge it in.
        setSelectedInvoice((prev) => ({ ...prev, ...data }));
        return;
      }

      const data = await api.getSalesInvoiceById(select.id);
      setSalesInvoicesItem(data?.items || data || []);
      // getDailyPosReport's row (`select`) is a summary shape only — it has
      // no `taxes`/`discount_rate`. The detailed fetch above is the only
      // place those live, so merge it in rather than discarding everything
      // but .items — otherwise every tax/discount row downstream (in
      // InvoiceReturnModal's summary) computes to zero even though the
      // invoice total clearly includes them.
      setSelectedInvoice((prev) => ({ ...prev, ...data }));
    } catch (err) {
      console.error("Error fetching invoice details:", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleBackToList = () => {
    setSelectedInvoice(null);
    setInvoiceMode("view");
    setSalesInvoicesItem([]);
  };

  if (!isOpen) return null;

  const dayLabel = new Date(`${date}T00:00:00`).toLocaleDateString(
    i18n.language,
    { weekday: "long", month: "short", day: "numeric" },
  );

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-white animate-fade-in">
      <div className="flex h-screen w-full flex-col overflow-hidden">
        {/* HEADER */}
        <div className="shrink-0 flex items-center justify-between border-b border-stone-200 px-6 py-4">
          <div className="flex items-center gap-3">
            {selectedInvoice && (
              <button
                onClick={handleBackToList}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-600 transition hover:bg-stone-200 active:scale-95"
              >
                <ArrowRight size={18} className="rtl:rotate-0 ltr:rotate-180" />
              </button>
            )}

            <div>
              <h2 className="text-lg font-black text-stone-950">
                {selectedInvoice
                  ? selectedInvoice.type === "return"
                    ? `${t("screens.pos.returnDetails", "تفاصيل المرتجع")} #${selectedInvoice.id || selectedInvoice.invoice_number}`
                    : invoiceMode === "return"
                      ? `${t("screens.pos.invoiceReturnProcess", "إرجاع من الفاتورة")} #${selectedInvoice.id || selectedInvoice.invoice_number}`
                      : `${t("screens.pos.invoiceDetails", "تفاصيل الفاتورة")} #${selectedInvoice.id || selectedInvoice.invoice_number}`
                  : date === toLocalDate()
                    ? t("simple.daily.title")
                    : t("simple.daily.titleOn", { date: dayLabel })}
              </h2>

              <p className="text-sm text-stone-500">{dayLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-600 transition hover:bg-stone-200 active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-h-0">
          {!selectedInvoice ? (
            <TodayInvoicesList
              loading={loading}
              error={error}
              invoices={invoices}
              stats={stats}
              filter={filter}
              setFilter={setFilter}
              date={date}
              setDate={(next) => {
                setDate(next);
                setPage(1);
              }}
              search={search}
              setSearch={setSearch}
              filtering={filtering}
              onSelectInvoice={handleSelectSalesInvoice}
              money={money}
              t={t}
              page={page}
              setPage={setPage}
              total={total}
              totalPages={totalPages}
              limit={limit}
              setLimit={setLimit}
              onClose={onClose}
            />
          ) : detailsLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 text-xs font-semibold text-stone-500">
                {t("screens.pos.fetchingItems", "جاري جلب المنتجات...")}
              </p>
            </div>
          ) : selectedInvoice.type === "return" ? (
            <ReturnInvoiceDetails
              selectedInvoice={selectedInvoice}
              items={salesInvoicesItem}
              money={money}
              t={t}
              onClose={onClose}
            />
          ) : invoiceMode === "return" ? (
            <InvoiceReturnModal
              selectedInvoice={selectedInvoice}
              salesInvoicesItem={salesInvoicesItem}
              funds={funds}
              money={money}
              t={t}
              onClose={onClose}
              onSuccess={() => {
                handleBackToList();
                refetch();
              }}
            />
          ) : (
            <InvoiceDetailsModal
              selectedInvoice={selectedInvoice}
              salesInvoicesItem={salesInvoicesItem}
              money={money}
              t={t}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
