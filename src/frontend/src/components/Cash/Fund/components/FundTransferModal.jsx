import { X, Save, ArrowRightLeft, ArrowRight } from "lucide-react";
import { formatMoney } from "../../../../Global/FormatNumber";
import useTransferFundtoFund from "../hooks/useTransferFundtoFund";

export default function FundTransferModal({ isOpen, onClose, refetchList }) {
  const {
    funds,
    form,
    setForm,
    sourceFund,
    targetFund,
    nominalRate,
    isCrossCurrency,
    effectiveRate,
    loading,
    message,
    handleSourceFundChange,
    handleAmountChange,
    handleReceiveAmountChange,
    submit,
    t,
  } = useTransferFundtoFund({ isOpen, refetchList, onClose });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-2xl bg-indigo-100 text-indigo-600">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                {t("screens.transfer.internal_fund_transfer")}
              </h2>
              <p className="text-xs text-gray-500">
                {t("screens.transfer.move_money_safely")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Horizontal flow: source column -> arrow -> destination column.
              Fund select + amount live together in each column so the whole
              transfer reads left-to-right instead of top-to-bottom. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            {/* SOURCE */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                {t("screens.transfer.source_fund")}
              </div>

              <select
                value={form.from_fund_id}
                onChange={handleSourceFundChange}
                className="w-full h-10 rounded-xl border px-3 bg-white outline-none focus:border-indigo-500 text-sm"
              >
                <option value="">
                  {t("screens.transfer.select_source_fund")}
                </option>
                {funds.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({formatMoney(f.balance, f)})
                  </option>
                ))}
              </select>

              <div>
                <label className="text-xs font-medium text-gray-600">
                  {t("screens.transfer.amount")}{" "}
                  {sourceFund && `(${sourceFund.currency_code})`}
                </label>
                <input
                  type="number"
                  value={form.amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  className="w-full h-10 rounded-xl border px-3 mt-1 bg-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm disabled:bg-gray-100"
                  placeholder="0.00"
                  disabled={!form.from_fund_id}
                />
              </div>
            </div>

            {/* ARROW */}
            <div className="flex h-full items-center justify-center pt-8">
              <div className="rounded-full bg-indigo-100 text-indigo-600 p-2">
                <ArrowRight size={18} />
              </div>
            </div>

            {/* DESTINATION */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">
                {t("screens.transfer.destination_fund")}
              </div>

              <select
                value={form.to_fund_id}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, to_fund_id: e.target.value }))
                }
                disabled={!form.from_fund_id}
                className="w-full h-10 rounded-xl border px-3 bg-white outline-none focus:border-indigo-500 text-sm disabled:bg-gray-100"
              >
                <option value="">
                  {t("screens.transfer.select_destination_fund")}
                </option>
                {funds
                  .filter((f) => f.id !== Number(form.from_fund_id))
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({formatMoney(f.balance, f)})
                    </option>
                  ))}
              </select>

              <div>
                <label className="text-xs font-medium text-gray-600">
                  {t("screens.transfer.destination_receives")}{" "}
                  {targetFund && `(${targetFund.currency_code})`}
                </label>
                <input
                  type="number"
                  value={form.receive_amount}
                  onChange={(e) => handleReceiveAmountChange(e.target.value)}
                  className={`w-full h-10 rounded-xl border px-3 mt-1 focus:ring-2 focus:ring-emerald-500 outline-none text-sm disabled:bg-gray-100 ${
                    isCrossCurrency ? "bg-white" : "bg-gray-100 text-gray-500"
                  }`}
                  placeholder="0.00"
                  disabled={
                    !isCrossCurrency || !form.to_fund_id || !form.amount
                  }
                />
              </div>
            </div>
          </div>

          {/* Rate breakdown — only meaningful once both amounts exist and
              the currencies actually differ. */}
          {isCrossCurrency && form.amount && form.receive_amount ? (
            <div className="flex justify-between text-xs text-gray-500 bg-slate-50 p-2.5 rounded-xl border border-dashed">
              <span>
                {t("ui.fundRate") || "Fund rate"}:{" "}
                <strong>{nominalRate.toFixed(4)}</strong>
              </span>
              <span>
                {t("ui.effectiveRate") || "Effective rate"}:{" "}
                <strong
                  className={
                    effectiveRate !== nominalRate
                      ? "text-blue-600"
                      : "text-gray-700"
                  }
                >
                  {effectiveRate.toFixed(4)}
                </strong>
              </span>
            </div>
          ) : null}

          <div>
            <label className="text-sm text-gray-600">
              {t("screens.transfer.internal_remarks")}
            </label>
            <div className="relative mt-1">
              <textarea
                rows={2}
                value={form.note}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, note: e.target.value }))
                }
                className="w-full rounded-xl border p-2 pl-3 outline-none focus:border-indigo-500 text-sm"
                placeholder={t("screens.transfer.note_placeholder")}
              />
            </div>
          </div>

          {message && (
            <div className="text-center text-sm font-medium bg-amber-50 text-amber-700 p-2.5 rounded-xl border border-amber-200">
              {message}
            </div>
          )}
        </div>

        <div className="p-5 border-t bg-gray-50 flex gap-2">
          <button
            onClick={submit}
            disabled={loading}
            className="w-full h-11 rounded-xl text-white flex items-center justify-center gap-2 font-medium bg-indigo-600 hover:bg-indigo-700 transition-all shadow-sm disabled:opacity-50"
          >
            <Save size={18} />
            {loading
              ? t("screens.transfer.processing")
              : t("screens.transfer.execute_transfer")}
          </button>
        </div>
      </div>
    </div>
  );
}
