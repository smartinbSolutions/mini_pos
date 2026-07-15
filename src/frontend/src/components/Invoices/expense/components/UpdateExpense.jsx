import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Receipt,
  HandCoins,
  AlertCircle,
  Lock,
} from "lucide-react";
import { toast } from "react-toastify";
import SearchableSelect from "../../../../Global/SearchableSelect";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import useUpdateExpense from "../hooks/useUpdateExpense";
import AddPayment from "../../../Cash/Payment/components/AddPayment";

export default function UpdateExpense() {
  const { t } = useTranslation();

  const {
    invoice,
    setInvoice,
    items,
    category,
    supplierOptions,
    loading,
    saving,
    error,
    addItem,
    removeItem,
    updateItem,
    subtotal,
    netTotal,
    submit,
    status,
  } = useUpdateExpense();

  const [deleteItemIndex, setDeleteItemIndex] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { money } = usePrimaryCurrency();

  const supplierName =
    supplierOptions.find((s) => s.id === invoice.supplier_id)?.name || "";

  // Backend blocks edits once a payment row exists — lock the form to match
  const isLocked = status === "paid" || status === "partial";

  const hasUsableItems = items.some((i) => i.category_id);
  const canSave = hasUsableItems && !saving && !isLocked;

  const inputClass =
    "h-11 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 px-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10 disabled:bg-slate-100";

  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(70,99,255,0.10)]";

  const handleSaveUnpaid = async () => {
    if (!canSave) return;
    const res = await submit();
    if (res?.success) {
      toast.success(t("screens.expenses.savedUnpaid"));
    }
  };

  const handleOpenPayModal = () => {
    if (!hasUsableItems) {
      toast.error(t("errors.addOneItem"));
      return;
    }
    setPaymentModalOpen(true);
  };

  const handlePaymentCollected = async (paymentData) => {
    const res = await submit(paymentData);
    if (res?.success) {
      toast.success(t("screens.expenses.savedPaid"));
      setPaymentModalOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="flex flex-col gap-4 rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4663ff] text-white shadow-lg shadow-[#4663ff]/20">
              <Receipt size={24} />
            </span>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[#4663ff]">
                {t("ui.expense")}
              </p>
              <h1 className="text-3xl font-black text-slate-950">
                {t("screens.expenses.createExpense")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("screens.expenses.manageItemsPayments")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-xl px-3 py-1.5 text-xs font-black ${
                status === "paid"
                  ? "bg-green-100 text-green-700"
                  : status === "partial"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-600"
              }`}
            >
              {status?.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => window.history.back()}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff] disabled:opacity-50"
            >
              <ArrowLeft size={16} />
              {t("common.back")}
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isLocked && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            <Lock size={18} className="mt-0.5 shrink-0" />
            <span>{t("screens.expenses.lockedAfterPayment")}</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <section className={panelClass}>
              <div className="grid gap-4 md:grid-cols-2">
                <SearchableSelect
                  placeholder={t("ui.selectSupplier")}
                  options={supplierOptions}
                  selectedValue={invoice.supplier_id}
                  onChange={(e) =>
                    setInvoice({ ...invoice, supplier_id: e.id })
                  }
                  disabled={isLocked}
                />

                <input
                  type="date"
                  className={inputClass}
                  value={invoice.date}
                  // max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setInvoice({ ...invoice, date: e.target.value })
                  }
                  disabled={isLocked}
                />

                <input
                  type="text"
                  className={inputClass}
                  placeholder={t("ui.expenseName")}
                  value={invoice.invoice_name || ""}
                  onChange={(e) =>
                    setInvoice({ ...invoice, invoice_name: e.target.value })
                  }
                  disabled={isLocked}
                />
              </div>

              <textarea
                className={`${inputClass} mt-4 h-24 resize-none py-3`}
                placeholder={t("ui.description")}
                value={invoice.description || ""}
                onChange={(e) =>
                  setInvoice({ ...invoice, description: e.target.value })
                }
                disabled={isLocked}
              />
            </section>

            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
              <div className="flex items-center justify-between border-b border-[#e5ebff] bg-white/70 p-5">
                <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                  {t("ui.items")}
                  {items.length > 0 && (
                    <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-xs font-bold text-[#4663ff]">
                      {items.length}
                    </span>
                  )}
                </h2>

                <button
                  type="button"
                  onClick={addItem}
                  disabled={isLocked}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#4663ff] px-4 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />
                  {t("screens.invoices.addItem")}
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-3 text-left">{t("ui.name")}</th>
                      <th className="p-3">{t("ui.price")}</th>
                      <th className="p-3">{t("ui.total")}</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e5ebff]">
                    {items.map((item, index) => (
                      <tr key={index} className="transition hover:bg-[#f8faff]">
                        <td className="p-2">
                          <SearchableSelect
                            placeholder={t("ui.selectExpense")}
                            options={category}
                            selectedValue={item.category_id}
                            onChange={(e) =>
                              updateItem(index, "category_id", e.id)
                            }
                            disabled={isLocked}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min="0"
                            className={inputClass}
                            value={item.price}
                            disabled={isLocked}
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
                            type="button"
                            onClick={() => setDeleteItemIndex(index)}
                            disabled={items.length === 1 || isLocked}
                            className="rounded-xl p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
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
                    {t("screens.expenses.expensesTotal")}
                  </p>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="grid grid-cols-[1fr_9rem] items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {t("ui.subtotal")}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums">
                    {money(subtotal)}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_9rem] items-center gap-3 rounded-2xl bg-[#f8faff] px-4 py-3">
                <span className="text-sm font-bold text-slate-700">
                  {t("ui.total")}
                </span>
                <span className="text-right text-xl font-black tabular-nums text-[#4663ff]">
                  {money(netTotal)}
                </span>
              </div>
            </section>

            {!isLocked && (
              <section className={`${panelClass} space-y-3`}>
                <div>
                  <h3 className="font-black">{t("ui.payment")}</h3>
                  <p className="text-xs text-slate-500">
                    {t("screens.expenses.paymentHelper")}
                  </p>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={handleSaveUnpaid}
                    disabled={!canSave}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white py-3 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving
                      ? t("common.saving")
                      : t("screens.invoices.saveInvoice")}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPayModal}
                    disabled={!canSave}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-[#4663ff] py-3 text-sm font-black text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <HandCoins size={16} />
                    {t("screens.invoices.saveAndPay")}
                  </button>
                </div>

                {!canSave && !saving && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <AlertCircle size={12} />
                    {t("errors.addOneItem")}
                  </p>
                )}
              </section>
            )}
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
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />

      <AddPayment
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoice={null}
        totalAmount={netTotal}
        party={invoice.supplier_id}
        partyName={supplierName}
        mode="expense"
        onSubmit={handlePaymentCollected}
        confirmLabel={t("screens.invoices.saveInvoice")}
      />

      <ToastContainer />
    </div>
  );
}
