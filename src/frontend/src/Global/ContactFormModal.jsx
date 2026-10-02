import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  Save,
  X,
  Wallet,
  Calendar,
  PlusCircle,
  MinusCircle,
  Trash2,
  Info,
  Pencil,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { normalizeDigits } from "./FormatNumber";
import NumberInput from "./NumberInput";
import TagPickerField from "../components/Tags/components/TagPickerField";
import LinkedSupplierField from "./LinkedSupplierField";

const defaultOpeningDate = () => `${new Date().getFullYear()}-01-01`;

const Num = ({ children, className = "" }) => (
  <span dir="ltr" className={`font-mono tabular-nums ${className}`}>
    {children}
  </span>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </span>
    {children}
  </label>
);

const DirectionCard = ({
  selected,
  tone,
  icon: Icon,
  title,
  hint,
  onClick,
}) => {
  const tones = {
    green: {
      active: "border-emerald-400 bg-emerald-50 ring-4 ring-emerald-100",
      icon: "text-emerald-600",
      title: "text-emerald-700",
    },
    red: {
      active: "border-red-400 bg-red-50 ring-4 ring-red-100",
      icon: "text-red-600",
      title: "text-red-700",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-2xl border-2 p-3 text-start transition ${
        selected
          ? tones.active
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <Icon
        size={20}
        className={`mt-0.5 shrink-0 ${selected ? tones.icon : "text-gray-400"}`}
      />
      <span className="min-w-0">
        <span
          className={`block text-xs font-black ${
            selected ? tones.title : "text-gray-600"
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
          {hint}
        </span>
      </span>
    </button>
  );
};

const ContactFormModal = ({
  open,
  onClose,
  mode = "create",
  form,
  setForm,
  onSubmit,
  saving,
  actionError,
  title,
  subtitle,
  submitLabel,
  type,
  t,
  remainingPercentage,
}) => {
  const isEdit = mode === "edit";
  const [expanded, setExpanded] = useState(false);
  const originalRef = useRef(null);

  const inputClass =
    "w-full rounded-xl border border-[#dbe4ff] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";
  const ghostButtonClass =
    "flex items-center gap-1.5 rounded-xl border border-[#dbe4ff] bg-white px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff]";

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const amount = Number(form.opening_balance || 0);
  const hasExisting = isEdit && Boolean(form.hasOpeningBalance);
  const markedForRemoval = hasExisting && amount === 0;

  // party_history direction is relative to the party:
  // customer "increase" = they owe you; supplier/partner "increase" = you owe them
  const increaseMeansWeOwe = type === "supplier";
  const theyOweYouValue = increaseMeansWeOwe ? "decrease" : "increase";
  const youOweThemValue = increaseMeansWeOwe ? "increase" : "decrease";
  const theyOweYouSelected =
    (form.balance_type || "increase") === theyOweYouValue;

  // Per-type wording, falling back to the generic keys (partner overrides)
  const label = (key, fallbackKey, vars) =>
    t(`screens.contacts.${type}${key}`, {
      ...vars,
      defaultValue: t(`screens.contacts.${fallbackKey}`, vars),
    });
  const theyOweYouTitle = label("TheyOweYouTitle", "theyOweYou");
  const youOweThemTitle = label("YouOweThemTitle", "youOweThem");

  const balanceDate = form.date || defaultOpeningDate();
  const summaryName = form.name?.trim() || "—";

  // Reset local UI state each time the modal opens / closes
  useEffect(() => {
    if (open) {
      if (!form.date) set({ date: defaultOpeningDate() });
      setExpanded(!isEdit && Number(form.opening_balance || 0) !== 0);
    } else {
      originalRef.current = null;
      setExpanded(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Snapshot the stored balance once it arrives (loaded async in startEdit)
  useEffect(() => {
    if (open && form.hasOpeningBalance && !originalRef.current) {
      originalRef.current = {
        opening_balance: form.opening_balance,
        balance_type: form.balance_type,
        date: form.date,
      };
    }
  }, [open, form.hasOpeningBalance]);

  const restoreOriginal = () => {
    if (originalRef.current) set(originalRef.current);
    setExpanded(false);
  };

  const cancelBalanceEdit = () => {
    if (hasExisting) {
      restoreOriginal();
    } else {
      set({ opening_balance: "" });
      setExpanded(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onSubmit(e);
    if (result !== false) onClose();
  };

  if (!open) return null;

  const directionLabel = theyOweYouSelected ? theyOweYouTitle : youOweThemTitle;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1c2340]/50 p-4 backdrop-blur-sm">
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(28,35,64,0.35)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e9edfb] bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_100%)] px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#4663ff]/10 text-[#4663ff]">
              <UserRound size={18} />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-black text-slate-950">{title}</h3>
              <p className="truncate text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 transition hover:bg-[#eef3ff] hover:text-slate-700"
            title={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {actionError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {actionError}
              </div>
            )}

            {/* Contact details */}
            <section className="space-y-3">
              <Field label={t("ui.name")}>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set({ name: e.target.value })}
                  className={inputClass}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label={t("ui.phone")}>
                  <input
                    value={form.phone}
                    onChange={(e) => set({ phone: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label={t("ui.address")}>
                  <input
                    value={form.address}
                    onChange={(e) => set({ address: e.target.value })}
                    className={inputClass}
                  />
                </Field>
              </div>

              {type === "partner" && (
                <Field label={t("ui.percentage")}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={form.percentage || ""}
                    onChange={(e) =>
                      set({ percentage: normalizeDigits(e.target.value) })
                    }
                    className={inputClass}
                    placeholder="0"
                  />
                  <span className="mt-1 block text-[11px] text-slate-400">
                    {t("screens.contacts.maxPercentageAllowed", {
                      value: remainingPercentage,
                    })}
                  </span>
                </Field>
              )}

              <TagPickerField
                scope={type}
                entityType={type}
                entityId={isEdit ? form.id : null}
                selectedIds={form.tagIds || []}
                onChange={(ids) => set({ tagIds: ids })}
              />
            </section>

            {type === "customer" && (
              <LinkedSupplierField form={form} onChange={set} t={t} />
            )}

            {/* Opening balance */}
            <section className="rounded-2xl border border-[#e9edfb] bg-[#f8faff] p-4">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-[#4663ff] shadow-sm">
                  <Wallet size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-700">
                    {t("ui.opening_balance")}
                    <span className="ms-1.5 text-[11px] font-medium text-slate-400">
                      ({t("ui.optional")})
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs leading-snug text-slate-500">
                    {t("screens.contacts.openingBalanceExplain")}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                {/* 1. Existing balance, collapsed: summary + Change / Delete */}
                {hasExisting && !expanded && !markedForRemoval && (
                  <div
                    className={`rounded-xl border bg-white p-3 ${
                      theyOweYouSelected
                        ? "border-emerald-200"
                        : "border-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {t("screens.contacts.openingBalanceOnRecord")}
                        </p>
                        <p
                          className={`mt-0.5 text-lg font-black ${
                            theyOweYouSelected
                              ? "text-emerald-600"
                              : "text-red-600"
                          }`}
                        >
                          <Num>{amount}</Num>
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-medium text-slate-500">
                          <span>{directionLabel}</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={11} />
                            <Num>{balanceDate}</Num>
                          </span>
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpanded(true)}
                          className={ghostButtonClass}
                        >
                          <Pencil size={12} />
                          {t("screens.contacts.changeOpeningBalance")}
                        </button>
                        <button
                          type="button"
                          onClick={() => set({ opening_balance: "" })}
                          className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 size={12} />
                          {t("common.delete")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Existing balance marked for removal: notice + Undo */}
                {markedForRemoval && (
                  <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5">
                    <span className="flex items-start gap-2 text-xs font-bold text-red-700">
                      <Trash2 size={14} className="mt-0.5 shrink-0" />
                      {t("screens.contacts.openingBalanceWillBeRemoved")}
                    </span>
                    <button
                      type="button"
                      onClick={restoreOriginal}
                      className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-100"
                    >
                      <RotateCcw size={12} />
                      {t("common.undo")}
                    </button>
                  </div>
                )}

                {/* 3. No balance, collapsed: add button */}
                {!hasExisting && !expanded && (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#4663ff]/40 bg-white py-2.5 text-xs font-bold text-[#4663ff] transition hover:bg-[#eef3ff]"
                  >
                    <Plus size={14} />
                    {t("screens.contacts.addOpeningBalance")}
                  </button>
                )}

                {/* 4. Expanded: amount, direction, date, summary */}
                {expanded && !markedForRemoval && (
                  <div className="space-y-3">
                    <Field label={t("ui.amount")}>
                      <NumberInput
                        value={form.opening_balance}
                        onChange={(val) => set({ opening_balance: val })}
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </Field>

                    <div>
                      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        {t("screens.contacts.directionQuestion")}
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        <DirectionCard
                          selected={theyOweYouSelected}
                          tone="green"
                          icon={PlusCircle}
                          title={theyOweYouTitle}
                          hint={t(`screens.contacts.${type}TheyOweYouHint`)}
                          onClick={() => set({ balance_type: theyOweYouValue })}
                        />
                        <DirectionCard
                          selected={!theyOweYouSelected}
                          tone="red"
                          icon={MinusCircle}
                          title={youOweThemTitle}
                          hint={t(`screens.contacts.${type}YouOweThemHint`)}
                          onClick={() => set({ balance_type: youOweThemValue })}
                        />
                      </div>
                    </div>

                    <Field label={t("screens.contacts.balanceAsOf")}>
                      <input
                        type="date"
                        value={balanceDate}
                        max={new Date().toISOString().slice(0, 10)}
                        onChange={(e) => set({ date: e.target.value })}
                        className={inputClass}
                      />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {t("screens.contacts.balanceAsOfHint")}
                      </span>
                    </Field>

                    {amount !== 0 && (
                      <div
                        className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold ${
                          theyOweYouSelected
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        <Info size={14} className="mt-0.5 shrink-0" />
                        <span>
                          {theyOweYouSelected
                            ? label(
                                "SummaryTheyOweYou",
                                "openingSummaryTheyOweYou",
                                {
                                  name: summaryName,
                                  amount,
                                  date: balanceDate,
                                },
                              )
                            : label(
                                "SummaryYouOweThem",
                                "openingSummaryYouOweThem",
                                {
                                  name: summaryName,
                                  amount,
                                  date: balanceDate,
                                },
                              )}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={cancelBalanceEdit}
                        className={ghostButtonClass}
                      >
                        <X size={12} />
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex gap-2 border-t border-[#e9edfb] bg-[#f8faff] px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#dbe4ff] bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff]"
            >
              {t("common.cancel")}
            </button>
            <button
              disabled={saving}
              className={`flex-1 ${primaryButtonClass}`}
            >
              {isEdit ? <Save size={15} /> : <Plus size={15} />}
              {saving ? t("common.saving") : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};

export default ContactFormModal;
