import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Wallet,
  Calendar,
  PlusCircle,
  MinusCircle,
  Info,
} from "lucide-react";

const defaultOpeningDate = () => `${new Date().getFullYear()}-01-01`;

export default function SupplierFormModal({
  open,
  onClose,
  draft,
  setDraft,
  onSubmit,
  saving,
  actionError,
  t,
}) {
  useEffect(() => {
    if (open && !draft.date) {
      setDraft((prev) => ({
        ...prev,
        date: defaultOpeningDate(),
      }));
    }
  }, [open]);

  if (!open) return null;

  const inputClass =
    "w-full rounded-xl border border-[#dbe4ff] bg-white px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";

  const buttonClass =
    "flex w-full items-center justify-center gap-2 rounded-xl bg-[#4663ff] px-4 py-2 font-bold text-white transition hover:bg-[#3854e8] disabled:opacity-50";

  const hasOpeningBalance = Number(draft.opening_balance || 0) !== 0;
  const isDebit = draft.balance_type !== "decrease";

  const handleSubmit = async (e) => {
    e.preventDefault();

    const res = await onSubmit(e);

    if (res !== false) {
      onClose();
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 hover:bg-slate-100"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-black">
          {t("screens.contacts.createSupplier")}
        </h2>

        <p className="mb-6 text-sm text-slate-500">
          {t("screens.contacts.addSupplierContact")}
        </p>

        {actionError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-600">
            {actionError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            value={draft.name}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                name: e.target.value,
              }))
            }
            className={inputClass}
            placeholder={t("ui.name")}
          />

          <input
            value={draft.phone}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                phone: e.target.value,
              }))
            }
            className={inputClass}
            placeholder={t("ui.phone")}
          />

          <input
            value={draft.address}
            onChange={(e) =>
              setDraft((p) => ({
                ...p,
                address: e.target.value,
              }))
            }
            className={inputClass}
            placeholder={t("ui.address")}
          />

          <div className="space-y-3 rounded-2xl border border-dashed border-[#dbe4ff] bg-[#f8faff] p-4">
            <div className="flex items-center gap-2">
              <Wallet className="text-[#4663ff]" size={18} />
              <div>
                <div className="font-bold">{t("ui.opening_balance")}</div>
                <div className="text-xs text-slate-500">
                  {t("screens.contacts.openingBalanceHelper")}
                </div>
              </div>
            </div>

            <input
              type="number"
              value={draft.opening_balance}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  opening_balance: e.target.value,
                }))
              }
              className={inputClass}
              placeholder="0"
            />

            {hasOpeningBalance && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        balance_type: "increase",
                      }))
                    }
                    className={`rounded-xl border-2 p-3 ${
                      isDebit
                        ? "border-green-400 bg-green-50"
                        : "border-slate-200"
                    }`}
                  >
                    <PlusCircle
                      className="mx-auto mb-2 text-green-600"
                      size={26}
                    />
                    <div className="text-xs font-bold">
                      {t("screens.contacts.theyOweYou")}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setDraft((p) => ({
                        ...p,
                        balance_type: "decrease",
                      }))
                    }
                    className={`rounded-xl border-2 p-3 ${
                      !isDebit ? "border-red-400 bg-red-50" : "border-slate-200"
                    }`}
                  >
                    <MinusCircle
                      className="mx-auto mb-2 text-red-600"
                      size={26}
                    />
                    <div className="text-xs font-bold">
                      {t("screens.contacts.youOweThem")}
                    </div>
                  </button>
                </div>

                <div>
                  <label className="mb-1 flex items-center gap-2 text-xs font-semibold">
                    <Calendar size={13} />
                    {t("screens.contacts.balanceAsOf")}
                  </label>

                  <input
                    type="date"
                    value={draft.date || defaultOpeningDate()}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        date: e.target.value,
                      }))
                    }
                    className={inputClass}
                  />
                </div>
              </>
            )}
          </div>

          <button disabled={saving} className={buttonClass}>
            <Plus size={16} />
            {t("screens.contacts.addSupplier")}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
