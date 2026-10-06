import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
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
  Receipt,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import useContactLedger from "../hooks/useContactLedger";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import GoTo from "../../../Global/GoTo";
import Pagination from "../../../Global/Pagination";
import ExportModal from "../../../Global/ExportModal";
import partyLedgerRowLabel from "./PartyLedgerRowLabel";
import BackButton from "../../../Global/BackButton";

const KIND_STYLE = {
  opening: {
    Icon: Landmark,
    color: "text-slate-600",
    bg: "bg-slate-100",
  },
  invoice: {
    Icon: FileText,
    color: "text-[#4663ff]",
    bg: "bg-[#eef3ff]",
  },
  expense: {
    Icon: Receipt,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  return: {
    Icon: RefreshCw,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  cashIn: {
    Icon: ArrowDownLeft,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  cashOut: {
    Icon: ArrowUpRight,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  settlement: {
    Icon: ArrowLeftRight,
    color: "text-violet-600",
    bg: "bg-violet-50",
  },
  other: {
    Icon: Wallet,
    color: "text-slate-500",
    bg: "bg-slate-100",
  },
};

function rowKind(row) {
  if (row.record_type === "opening_balance") return "opening";
  if (row.record_type === "invoice") {
    return row.invoice_type === "expense" ? "expense" : "invoice";
  }
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
  const { money } = usePrimaryCurrency();

  const KIND_LABEL_KEYS = {
    opening: t("ui.opening_balance"),
    invoice: t("ui.invoice"),
    expense: t("ui.expense"),
    return: t("ui.return"),
    cashIn: t("screens.ledger.paymentIn", "Payment In"),
    cashOut: t("screens.ledger.paymentOut", "Payment Out"),
    settlement: t("screens.payments.settlement", "Settlement"),
    other: t("ui.other"),
  };

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

  // One flat strip of figures. Zero-value document totals are hidden;
  // opening balance and cash in/out always show.
  const stats = [
    {
      key: "opening",
      label: t("screens.ledger.openingBalance"),
      value: Number(summary.opening_balance || 0),
      always: true,
    },
    {
      key: "sales",
      label: t("screens.ledger.totalSales"),
      value: Number(summary.sales_total || 0),
    },
    {
      key: "purchases",
      label: t("screens.ledger.totalPurchases"),
      value: Number(summary.purchases_total || 0),
    },
    {
      key: "returns",
      label: t("screens.ledger.totalReturn"),
      value:
        Number(summary.sales_returns_total || 0) +
        Number(summary.purchase_returns_total || 0),
    },
    {
      key: "cashIn",
      label: t("screens.ledger.paymentIn", "Payment In"),
      value: Number(summary.payments_in_total || 0),
      color: "text-emerald-700",
      always: true,
    },
    {
      key: "cashOut",
      label: t("screens.ledger.paymentOut", "Payment Out"),
      value: Number(summary.payments_out_total || 0),
      color: "text-rose-600",
      always: true,
    },
    {
      key: "settled",
      label: t("screens.ledger.settledNonCash", "Settled (non-cash)"),
      value: Number(summary.settlements_total || 0),
      color: "text-violet-600",
    },
  ].filter((s) => s.always || s.value !== 0);

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

  const formatDate = (raw) => {
    const day = (raw || "").slice(0, 10);
    if (!day) return "—";
    return new Date(`${day}T00:00:00`).toLocaleDateString(i18n.language, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";

  const roleChip = (Icon, label) => (
    <span className="inline-flex items-center gap-1 rounded-lg bg-[#eef3ff] px-2 py-0.5 text-[11px] font-bold text-[#4663ff]">
      <Icon size={12} />
      {label}
    </span>
  );

  const th = "px-4 py-3 text-xs font-semibold text-slate-500 whitespace-nowrap";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-4 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* HEADER */}
        <section className={panelClass}>
          {/* Name + actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <BackButton size="lg" />

              <h1 className="truncate text-xl font-black text-[#1c2340]">
                {partyName}
              </h1>

              <div className="flex flex-wrap items-center gap-2">
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

            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[#dbe4ff] bg-white px-3 py-2 text-sm font-bold text-[#1c2340] transition hover:bg-[#eef3ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4663ff]/20"
            >
              <Download size={15} />
              {t("common.export")}
            </button>
          </div>

          {/* Balance + figures in one strip */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-[#e5ebff] px-5 py-4">
            <div className="pe-8 sm:border-e sm:border-[#e5ebff]">
              <p className="text-xs font-semibold text-slate-500">
                {heroLabel}
              </p>
              <p
                className={`text-2xl font-black tabular-nums ${STATUS_COLOR[status]}`}
              >
                <span dir="ltr">{money(Math.abs(balance))}</span>
              </p>
            </div>

            {stats.map((s) => (
              <div key={s.key}>
                <p className="text-xs font-semibold text-slate-500">
                  {s.label}
                </p>
                <p
                  className={`text-base font-bold tabular-nums ${
                    s.color || "text-[#1c2340]"
                  }`}
                >
                  <span dir="ltr">{money(s.value)}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Date filter */}
          <div className="flex flex-wrap items-center gap-3 border-t border-[#e5ebff] bg-[#f8faff]/60 px-5 py-3">
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

            <div className="flex items-center gap-2 rounded-xl border border-[#dbe4ff] bg-white px-3 py-1.5 focus-within:ring-4 focus-within:ring-[#4663ff]/10">
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
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-[#e5ebff] bg-[#f8faff]/60">
                  <tr>
                    <th className={`${th} w-10`} />
                    <th className={`${th} text-start`}>{t("ui.type")}</th>
                    <th className={`${th} text-start`}>
                      {t("ui.description")}
                    </th>
                    <th className={`${th} text-start`}>{t("ui.date")}</th>
                    <th className={`${th} text-end`}>{t("ui.amount")}</th>
                    <th className={`${th} text-end`}>{t("ui.balance")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef1ff]">
                  {rows.map((p) => {
                    const kind = rowKind(p);
                    const { Icon, color, bg } = KIND_STYLE[kind];
                    const sign = p.movement_type === "decrease" ? "−" : "+";

                    const rate = Number(p.exchange_rate || 1);
                    const isForeignCurrency = rate !== 1;
                    const fundAmount = Number(
                      p.amount_fund_currency ?? Number(p.amount || 0) * rate,
                    );

                    const label = partyLedgerRowLabel({
                      row: p,
                      partyName,
                      partyType:
                        contact?.is_supplier && !contact?.is_customer
                          ? "supplier"
                          : "customer",
                      t,
                      formattedAmount: money(p.amount),
                    });

                    // Description links to its document when there is one
                    const description =
                      p.record_type === "payment" ? (
                        p.settlement_id ? (
                          <GoTo type="settlements" id={p.settlement_id}>
                            {label}
                          </GoTo>
                        ) : p.payment_id ? (
                          <GoTo type="payment" id={p.payment_id}>
                            {label}
                          </GoTo>
                        ) : (
                          label
                        )
                      ) : p.invoice_id && p.invoice_type ? (
                        <GoTo type={p.invoice_type} id={p.invoice_id}>
                          {p.invoice_name
                            ? `${p.invoice_name} · ${label}`
                            : label}
                        </GoTo>
                      ) : (
                        label
                      );

                    return (
                      <tr
                        key={`${p.record_type}-${p.id}`}
                        className="transition hover:bg-[#f8faff]"
                        title={p.note && p.note !== label ? p.note : undefined}
                      >
                        <td className="px-4 py-3">
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg} ${color}`}
                          >
                            <Icon size={15} />
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">
                          {KIND_LABEL_KEYS[kind]}
                        </td>

                        <td className="max-w-[420px] px-4 py-3">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className="truncate text-[#1c2340]">
                              {description}
                            </span>

                            {p.fund_name && (
                              <span className="shrink-0 rounded-md bg-[#eef3ff] px-1.5 py-0.5 text-[11px] font-semibold text-[#4663ff]">
                                {p.fund_name}
                              </span>
                            )}

                            {isForeignCurrency && (
                              <span
                                dir="ltr"
                                className="shrink-0 whitespace-nowrap text-[11px] tabular-nums text-slate-400"
                              >
                                {fundAmount.toFixed(2)} {p.currency_code} @{" "}
                                {rate.toFixed(4)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                          {formatDate(p.date)}
                          <span
                            dir="ltr"
                            className="ms-2 text-xs tabular-nums text-slate-400"
                          >
                            {(p.date || "").slice(11, 16)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-end font-bold tabular-nums text-[#1c2340]">
                          <span dir="ltr">
                            {sign}
                            {money(p.amount)}
                          </span>
                        </td>

                        <td className="whitespace-nowrap px-4 py-3 text-end font-semibold tabular-nums text-slate-500">
                          <span dir="ltr">{money(p.running_balance)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
