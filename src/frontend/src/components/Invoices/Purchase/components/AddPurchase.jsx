import React from "react";
import { Plus, Trash2, Save } from "lucide-react";
import useAddPurchase from "../hooks/useAddPurchase";
import SearchableSelect from "../../../../Global/SearchableSelect";

export default function AddPurchase() {
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
    netTotal,
    saving,
    error,
    funds,
    dueAmount,
    setStatus,
  } = useAddPurchase();

  const num = (v) => (isNaN(Number(v)) ? 0 : Number(v));

  const paid = num(invoice.paid_amount);
  const total = num(netTotal);
  const due = Math.max(total - paid, 0);

  const status =
    paid >= total && total > 0 ? "paid" : paid > 0 ? "partial" : "unpaid";

  const Input =
    "border rounded-xl px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-400 outline-none bg-white";

  const Card = "bg-white rounded-2xl shadow-sm border";

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6 rounded-2xl shadow">
          <h1 className="text-2xl font-bold">Purchase Invoice</h1>
          <p className="text-sm text-blue-100">
            Create and manage supplier purchases
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-200">
            {error}
          </div>
        )}

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT SIDE */}
          <div className="lg:col-span-2 space-y-6">
            {/* BASIC INFO */}
            <div className={`${Card} p-5`}>
              <div className="grid md:grid-cols-2 gap-4">
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
                  className={Input}
                  value={invoice.date}
                  onChange={(e) =>
                    setInvoice({ ...invoice, date: e.target.value })
                  }
                />
              </div>
            </div>

            {/* ITEMS */}
            <div className={`${Card} overflow-hidden`}>
              <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h2 className="font-semibold">Items</h2>

                <button
                  onClick={addItem}
                  className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl hover:bg-gray-800"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="p-3 text-left">Product</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">Price</th>
                    <th className="p-3">Total</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t hover:bg-gray-50">
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
                          className={Input}
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, "quantity", e.target.value)
                          }
                        />
                      </td>

                      <td className="p-2">
                        <input
                          type="number"
                          className={Input}
                          value={item.price}
                          onChange={(e) =>
                            updateItem(index, "price", e.target.value)
                          }
                        />
                      </td>

                      <td className="p-2 text-center font-semibold">
                        {num(item.total).toFixed(2)}
                      </td>

                      <td className="p-2 text-center">
                        <button
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SUMMARY */}
            <div className={`${Card} p-5`}>
              <h3 className="font-semibold mb-4">Summary</h3>

              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between mt-2">
                <span>Total</span>
                <span className="font-bold text-blue-600">
                  {netTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - PAYMENT (STICKY) */}
          <div className="lg:col-span-1">
            <div className="sticky top-6 space-y-4">
              {/* PAYMENT CARD */}
              <div className={`${Card} p-5 space-y-4`}>
                <div className="flex justify-between items-center">
                  <h3 className="font-bold">Payment</h3>

                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
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

                <div className="text-3xl font-bold text-blue-600">
                  {netTotal.toFixed(2)}
                </div>

                <div>
                  <label className="text-sm text-gray-500">Paid Amount</label>

                  <input
                    disabled
                    type="number"
                    className={Input}
                    value={invoice.paid_amount || ""}
                    onChange={(e) =>
                      setInvoice((p) => ({
                        ...p,
                        paid_amount: Number(e.target.value || 0),
                      }))
                    }
                  />
                </div>

                {/* QUICK ACTIONS */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setInvoice((p) => ({ ...p, paid_amount: 0 }));
                      setStatus("unpaid");
                    }}
                    className="flex-1 border rounded-xl py-2"
                  >
                    Unpaid
                  </button>

                  <button
                    onClick={() => {
                      setInvoice((p) => ({ ...p, paid_amount: total }));
                      setStatus("paid");
                    }}
                    className="flex-1 bg-green-600 text-white rounded-xl py-2"
                  >
                    Full
                  </button>
                </div>

                {/* DUE */}
                <div className="flex justify-between font-bold">
                  <span>Due</span>
                  <span className="text-red-500">{due.toFixed(2)}</span>
                </div>

                {/* FUND */}
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
                      }))
                    }
                  />
                )}
              </div>

              {/* SAVE */}
              <button
                onClick={submit}
                disabled={saving}
                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700"
              >
                <Save size={16} />
                {saving ? "Saving..." : "Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
