import React from "react";
import { X, Check } from "lucide-react";

const POSSystemEditTotalPrice = ({
  isTotalModalOpen,
  setIsTotalModalOpen,
  subtotal,
  customNetTotal,
  setCustomNetTotal,
  handleSaveTotal,
  money,
  t,
}) => {
  if (!isTotalModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl shadow-stone-900/20">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-base font-black text-stone-950">
            {t("screens.pos.changeTotal")}
          </h3>
          <button
            type="button"
            onClick={() => setIsTotalModalOpen(false)}
            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-5 space-y-4">
          <div className="flex justify-between text-sm bg-stone-50 p-3 rounded-xl">
            <span className="text-stone-500 font-medium">
              {t("screens.pos.originalTotal")}:
            </span>
            <span className="font-black text-stone-950">{money(subtotal)}</span>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-stone-500 mb-2">
              {t("screens.pos.finalTotal")}
            </label>
            <div className="relative">
              <input
                type="number"
                value={customNetTotal}
                onChange={(event) => setCustomNetTotal(event.target.value)}
                className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-lg font-black text-stone-950 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
                placeholder="0.00"
                min="0"
                max={subtotal}
                step="any"
                autoFocus
              />
            </div>
            <p className="text-xs text-stone-400 mt-1.5">this is a Discount </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsTotalModalOpen(false)}
            className="flex-1 h-11 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-700 hover:bg-stone-50 transition"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSaveTotal}
            className="flex-1 h-11 flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 text-sm font-bold text-white hover:bg-teal-700 transition"
          >
            <Check size={16} />
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default POSSystemEditTotalPrice;
