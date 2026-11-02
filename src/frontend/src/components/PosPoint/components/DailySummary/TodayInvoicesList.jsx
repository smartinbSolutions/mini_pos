import { useState } from "react";
import {
  Receipt,
  RotateCcw,
  Eye,
  Calendar,
  User,
  Loader2,
  Wallet,
  TrendingDown,
  TrendingUp,
  ChevronDown,
  Search,
  X,
  CalendarDays,
  Package,
} from "lucide-react";
import Pagination from "../../../../Global/Pagination";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import ReturnStatusBadge from "../../../../Global/ReturnStatusBadge";
import { toLocalDate } from "../../../../Global/useSalesSummary";

const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDate(d);
};

export default function TodayInvoicesList({
  loading,
  error,
  invoices,
  stats,
  filter,
  setFilter,
  date,
  setDate,
  search,
  setSearch,
  filtering,
  onSelectInvoice,
  money,
  t,
  onClose,

  page,
  setPage,
  total,
  totalPages,
  limit,
  setLimit,
}) {
  const { primaryCurrency } = usePrimaryCurrency();
  const [fundsOpen, setFundsOpen] = useState(false);

  // search is applied by the database (it looks inside the products);
  // only the sale/return switch is applied here
  const filteredInvoices =
    filter === "all"
      ? invoices
      : invoices.filter((invoice) => invoice.type === filter);
  const today = toLocalDate();
  const dayChip = (active) =>
    `flex h-11 shrink-0 items-center gap-1.5 rounded-2xl px-4 text-base font-bold transition active:scale-95 ${
      active
        ? "bg-stone-900 text-white"
        : "bg-stone-100 text-stone-700 hover:bg-stone-200"
    }`;

  const salesCount = stats?.salesCount ?? 0;
  const salesTotal = stats?.salesTotal ?? 0;
  const salesTax = stats?.salesTax ?? 0;
  const returnCount = stats?.returnCount ?? 0;
  const returnTotal = stats?.returnTotal ?? 0;
  const returnTax = stats?.returnTax ?? 0;
  const netCollected = salesTotal - returnTotal;
  const fundIn = stats?.fundIn ?? [];
  const fundOut = stats?.fundOut ?? [];
  const hasFundData = fundIn.length > 0 || fundOut.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#f7f3ee]">
      {/* STATS — one slim bar, fund detail collapsed by default */}
      <div className="shrink-0 border-b border-stone-200 bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl bg-blue-50 px-3 py-1.5">
            <Receipt size={14} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-700/70">
              {salesCount}
            </span>
            <span className="text-sm font-black text-blue-800">
              {money(salesTotal)}
            </span>
            {salesTax > 0 && (
              <span className="text-[10px] font-semibold text-blue-500">
                ({t("ui.tax", "الضريبة")} {money(salesTax)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-1.5">
            <RotateCcw size={14} className="text-rose-600" />
            <span className="text-xs font-bold text-rose-700/70">
              {returnCount}
            </span>
            <span className="text-sm font-black text-rose-800">
              {money(returnTotal)}
            </span>
            {returnTax > 0 && (
              <span className="text-[10px] font-semibold text-rose-500">
                ({t("ui.tax", "الضريبة")} {money(returnTax)})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-stone-100 px-3 py-1.5">
            {netCollected >= 0 ? (
              <TrendingUp size={14} className="text-stone-600" />
            ) : (
              <TrendingDown size={14} className="text-stone-600" />
            )}
            <span className="text-xs font-bold text-stone-500">
              {t("simple.daily.net")}
            </span>
            <span className="text-sm font-black text-stone-950">
              {money(netCollected)}
            </span>
          </div>

          {hasFundData && (
            <button
              type="button"
              onClick={() => setFundsOpen((prev) => !prev)}
              className="ms-auto flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 active:scale-95"
            >
              <Wallet size={14} />
              {t("simple.daily.fundBreakdown")}
              <ChevronDown
                size={14}
                className={`transition-transform ${fundsOpen ? "rotate-180" : ""}`}
              />
            </button>
          )}
        </div>

        {/* FUND BREAKDOWN — collapsed by default */}
        {hasFundData && fundsOpen && (
          <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-stone-500">
                <Wallet size={13} />
                {t("simple.daily.fundIn")}
              </div>

              {fundIn.length > 0 ? (
                <div className="space-y-1.5">
                  {fundIn.map((fund) => (
                    <div
                      key={fund.fund_id}
                      className="flex items-center justify-between rounded-xl bg-blue-50/60 px-3 py-2"
                    >
                      <span className="truncate text-sm font-semibold text-stone-800">
                        {fund.fund_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-blue-700">
                          {money(fund.amount)}
                        </span>
                        {fund.currency_code !== primaryCurrency?.code && (
                          <>
                            <span className="text-stone-300">·</span>
                            <span className="text-xs font-semibold text-stone-500">
                              {Number(fund.fund_amount).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}{" "}
                              {fund.currency_symbol || fund.currency_code}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400">
                  {t("simple.daily.nothing")}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-stone-500">
                <Wallet size={13} />
                {t("simple.daily.fundOut")}
              </div>
              {fundOut.length > 0 ? (
                <div className="space-y-1.5">
                  {fundOut.map((fund) => (
                    <div
                      key={fund.fund_id}
                      className="flex items-center justify-between rounded-xl bg-rose-50/60 px-3 py-2"
                    >
                      <span className="truncate text-sm font-semibold text-stone-800">
                        {fund.fund_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-rose-700">
                          {money(fund.amount)}
                        </span>
                        {fund.currency_code !== primaryCurrency?.code && (
                          <>
                            <span className="text-stone-300">·</span>
                            <span className="text-xs font-semibold text-stone-500">
                              {Number(fund.fund_amount).toLocaleString(
                                undefined,
                                {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                },
                              )}{" "}
                              {fund.currency_symbol || fund.currency_code}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400">
                  {t("simple.daily.nothing")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DAY + SEARCH */}
      <div className="shrink-0 flex flex-wrap items-center gap-2 border-b border-stone-200 bg-white px-3 pt-3">
        <button
          type="button"
          onClick={() => setDate(today)}
          aria-pressed={date === today}
          className={dayChip(date === today)}
        >
          {t("simple.daily.today")}
        </button>
        <button
          type="button"
          onClick={() => setDate(yesterday())}
          aria-pressed={date === yesterday()}
          className={dayChip(date === yesterday())}
        >
          {t("simple.daily.yesterday")}
        </button>
        <label
          className={`${dayChip(date !== today && date !== yesterday())} cursor-pointer`}
        >
          <CalendarDays size={18} />
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="cursor-pointer bg-transparent text-base font-bold outline-none"
            aria-label={t("simple.daily.pickDay")}
          />
        </label>

        <div className="relative min-w-[240px] flex-1">
          <Search
            size={20}
            className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-stone-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("simple.daily.search")}
            aria-label={t("simple.daily.search")}
            className="h-11 w-full rounded-2xl border-2 border-stone-200 bg-stone-50 pe-11 ps-11 text-base font-semibold text-stone-900 outline-none transition placeholder:font-normal placeholder:text-stone-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute end-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-stone-400 hover:bg-stone-200 hover:text-stone-700"
              aria-label={t("simple.daily.clearSearch")}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* TYPE CHIPS */}
      <div className="shrink-0 flex gap-2 border-b border-stone-200 bg-white p-3">
        <button
          onClick={() => setFilter("all")}
          className={`h-11 flex-1 rounded-2xl text-sm font-bold transition active:scale-95 ${
            filter === "all"
              ? "bg-stone-900 text-white shadow-sm"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200"
          }`}
        >
          {t("simple.pos.all")}
        </button>

        <button
          onClick={() => setFilter("sale")}
          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold transition active:scale-95 ${
            filter === "sale"
              ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
              : "bg-blue-50 text-blue-700 hover:bg-blue-100"
          }`}
        >
          <Receipt size={15} />
          {t("simple.daily.sales")}
        </button>

        <button
          onClick={() => setFilter("return")}
          className={`flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl text-sm font-bold transition active:scale-95 ${
            filter === "return"
              ? "bg-rose-600 text-white shadow-sm shadow-rose-200"
              : "bg-rose-50 text-rose-700 hover:bg-rose-100"
          }`}
        >
          <RotateCcw size={15} />
          {t("simple.daily.returns")}
        </button>
      </div>

      {/* LIST — the main event, gets the remaining space.
          Each row is a CSS grid with a fixed column template (id/badges,
          time, allocations, net total, actions) instead of flex-wrap, so
          the columns line up across rows like a table would — without
          actually becoming one. */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <div className="mx-auto max-w-7xl space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 text-sm font-semibold text-stone-500">
                {t("screens.pos.loading")}
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="text-base font-semibold text-rose-700">{error}</p>
            </div>
          ) : filteredInvoices.length > 0 ? (
            filteredInvoices.map((invoice) => {
              const isReturn = invoice.type === "return";
              const fullyRefunded = invoice.return_status === "full";

              return (
                <div
                  key={`${invoice.type}-${invoice.id}`}
                  className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_120px_auto] items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4 transition hover:border-blue-200 hover:shadow-sm"
                >
                  {/* COLUMN 1 — identity */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                        isReturn
                          ? "bg-rose-50 text-rose-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      <Receipt size={20} />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-black text-stone-950">
                          {invoice.invoice_number || invoice.id}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            isReturn
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isReturn
                            ? t("ui.return", "مرتجع")
                            : t("ui.sale", "مبيعات")}
                        </span>

                        {!isReturn && (
                          <ReturnStatusBadge status={invoice.return_status} />
                        )}

                        {isReturn && invoice.sales_invoice_id && (
                          <span className="text-[11px] font-semibold text-stone-400">
                            {t("simple.daily.fromInvoice")} #
                            {invoice.sales_invoice_id}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
                        <Calendar size={12} />
                        {invoice.date &&
                          new Date(invoice.date).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        <span className="text-stone-300">|</span>
                        <User size={12} />
                        {t("screens.pos.walkInCustomer", "زبون سفري")}
                      </p>

                      {invoice.matched_items && (
                        <p className="mt-1.5 flex items-start gap-1.5 text-sm font-semibold text-emerald-700">
                          <Package size={15} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-2">
                            {t("simple.daily.contains", {
                              items: invoice.matched_items
                                .split(",")
                                .join(t("simple.daily.listSep")),
                            })}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* COLUMN 2 — fund allocations */}
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {invoice.allocations?.map((alloc) => {
                      const sameCurrency =
                        alloc.currency_code === primaryCurrency?.code;
                      return (
                        <span
                          key={alloc.fund_id}
                          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                            isReturn
                              ? "bg-rose-50 text-rose-700"
                              : "bg-blue-50 text-blue-700"
                          }`}
                        >
                          <span className="font-bold">{alloc.fund_name}</span>
                          <span className="opacity-50">·</span>
                          {sameCurrency ? (
                            <span className="font-black">
                              {money(alloc.amount)}
                            </span>
                          ) : (
                            <>
                              <span className="font-black">
                                {Number(alloc.fund_amount).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}{" "}
                                {alloc.currency_symbol || alloc.currency_code}
                              </span>
                              <span className="text-[11px] font-medium opacity-70">
                                (= {money(alloc.amount)})
                              </span>
                            </>
                          )}
                        </span>
                      );
                    })}
                  </div>

                  {/* COLUMN 3 — net total */}
                  <div className="text-end">
                    <p className="text-[10px] font-semibold uppercase text-stone-500">
                      {t("simple.daily.netTotal")}
                    </p>
                    <b className="text-sm text-stone-950">
                      {money(invoice.net_total || 0)}
                    </b>
                  </div>

                  {/* COLUMN 4 — actions */}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onSelectInvoice(invoice, "view")}
                      className="flex h-11 items-center gap-1.5 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:bg-stone-50 active:scale-95"
                    >
                      <Eye size={16} />
                      {t("common.view", "عرض")}
                    </button>

                    {!isReturn && !fullyRefunded && (
                      <button
                        type="button"
                        onClick={() => onSelectInvoice(invoice, "return")}
                        className="flex h-11 items-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-700 transition hover:bg-rose-100 active:scale-95"
                      >
                        <RotateCcw size={16} />
                        {t("screens.pos.return", "إرجاع")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
              <p className="text-lg font-bold text-stone-500">
                {filtering
                  ? t("simple.daily.noResults")
                  : t("simple.daily.noSalesDay")}
              </p>
              {filtering && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                  className="h-11 rounded-2xl border-2 border-stone-200 bg-white px-5 text-base font-bold text-stone-700 hover:bg-stone-50"
                >
                  {t("simple.daily.clearFilters")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PAGINATION — a filter loads the whole day, so no pages then */}
      {filtering ? (
        <p className="shrink-0 border-t border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-stone-500">
          {t("simple.daily.showing", {
            count: filteredInvoices.length,
            total: invoices.length,
          })}
        </p>
      ) : (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
