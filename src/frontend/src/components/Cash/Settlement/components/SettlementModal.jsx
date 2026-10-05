import React from "react";
import {
  X,
  ArrowLeftRight,
  Calendar,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import useSettlement from "../hooks/useSettlement";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import NumberInput from "../../../../Global/NumberInput";

function SideList({ title, tone, lines, onChange, money, t }) {
  const toneClass =
    tone === "receivable" ? "text-emerald-700" : "text-rose-600";
  const total = lines.reduce((s, l) => s + (Number(l.allocate) || 0), 0);

  return (
    <div className="flex-1 rounded-2xl border border-[#e9edfb] bg-white p-4">
      <p className={`mb-3 text-xs font-black ${toneClass}`}>{title}</p>

      {lines.length === 0 ? (
        <p className="text-sm text-slate-400">
          {t("screens.payments.noOpenDocuments", "Nothing open on this side")}
        </p>
      ) : (
        <div className="space-y-2">
          {lines.map((line, index) => (
            <div
              key={`${line.invoice_type}-${line.invoice_id}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#f8faff] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#1c2340]">
                  {line.name ||
                    t("screens.payments.openingBalanceLine", "Opening balance")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("screens.invoices.remaining_amount", "Remaining")}:{" "}
                  {money(line.remaining)}
                </p>
              </div>
              <NumberInput
                value={line.allocate}
                onChange={(val) => onChange(index, val)}
                className="h-9 w-28 shrink-0 rounded-lg border border-[#e9edfb] bg-white px-2 text-end text-sm font-bold tabular-nums outline-none focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10"
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[#eef1ff] pt-3 text-sm">
        <span className="font-semibold text-slate-500">{t("ui.total")}</span>
        <span dir="ltr" className={`font-black tabular-nums ${toneClass}`}>
          {money(total)}
        </span>
      </div>
    </div>
  );
}

export default function SettlementModal({
  isOpen,
  onClose,
  contactId,
  onSaved,
}) {
  const { money } = usePrimaryCurrency();
  const {
    contact,
    receivable,
    payable,
    maxAmount,
    receivableTotal,
    payableTotal,
    mismatch,
    canSubmit,
    note,
    setNote,
    date,
    setDate,
    loading,
    saving,
    error,
    requestAmount,
    updateReceivableLine,
    updatePayableLine,
    submit,
    t,
  } = useSettlement({ isOpen, contactId, onClose, onSaved });

  if (!isOpen) return null;

  const partyName = contact?.name || "";
  const matched = Math.abs(mismatch) < 0.005;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1c2340]/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-[28px] border border-[#e9edfb] bg-white shadow-[0_30px_90px_rgba(38,54,148,0.18)]">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-[#e9edfb] bg-[#f8faff] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm">
              <ArrowLeftRight size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-[#1c2340]">
                {t("screens.payments.settlement", "Settlement")}
              </h2>
              <p className="text-sm text-slate-500">{partyName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
          {loading ? (
            <p className="py-10 text-center text-sm text-slate-400">
              {t("common.loading")}
            </p>
          ) : maxAmount <= 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">
              {t(
                "screens.payments.nothingToSettle",
                "No open documents on both sides to settle.",
              )}
            </p>
          ) : (
            <>
              <div>
                <label className="text-sm font-bold text-[#1c2340]">
                  {t("screens.payments.settleAmount", "Amount to settle")}
                </label>
                <div className="mt-1.5 flex items-center rounded-2xl border-2 border-violet-200 bg-white transition focus-within:ring-4 focus-within:ring-violet-100">
                  <NumberInput
                    value={receivableTotal}
                    onChange={requestAmount}
                    className="h-14 w-full min-w-0 flex-1 rounded-2xl bg-transparent px-4 text-2xl font-black tabular-nums text-[#1c2340] outline-none"
                  />
                  <span className="shrink-0 px-4 text-sm font-bold text-slate-500">
                    / {money(maxAmount)} {t("ui.max", "max")}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-4 sm:flex-row">
                <SideList
                  title={t("screens.contacts.owesYou", "Owes you")}
                  tone="receivable"
                  lines={receivable}
                  onChange={updateReceivableLine}
                  money={money}
                  t={t}
                />
                <SideList
                  title={t("screens.contacts.youOwe", "You owe")}
                  tone="payable"
                  lines={payable}
                  onChange={updatePayableLine}
                  money={money}
                  t={t}
                />
              </div>

              {!matched && (
                <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                  <AlertTriangle size={15} />
                  {t(
                    "screens.payments.settlementMismatch",
                    "Both sides must add up to the same amount",
                  )}{" "}
                  ({money(Math.abs(mismatch))})
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Calendar size={13} />
                    {t("ui.date")}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#e9edfb] bg-white px-3 outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-slate-500">
                    {t("ui.note")}
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-[#e9edfb] bg-white px-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10"
                    placeholder={t("ui.note")}
                  />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="flex items-center justify-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-700">
              <AlertTriangle size={15} />
              {error}
            </div>
          )}
        </div>

        {/* CONFIRM */}
        <div className="space-y-3 border-t border-[#e9edfb] bg-[#f8faff] px-6 py-4">
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-sm font-black text-white shadow-lg transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={18} />
            {saving
              ? t("common.saving")
              : t("screens.payments.confirmSettlement", "Confirm settlement")}
          </button>
        </div>
      </div>
    </div>
  );
}
