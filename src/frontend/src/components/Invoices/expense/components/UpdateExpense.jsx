import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Receipt,
  HandCoins,
} from "lucide-react";
import SearchableSelect from "../../../../Global/SearchableSelect";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import useUpdateExpense from "../hooks/useUpdateExpense";

export default function UpdateExpense() {
  const { t } = useTranslation();

  const {
    invoice,
    setInvoice,
    items,
    setItems,
    category,
    suppliers,
    funds,
    loading,
    saving,
    error,
    addItem,
    removeItem,
    updateItem,
    subtotal,
    netTotal,
    submit,
    reset,
    refetch,
    status
  } = useUpdateExpense();

  const [paymentChoice, setPaymentChoice] = useState(null);
  const [deleteItemIndex, setDeleteItemIndex] = useState(null);
  const { money } = usePrimaryCurrency();

  const num = (v) => (isNaN(Number(v)) ? 0 : Number(v));

  const paid = Number(invoice.paid_amount);
  const total = Number(netTotal);

  const inputClass =
    "h-11 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 px-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10 disabled:bg-slate-100";

  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(70,99,255,0.10)]";

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4663ff] text-white">
              <Receipt size={24} />
            </span>

            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[#4663ff]">
                {t("ui.expenses")}
              </p>
              <h1 className="text-3xl font-black">
                {t("screens.expenses.createExpense")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("screens.expenses.manageItemsPayments")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-bold"
            >
              <ArrowLeft size={16} />
              {t("common.back")}
            </button>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <section className={panelClass}>
              <SearchableSelect
                placeholder={t("ui.selectSupplier")}
                options={suppliers}
                selectedValue={invoice.supplier_id}
                onChange={(e) => setInvoice({ ...invoice, supplier_id: e.id })}
              />
            </section>

            {/* ITEMS */}
            <section className="overflow-hidden rounded-[28px] border bg-white/85 shadow">
              <div className="flex items-center justify-between border-b bg-white/70 p-5">
                <h2 className="text-lg font-black">{t("ui.items")}</h2>

                <button
                  onClick={addItem}
                  className="flex items-center gap-2 rounded-2xl bg-[#4663ff] px-4 py-2 text-white"
                >
                  <Plus size={16} />
                  {t("add")}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-[#f8faff] text-xs uppercase">
                    <tr>
                      <th className="p-3">{t("ui.name")}</th>
                      <th className="p-3">{t("ui.price")}</th>
                      <th className="p-3">{t("ui.total")}</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index}>
                        <td className="p-2">
                          <SearchableSelect
                            placeholder={t("ui.selectProduct")}
                            options={category}
                            selectedValue={item.category_id}
                            onChange={(e) =>
                              updateItem(index, "category_id", e.id)
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className={inputClass}
                            value={item.price}
                            onChange={(e) =>
                              updateItem(index, "price", e.target.value)
                            }
                          />
                        </td>

                        <td className="p-2 text-center font-black">
                          {money(item.price)}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            onClick={() => setDeleteItemIndex(index)}
                            className="text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </main>

          <aside className="space-y-4">
            <section className={panelClass}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                  <HandCoins size={19} />
                </span>
                <div>
                  <h3 className="font-black text-slate-950">
                    {t("ui.summary")}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {t("screens.invoices.purchaseTotal")}
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("ui.subtotal")}</span>
                  <span className="font-bold">{money(subtotal)}</span>
                </div>

                <div className="flex justify-between text-xl font-black">
                  <span>{t("ui.total")}</span>
                  <span className="text-[#4663ff]">{money(netTotal)}</span>
                </div>
              </div>
            </section>
            <section className={`${panelClass} space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-black">{t("ui.payment")}</h3>
                <span
                  className={`rounded-xl px-3 py-1 text-xs font-black ${
                    status === "paid"
                      ? "bg-green-100 text-green-700"
                      : status === "partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-red-100 text-red-600"
                  }`}
                >
                  {status.toUpperCase()}
                </span>
              </div>
              <div className="rounded-2xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">
                    {t("screens.invoices.amountToPay")}
                  </span>
                  <span className="font-black text-slate-950">
                    {money(total)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">
                    {t("screens.invoices.paymentInCash")}
                  </span>
                  <span className="font-black text-[#4663ff]">
                    {invoice.currency_symbol}
                    {""}
                    {total * invoice.exchange_rate || money(total)}{" "}
                  </span>
                </div>
              </div>

              {paid > 0 && (
                <SearchableSelect
                  placeholder={t("ui.selectFund")}
                  options={funds}
                  selectedValue={invoice.fund_id}
                  onChange={(e) =>
                    setInvoice((p) => ({
                      ...p,
                      fund_id: e.id,
                      exchange_rate: e.currency_exchangeRate,
                      currency_code: e.currency_code,
                      currency_symbol: e.currency_symbol,
                    }))
                  }
                />
              )}
            </section>

            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4663ff] py-3 text-sm font-black text-white shadow-lg shadow-[#4663ff]/20 hover:bg-[#3854e8] disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? t("common.saving") : t("screens.invoices.saveInvoice")}
            </button>
          </aside>
        </div>
      </div>

      <DeleteModal
        open={deleteItemIndex !== null}
        onClose={() => setDeleteItemIndex(null)}
        onConfirm={() => {
          removeItem(deleteItemIndex);
          setDeleteItemIndex(null);
        }}
      />

      <ToastContainer />
    </div>
  );
}
