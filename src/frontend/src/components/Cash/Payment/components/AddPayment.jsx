import React from "react";
import {
  Wallet,
  Save,
  X,
  Receipt,
  Building2,
  User,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Sparkles,
} from "lucide-react";
import { formatMoney } from "../../../../Global/FormatNumber";
import useAddPayment from "../hooks/useAddPayment";

export default function AddPayment({
  isOpen,
  onClose,
  onSubmit,
  invoice,
  totalAmount,
  party,
  partyName,
  mode = "purchase",
  refetchList,
  confirmLabel,
}) {
  const {
    form,
    funds,
    loading,
    message,
    effectiveRate,
    handleChange,
    handleFundChange,
    handleBaseAmountChange,
    submit,
    isPartner,
    isPurchase,
    isExpense,
    isSales,
    isCustomer,
    isSupplier,
    isCollectorMode,
    initialBaseAmount,
    t,
    money,
    availableCredit,
    useCredit,
    toggleUseCredit,
    isPurchaseReturn,
    isSalesReturn,
  } = useAddPayment({
    isOpen,
    onClose,
    onSubmit,
    invoice,
    totalAmount,
    party,
    partyName,
    mode,
    refetchList,
    confirmLabel,
  });

  if (!isOpen) return null;

  const getHeaderStyle = () => {
    if (isPurchase || isExpense || isSupplier) return "bg-red-100 text-red-600";
    if (isSales || isCustomer) return "bg-green-100 text-green-600";
    return form.partner_transaction_type === "income"
      ? "bg-emerald-100 text-emerald-600"
      : "bg-orange-100 text-orange-600";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl ${getHeaderStyle()}`}>
              {isPartner ? <Users size={20} /> : <Receipt size={20} />}
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                {isPurchase && t("screens.payments.purchasePayment")}
                {isExpense && t("screens.payments.expensePayment")}
                {isSales && t("screens.payments.salesPayment")}
                {isCustomer &&
                  t("screens.payments.customer_account_collection")}
                {isPurchaseReturn &&
                  t("screens.payments.purchaseReturnPayment")}
                {isSalesReturn && t("screens.payments.salesReturnPayment")}
                {isSupplier &&
                  t("screens.payments.supplier_account_collection")}
                {isPartner &&
                  (form.partner_transaction_type === "income"
                    ? t("screens.payments.partner_deposit")
                    : t("screens.payments.partner_withdrawal"))}
              </h2>
              {invoice && (
                <p className="text-xs text-gray-500">
                  {t("ui.invoice")} #{invoice?.id}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="rounded-2xl border p-4 bg-gray-50 flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${isPurchase || isExpense || isSupplier ? "bg-blue-100 text-blue-600" : isSales || isCustomer ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"}`}
            >
              {isPurchase || isExpense || isSupplier ? (
                <Building2 size={18} />
              ) : isSales || isCustomer ? (
                <User size={18} />
              ) : (
                <Users size={18} />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {(isPurchase || isExpense || isSupplier) && t("ui.supplier")}
                {(isSales || isCustomer) && t("ui.customer")}
                {isPartner && t("screens.payments.partner")}
              </p>
              <h3 className="font-medium text-gray-800">{partyName}</h3>
            </div>
          </div>

          {/* CREDIT BANNER */}
          {!isPartner && availableCredit > 0 && (
            <div
              className={`rounded-2xl border p-4 transition ${
                useCredit
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-dashed border-emerald-200 bg-emerald-50/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Sparkles size={16} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-emerald-800">
                      {t("screens.payments.credit_available")}
                    </p>
                    <p className="text-xs text-emerald-600">
                      {money(availableCredit)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleUseCredit}
                  className={`rounded-xl px-3 py-2 text-xs font-bold transition ${
                    useCredit
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-emerald-700 border border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  {useCredit
                    ? t("common.applied")
                    : t("screens.payments.apply_credit")}
                </button>
              </div>
            </div>
          )}

          {isPartner && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() =>
                  handleChange("partner_transaction_type", "income")
                }
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${form.partner_transaction_type === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <ArrowDownLeft size={16} />
                {t("screens.payments.deposit")}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleChange("partner_transaction_type", "expense")
                }
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${form.partner_transaction_type === "expense" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <ArrowUpRight size={16} />
                {t("screens.payments.withdraw")}
              </button>
            </div>
          )}

          {!useCredit && (
            <div>
              <label className="text-sm text-gray-600">
                {t("ui.cashFund")}
              </label>
              <select
                value={form.fund_id}
                onChange={handleFundChange}
                className="w-full h-11 rounded-xl border px-3 mt-1 bg-white outline-none"
              >
                <option value="">{t("ui.selectFund")}</option>
                {funds?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({formatMoney(f.balance, f)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <hr className="border-dashed" />

          <div>
            <label className="text-sm font-medium text-gray-700">
              {t(
                useCredit
                  ? "screens.payments.amountFromCredit"
                  : "screens.payments.amountToReceive",
              )}
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                value={form.amount_in_base}
                onChange={(e) => handleBaseAmountChange(e.target.value)}
                className="w-full h-11 rounded-xl border px-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                disabled={
                  !useCredit &&
                  (!form.fund_id ||
                    isPurchase ||
                    isSales ||
                    isExpense ||
                    isPurchase ||
                    isPurchaseReturn ||
                    isSalesReturn)
                }
                max={useCredit ? availableCredit : undefined}
              />
              <DollarSign
                className="absolute right-3 top-3 text-gray-400"
                size={18}
              />
            </div>
            {invoice && (
              <p className="mt-1 text-xs text-gray-400">
                {t("screens.payments.originalNetTotal")}:{" "}
                {money(invoice?.net_total)}
              </p>
            )}
            {useCredit && (
              <p className="mt-1 text-xs text-emerald-600">
                {t("screens.payments.creditCap")}: {money(availableCredit)}
              </p>
            )}
          </div>

          {!useCredit && form.fund_exchangeRate !== 1 && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                {t("screens.payments.collected_paid_amount")}
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  value={form.collected_amount}
                  onChange={(e) =>
                    handleChange("collected_amount", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border px-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                  disabled={!form.fund_id}
                />
                <Wallet
                  className="absolute right-3 top-3 text-gray-400"
                  size={18}
                />
              </div>
              {form.fund_id && (
                <div className="mt-1 flex justify-between text-xs text-gray-500 bg-slate-50 p-2 rounded-lg border border-dashed">
                  <span>
                    {t("screens.ledger.fundRate")}:{" "}
                    <strong>{form.fund_exchangeRate}</strong>
                  </span>
                  <span>
                    {t("screens.ledger.effectiveRate")}:{" "}
                    <strong className="text-blue-600">
                      {effectiveRate.toFixed(4)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">{t("ui.note")}</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              className="w-full rounded-xl border p-2 mt-1 outline-none"
              placeholder={t("ui.note")}
            />
          </div>

          {message && (
            <div className="text-center text-sm font-medium bg-amber-50 text-amber-700 p-2.5 rounded-xl border border-amber-200">
              {message}
            </div>
          )}
        </div>

        <div className="p-5 border-t bg-gray-50">
          <button
            onClick={submit}
            disabled={loading}
            className={`w-full h-11 rounded-xl text-white flex items-center justify-center gap-2 font-medium transition-all ${
              useCredit
                ? "bg-emerald-600 hover:bg-emerald-700"
                : isPurchase || isExpense || isSupplier
                  ? "bg-red-600 hover:bg-red-700"
                  : isSales || isCustomer
                    ? "bg-green-600 hover:bg-green-700"
                    : form.partner_transaction_type === "income"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            <Save size={18} />
            {loading
              ? t("common.saving")
              : confirmLabel ||
                (isCollectorMode
                  ? t("common.add")
                  : t("screens.payments.savePayment"))}
          </button>
        </div>
      </div>
    </div>
  );
}
