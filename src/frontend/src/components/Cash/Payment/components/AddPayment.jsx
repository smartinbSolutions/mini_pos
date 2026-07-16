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
  Calendar,
  Sparkles,
  Landmark,
  ArrowRight,
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
    showDatePicker,
    minDate,
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

  // Is money flowing IN to the business (collected) or OUT (paid)?
  const isOutflow =
    isPurchase ||
    isExpense ||
    isSupplier ||
    isSalesReturn ||
    (isPartner && form.partner_transaction_type === "expense");

  const accent = isOutflow
    ? {
        bg: "bg-red-50",
        text: "text-red-600",
        solid: "bg-red-600 hover:bg-red-700",
        ring: "border-red-200",
      }
    : {
        bg: "bg-green-50",
        text: "text-green-600",
        solid: "bg-green-600 hover:bg-green-700",
        ring: "border-green-200",
      };

  const finalAccent = useCredit
    ? {
        bg: "bg-emerald-50",
        text: "text-emerald-600",
        solid: "bg-emerald-600 hover:bg-emerald-700",
        ring: "border-emerald-200",
      }
    : accent;

  const title = (() => {
    if (isPurchase) return t("screens.payments.purchasePayment");
    if (isExpense) return t("screens.payments.expensePayment");
    if (isSales) return t("screens.payments.salesPayment");
    if (isCustomer) return t("screens.payments.customer_account_collection");
    if (isPurchaseReturn) return t("screens.payments.purchaseReturnPayment");
    if (isSalesReturn) return t("screens.payments.salesReturnPayment");
    if (isSupplier) return t("screens.payments.supplier_account_collection");
    if (isPartner) {
      return form.partner_transaction_type === "income"
        ? t("screens.payments.partner_deposit")
        : t("screens.payments.partner_withdrawal");
    }
    return "";
  })();

  const partyIcon =
    isPurchase || isExpense || isSupplier ? (
      <Building2 size={18} />
    ) : isSales || isCustomer ? (
      <User size={18} />
    ) : (
      <Users size={18} />
    );

  const partyLabel = (() => {
    if (isPurchase || isExpense || isSupplier) return t("ui.supplier");
    if (isSales || isCustomer) return t("ui.customer");
    return t("screens.payments.partner");
  })();

  const selectedFund = funds?.find((f) => f.id === Number(form.fund_id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border">
        {/* HEADER */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${finalAccent.bg}`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-2xl bg-white ${finalAccent.text} shadow-sm`}
            >
              {isOutflow ? (
                <ArrowUpRight size={20} />
              ) : (
                <ArrowDownLeft size={20} />
              )}
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">{title}</h2>
              {invoice && (
                <p className="text-xs text-gray-500">
                  {t("ui.invoice")} #{invoice?.id}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 text-gray-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* STEP 1 — WHO */}
          <div className="rounded-2xl border p-4 flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${finalAccent.bg} ${finalAccent.text}`}
            >
              {partyIcon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase  text-gray-400">{partyLabel}</p>
              <h3 className="font-medium text-gray-800 truncate">
                {partyName}
              </h3>
            </div>
            {invoice && (
              <div className="text-right shrink-0">
                <p className="text-xs text-gray-400">
                  {t("screens.payments.originalNetTotal")}
                </p>
                <p className="text-sm font-semibold text-gray-700">
                  {money(invoice?.net_total)}
                </p>
              </div>
            )}
          </div>

          {/* PARTNER: deposit vs withdraw */}
          {isPartner && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() =>
                  handleChange("partner_transaction_type", "income")
                }
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                  form.partner_transaction_type === "income"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ArrowDownLeft size={16} />
                {t("screens.payments.deposit")}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleChange("partner_transaction_type", "expense")
                }
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                  form.partner_transaction_type === "expense"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ArrowUpRight size={16} />
                {t("screens.payments.withdraw")}
              </button>
            </div>
          )}

          {/* STEP 2 — HOW IS THIS FUNDED (cash fund vs credit) */}
          <div>
            <p className="text-xs uppercase  text-gray-400 mb-2">
              {t("screens.payments.paymentSource")}
            </p>

            <div className="space-y-2">
              {/* Cash fund option */}
              <button
                type="button"
                onClick={() => useCredit && toggleUseCredit()}
                className={`w-full text-left rounded-2xl border-2 p-3 transition ${
                  !useCredit
                    ? "border-blue-300 bg-blue-50/50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      !useCredit
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Landmark size={16} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">
                      {t("screens.payments.payFromFund")}
                    </p>
                    {!useCredit && (
                      <select
                        value={form.fund_id}
                        onChange={handleFundChange}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full h-9 rounded-lg border px-2 mt-1.5 bg-white text-sm outline-none"
                      >
                        <option value="">{t("ui.selectFund")}</option>
                        {funds?.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name} ({formatMoney(f.balance, f)})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              </button>

              {/* Credit option — only shown if there's credit to use */}
              {!isPartner && availableCredit > 0 && (
                <button
                  type="button"
                  onClick={() => !useCredit && toggleUseCredit()}
                  className={`w-full text-left rounded-2xl border-2 p-3 transition ${
                    useCredit
                      ? "border-emerald-300 bg-emerald-50"
                      : "border-dashed border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <Sparkles size={16} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800">
                          {t("screens.payments.apply_credit")}
                        </p>
                        <p className="text-xs text-emerald-600">
                          {t("screens.payments.credit_available")}:{" "}
                          {money(availableCredit)}
                        </p>
                      </div>
                    </div>
                    <div
                      className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        useCredit
                          ? "border-emerald-600 bg-emerald-600"
                          : "border-emerald-300"
                      }`}
                    >
                      {useCredit && (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* STEP 3 — HOW MUCH */}
          <div className="rounded-2xl border p-4 space-y-3">
            <div>
              <label className="text-xs uppercase  text-gray-400">
                {t(
                  useCredit
                    ? "screens.payments.amountFromCredit"
                    : "screens.payments.amountToReceive"
                )}
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  value={form.amount_in_base}
                  onChange={(e) => handleBaseAmountChange(e.target.value)}
                  className={`w-full h-12 rounded-xl border-2 px-3 text-lg font-semibold focus:ring-2 outline-none ${finalAccent.ring}`}
                  placeholder="0.00"
                  disabled={
                    !useCredit &&
                    (!form.fund_id ||
                      isPurchase ||
                      isSales ||
                      isExpense ||
                      isPurchaseReturn ||
                      isSalesReturn)
                  }
                  max={useCredit ? availableCredit : undefined}
                />
              </div>
              {useCredit && (
                <p className="mt-1 text-xs text-emerald-600">
                  {t("screens.payments.creditCap")}: {money(availableCredit)}
                </p>
              )}
            </div>

            {/* Currency conversion — only relevant when the fund's currency differs */}
            {!useCredit && form.fund_exchangeRate !== 1 && (
              <div className="rounded-xl bg-slate-50 border border-dashed p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{money(form.amount_in_base)}</span>
                  <ArrowRight size={12} />
                  <span>
                    {selectedFund?.currency_symbol || form.currency_symbol}
                  </span>
                </div>
                <div>
                  <label className="text-xs text-gray-600">
                    {t("screens.payments.collected_paid_amount")}
                  </label>
                  <div className="relative mt-1">
                    <input
                      type="number"
                      value={form.collected_amount}
                      onChange={(e) =>
                        handleChange("collected_amount", e.target.value)
                      }
                      className="w-full h-10 rounded-lg border px-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100"
                      disabled={!form.fund_id}
                    />
                    <Wallet
                      className="absolute right-3 top-2.5 text-gray-400"
                      size={16}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
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
              </div>
            )}
          </div>

          {/* STEP 4 — WHEN (hidden when embedded in invoice creation or paying from credit) */}
          {showDatePicker && (
            <div>
              <label className="text-xs uppercase  text-gray-400 flex items-center gap-1.5">
                <Calendar size={12} />
                {t("ui.date")}
              </label>
              <input
                type="date"
                value={form.date}
                min={minDate || undefined}
                onChange={(e) => handleChange("date", e.target.value)}
                className="w-full h-11 rounded-xl border px-3 mt-1 bg-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              {minDate && (
                <p className="mt-1 text-xs text-gray-400">
                  {t("screens.payments.dateNotBefore", { date: minDate })}
                </p>
              )}
            </div>
          )}

          {/* NOTE */}
          <div>
            <label className="text-xs uppercase  text-gray-400">
              {t("ui.note")}
            </label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              className="w-full rounded-xl border p-2 mt-1 outline-none text-sm"
              placeholder={t("ui.note")}
            />
          </div>

          {message && (
            <div className="text-center text-sm font-medium bg-amber-50 text-amber-700 p-2.5 rounded-xl border border-amber-200">
              {message}
            </div>
          )}
        </div>

        {/* SUMMARY + CONFIRM */}
        <div className="p-5 border-t bg-gray-50 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {isOutflow
                ? t("screens.payments.summaryPaying")
                : t("screens.payments.summaryReceiving")}
            </span>
            <span className={`font-bold ${finalAccent.text}`}>
              {money(form.amount_in_base || 0)}
            </span>
          </div>
          <button
            onClick={submit}
            disabled={loading}
            className={`w-full h-11 rounded-xl text-white flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-60 ${finalAccent.solid}`}
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
