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
} from "lucide-react";
import { toast } from "react-toastify";
import useAddPurchase from "../hooks/useAddPurchase";
import SearchableSelect from "../../../../Global/SearchableSelect";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import AddPayment from "../../../Cash/Payment/components/AddPayment";
import ProductQuickAddModal from "../../../Products/components/ProductQuickAddModal";
import useProductCatalog from "../../../Products/hooks/useProductCatalog";
import useSuppliersList from "../../../Supplier/hooks/useSuppliersList";
import SupplierFormModal from "./SupplierFormModal";

export default function AddPurchase() {
  const { t } = useTranslation();
  const catalog = useProductCatalog();
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);

  const {
    saving: productSaving,
    canUseUnits,
    canUseTaxes,
    isFormOpen,
    setIsFormOpen,
    submitProduct,
    units,
    taxes: productTaxes,
  } = catalog;

  const {
    invoice,
    setInvoice,
    items,
    suppliers,
    taxes,
    addItem,
    removeItem,
    updateItem,
    setItemProduct,
    addItemWithProduct,
    submit,
    subtotal,
    taxableAmount,
    taxValue,
    netTotal,
    loading,
    saving,
    error,
    reset,
    api,
    setProducts,
    products,
    refetch,
  } = useAddPurchase({ isFormOpen, supplierModalOpen });
  const { submitDraft, setDraft, draft, actionError } = useSuppliersList();

  const [deleteItemIndex, setDeleteItemIndex] = useState(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const { money } = usePrimaryCurrency();

  const supplierName =
    suppliers?.data?.find((s) => s.id === invoice.supplier_id)?.name || "";

  const hasUsableItems = items.some((i) => i.product_id);
  const canSave = !!invoice.supplier_id && hasUsableItems && !saving;

  const inputClass =
    "h-9 w-full rounded-xl border border-[#e1e7fb] bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition placeholder:font-medium placeholder:text-slate-350 focus:border-[#4663ff] focus:ring-[3px] focus:ring-[#4663ff]/12 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";
  const panelClass =
    "relative overflow-hidden rounded-2xl border border-[#e9edfb] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
  const panelBodyClass = "p-4";

  const accentRule = (colorClass) => (
    <div className={`absolute inset-x-0 top-0 h-[3px] ${colorClass}`} />
  );

  const handleSaveUnpaid = async () => {
    if (!canSave) return;
    const res = await submit();
    if (res?.success) {
      toast.success(t("screens.invoices.savedUnpaid"));
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
      toast.success(t("screens.invoices.savedPaid"));
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fd] text-slate-900">
      <div className="mx-auto max-w-7xl space-y-4 p-5">
        {/* Compact header */}
        <section className="flex flex-col gap-3 rounded-2xl border border-[#e9edfb] bg-white px-5 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4663ff] text-white shadow-md shadow-[#4663ff]/25">
              <Receipt size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-[#4663ff]">
                {t("ui.purchase")}
              </p>
              <h1 className="text-lg font-black leading-tight text-slate-950">
                {t("screens.invoices.createPurchase")}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              {t("common.refresh")}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              disabled={saving}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-sm font-bold text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft size={14} />
              {t("common.back")}
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-bold text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <main className="space-y-4">
            {/* Supplier + date */}
            <section className={panelClass}>
              {accentRule("bg-[#4663ff]")}
              <div className={panelBodyClass}>
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <SearchableSelect
                          placeholder={t("ui.selectSupplier")}
                          options={suppliers}
                          selectedValue={invoice?.supplier_id}
                          onChange={(e) =>
                            setInvoice({ ...invoice, supplier_id: e.id })
                          }
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setSupplierModalOpen(true)}
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-[#4663ff] px-3 text-sm font-bold text-white shadow-md shadow-[#4663ff]/25 transition hover:bg-[#3854e8]"
                      >
                        <Plus size={14} />
                        <span>{t("screens.contacts.addSupplier")}</span>
                      </button>
                    </div>

                    {!invoice.supplier_id && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-amber-600">
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
              </div>
            </section>

            {/* Items */}
            <section className={panelClass}>
              {accentRule("bg-violet-500")}
              <div className="flex items-center justify-between gap-3 border-b border-[#eef1ff] px-4 py-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-[13px] font-black text-slate-900">
                    {t("ui.items")}
                  </h2>
                  {items.length > 0 && (
                    <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-600">
                      {items.length}
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#4663ff] px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#3854e8]"
                  >
                    <Plus size={13} />
                    {t("screens.invoices.addItem")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-xs font-bold text-violet-600 transition hover:bg-violet-100"
                  >
                    <Plus size={13} />
                    {t("screens.products.create")}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-2.5 p-10 text-slate-400">
                  <Loader2 size={22} className="animate-spin" />
                  <p className="text-xs font-bold">{t("common.loading")}</p>
                </div>
              ) : items.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2.5 p-10 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3ff] text-[#4663ff]">
                    <PackageOpen size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-700">
                      {t("screens.invoices.noItemsYet")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("screens.invoices.addItemToStart")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addItem}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-[#dbe4ff] bg-white px-3 py-1.5 text-xs font-bold text-[#4663ff] transition hover:bg-[#eef3ff]"
                  >
                    <Plus size={13} />
                    {t("screens.invoices.addItem")}
                  </button>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[720px] text-sm">
                      <thead className="bg-[#f8faff] text-[11px] font-bold uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="p-2.5 text-left">{t("ui.product")}</th>
                          <th className="p-2.5">{t("ui.qty")}</th>
                          <th className="p-2.5">{t("ui.price")}</th>
                          <th className="p-2.5">{t("ui.total")}</th>
                          <th className="p-2.5"></th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-[#eef1ff]">
                        {items.map((item, index) => (
                          <tr
                            key={index}
                            className="transition hover:bg-[#f8faff]"
                          >
                            <td className="p-1.5">
                              <SearchableSelect
                                placeholder={t("ui.selectProduct")}
                                options={products}
                                selectedValue={item.product_id}
                                selectedLabel={item.name}
                                onChange={(e) => {
                                  updateItem(index, "product_id", e.id);
                                }}
                                onInputChange={async (value) => {
                                  if (!value.trim()) return;

                                  try {
                                    const res = await api.getProducts({
                                      page: 1,
                                      limit: 50,
                                      search: value,
                                    });

                                    setProducts(res?.data || []);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                              />
                            </td>
                            <td className="p-1.5">
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
                            <td className="p-1.5">
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
                            <td className="p-1.5 text-center text-sm font-black tabular-nums">
                              {money(item.total)}
                            </td>
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => setDeleteItemIndex(index)}
                                disabled={items.length === 1}
                                title={
                                  items.length === 1
                                    ? t("screens.invoices.keepOneItem")
                                    : undefined
                                }
                                className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile stacked cards */}
                  <div className="divide-y divide-[#eef1ff] md:hidden">
                    {items.map((item, index) => (
                      <div key={index} className="space-y-2.5 p-3.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                            {t("ui.product")} #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDeleteItemIndex(index)}
                            disabled={items.length === 1}
                            className="rounded-lg p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={15} />
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
                            <label className="mb-1 block text-[11px] font-bold text-slate-400">
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
                            <label className="mb-1 block text-[11px] font-bold text-slate-400">
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
                        <div className="flex justify-between rounded-lg bg-[#f8faff] px-3 py-1.5 text-sm">
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
              {accentRule("bg-emerald-500")}
              <div className={panelBodyClass}>
                <div className="mb-3 flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <HandCoins size={15} />
                  </span>
                  <h3 className="text-[13px] font-black text-slate-950">
                    {t("ui.summary")}
                  </h3>
                </div>

                <div className="space-y-2.5">
                  <div className="grid grid-cols-[1fr_7.5rem] items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {t("ui.subtotal")}
                    </span>
                    <span className="text-right text-sm font-black tabular-nums">
                      {money(subtotal)}
                    </span>
                  </div>

                  <div className="grid grid-cols-[1fr_7.5rem] items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500">
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

                  <div className="grid grid-cols-[1fr_7.5rem] items-center gap-2">
                    <label className="text-xs font-semibold text-slate-500">
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

                <div className="my-3 h-px bg-[#eef1ff]" />

                <div className="space-y-2">
                  <div className="grid grid-cols-[1fr_7.5rem] items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {t("screens.invoices.taxableAmount")}
                    </span>
                    <span className="text-right text-sm font-bold tabular-nums">
                      {money(taxableAmount)}
                    </span>
                  </div>
                  <div className="grid grid-cols-[1fr_7.5rem] items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">
                      {t("screens.invoices.taxAmount")}
                    </span>
                    <span className="text-right text-sm font-bold tabular-nums text-emerald-700">
                      {money(taxValue)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-[1fr_7.5rem] items-center gap-2 rounded-xl bg-[#f6f8fd] px-3 py-2.5">
                  <span className="text-xs font-black text-slate-700">
                    {t("ui.total")}
                  </span>
                  <span className="text-right text-lg font-black tabular-nums text-[#4663ff]">
                    {money(netTotal)}
                  </span>
                </div>
              </div>
            </section>

            {/* Payment choice */}
            <section className={panelClass}>
              {accentRule("bg-amber-500")}
              <div className={`${panelBodyClass} space-y-2.5`}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                    <Save size={14} />
                  </span>
                  <h3 className="text-[13px] font-black text-slate-950">
                    {t("ui.payment")}
                  </h3>
                </div>

                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={handleSaveUnpaid}
                    disabled={!canSave}
                    className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : null}
                    {t("screens.invoices.saveUnpaid")}
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPayModal}
                    disabled={!canSave}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2.5 text-sm font-black text-white shadow-md shadow-[#4663ff]/25 transition hover:bg-[#3854e8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save size={15} />
                    {t("screens.invoices.saveAndPay")}
                  </button>
                </div>

                {!canSave && !saving && (
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                    <AlertCircle size={12} />
                    {!invoice.supplier_id
                      ? t("errors.supplierRequired")
                      : t("errors.addOneItem")}
                  </p>
                )}
              </div>
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

      <AddPayment
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

      {supplierModalOpen && (
        <SupplierFormModal
          open={supplierModalOpen}
          onClose={() => setSupplierModalOpen(false)}
          draft={draft}
          setDraft={setDraft}
          onSubmit={async (event) => {
            const result = await submitDraft(event);
            if (result && result.id) {
              setInvoice((prev) => ({ ...prev, supplier_id: result.id }));
              setSupplierModalOpen(false);
            }
          }}
          saving={saving}
          actionError={actionError}
          t={t}
        />
      )}

      {isFormOpen && (
        <ProductQuickAddModal
          units={units}
          taxes={productTaxes}
          canUseUnits={canUseUnits}
          canUseTaxes={canUseTaxes}
          saving={productSaving}
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (form) => {
            try {
              const result = await submitProduct(form);
              const targetIndex = items.findIndex((i) => !i.product_id);

              if (targetIndex === -1) {
                addItemWithProduct({
                  id: result.id,
                  name: form.name,
                  price: form.costPrice,
                });
              } else {
                setItemProduct(targetIndex, {
                  id: result.id,
                  name: form.name,
                  price: form.costPrice,
                });
              }

              setIsFormOpen(false);
              await refetch();
            } catch {
              // actionError already set inside submitProduct/useProductCatalog
            }
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
}
