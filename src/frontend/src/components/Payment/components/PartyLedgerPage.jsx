import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Landmark,
  FileText,
  Wallet,
  Download,
  CalendarDays,
  X,
  User,
  Truck,
  Handshake,
} from "lucide-react";

import usePartyLedger from "../hooks/useGetPartyPayments";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import GoTo from "../../../Global/GoTo";
import Pagination from "../../../Global/Pagination";
import ExportModal from "../../../Global/ExportModal";
import partyLedgerRowLabel from "./PartyLedgerRowLabel";

const PARTY_ICONS = {
  customer: User,
  supplier: Truck,
  partner: Handshake,
};

const UNKNOWN_DAY = "__unknown__";

// What kind of entry a row is — drives the icon and its color.
// Color encodes the kind of entry, never the sign, so a customer paying
// you never shows up as a red "bad" row.
const KIND_STYLE = {
  opening: { Icon: Landmark, tile: "bg-slate-100 text-slate-600" },
  invoice: { Icon: FileText, tile: "bg-[#eef3ff] text-[#4663ff]" },
  return: { Icon: RefreshCw, tile: "bg-amber-50 text-amber-600" },
  cashIn: { Icon: ArrowDownLeft, tile: "bg-emerald-50 text-emerald-600" },
  cashOut: { Icon: ArrowUpRight, tile: "bg-rose-50 text-rose-600" },
  other: { Icon: Wallet, tile: "bg-slate-100 text-slate-500" },
};

function rowKind(row, partyType) {
  if (row.record_type === "opening_balance") return "opening";
  if (row.record_type === "invoice") return "invoice";
  if (row.record_type === "return") return "return";
  if (row.record_type === "payment") {
    const isIncrease = row.movement_type === "increase";
    // Customer: a decrease is them paying you (cash in).
    // Supplier / partner: an increase is cash coming in (refund / deposit).
    const cashIn = partyType === "customer" ? !isIncrease : isIncrease;
    return cashIn ? "cashIn" : "cashOut";
  }
  return "other";
}

// Who owes whom, in words. balance = increases − decreases.
// Customer: positive means they owe you.
// Supplier / partner: positive means you owe them.
function balanceStatus(balance, partyType) {
  if (Math.abs(balance) < 0.005) return "settled";
  if (partyType === "customer") return balance > 0 ? "owesYou" : "youOwe";
  return balance > 0 ? "youOwe" : "owesYou";
}

const STATUS_COLOR = {
  owesYou: "text-emerald-700",
  youOwe: "text-rose-600",
  settled: "text-slate-400",
};

const PartyLedgerPage = () => {
  const { t, i18n } = useTranslation();
  const { id, type } = useParams();
  const navigate = useNavigate();
  const isRtl = i18n.dir() === "rtl";
  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  const normalizedType = type === "partners" ? "partner" : type;
  const isPartnerParty = normalizedType === "partner";
  const PartyIcon = PARTY_ICONS[normalizedType] || User;

  const {
    data,
    summary,
    loading,
    party,
    page,
    setPage,
    total,
    totalPages,
    limit,
    setLimit,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = usePartyLedger(id, normalizedType);

  const { money } = usePrimaryCurrency();

  // Export modal state — independent date range from the on-screen filter above.
  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const typeLabel = isPartnerParty
    ? t("ui.partner")
    : normalizedType === "customer"
      ? t("ui.customer")
      : t("ui.supplier");

  const partyName = party?.name || `${typeLabel} #${id}`;

  const runExport = async (apiFn, { startDate, endDate, language }) => {
    setExporting(true);
    setExportError("");
    try {
      const res = await apiFn({
        partyId: id,
        partyType: normalizedType,
        startDate,
        endDate,
        language,
        partyName,
      });

      if (res.success) {
        toast.success(t("common.exportSuccess", "Export completed"));
        setExportOpen(false);
      } else if (res.error !== "Export cancelled") {
        setExportError(res.error || t("common.exportFailed", "Export failed"));
      }
    } catch (err) {
      setExportError(err.message || String(err));
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = (range) =>
    runExport(window.api.exportPartyHistoryExcel, range);

  const handleExportPdf = (range) =>
    runExport(window.api.exportPartyHistoryPdf, range);

  const totalIncrease = Number(summary?.total_increase || 0);
  const totalDecrease = Number(summary?.total_decrease || 0);
  const totalInvoice = Number(summary?.total_invoice || 0);
  const totalReturn = Number(summary?.total_return || 0);
  const totalPayment = Number(summary?.total_payment || 0);
  const openingBalance = Number(summary?.opening_balance || 0);

  const partyBalance = totalIncrease - totalDecrease;
  const hasDateFilter = Boolean(dateFrom || dateTo);

  // Hero: the real balance in words — or, under a date filter, the net
  // movement within that range (the summary is range-scoped).
  const status = balanceStatus(partyBalance, normalizedType);
  const heroLabel = hasDateFilter
    ? t("screens.ledger.netChangeInRange", "Net change in this range")
    : status === "settled"
      ? t("screens.ledger.settled", "All settled")
      : t(`screens.ledger.${status}`, {
          party: partyName,
          defaultValue:
            status === "owesYou"
              ? `${partyName} owes you`
              : `You owe ${partyName}`,
        });
  const heroAmount = hasDateFilter ? partyBalance : Math.abs(partyBalance);
  const heroColor = hasDateFilter ? "text-[#1c2340]" : STATUS_COLOR[status];

  const facts = isPartnerParty
    ? [
        { label: t("screens.ledger.openingBalance"), value: openingBalance },
        { label: t("screens.ledger.totalDeposit"), value: totalIncrease },
        { label: t("screens.ledger.totalWithdrawal"), value: totalDecrease },
      ]
    : [
        { label: t("screens.ledger.openingBalance"), value: openingBalance },
        { label: t("screens.ledger.totalInvoice"), value: totalInvoice },
        { label: t("screens.ledger.totalReturn"), value: totalReturn },
        { label: t("screens.ledger.totalPayment"), value: totalPayment },
      ];

  const formatDay = (day) =>
    day === UNKNOWN_DAY
      ? t("screens.ledger.unknownDate", "Unknown date")
      : new Date(`${day}T00:00:00`).toLocaleDateString(i18n.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  // Group rows by calendar day — display grouping only, doesn't touch
  // running_balance or pagination math.
  const groupedByDay = data.reduce((acc, row) => {
    const key = (row.date || "").slice(0, 10) || UNKNOWN_DAY;
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";

  const rowGrid =
    "grid grid-cols-[2.75rem_1fr_auto] sm:grid-cols-[2.75rem_1fr_9rem_9rem] gap-x-4";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* HEADER + BALANCE */}
        <section className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-4 p-6 sm:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#dbe4ff] bg-white text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4663ff]/20"
                aria-label={t("common.back")}
              >
                <BackArrowIcon size={18} />
              </button>

              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#4663ff]">
                  <PartyIcon size={15} />
                  {typeLabel}
                  <span className="font-normal text-slate-400">#{id}</span>
                </p>
                <h1 className="truncate text-2xl font-black leading-tight text-[#1c2340] sm:text-3xl">
                  {partyName}
                </h1>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 py-2.5 text-sm font-bold text-[#1c2340] transition hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4663ff]/20"
            >
              <Download size={16} />
              {t("common.export")}
            </button>
          </div>

          {/* The one bold element: who owes whom, in words */}
          <div className="border-t border-[#e5ebff] px-6 py-6 sm:px-7">
            <p className="text-sm font-semibold text-slate-500">{heroLabel}</p>
            <p
              className={`mt-1 text-4xl font-black tabular-nums sm:text-5xl ${heroColor}`}
            >
              <span dir="ltr">{money(heroAmount)}</span>
            </p>

            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-semibold text-slate-500">
                    {fact.label}
                  </dt>
                  <dd className="mt-0.5 text-base font-bold tabular-nums text-[#1c2340]">
                    <span dir="ltr">{money(fact.value)}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* DATE FILTER */}
          <div className="flex flex-wrap items-center gap-3 border-t border-[#e5ebff] bg-[#f8faff]/60 px-6 py-4 sm:px-7">
            <div className="flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-3 py-2 focus-within:ring-4 focus-within:ring-[#4663ff]/10">
              <CalendarDays size={15} className="shrink-0 text-[#4663ff]" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none"
                aria-label={t("filters.dateFrom")}
              />
              <span className="text-slate-300">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none"
                aria-label={t("filters.dateTo")}
              />
            </div>

            {hasDateFilter && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4663ff]/20"
              >
                <X size={13} />
                {t("common.clear", "Clear")}
              </button>
            )}

            <span className="text-xs font-semibold text-slate-500">
              {hasDateFilter
                ? t("screens.ledger.filteredResults", { count: total })
                : t("screens.ledger.allTimeResults", { count: total })}
            </span>
          </div>
        </section>

        {/* STATEMENT */}
        <section className={panelClass}>
          {loading ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-400">
              {t("common.loading")}
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                <Wallet size={22} />
              </div>
              <p className="font-bold text-slate-600">
                {t("screens.ledger.noMovements")}
              </p>
              {hasDateFilter && (
                <p className="text-sm text-slate-500">
                  {t(
                    "screens.ledger.noMovementsInRange",
                    "Try widening or clearing the date range.",
                  )}
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Column headings — desktop only */}
              <div
                className={`${rowGrid} hidden border-b border-[#e5ebff] px-6 py-3 text-xs font-semibold text-slate-500 sm:grid`}
              >
                <span />
                <span>{t("ui.description")}</span>
                <span className="text-end">{t("ui.amount")}</span>
                <span className="text-end">{t("ui.balance")}</span>
              </div>

              {Object.entries(groupedByDay).map(([day, rows]) => (
                <div key={day}>
                  <h3 className="sticky top-0 z-10 border-b border-[#e5ebff] bg-[#f8faff]/95 px-6 py-2 text-sm font-semibold text-slate-600 backdrop-blur">
                    {formatDay(day)}
                  </h3>

                  <div className="divide-y divide-[#eef1ff]">
                    {rows.map((p) => {
                      const kind = rowKind(p, normalizedType);
                      const { Icon, tile } = KIND_STYLE[kind];
                      const sign = p.movement_type === "decrease" ? "−" : "+";
                      const time = (p.date || "").slice(11, 16);

                      const rate = Number(p.exchange_rate || 1);
                      const isForeignCurrency = rate !== 1;
                      const effectiveRate = Number(p.effective_rate || rate);
                      const fundAmount = Number(
                        p.amount_fund_currency ?? Number(p.amount || 0) * rate,
                      );

                      const label = partyLedgerRowLabel({
                        row: p,
                        partyName,
                        partyType: normalizedType,
                        t,
                        formattedAmount: money(p.amount),
                      });
                      const showNote = p.note && p.note !== label;

                      return (
                        <div
                          key={`${p.record_type}-${p.id}`}
                          className={`${rowGrid} items-start px-6 py-4 hover:bg-[#f8faff]`}
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tile}`}
                          >
                            <Icon size={19} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-[#1c2340]">
                              {label}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                              {time && (
                                <span dir="ltr" className="tabular-nums">
                                  {time}
                                </span>
                              )}

                              {p.record_type !== "payment" &&
                                p.invoice_id &&
                                p.invoice_type && (
                                  <GoTo type={p.invoice_type} id={p.invoice_id}>
                                    {p.invoice_name || `#${p.invoice_id}`}
                                  </GoTo>
                                )}

                              {p.record_type === "payment" && p.payment_id && (
                                <GoTo type="payment" id={p.payment_id}>
                                  {t("screens.ledger.payment")} #{p.payment_id}
                                </GoTo>
                              )}

                              {p.record_type === "payment" && p.fund_name && (
                                <GoTo type="fund" id={p.payment_fund_id}>
                                  {p.fund_name}
                                </GoTo>
                              )}
                            </div>

                            {showNote && (
                              <p className="mt-1 truncate text-xs text-slate-400">
                                {p.note}
                              </p>
                            )}

                            {isForeignCurrency && (
                              <p
                                dir="ltr"
                                className="mt-1.5 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-[#f8faff] px-2 py-1 text-[11px] tabular-nums text-slate-500"
                              >
                                <span className="font-semibold text-slate-700">
                                  {money(p.amount)}
                                </span>
                                <span>× {rate.toFixed(4)} =</span>
                                <span className="font-semibold text-slate-700">
                                  {fundAmount.toFixed(2)} {p.currency_code}
                                </span>
                                {effectiveRate !== rate && (
                                  <span className="font-semibold text-[#4663ff]">
                                    ({t("screens.ledger.effectiveRate")}:{" "}
                                    {effectiveRate.toFixed(4)})
                                  </span>
                                )}
                              </p>
                            )}
                          </div>

                          {/* Amount (+ balance underneath on mobile) */}
                          <div className="text-end">
                            <p className="text-base font-black tabular-nums text-[#1c2340] sm:text-lg">
                              <span dir="ltr">
                                {sign}
                                {money(p.amount)}
                              </span>
                            </p>
                            <p className="mt-1 text-xs font-semibold tabular-nums text-slate-500 sm:hidden">
                              <span dir="ltr">{money(p.running_balance)}</span>
                            </p>
                          </div>

                          {/* Running balance — desktop column */}
                          <p className="hidden pt-0.5 text-end text-sm font-semibold tabular-nums text-slate-500 sm:block">
                            <span dir="ltr">{money(p.running_balance)}</span>
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </>
          )}

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
        </section>
      </div>

      <ExportModal
        isOpen={exportOpen}
        onClose={() => {
          setExportOpen(false);
          setExportError("");
        }}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
        exporting={exporting}
        exportError={exportError}
        title={t("screens.ledger.exportTitle", "Export Ledger")}
      />
    </div>
  );
};

export default PartyLedgerPage;
