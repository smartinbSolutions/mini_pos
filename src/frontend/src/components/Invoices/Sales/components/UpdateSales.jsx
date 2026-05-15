import React from "react";
import { Plus, Trash2, Save, Receipt } from "lucide-react";
import useUpdateSales from "../hooks/useUpdateSales";
import SearchableSelect from "../../../../Global/SearchableSelect";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";

export default function UpdateSales() {
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
    netTotal,
  } = useUpdateSales();
  const { money } = usePrimaryCurrency();

  const inputClass =
    "h-11 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 px-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(70,99,255,0.10)]";

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ff] text-slate-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[32px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4663ff] text-white shadow-lg shadow-[#4663ff]/20">
              <Receipt size={24} />
            </span>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.22em] text-[#4663ff]">
                Sales
              </p>
              <h1 className="text-3xl font-black text-slate-950">
                Edit Sales Invoice
              </h1>
              <p className="text-sm text-slate-500">
                Update customer, items, and totals
              </p>
            </div>
          </div>
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
                  placeholder="Select Customer"
                  options={customers}
                  selectedValue={invoice?.customer_id}
                  onChange={(e) => setInvoice({ ...invoice, customer_id: e })}
                />
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

            <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
              <div className="flex items-center justify-between border-b border-[#e5ebff] bg-white/70 p-5">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Items</h2>
                  <p className="text-sm text-slate-500">
                    Products on this invoice
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex h-10 items-center gap-2 rounded-2xl bg-[#4663ff] px-4 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Total</th>
                      <th className="p-3"></th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e5ebff]">
                    {items.map((item, index) => (
                      <tr key={index} className="transition hover:bg-[#f8faff]">
                        <td className="p-2">
                          <SearchableSelect
                            placeholder="Select Products"
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
                            onClick={() => removeItem(index)}
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
              <h3 className="font-black text-slate-950">Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-bold">{money(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Tax</span>
                <select
                  className={`${inputClass} w-36`}
                  value={invoice.tax_id}
                  onChange={(e) => {
                    const selected = taxes.find(
                      (t) => t.id === Number(e.target.value),
                    );

                    setInvoice({
                      ...invoice,
                      tax_id: selected?.id || "",
                      tax_rate: selected?.rate || 0,
                    });
                  }}
                >
                  <option value="">Select tax</option>
                  {taxes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.rate}%)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-between border-t border-[#e5ebff] pt-4 text-xl font-black">
                <span>Total</span>
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
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
