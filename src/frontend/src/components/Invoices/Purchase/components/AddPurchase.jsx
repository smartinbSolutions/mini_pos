import React, { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Receipt,
  HandCoins,
  PackageOpen,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { toast } from "react-toastify";
import useAddPurchase from "../hooks/useAddPurchase";
import SearchableSelect from "../../../../Global/SearchableSelect";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import InvoicePaymentModal from "../../../Cash/Payment/components/AddPayment";

export default function AddPurchase() {
  const { t } = useTranslation();
  const {
    invoice,
    setInvoice,
    items,
    products,
    suppliers,
    taxes,
    addItem,
    removeItem,
    updateItem,
    submit,
    subtotal,
    taxableAmount,
    taxValue,
    netTotal,
    loading,
    saving,
    error,
    reset,
  } = useAddPurchase();

  const [deleteItemIndex, setDeleteItemIndex] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { money } = usePrimaryCurrency();

  const supplierName =
    suppliers.find((s) => s.id === invoice.supplier_id)?.name || "";

  const hasUsableItems = items.some((i) => i.product_id);
  const canSave = !!invoice.supplier_id && hasUsableItems && !saving;

  const inputClass =
    "h-11 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 px-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10 disabled:bg-slate-100";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(70,99,255,0.10)]";

  const handleSaveUnpaid = async () => {
    if (!canSave) return;
    const res = await submit();
    if (res?.success) {
      toast.success(t("screens.invoices.savedUnpaid") || "Invoice saved");
    }
  };

  const handleOpenPayModal = () => {
    if (!invoice.supplier_id) {
      toast.error(t("errors.supplierRequired"));
      return;
    }
    if (!hasUsableItems) {
      toast.error(t("errors.addOneItem"));
      return;
    }
    setPaymentModalOpen(true);
  };

  const handlePaymentCollected = async (paymentData) => {
    const res = await submit(paymentData);
    if (res?.success) {
      toast.success(t("screens.invoices.savedPaid") || "Invoice saved & paid");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="flex flex-col gap-4 rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4663ff] text-white shadow-lg shadow-[#4663ff]/20">
              <Receipt size={24} />
            </span>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[#4663ff]">
                {t("ui.purchase")}
              </p>
              <h1 className="text-3xl font-black text-slate-950">
                {t("screens.invoices.createPurchase")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("screens.invoices.manageItemsPayments")}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff] disabled:opacity-50"
            >
              {t("common.refresh")}
            </button>
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

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            {/* Supplier + date */}
            <section className={panelClass}>
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <SearchableSelect
                    placeholder={t("ui.selectSupplier")}
                    options={suppliers}
                    selectedValue={invoice?.supplier_id}
                    onChange={(e) =>
                      setInvoice({ ...invoice, supplier_id: e.id })
                    }
                  />
                  {!invoice.supplier_id && (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-amber-600">
                      <AlertCircle size={12} />
                      {t("errors.supplierRequired")}
                    </p>
                  )}
                </div>

                <input
                  type="date"
                  className={inputClass}
                  value={invoice.date}
                  onChange={(e) =>
                    setInvoice({ ...invoice, date: e.target.value })
                  }
                />
              </div>
            </section>

            {/* Items */}
            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
              <div className="flex items-center justify-between border-b border-[#e5ebff] bg-white/70 p-5">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-black text-slate-950">
                    {t("ui.items")}
                    {items.length > 0 && (
                      <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-xs font-bold text-[#4663ff]">
                        {items.length}
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t("screens.invoices.productsOnInvoice")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#4663ff] px-4 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8]"
                >
                  <Plus size={16} />
                  {t("screens.invoices.addItem")}
                </button>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 p-12 text-slate-400">
                  <Loader2 size={28} className="animate-spin" />
                  <p className="text-sm font-medium">{t("common.loading")}</p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 p-12 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                    <PackageOpen size={26} />
                  </span>
                  <div>
                    <p className="font-bold text-slate-700">
                      {t("screens.invoices.noItemsYet") || "No items yet"}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t("screens.invoices.addItemToStart") ||
                        "Add a product to start this invoice."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-1 inline-flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 py-2 text-sm font-bold text-[#4663ff] transition hover:bg-[#eef3ff]"
                  >
                    <Plus size={16} />
                    {t("screens.invoices.addItem")}
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="p-3 text-left">{t("ui.product")}</th>
                          <th className="p-3">{t("ui.qty")}</th>
                          <th className="p-3">{t("ui.price")}</th>
                          <th className="p-3">{t("ui.total")}</th>
                          <th className="p-3"></th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#e5ebff]">
                        {items.map((item, index) => (
                          <tr
                            key={index}
                            className="transition hover:bg-[#f8faff]"
                          >
                            <td className="p-2">
                              <SearchableSelect
                                placeholder={t("ui.selectProduct")}
                                options={products}
                                selectedValue={item.product_id}
                                onChange={(e) =>
                                  updateItem(index, "product_id", e.id)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                className={inputClass}
                                value={item.quantity}
                                onChange={(e) =>
                                  updateItem(index, "quantity", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                className={inputClass}
                                value={item.price}
                                onChange={(e) =>
                                  updateItem(index, "price", e.target.value)
                                }
                              />
                            </td>
                            <td className="p-2 text-center font-black">
                              {money(item.total)}
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => setDeleteItemIndex(index)}
                                disabled={items.length === 1}
                                title={
                                  items.length === 1
                                    ? t("screens.invoices.keepOneItem") ||
                                      "At least one item is required"
                                    : undefined
                                }
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

                  {/* Mobile stacked cards */}
                  <div className="divide-y divide-[#e5ebff] md:hidden">
                    {items.map((item, index) => (
                      <div key={index} className="space-y-3 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
                            {t("ui.product")} #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDeleteItemIndex(index)}
                            disabled={items.length === 1}
                            className="rounded-xl p-1.5 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <SearchableSelect
                          placeholder={t("ui.selectProduct")}
                          options={products}
                          selectedValue={item.product_id}
                          onChange={(e) =>
                            updateItem(index, "product_id", e.id)
                          }
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">
                              {t("ui.qty")}
                            </label>
                            <input
                              type="number"
                              min="0"
                              className={inputClass}
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, "quantity", e.target.value)
                              }
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-xs font-semibold text-slate-500">
                              {t("ui.price")}
                            </label>
                            <input
                              type="number"
                              min="0"
                              className={inputClass}
                              value={item.price}
                              onChange={(e) =>
                                updateItem(index, "price", e.target.value)
                              }
                            />
                          </div>
                        </div>
                        <div className="flex justify-between rounded-xl bg-[#f8faff] px-3 py-2 text-sm">
                          <span className="text-slate-500">
                            {t("ui.total")}
                          </span>
                          <span className="font-black">
                            {money(item.total)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </section>
          </main>

          <aside className="space-y-4">
            {/* Summary */}
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

              {/* Editable inputs — label left, control right, fixed control width so
      every row's right edge lines up regardless of input vs select */}
              <div className="space-y-3">
                <div className="grid grid-cols-[1fr_9rem] items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {t("ui.subtotal")}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums">
                    {money(subtotal)}
                  </span>
                </div>

                <div className="grid grid-cols-[1fr_9rem] items-center gap-3">
                  <label className="text-sm text-slate-500">
                    {t("ui.discount")}
                  </label>
                  <input
                    type="number"
                    min="0"
                    className={`${inputClass} text-right tabular-nums`}
                    value={invoice.discount || ""}
                    onChange={(e) =>
                      setInvoice((p) => ({ ...p, discount: e.target.value }))
                    }
                    placeholder="0"
                  />
                </div>

                <div className="grid grid-cols-[1fr_9rem] items-center gap-3">
                  <label className="text-sm text-slate-500">
                    {t("ui.tax")}
                  </label>
                  <select
                    className={`${inputClass} text-right`}
                    value={invoice.tax || ""}
                    onChange={(e) => {
                      const selected = taxes.find(
                        (tax) => tax.id === Number(e.target.value)
                      );
                      setInvoice((p) => ({
                        ...p,
                        tax: selected?.id || "",
                        tax_rate: selected?.rate || 0,
                      }));
                    }}
                  >
                    <option value="">{t("ui.selectTax")}</option>
                    {taxes.map((tax) => (
                      <option key={tax.id} value={tax.id}>
                        {tax.name} ({tax.rate}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="my-4 h-px bg-[#e5ebff]" />

              {/* Computed values — same grid, no inputs, so the two blocks visually
      align on the same right edge without looking editable */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-[1fr_9rem] items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {t("screens.invoices.taxableAmount")}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums">
                    {money(taxableAmount)}
                  </span>
                </div>
                <div className="grid grid-cols-[1fr_9rem] items-center gap-3">
                  <span className="text-sm text-slate-500">
                    {t("screens.invoices.taxAmount")}
                  </span>
                  <span className="text-right text-sm font-bold tabular-nums text-emerald-700">
                    {money(taxValue)}
                  </span>
                </div>
              </div>

              {/* Total — pulled into its own highlighted block so it reads as the
      final answer, not just another row in the list */}
              <div className="mt-4 grid grid-cols-[1fr_9rem] items-center gap-3 rounded-2xl bg-[#f8faff] px-4 py-3">
                <span className="text-sm font-bold text-slate-700">
                  {t("ui.total")}
                </span>
                <span className="text-right text-xl font-black tabular-nums text-[#4663ff]">
                  {money(netTotal)}
                </span>
              </div>
            </section>

            {/* Payment choice */}
            <section className={`${panelClass} space-y-3`}>
              <div>
                <h3 className="font-black">{t("ui.payment")}</h3>
                <p className="text-xs text-slate-500">
                  {t("screens.invoices.paymentHelper") ||
                    "Save now and settle later, or pay right away."}
                </p>
              </div>

              <div className="grid gap-2">
                <button
                  type="button"
                  onClick={handleSaveUnpaid}
                  disabled={!canSave}
                  className="flex items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white py-3 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  {t("screens.invoices.saveUnpaid") || "Save (unpaid)"}
                </button>
                <button
                  type="button"
                  onClick={handleOpenPayModal}
                  disabled={!canSave}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-[#4663ff] py-3 text-sm font-black text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Save size={16} />
                  {t("screens.invoices.saveAndPay") || "Save & Pay"}
                </button>
              </div>

              {!canSave && !saving && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <AlertCircle size={12} />
                  {!invoice.supplier_id
                    ? t("errors.supplierRequired")
                    : t("errors.addOneItem")}
                </p>
              )}
            </section>
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

      <InvoicePaymentModal
        isOpen={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        invoice={null}
        totalAmount={netTotal}
        party={invoice.supplier_id}
        partyName={supplierName}
        mode="purchase"
        onSubmit={handlePaymentCollected}
        confirmLabel={t("screens.invoices.saveInvoice")}
      />

      <ToastContainer />
    </div>
  );
}
