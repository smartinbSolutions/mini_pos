import React, { useState } from "react";
import { ArrowLeft, Plus, Trash2, Save, Receipt } from "lucide-react";
import useUpdatePurchase from "../hooks/useUpdatePurchase";
import SearchableSelect from "../../../../Global/SearchableSelect";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";

export default function UpdatePurchase() {
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
    saving,
    error,
    loading,
  } = useUpdatePurchase();
  const { money } = usePrimaryCurrency();
  const [deleteItemIndex, setDeleteItemIndex] = useState(null);

  const inputClass =
    "h-11 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 px-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(70,99,255,0.10)]";

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
                {t("ui.purchase")}
              </p>
              <h1 className="text-3xl font-black text-slate-950">
                {t("screens.invoices.editPurchase")}
              </h1>
              <p className="text-sm text-slate-500">
                {t("screens.invoices.updateItemsTotals")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
          >
            <ArrowLeft size={16} />
            {t("common.back")}
          </button>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <section className={panelClass}>
              <div className="grid gap-3 md:grid-cols-2">
                <SearchableSelect
                  placeholder={t("ui.selectSupplier")}
                  options={suppliers}
                  selectedValue={invoice?.supplier_id}
                  onChange={(e) =>
                    setInvoice({ ...invoice, supplier_id: e.id })
                  }
                />
                <input
                  type="date"
                  className={inputClass}
                  value={invoice?.date?.slice(0, 10)}
                  onChange={(e) =>
                    setInvoice({ ...invoice, date: e.target.value })
                  }
                />
              </div>
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
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#4663ff] px-4 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20"
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
                            className={`${inputClass} mx-auto w-24 text-center`}
                            value={item.quantity}
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
                            className="rounded-xl p-2 text-red-500 hover:bg-red-50"
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
                  value={invoice.tax}
                  onChange={(e) => {
                    const selected = taxes.find(
                      (t) => t.id === Number(e.target.value),
                    );

                    setInvoice({
                      ...invoice,
                      tax: e.target.value || "",
                      tax_rate: selected?.rate || 0,
                    });
                  }}
                >
                  <option value="">{t("ui.selectTax")}</option>
                  {taxes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.rate}%)
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
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
    </div>
  );
}
