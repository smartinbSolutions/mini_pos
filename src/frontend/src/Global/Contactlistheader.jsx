import React, { useState } from "react";
import { Plus, Search } from "lucide-react";
import ContactFormModal from "./ContactFormModal";

const ContactListHeader = ({
  eyebrow,
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder,
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
  remainingPercentage,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] px-4 py-2 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

  return (
    <>
      <div className="flex items-center justify-between gap-4 p-6 pb-4">
        <div>
          <p className="mb-1 text-xs font-bold uppercase  text-[#4663ff]">
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
            {t("common.create") || "New"}
          </button>
        </div>
      </div>

      <ContactFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        mode="create"
        form={draft}
        setForm={setDraft}
        onSubmit={onSubmit}
        saving={saving}
        actionError={actionError}
        title={createTitle}
        subtitle={createSubtitle}
        submitLabel={submitLabel}
        type={type}
        t={t}
        remainingPercentage={remainingPercentage}
      />
    </>
  );
};

export default ContactListHeader;
