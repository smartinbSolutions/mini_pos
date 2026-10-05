import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from "react-toastify";
import {
  ArrowLeftRight,
  Trash2,
  Calendar,
  User,
  Info,
  Receipt,
  RotateCcw,
  Wallet,
  ExternalLink,
  FileText,
} from "lucide-react";

import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import DeleteModal from "../../../../Global/DeleteModel";
import GoTo from "../../../../Global/GoTo";
import BackButton from "../../../../Global/BackButton";

// Visual identity per document type — same family of icons used
// elsewhere in the app (ledger row icons), so a settlement line reads
// consistently with everything else.
const TYPE_META = {
  sales: { Icon: Receipt, tone: "text-[#4663ff]", bg: "bg-[#eef3ff]" },
  purchase: { Icon: Receipt, tone: "text-[#4663ff]", bg: "bg-[#eef3ff]" },
  expense: { Icon: Wallet, tone: "text-amber-600", bg: "bg-amber-50" },
  sales_return: { Icon: RotateCcw, tone: "text-amber-600", bg: "bg-amber-50" },
  purchase_return: {
    Icon: RotateCcw,
    tone: "text-amber-600",
    bg: "bg-amber-50",
  },
  opening_balance: {
    Icon: FileText,
    tone: "text-slate-500",
    bg: "bg-slate-100",
  },
};

function Endpoint({ label, tone, total, count, money, t, children }) {
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-[#e9edfb] bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={`text-xs font-black ${tone}`}>{label}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-500">
          {t("screens.payments.documentCount", "{{count}} document", {
            count,
            defaultValue: count === 1 ? "1 document" : `${count} documents`,
          })}
        </span>
      </div>

      <div className="space-y-2">{children}</div>

      <div className="mt-3 flex items-center justify-between border-t border-[#eef1ff] pt-3 text-sm">
        <span className="font-semibold text-slate-500">{t("ui.total")}</span>
        <span dir="ltr" className={`font-black tabular-nums ${tone}`}>
          {money(total)}
        </span>
      </div>
    </div>
  );
}

function DocLine({ line, money, t }) {
  const meta = TYPE_META[line.invoice_type] || TYPE_META.opening_balance;
  const { Icon } = meta;

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#f8faff] px-3 py-2.5 text-sm">
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.bg} ${meta.tone}`}
      >
        <Icon size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <GoTo type={line.invoice_type} id={line.invoice_id} variant="light">
          <span className="truncate font-bold">
            {line.invoice_name ||
              t(`screens.invoices.invoiceType.${line.invoice_type}`, {
                defaultValue: line.invoice_type,
              })}
          </span>
        </GoTo>
        <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
          {t(`screens.invoices.invoiceType.${line.invoice_type}`, {
            defaultValue: line.invoice_type,
          })}
        </p>
      </div>
      <span
        dir="ltr"
        className="shrink-0 font-black tabular-nums text-[#1c2340]"
      >
        {money(line.amount)}
      </span>
    </div>
  );
}

const SettlementDocumentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { money } = usePrimaryCurrency();
  const api = window.api;

  const [settlement, setSettlement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getSettlement(id).then((res) => {
      if (active) {
        setSettlement(res?.success ? res.data : null);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    const res = await api.deleteSettlement(id);
    setDeleting(false);
    setDeleteOpen(false);
    if (res.success) {
      toast.success(
        t("screens.payments.settlementDeleted", "Settlement deleted"),
      );
      navigate("/payments");
    } else {
      toast.error(
        t(`errors.${res.error}`, {
          defaultValue: res.error || "Delete failed",
        }),
      );
    }
  };

  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";

  if (loading || !settlement) {
    return (
      <div className={pageClass}>
        <div className="mx-auto max-w-3xl py-16 text-center text-slate-500">
          {loading ? t("common.loading") : t("screens.payments.notFound")}
        </div>
      </div>
    );
  }

  const receivableTotal = settlement.receivable.reduce(
    (s, l) => s + Number(l.amount || 0),
    0,
  );
  const payableTotal = settlement.payable.reduce(
    (s, l) => s + Number(l.amount || 0),
    0,
  );
  const totalDocuments =
    settlement.receivable.length + settlement.payable.length;

  return (
    <div className={pageClass}>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton />

          <div className="flex flex-wrap items-center gap-2">
            {settlement.contact_id && (
              <button
                type="button"
                onClick={() => navigate(`/contact/${settlement.contact_id}`)}
                className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4663ff]/20"
              >
                <ExternalLink size={16} />
                {t("screens.payments.viewAccount", "View account")}
              </button>
            )}
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
            >
              <Trash2 size={16} />
              {t("common.delete")}
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(70,99,255,0.12)]">
          {/* Header + amount */}
          <div className="px-7 pb-6 pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="flex items-center gap-2 text-lg font-black text-[#1c2340]">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <ArrowLeftRight size={18} />
                </span>
                {t("screens.payments.settlement", "Settlement")}{" "}
                <span className="text-slate-400">#{settlement.id}</span>
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-slate-500">
                <Calendar size={14} />
                {new Date(settlement.date).toLocaleString(i18n.language)}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                settlement.contact_id &&
                navigate(`/contact/${settlement.contact_id}`)
              }
              className="mt-2 flex items-center gap-1.5 text-sm font-bold text-slate-600 transition hover:text-[#4663ff]"
            >
              <User size={14} />
              {settlement.contact_name}
            </button>

            <p
              dir="ltr"
              className="mt-6 text-start text-5xl font-black tabular-nums tracking-tight text-violet-700"
            >
              {money(settlement.amount)}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {t(
                "screens.payments.documentsClosedCount",
                "{{count}} documents closed, no cash moved",
                {
                  count: totalDocuments,
                  defaultValue: `${totalDocuments} documents closed, no cash moved`,
                },
              )}
            </p>
          </div>

          {/* Plain-language explainer — what this settlement actually did */}
          <div className="mx-7 mb-6 flex items-start gap-3 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600">
              <Info size={15} />
            </span>
            <p className="text-sm leading-relaxed text-violet-900">
              {t(
                "screens.payments.settlementExplainer",
                "This matched {{amount}} of what {{party}} owed you against {{amount}} of what you owed them. Their overall balance with you is unchanged — only these specific documents are now marked closed.",
                {
                  amount: money(settlement.amount),
                  party: settlement.contact_name,
                  defaultValue: `This matched ${money(settlement.amount)} of what ${settlement.contact_name} owed you against ${money(settlement.amount)} of what you owed them. Their overall balance with you is unchanged — only these specific documents are now marked closed.`,
                },
              )}
            </p>
          </div>

          {/* The two sides */}
          <div className="flex flex-col gap-4 border-t border-[#e5ebff] bg-violet-50/40 px-7 py-5 sm:flex-row">
            <Endpoint
              label={t("screens.contacts.owesYou", "Owes you")}
              tone="text-emerald-700"
              total={receivableTotal}
              count={settlement.receivable.length}
              money={money}
              t={t}
            >
              {settlement.receivable.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  {t(
                    "screens.payments.noOpenDocuments",
                    "Nothing on this side",
                  )}
                </p>
              ) : (
                settlement.receivable.map((line) => (
                  <DocLine
                    key={`${line.invoice_type}-${line.invoice_id}`}
                    line={line}
                    money={money}
                    t={t}
                  />
                ))
              )}
            </Endpoint>

            <div className="flex items-center justify-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-violet-600 shadow-sm">
                <ArrowLeftRight size={17} />
              </span>
            </div>

            <Endpoint
              label={t("screens.contacts.youOwe", "You owe")}
              tone="text-rose-600"
              total={payableTotal}
              count={settlement.payable.length}
              money={money}
              t={t}
            >
              {settlement.payable.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-400">
                  {t(
                    "screens.payments.noOpenDocuments",
                    "Nothing on this side",
                  )}
                </p>
              ) : (
                settlement.payable.map((line) => (
                  <DocLine
                    key={`${line.invoice_type}-${line.invoice_id}`}
                    line={line}
                    money={money}
                    t={t}
                  />
                ))
              )}
            </Endpoint>
          </div>

          {/* Metadata */}
          <dl className="divide-y divide-[#eef1ff] px-7">
            {settlement.note && (
              <div className="py-4 text-sm">
                <dt className="text-slate-500">{t("ui.notes")}</dt>
                <dd className="mt-1 max-w-prose leading-relaxed text-slate-700">
                  {settlement.note}
                </dd>
              </div>
            )}
            {settlement.created_by_name && (
              <div className="flex items-center justify-between py-4 text-sm">
                <dt className="text-slate-500">{t("ui.user", "User")}</dt>
                <dd className="font-bold text-[#1c2340]">
                  {settlement.created_by_name}
                </dd>
              </div>
            )}
            <div className="flex items-center justify-between py-4 text-sm">
              <dt className="text-slate-500">
                {t("screens.payments.settlementId", "Settlement ID")}
              </dt>
              <dd dir="ltr" className="font-bold tabular-nums text-[#1c2340]">
                #{settlement.id}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        confirming={deleting}
        title={t("deleteModal.settlementTitle", "Delete settlement?")}
        message={t(
          "deleteModal.settlementMessage",
          "This reopens the documents that were settled.",
        )}
      />

      <ToastContainer />
    </div>
  );
};

export default SettlementDocumentPage;
