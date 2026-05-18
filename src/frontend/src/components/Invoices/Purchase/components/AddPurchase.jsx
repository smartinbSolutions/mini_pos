import React, { useState } from "react";
import { Plus, Trash2, Save, Receipt, HandCoins } from "lucide-react";
import useAddPurchase from "../hooks/useAddPurchase";
import SearchableSelect from "../../../../Global/SearchableSelect";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { formatMoney } from "../../../../Global/FormatNumber";
import { ToastContainer } from "react-toastify";

export default function AddPurchase() {
  const {
    invoice,
    setInvoice,
    items,
    products,
    suppliers,
    addItem,
    removeItem,
    updateItem,
    submit,
    subtotal,
    netTotal,
    saving,
    error,
    funds,
    setStatus,
  } = useAddPurchase();
  const [paymentChoice, setPaymentChoice] = useState(null);
  const { money } = usePrimaryCurrency();

  const num = (v) => (isNaN(Number(v)) ? 0 : Number(v));

  const paid = num(invoice.paid_amount);
  const total = num(netTotal);
  const status = invoice.status === "paid" ? "paid" : "unpaid";
  const inputClass =
    "h-11 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 px-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10 disabled:bg-slate-100";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/85 p-5 shadow-[0_18px_60px_rgba(70,99,255,0.10)]";

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
                Purchasing
              </p>
              <h1 className="text-3xl font-black text-slate-950">
                Purchase Invoice
              </h1>
              <p className="text-sm text-slate-500">
                Create and manage supplier purchases
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
                  placeholder="Select Supplier"
                  options={suppliers}
                  selectedValue={invoice?.supplier_id}
                  onChange={(e) =>
                    setInvoice({ ...invoice, supplier_id: e.id })
                  }
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
                    Products on this purchase
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
                            placeholder="Select Product"
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
            <section className={panelClass}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                  <HandCoins size={19} />
                </span>
                <div>
                  <h3 className="font-black text-slate-950">Summary</h3>
                  <p className="text-sm text-slate-500">Purchase total</p>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold">{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xl font-black">
                  <span>Total</span>
                  <span className="text-[#4663ff]">{money(netTotal)}</span>
                </div>
              </div>
            </section>

            <section className={`${panelClass} space-y-4`}>
              <div className="flex items-center justify-between">
                <h3 className="font-black">Payment</h3>
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
                  <span className="text-slate-500">Amount to pay</span>
                  <span className="font-black text-slate-950">
                    {money(total)}
                  </span>
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-slate-500">payment in CASH</span>
                  <span className="font-black text-[#4663ff]">
                    {money(total * invoice.exchange_rate)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentChoice("unpaid");
                    setInvoice((p) => ({ ...p, paid_amount: 0 }));
                    setStatus("unpaid");
                  }}
                  className={`flex-1 rounded-2xl border py-2 text-sm font-bold transition ${
                    paymentChoice === "unpaid"
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-[#dbe4ff] bg-white text-slate-600 hover:bg-[#eef3ff]"
                  }`}
                >
                  No payment now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentChoice("paid");
                    setInvoice((p) => ({ ...p, paid_amount: total }));
                    setStatus("paid");
                  }}
                  className={`flex-1 rounded-2xl border py-2 text-sm font-bold transition ${
                    paymentChoice === "paid"
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                      : "border-[#dbe4ff] bg-white text-slate-600 hover:bg-[#eef3ff]"
                  }`}
                >
                  Pay in full
                </button>
              </div>

              {paid > 0 && (
                <SearchableSelect
                  placeholder="Select Fund"
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
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </aside>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
