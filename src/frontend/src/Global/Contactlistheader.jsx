import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, X } from "lucide-react";

/**
 * Shared header for SuppliersList / CustomerList / PartnersList.
 * Renders the title/subtitle/search row, plus a "New" button that opens
 * a modal with the create-contact form inline (no separate form component).
 *
 * The modal is rendered via a portal into document.body. This matters
 * because the panels this header sits inside use `backdrop-blur`, and CSS
 * `filter` creates a new containing block for `position: fixed` descendants
 * — without the portal, the modal would center itself relative to that
 * panel instead of the actual viewport.
 *
 * Assumption (please confirm): `onSubmit` is awaited, and the modal closes
 * automatically unless `onSubmit` resolves to `false`. If your submitDraft
 * doesn't return a value on success/failure, tell me and I'll change the
 * close condition (e.g. to check `actionError` after the call instead).
 */
const ContactListHeader = ({
  eyebrow,
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder,

  // create form fields
  createTitle,
  createSubtitle,
  draft,
  setDraft,
  onSubmit,
  saving,
  actionError,
  submitLabel,
  type,
  t,
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  console.log(title);

  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

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

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className={`w-full ${inputClass}`}
            placeholder={t("ui.name")}
          />

          <input
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            className={`w-full ${inputClass}`}
            placeholder={t("ui.phone")}
          />

          <input
            value={draft.address}
            onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            className={`w-full ${inputClass}`}
            placeholder={t("ui.address")}
          />
          <div className="flex gap-2">
            <input
              value={draft.opening_balance}
              onChange={(e) =>
                setDraft({ ...draft, opening_balance: e.target.value })
              }
              className={`w-full ${inputClass}`}
              placeholder={t("ui.opening_balance")}
            />

            {type === "partner" && (
              <select
                value={draft.balance_type}
                onChange={(e) =>
                  setDraft({ ...draft, balance_type: e.target.value })
                }
                className={inputClass}
              >
                <option value="deposit">{t("ui.debit")}</option>
                <option value="withdrawal">{t("ui.credit")}</option>
              </select>
            )}
          </div>

          <button disabled={saving} className={`w-full ${primaryButtonClass}`}>
            <Plus size={15} />
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

          <button
            onClick={() => setModalOpen(true)}
            className={primaryButtonClass}
          >
            <Plus size={15} />
            {t("common.new") || "New"}
          </button>
        </div>
      </div>

      {modalOpen && createPortal(modal, document.body)}
    </>
  );
};

export default ContactListHeader;
