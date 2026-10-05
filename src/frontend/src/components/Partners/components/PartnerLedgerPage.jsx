import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Landmark,
  Wallet,
  Download,
  CalendarDays,
  X,
  Handshake,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

import usePartyLedger from "../../Payment/hooks/useGetPartyPayments";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import GoTo from "../../../Global/GoTo";
import Pagination from "../../../Global/Pagination";
import ExportModal from "../../../Global/ExportModal";
import partyLedgerRowLabel from "../../Payment/components/PartyLedgerRowLabel";

const UNKNOWN_DAY = "__unknown__";

const KIND_STYLE = {
  opening: { Icon: Landmark, tile: "bg-slate-100 text-slate-600" },
  cashIn: { Icon: ArrowDownLeft, tile: "bg-emerald-50 text-emerald-600" },
  cashOut: { Icon: ArrowUpRight, tile: "bg-rose-50 text-rose-600" },
  other: { Icon: Wallet, tile: "bg-slate-100 text-slate-500" },
};

function rowKind(row) {
  if (row.record_type === "opening_balance") return "opening";
  if (row.record_type === "payment") {
    return row.payment_kind === "deposit" ? "cashIn" : "cashOut";
  }
  return "other";
}

export default function PartnerLedgerPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const isRtl = i18n.dir() === "rtl";
  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;

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
  } = usePartyLedger(id, "partner");

  const { money } = usePrimaryCurrency();

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const partyName = party?.name || `${t("ui.partner")} #${id}`;

  const runExport = async (apiFn, { startDate, endDate, language }) => {
    setExporting(true);
    setExportError("");
    try {
      const res = await apiFn({
        partyId: id,
        partyType: "partner",
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

  const totalIncrease = Number(summary?.total_increase || 0);
  const totalDecrease = Number(summary?.total_decrease || 0);
  const openingBalance = Number(summary?.opening_balance || 0);
  const balance = totalIncrease - totalDecrease;
  const hasDateFilter = Boolean(dateFrom || dateTo);

  const heroLabel = hasDateFilter
    ? t("screens.ledger.netChangeInRange", "Net change in this range")
    : balance <= 0
      ? t("ui.settled", "Settled")
      : t("screens.ledger.youOwe", {
          party: partyName,
          defaultValue: `You owe ${partyName}`,
        });

  const heroAmount = hasDateFilter ? balance : Math.abs(balance);
  const heroColor = hasDateFilter
    ? "text-[#1c2340]"
    : balance <= 0
      ? "text-slate-400"
      : "text-rose-600";

  const facts = [
    { label: t("screens.ledger.openingBalance"), value: openingBalance },
    { label: t("screens.ledger.totalDeposit"), value: totalIncrease },
    { label: t("screens.ledger.totalWithdrawal"), value: totalDecrease },
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

  const groupedByDay = data.reduce((acc, row) => {
    const key = (row.date || "").slice(0, 10) || UNKNOWN_DAY;
    (acc[key] ||= []).push(row);
    return acc;
  }, {});

  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";
  const rowGrid =
    "grid grid-cols-[2.75rem_1fr_auto] sm:grid-cols-[2.75rem_1fr_9rem_9rem] gap-x-4";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-4 p-6 sm:p-7">
            <div className="flex min-w-0 items-start gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#dbe4ff] bg-white text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                aria-label={t("common.back")}
              >
                <BackArrowIcon size={18} />
              </button>

              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-[#4663ff]">
                  <Handshake size={15} />
                  {t("ui.partner")}
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
              className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 py-2.5 text-sm font-bold text-[#1c2340] transition hover:bg-[#eef3ff]"
            >
              <Download size={16} />
              {t("common.export")}
            </button>
          </div>

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

          <div className="flex flex-wrap items-center gap-3 border-t border-[#e5ebff] bg-[#f8faff]/60 px-6 py-4 sm:px-7">
            <div className="flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-3 py-2">
              <CalendarDays size={15} className="shrink-0 text-[#4663ff]" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none"
              />
              <span className="text-slate-300">–</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-transparent text-sm text-slate-700 outline-none"
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
            </div>
          ) : (
            <>
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
                      const kind = rowKind(p);
                      const { Icon, tile } = KIND_STYLE[kind];
                      const sign = p.movement_type === "decrease" ? "−" : "+";
                      const time = (p.date || "").slice(11, 16);

                      const label = partyLedgerRowLabel({
                        row: p,
                        partyName,
                        partyType: "partner",
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
            onLimitChange={(l) => {
              setLimit(l);
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
