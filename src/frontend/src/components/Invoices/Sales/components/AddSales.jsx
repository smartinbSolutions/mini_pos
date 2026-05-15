import React, { useMemo } from "react";
import { Plus, Trash2, Save, ArrowLeft, Receipt } from "lucide-react";
import useAddSales from "../hooks/useAddSales";
import SearchableSelect from "../../../../Global/SearchableSelect";

export default function AddSales() {
  const {
    invoice,
    setInvoice,
    items,
    products,
    customers,
    addItem,
    removeItem,
    updateItem,
    submit,
    subtotal,
    netTotal,
    saving,
    error,
    navigate,
    taxes,
    funds,
    dueAmount,
    setStatus,
  } = useAddSales();

  const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));

  const total = toNum(netTotal);
  const paid = toNum(invoice.paid_amount);
  const due = Math.max(total - paid, 0);

  const status = useMemo(() => {
    if (total === 0) return "unpaid";
    if (paid >= total) return "paid";
    if (paid > 0) return "partial";
    return "unpaid";
  }, [paid, total]);

  const Input =
    "border rounded-xl px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-400 outline-none bg-white";

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex justify-between items-center bg-white p-5 rounded-2xl border">
          <div className="flex items-center gap-3">
            <Receipt />
            <div>
              <h1 className="font-bold text-lg">Create Sales Invoice</h1>
              <p className="text-sm text-gray-500">Manage items & payments</p>
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 border px-3 py-2 rounded-xl hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl border">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* LEFT */}
          <div className="lg:col-span-2 space-y-4">
            {/* CUSTOMER + DATE */}
            <div className="bg-white p-4 border rounded-2xl grid md:grid-cols-2 gap-3">
              <select
                className={Input}
                value={invoice.customer_id || ""}
                onChange={(e) =>
                  setInvoice((p) => ({
                    ...p,
                    customer_id: e.target.value,
                  }))
                }
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                className={Input}
                value={invoice.date || ""}
                onChange={(e) =>
                  setInvoice((p) => ({
                    ...p,
                    date: e.target.value,
                  }))
                }
              />
            </div>

            {/* ITEMS */}
            <div className="bg-white border rounded-2xl overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="font-semibold">Items</h2>

                <button
                  onClick={addItem}
                  className="bg-black text-white px-3 py-2 rounded-xl flex items-center gap-2"
                >
                  <Plus size={14} />
                  Add Item
                </button>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="p-3 text-left">Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-t hover:bg-gray-50">
                      <td className="p-2">
                        <SearchableSelect
                          options={products}
                          selectedValue={item.product_id}
                          onChange={(e) => updateItem(i, "product_id", e.id)}
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          className="border rounded-xl w-20 text-center"
                          value={item.quantity || 0}
                          onChange={(e) =>
                            updateItem(i, "quantity", e.target.value)
                          }
                        />
                      </td>

                      <td>
                        <input
                          type="number"
                          className="border rounded-xl w-24 text-center"
                          value={item.price || 0}
                          onChange={(e) =>
                            updateItem(i, "price", e.target.value)
                          }
                        />
                      </td>

                      <td className="text-center font-bold">
                        {toNum(item.total).toFixed(2)}
                      </td>

                      <td className="text-center">
                        <button
                          onClick={() => removeItem(i)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-xl"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            {/* TOTAL */}
            <div className="bg-white p-5 border rounded-2xl">
              <div className="flex justify-between">
                <span>Total</span>
                <span className="font-bold text-blue-600">
                  {total.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between mt-2">
                <span>Subtotal</span>
                <span>{toNum(subtotal).toFixed(2)}</span>
              </div>
            </div>

            {/* PAYMENT */}
            <div className="bg-white p-5 border rounded-2xl space-y-4">
              {/* STATUS */}
              <div className="flex justify-between items-center">
                <span className="font-bold">Payment</span>

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

              {/* PAID INPUT */}
              <input
                disabled
                type="number"
                className={Input + " text-lg font-bold"}
                value={invoice.paid_amount || ""}
                max={total}
                onChange={(e) => {
                  let v = toNum(e.target.value);
                  if (v > total) v = total;

                  setInvoice((p) => ({
                    ...p,
                    paid_amount: v,
                  }));
                }}
              />

              {/* QUICK BUTTONS */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => {
                    setInvoice((p) => ({
                      ...p,
                      paid_amount: 0,
                    }));
                  }}
                  className="border rounded-xl py-2 hover:bg-gray-50"
                >
                  Unpaid
                </button>

                <button
                  onClick={() => {
                    setInvoice((p) => ({
                      ...p,
                      paid_amount: total,
                    }));
                    setStatus("paid");
                  }}
                  className="bg-green-600 text-white rounded-xl py-2"
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
              className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold hover:bg-blue-700"
            >
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
