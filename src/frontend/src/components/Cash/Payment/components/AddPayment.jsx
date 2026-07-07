import React, { useCallback, useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { formatMoney } from "../../../../Global/FormatNumber";
import { useTranslation } from "react-i18next";
import useAddPayment from "../hooks/useAddPayment";

export default function AddPayment({
  isOpen,
  onClose,
  onSubmit,
  invoice,
  totalAmount,
  party,
  partyName,
  mode = "purchase", // "purchase" | "sales" | "expense" | "partner" | "customer" | "supplier"
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
                {isCustomer && "Customer Account Collection"}
                {isSupplier && "Supplier Balance Settlement"}
                {isPartner &&
                  (form.partner_transaction_type === "income"
                    ? "Partner Deposit — Add Funds"
                    : "Partner Withdrawal — Disburse Funds")}
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
                {isPartner && "Partner"}
              </p>
              <h3 className="font-medium text-gray-800">{partyName}</h3>
            </div>
          </div>

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
                Deposit
              </button>
              <button
                type="button"
                onClick={() =>
                  handleChange("partner_transaction_type", "expense")
                }
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${form.partner_transaction_type === "expense" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <ArrowUpRight size={16} />
                Withdraw
              </button>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">{t("ui.cashFund")}</label>
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

          <hr className="border-dashed" />

          <div>
            <label className="text-sm font-medium text-gray-700">
              Amount to Receive / Pay (Base Currency)
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                value={form.amount_in_base}
                onChange={(e) => handleBaseAmountChange(e.target.value)}
                className="w-full h-11 rounded-xl border px-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                disabled={!form.fund_id}
              />
              <DollarSign
                className="absolute right-3 top-3 text-gray-400"
                size={18}
              />
            </div>
            {invoice && (
              <p className="mt-1 text-xs text-gray-400">
                Original Net Total: {money(invoice?.net_total)}
              </p>
            )}
          </div>

          {form.fund_exchangeRate !== 1 && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Collected / Paid Amount (Fund Currency)
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
                    {t("ui.fundRate")}:{" "}
                    <strong>{form.fund_exchangeRate}</strong>
                  </span>
                  <span>
                    {t("ui.effectiveRate")}:{" "}
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
            className={`w-full h-11 rounded-xl text-white flex items-center justify-center gap-2 font-medium transition-all ${isPurchase || isExpense || isSupplier ? "bg-red-600 hover:bg-red-700" : isSales || isCustomer ? "bg-green-600 hover:bg-green-700" : form.partner_transaction_type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"}`}
          >
            <Save size={18} />
            {loading
              ? t("common.saving")
              : confirmLabel ||
                (isCollectorMode
                  ? "Confirm Collection"
                  : t("screens.payments.savePayment"))}
          </button>
        </div>
      </div>
    </div>
  );
}
