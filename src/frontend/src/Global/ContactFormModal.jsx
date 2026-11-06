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

const defaultOpeningDate = () => `${new Date().getFullYear()}-01-01`;

const Num = ({ children, className = "" }) => (
  <span dir="ltr" className={`font-mono tabular-nums ${className}`}>
    {children}
  </span>
);

const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-1.5 block text-sm font-bold text-ink-soft">
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
      active: "border-ok bg-ok-50 ring-4 ring-ok-100",
      icon: "text-ok-600",
      title: "text-ok-700",
    },
    red: {
      active: "border-danger bg-danger-50 ring-4 ring-danger-100",
      icon: "text-danger-600",
      title: "text-danger-700",
    },
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[52px] items-start gap-3 rounded-2xl border-2 p-3 text-start transition ${
        selected
          ? tones.active
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <Icon
        size={22}
        className={`mt-0.5 shrink-0 ${selected ? tones.icon : "text-slate-400"}`}
      />
      <span className="min-w-0">
        <span
          className={`block text-sm font-black ${
            selected ? tones.title : "text-ink"
          }`}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-sm leading-snug text-ink-muted">
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
    "min-h-[48px] w-full rounded-2xl border-2 border-slate-200 bg-white px-3.5 text-base font-medium text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand-100";
  const primaryButtonClass =
    "ui-btn ui-btn-brand min-h-[48px] px-5";
  const ghostButtonClass =
    "inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-sm font-bold text-ink-soft transition hover:bg-slate-50 hover:text-ink";

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

  // Cache the opening balance as it came in when the modal opened so
  // "Undo delete" or "Cancel edit" can put it back.
  useEffect(() => {
    if (!open) return;
    originalRef.current = {
      opening_balance: form.opening_balance,
      balance_type: form.balance_type,
      date: form.date,
      hasOpeningBalance: form.hasOpeningBalance,
    };
    // New contact with an initial balance starts expanded; edit starts collapsed
    setExpanded(!isEdit && Number(form.opening_balance || 0) > 0);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const restoreOriginal = () => {
    if (originalRef.current) set(originalRef.current);
    setExpanded(false);
  };

  const cancelBalanceEdit = () => {
    if (hasExisting && originalRef.current) {
      set(originalRef.current);
    } else {
      set({ opening_balance: "", balance_type: "increase", date: "" });
    }
    setExpanded(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  const directionLabel = theyOweYouSelected
    ? theyOweYouTitle
    : youOweThemTitle;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-100 bg-slate-50/50 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand">
              <UserRound size={22} />
            </span>
            <div className="min-w-0">
              <h3 className="text-lg font-black text-ink">{title}</h3>
              {subtitle && (
                <p className="truncate text-sm text-ink-muted">{subtitle}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-2xl text-ink-muted transition hover:bg-slate-100 hover:text-ink"
            title={t("common.close")}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {actionError && (
              <div className="rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3 text-sm font-semibold text-danger-700">
                {actionError}
              </div>
            )}

            {/* Contact details */}
            <section className="space-y-3.5">
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
                  <span className="mt-1.5 block text-sm font-medium text-ink-muted">
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

            {/* Opening balance */}
            <section className="rounded-3xl border-2 border-slate-200 bg-slate-50/50 p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-brand shadow-sm">
                  <Wallet size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-base font-bold text-ink">
                    {t("ui.opening_balance")}
                    <span className="ms-1.5 text-sm font-medium text-ink-muted">
                      ({t("ui.optional")})
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm leading-snug text-ink-muted">
                    {t("screens.contacts.openingBalanceExplain")}
                  </p>
                </div>
              </div>

              <div className="mt-3.5">
                {/* 1. Existing balance, collapsed: summary + Change / Delete */}
                {hasExisting && !expanded && !markedForRemoval && (
                  <div
                    className={`rounded-2xl border-2 bg-white p-3.5 ${
                      theyOweYouSelected
                        ? "border-ok bg-ok-50/20"
                        : "border-danger bg-danger-50/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-ink-muted">
                          {t("screens.contacts.openingBalanceOnRecord")}
                        </p>
                        <p
                          className={`mt-0.5 text-xl font-black ${
                            theyOweYouSelected
                              ? "text-ok-600"
                              : "text-danger-600"
                          }`}
                        >
                          <Num>{amount}</Num>
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm font-medium text-ink-muted">
                          <span>{directionLabel}</span>
                          <span className="text-slate-300">•</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={13} />
                            <Num>{balanceDate}</Num>
                          </span>
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => setExpanded(true)}
                          className={ghostButtonClass}
                        >
                          <Pencil size={14} />
                          {t("screens.contacts.changeOpeningBalance")}
                        </button>
                        <button
                          type="button"
                          onClick={() => set({ opening_balance: "" })}
                          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-danger-100 bg-white px-3.5 py-1.5 text-sm font-bold text-danger transition hover:bg-danger-50"
                        >
                          <Trash2 size={14} />
                          {t("common.delete")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Existing balance marked for removal: notice + Undo */}
                {markedForRemoval && (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger-100 bg-danger-50 px-4 py-3">
                    <span className="flex items-start gap-2 text-sm font-bold text-danger-700">
                      <Trash2 size={16} className="mt-0.5 shrink-0" />
                      {t("screens.contacts.openingBalanceWillBeRemoved")}
                    </span>
                    <button
                      type="button"
                      onClick={restoreOriginal}
                      className="flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-white px-3.5 py-1 text-sm font-bold text-danger shadow-sm transition hover:bg-danger-100"
                    >
                      <RotateCcw size={14} />
                      {t("common.undo")}
                    </button>
                  </div>
                )}

                {/* 3. No balance, collapsed: add button */}
                {!hasExisting && !expanded && (
                  <button
                    type="button"
                    onClick={() => setExpanded(true)}
                    className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/40 bg-white py-2.5 text-sm font-bold text-brand transition hover:bg-brand-50"
                  >
                    <Plus size={16} />
                    {t("screens.contacts.addOpeningBalance")}
                  </button>
                )}

                {/* 4. Expanded: amount, direction, date, summary */}
                {expanded && !markedForRemoval && (
                  <div className="space-y-3.5">
                    <Field label={t("ui.amount")}>
                      <NumberInput
                        value={form.opening_balance}
                        onChange={(val) => set({ opening_balance: val })}
                        className={inputClass}
                        placeholder="0.00"
                      />
                    </Field>

                    <div>
                      <span className="mb-1.5 block text-sm font-bold text-ink-soft">
                        {t("screens.contacts.directionQuestion")}
                      </span>
                      <div className="grid grid-cols-2 gap-2.5">
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
                      <span className="mt-1.5 block text-sm text-ink-muted">
                        {t("screens.contacts.balanceAsOfHint")}
                      </span>
                    </Field>

                    {amount !== 0 && (
                      <div
                        className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-sm font-bold ${
                          theyOweYouSelected
                            ? "border-ok-100 bg-ok-50 text-ok-700"
                            : "border-danger-100 bg-danger-50 text-danger-700"
                        }`}
                      >
                        <Info size={16} className="mt-0.5 shrink-0" />
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
                        <X size={14} />
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Footer */}
          <div className="flex gap-3 border-t-2 border-slate-100 bg-slate-50/50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn ui-btn-soft min-h-[48px] px-5"
            >
              {t("common.cancel")}
            </button>
            <button
              disabled={saving}
              className={`flex-1 ${primaryButtonClass}`}
            >
              {isEdit ? <Save size={18} /> : <Plus size={18} />}
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
