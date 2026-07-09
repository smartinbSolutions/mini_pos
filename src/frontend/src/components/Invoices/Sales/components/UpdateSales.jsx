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
import useUpdateSales from "../hooks/useUpdateSales";
import SearchableSelect from "../../../../Global/SearchableSelect";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import AddPayment from "../../../Cash/Payment/components/AddPayment";
import { ToastContainer } from "react-toastify";

export default function UpdateSales() {
  const { t } = useTranslation();
  const {
    invoice,
    setInvoice,
    items,
    products,
    customers,
    taxes,
    loading,
    saving,
    error,

    addItem,
    removeItem,
    updateItem,
    submit,

    subtotal,
    taxableAmount,
    taxValue,
    netTotal,

    status,
  } = useUpdateSales();

  const { money } = usePrimaryCurrency();
  const [deleteItemIndex, setDeleteItemIndex] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const customerName =
    customers?.data?.find((c) => c.id === invoice?.customer_id)?.name || "";

  const isLocked = status === "paid" || status === "partial";
  const hasUsableItems = items.some((i) => i.product_id);
  const canSave =
    !!invoice?.customer_id && hasUsableItems && !saving && !isLocked;

  const inputClass =
    "h-11 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 px-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10 disabled:bg-slate-100";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(70,99,255,0.10)]";

  const handleSaveUnpaid = async () => {
    if (!canSave) return;
    const res = await submit();
    if (res?.success) {
      toast.success(t("screens.invoices.savedUnpaid") || "Invoice updated");
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
      toast.success(
        t("screens.invoices.savedPaid") || "Invoice updated & paid",
      );
      setPaymentModalOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ff] text-slate-500">
        {t("common.loading")}
      </div>
    );
  }

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
                {t("ui.sales")}
              </p>
              <h1 className="text-3xl font-black text-slate-950">
                {t("screens.invoices.editSales")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("screens.invoices.updateItemsTotals")}
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
              {t(`screens.invoices.${status}`)}
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
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {isLocked && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            <Lock size={18} className="mt-0.5 shrink-0" />
            <span>
              {t("screens.invoices.lockedAfterPayment") ||
                "This invoice has a payment recorded and can no longer be edited."}
            </span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <section className={panelClass}>
              <div className="grid gap-3 md:grid-cols-2">
                <SearchableSelect
                  placeholder={t("ui.selectCustomer")}
                  options={customers}
                  selectedValue={invoice?.customer_id}
                  onChange={(customer) =>
                    setInvoice({ ...invoice, customer_id: customer.id })
                  }
                  disabled={isLocked}
                />
                <input
                  type="date"
                  className={inputClass}
                  value={invoice?.date?.slice(0, 10)}
                  disabled={isLocked}
                  onChange={(e) =>
                    setInvoice({ ...invoice, date: e.target.value })
                  }
                />
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  className={inputClass}
                  placeholder={
                    t("screens.invoices.invoiceName") || "Invoice name"
                  }
                  value={invoice.invoice_name || ""}
                  disabled={isLocked}
                  onChange={(e) =>
                    setInvoice({ ...invoice, invoice_name: e.target.value })
                  }
                />
              </div>

              <textarea
                className={`${inputClass} mt-3 h-24 resize-none py-3`}
                placeholder={t("ui.description") || "Description (optional)"}
                value={invoice.description || ""}
                disabled={isLocked}
                onChange={(e) =>
                  setInvoice({ ...invoice, description: e.target.value })
                }
              />
            </section>

            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
              <div className="flex items-center justify-between border-b border-[#e5ebff] bg-white/70 p-5">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    {t("ui.items")}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {t("screens.invoices.productsOnInvoice")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  disabled={isLocked}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#4663ff] px-4 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} />
                  {t("screens.invoices.addItem")}
                </button>
              </div>

              <div className="overflow-x-auto">
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
                      <tr key={index} className="transition hover:bg-[#f8faff]">
                        <td className="p-2">
                          <SearchableSelect
                            placeholder={t("ui.selectProducts")}
                            options={products}
                            selectedValue={item.product_id}
                            onChange={(e) => {
                              updateItem(index, "product_id", e.id);
                              updateItem(index, "buyingPrice", e.costPrice);
                            }}
                            disabled={isLocked}
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className={`${inputClass} mx-auto w-24 text-center`}
                            value={item.quantity}
                            disabled={isLocked}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            className={`${inputClass} mx-auto w-28 text-center`}
                            value={item.price}
                            disabled={isLocked}
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
                            disabled={items.length === 1 || isLocked}
                            className="rounded-xl p-2 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300"
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
            <section className={`${panelClass} space-y-4`}>
              <h3 className="font-black text-slate-950">{t("ui.summary")}</h3>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">{t("ui.subtotal")}</span>
                <span className="font-bold">{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t("ui.discount")}</span>
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} w-36`}
                  value={invoice.discount || ""}
                  disabled={isLocked}
                  onChange={(e) =>
                    setInvoice({
                      ...invoice,
                      discount: e.target.value,
                    })
                  }
                  placeholder="0"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">{t("ui.tax")}</span>
                <select
                  className={`${inputClass} w-36`}
                  value={invoice.tax_id}
                  disabled={isLocked}
                  onChange={(e) => {
                    const selected = taxes.find(
                      (tax) => tax.id === Number(e.target.value),
                    );

                    setInvoice({
                      ...invoice,
                      tax_id: selected?.id || "",
                      tax_rate: selected?.rate || 0,
                    });
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
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {t("screens.invoices.taxableAmount")}
                </span>
                <span className="font-bold">{money(taxableAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">
                  {t("screens.invoices.taxAmount")}
                </span>
                <span className="font-bold text-emerald-700">
                  {money(taxValue)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#e5ebff] pt-4 text-xl font-black">
                <span>{t("ui.total")}</span>
                <span className="text-[#4663ff]">{money(netTotal)}</span>
              </div>
            </section>

            {!isLocked && (
              <section className={`${panelClass} space-y-3`}>
                <div>
                  <h3 className="font-black">{t("ui.payment")}</h3>
                  <p className="text-xs text-slate-500">
                    {t("screens.invoices.save_now_settle_later") ||
                      "Save your edits and settle later, or pay right away."}
                  </p>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={handleSaveUnpaid}
                    disabled={!canSave}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#4663ff] py-3 text-sm font-black text-white shadow-lg shadow-[#4663ff]/20 hover:bg-[#3854e8] disabled:opacity-60"
                  >
                    <Save size={16} />
                    {saving
                      ? t("common.saving")
                      : t("screens.invoices.saveInvoice")}
                  </button>
                </div>

                {!canSave && !saving && (
                  <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <AlertCircle size={12} />
                    {!invoice?.customer_id
                      ? t("errors.customer_required")
                      : t("errors.addOneItem")}
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
        party={invoice?.customer_id}
        partyName={customerName}
        mode="sales"
        onSubmit={handlePaymentCollected}
        confirmLabel={t("screens.invoices.saveInvoice")}
      />

      <ToastContainer />
    </div>
  );
}
