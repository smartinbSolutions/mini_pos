import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, X } from "lucide-react";

/**
 * Header for FundList — same visual/interaction pattern as ContactListHeader
 * (title/subtitle/search row + "New" button opening a portal-rendered modal),
 * but kept as its own component since funds have their own create-form shape
 * (name + currency select + initial balance) instead of name/phone/address.
 *
 * Same assumption as ContactListHeader: `onSubmit` is awaited and the modal
 * closes unless it resolves to `false`.
 */
const FundListHeader = ({
  eyebrow,
  title,
  subtitle,
  accountCount,
  accountsLabel,
  search,
  onSearchChange,
  searchPlaceholder,

  // create form fields
  createTitle,
  createSubtitle,
  draft,
  setDraft,
  currencies,
  onSubmit,
  saving,
  actionError,
  setActionError,
  submitLabel,

  t,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = () => {
    setActionError?.("");
    setModalOpen(true);
  };

  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-4 py-2.5 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onSubmit(e);
    if (result !== false) {
      setModalOpen(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4"
      onClick={() => setModalOpen(false)}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] border border-white/80 bg-white/95 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.25)] backdrop-blur"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setModalOpen(false)}
          className="absolute -top-3 -right-3 z-10 rounded-full bg-white p-1.5 text-slate-500 shadow-md hover:bg-slate-50 hover:text-slate-700"
          title={t("common.close") || "Close"}
        >
          <X size={16} />
        </button>

        <h3 className="mb-1 text-lg font-black text-slate-950">
          {createTitle}
        </h3>
        <p className="mb-5 text-sm text-slate-500">{createSubtitle}</p>

        {actionError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {actionError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={`w-full ${inputClass}`}
            placeholder={t("screens.funds.namePlaceholder")}
          />

          <select
            required
            value={draft.currency_id || ""}
            onChange={(e) => {
              const selected = currencies.find(
                (c) => c.id === Number(e.target.value),
              );

              setDraft({
                ...draft,
                currency_id: selected?.id || "",
                currency_code: selected?.code || "",
                exchange_rate: selected?.exchangeRate || 1,
              });
            }}
            className={`w-full ${inputClass}`}
          >
            <option value="">{t("ui.selectCurrency")}</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          <input
            type="number"
            value={draft.initial_balance || ""}
            onChange={(e) =>
              setDraft({ ...draft, initial_balance: Number(e.target.value) })
            }
            className={`w-full ${inputClass}`}
            placeholder={t("screens.funds.initialBalance")}
          />

          <button disabled={saving} className={`w-full ${primaryButtonClass}`}>
            <Plus size={16} />
            {submitLabel}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between gap-4 p-6 pb-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
            {eyebrow}
          </p>
          <h2 className="text-2xl font-black text-slate-950">{title}</h2>
          <p className="text-sm text-slate-500">{subtitle}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search
              className="absolute left-3 top-2.5 text-slate-400"
              size={16}
            />
            <input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={`${inputClass} pl-9`}
            />
          </div>

          <button onClick={openModal} className={primaryButtonClass}>
            <Plus size={15} />
            {t("common.create")}
          </button>
        </div>
      </div>

      {modalOpen && createPortal(modal, document.body)}
    </>
  );
};

export default FundListHeader;
