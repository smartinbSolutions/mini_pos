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
  Phone,
  ArrowLeftRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import useContactLedger from "../hooks/useContactLedger";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import GoTo from "../../../Global/GoTo";
import Pagination from "../../../Global/Pagination";
import ExportModal from "../../../Global/ExportModal";
import partyLedgerRowLabel from "./PartyLedgerRowLabel";

const UNKNOWN_DAY = "__unknown__";

const KIND_STYLE = {
  opening: { Icon: Landmark, tile: "bg-slate-100 text-slate-600" },
  invoice: { Icon: FileText, tile: "bg-[#eef3ff] text-[#4663ff]" },
  return: { Icon: RefreshCw, tile: "bg-amber-50 text-amber-600" },
  cashIn: { Icon: ArrowDownLeft, tile: "bg-emerald-50 text-emerald-600" },
  cashOut: { Icon: ArrowUpRight, tile: "bg-rose-50 text-rose-600" },
  settlement: { Icon: ArrowLeftRight, tile: "bg-violet-50 text-violet-600" },
  other: { Icon: Wallet, tile: "bg-slate-100 text-slate-500" },
};

function rowKind(row) {
  if (row.record_type === "opening_balance") return "opening";
  if (row.record_type === "invoice") return "invoice";
  if (row.record_type === "return") return "return";
  if (row.record_type === "payment") {
    if (row.payment_kind === "settlement") return "settlement";
    return row.payment_kind === "received" || row.payment_kind === "deposit"
      ? "cashIn"
      : "cashOut";
  }
  return "other";
}

// One account: balance > 0 → they owe you, < 0 → you owe them.
const statusOf = (balance) =>
  Math.abs(balance) < 0.005 ? "settled" : balance > 0 ? "owesYou" : "youOwe";

const STATUS_COLOR = {
  owesYou: "text-emerald-700",
  youOwe: "text-rose-600",
  settled: "text-slate-400",
};

const fmtDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;

function buildPresets(t) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  return [
    { key: "all", label: t("common.all", "All"), from: "", to: "" },
    {
      key: "thisMonth",
      label: t("reports.presets.thisMonth", "This month"),
      from: fmtDate(new Date(y, m, 1)),
      to: fmtDate(new Date(y, m + 1, 0)),
    },
    {
      key: "lastMonth",
      label: t("reports.presets.lastMonth", "Last month"),
      from: fmtDate(new Date(y, m - 1, 1)),
      to: fmtDate(new Date(y, m, 0)),
    },
    {
      key: "thisYear",
      label: t("reports.presets.thisYear", "This year"),
      from: fmtDate(new Date(y, 0, 1)),
      to: fmtDate(new Date(y, 11, 31)),
    },
  ];
}

export default function ContactLedgerPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isRtl = i18n.dir() === "rtl";
  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;
  const { money } = usePrimaryCurrency();

  const {
    contact,
    ledgerKey,
    rows,
    summary,
    loading,
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
  } = useContactLedger(id);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const partyName = contact?.name || `#${id}`;
  const hasDateFilter = Boolean(dateFrom || dateTo);
  const presets = buildPresets(t);

  // Hero is always the all-time balance, independent of the date filter.
  const balance = Number(contact?.balance || 0);
  const status = statusOf(balance);
  const heroLabel =
    status === "settled"
      ? t("screens.ledger.settled", "All settled")
      : t(`screens.ledger.${status}`, {
          party: partyName,
          defaultValue:
            status === "owesYou"
              ? `${partyName} owes you`
              : `You owe ${partyName}`,
        });

  const rangeNet =
    Number(summary.total_increase || 0) - Number(summary.total_decrease || 0);

  const facts = [
    {
      label: t("screens.ledger.openingBalance"),
      value: Number(summary.opening_balance || 0),
      always: true,
    },
    { label: t("screens.ledger.totalSales"), value: summary.sales_total },
    {
      label: t("screens.ledger.totalPurchases"),
      value: summary.purchases_total,
    },
    {
      label: t("screens.ledger.totalReturn"),
      value:
        Number(summary.sales_returns_total || 0) +
        Number(summary.purchase_returns_total || 0),
    },
    {
      label: t("screens.ledger.totalPayment"),
      value: summary.total_payment,
      always: true,
    },
  ].filter((f) => f.always || Number(f.value || 0) !== 0);

  const runExport = async (apiFn, { startDate, endDate, language }) => {
    if (!ledgerKey) return;
    setExporting(true);
    setExportError("");
    try {
      const res = await apiFn({
        partyId: ledgerKey.partyId,
        partyType: ledgerKey.partyType,
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

  const formatDay = (day) =>
    day === UNKNOWN_DAY
      ? t("screens.ledger.unknownDate", "Unknown date")
      : new Date(`${day}T00:00:00`).toLocaleDateString(i18n.language, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        });

  const groupedByDay = rows.reduce((acc, row) => {
    const key = (row.date || "").slice(0, 10) || UNKNOWN_DAY;
    (acc[key] ||= []).push(row);
    return acc;
  }, {});

  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";
  const rowGrid =
    "grid grid-cols-[2.75rem_1fr_auto] sm:grid-cols-[2.75rem_1fr_9rem_9rem] gap-x-4";

  const roleChip = (Icon, label) => (
    <span className="inline-flex items-center gap-1 rounded-lg bg-[#eef3ff] px-2 py-0.5 text-[11px] font-bold text-[#4663ff]">
      <Icon size={12} />
      {label}
    </span>
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
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
                <h1 className="truncate text-2xl font-black leading-tight text-[#1c2340] sm:text-3xl">
                  {partyName}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {contact?.is_customer
                    ? roleChip(
                        User,
                        t("screens.contacts.roleCustomer", "Customer"),
                      )
                    : null}
                  {contact?.is_supplier
                    ? roleChip(
                        Truck,
                        t("screens.contacts.roleSupplier", "Supplier"),
                      )
                    : null}
                  {contact?.phone ? (
                    <span
                      dir="ltr"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"
                    >
                      <Phone size={12} />
                      {contact.phone}
                    </span>
                  ) : null}
                </div>
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

          <div className="border-t border-[#e5ebff] px-6 py-6 sm:px-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500">
                  {heroLabel}
                </p>
                <p
                  className={`mt-1 text-4xl font-black tabular-nums sm:text-5xl ${STATUS_COLOR[status]}`}
                >
                  <span dir="ltr">{money(Math.abs(balance))}</span>
                </p>
              </div>

              {hasDateFilter && (
                <div className="rounded-2xl bg-[#f8faff] px-4 py-3 text-end">
                  <p className="text-xs font-semibold text-slate-500">
                    {t(
                      "screens.ledger.netChangeInRange",
                      "Net change in this range",
                    )}
                  </p>
                  <p className="mt-0.5 text-lg font-black tabular-nums text-[#1c2340]">
                    <span dir="ltr">
                      {rangeNet > 0 ? "+" : rangeNet < 0 ? "−" : ""}
                      {money(Math.abs(rangeNet))}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-4">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-semibold text-slate-500">
                    {fact.label}
                  </dt>
                  <dd className="mt-0.5 text-base font-bold tabular-nums text-[#1c2340]">
                    <span dir="ltr">{money(Number(fact.value || 0))}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* DATE FILTER */}
          <div className="flex flex-wrap items-center gap-3 border-t border-[#e5ebff] bg-[#f8faff]/60 px-6 py-4 sm:px-7">
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => {
                const active = dateFrom === p.from && dateTo === p.to;
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => {
                      setDateFrom(p.from);
                      setDateTo(p.to);
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      active
                        ? "bg-[#4663ff] text-white shadow-md shadow-[#4663ff]/20"
                        : "border border-[#dbe4ff] bg-white text-slate-500 hover:bg-[#eef3ff]"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

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
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
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
          ) : rows.length === 0 ? (
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
              <p className="border-b border-[#e5ebff] bg-[#f8faff]/60 px-6 py-2.5 text-xs text-slate-500">
                {t(
                  "screens.ledger.legend",
                  "+ increases what they owe you · − decreases it (purchases and payments you receive)",
                )}
              </p>

              <div
                className={`${rowGrid} hidden border-b border-[#e5ebff] px-6 py-3 text-xs font-semibold text-slate-500 sm:grid`}
              >
                <span />
                <span>{t("ui.description")}</span>
                <span className="text-end">{t("ui.amount")}</span>
                <span className="text-end">{t("ui.balance")}</span>
              </div>

              {Object.entries(groupedByDay).map(([day, dayRows]) => (
                <div key={day}>
                  <h3 className="sticky top-0 z-10 border-b border-[#e5ebff] bg-[#f8faff]/95 px-6 py-2 text-sm font-semibold text-slate-600 backdrop-blur">
                    {formatDay(day)}
                  </h3>

                  <div className="divide-y divide-[#eef1ff]">
                    {dayRows.map((p) => {
                      const kind = rowKind(p);
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
                        partyType: "customer",
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

                              {p.record_type === "payment" &&
                                p.settlement_id && (
                                  <GoTo type="settlements" id={p.settlement_id}>
                                    {t(
                                      "screens.payments.settlement",
                                      "Settlement",
                                    )}{" "}
                                    #{p.settlement_id}
                                  </GoTo>
                                )}
                              {p.record_type === "payment" &&
                                !p.settlement_id &&
                                p.payment_id && (
                                  <GoTo type="payment" id={p.payment_id}>
                                    {t("screens.ledger.payment")} #
                                    {p.payment_id}
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
            onLimitChange={setLimit}
          />
        </section>
      </div>

      <ExportModal
        isOpen={exportOpen}
        onClose={() => {
          setExportOpen(false);
          setExportError("");
        }}
        onExportExcel={(range) =>
          runExport(window.api.exportPartyHistoryExcel, range)
        }
        onExportPdf={(range) =>
          runExport(window.api.exportPartyHistoryPdf, range)
        }
        exporting={exporting}
        exportError={exportError}
        title={t("screens.ledger.exportTitle", "Export Ledger")}
      />
    </div>
  );
}
