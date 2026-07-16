import { Check, X } from "lucide-react";
import React from "react";

const POSSystemEditPriceProdcutCart = ({
  setIsPriceModalOpen,
  t,
  newPrice,
  setNewPrice,
  handleSavePrice,
  editingItem,
  isPriceModalOpen,
}) => {
  if (!isPriceModalOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-5 shadow-2xl shadow-stone-900/20">
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <h3 className="text-base font-black text-stone-950 truncate max-w-[80%]">
            {editingItem?.name}
          </h3>
          <button
            type="button"
            onClick={() => setIsPriceModalOpen(false)}
            className="rounded-xl p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="my-5">
          <label className="block text-xs font-bold uppercase  text-stone-500 mb-2">
            {t("Edit Product Price")}
          </label>
          <div className="relative">
            <input
              type="number"
              value={newPrice}
              onChange={(event) => setNewPrice(event.target.value)}
              className="h-12 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 text-lg font-black text-stone-950 outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-500/10"
              placeholder="0.00"
              min="0"
              step="any"
              autoFocus
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setIsPriceModalOpen(false)}
            className="flex-1 h-11 rounded-xl border border-stone-200 bg-white text-sm font-bold text-stone-700 hover:bg-stone-50 transition"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSavePrice}
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

export default POSSystemEditPriceProdcutCart;
