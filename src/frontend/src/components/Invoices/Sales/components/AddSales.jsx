import React from "react";
import { Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import useAddSales from "../hooks/useAddSales";

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
  } = useAddSales();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Sales Invoice</h1>

              <p className="text-sm text-blue-100">
                Create and manage customer sales
              </p>
            </div>

            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm hover:bg-white/30"
            >
              <ArrowLeft size={18} />
              Back
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              className="border rounded px-2 py-1 w-full"
              value={invoice.customer_id}
              onChange={(e) =>
                setInvoice({ ...invoice, customer_id: e.target.value })
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
              className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              value={invoice.date}
              onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
            />
          </div>

          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700">
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
                      <select
                        className="border rounded px-2 py-1 w-full"
                        value={item.product_id}
                        onChange={(e) =>
                          updateItem(index, "product_id", e.target.value)
                        }
                      >
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="p-2 w-24">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-full"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value)
                        }
                      />
                    </td>

                    <td className="p-2 w-28">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 w-full"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(index, "price", e.target.value)
                        }
                      />
                    </td>

                    <td className="p-2 text-center font-semibold">
                      {item.total.toFixed(2)}
                    </td>

                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={addItem}
              className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-black"
            >
              <Plus size={16} />
              Add Item
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div></div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-medium">{subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span>Discount</span>
                <input
                  type="number"
                  className="border rounded px-2 py-1 w-24 text-right"
                  value={invoice.discount}
                  onChange={(e) =>
                    setInvoice({ ...invoice, discount: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-between items-center">
                <span>Tax</span>
                <select
                  className="border rounded px-2 py-1 w-[120px]"
                  value={invoice.tax_id}
                  onChange={(e) => {
                    const selected = taxes.find((t) => t.id == e.target.value);

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

              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-blue-600">{netTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={submit}
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save Invoice"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
