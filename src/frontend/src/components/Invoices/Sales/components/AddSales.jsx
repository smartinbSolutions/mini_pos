import React from "react";
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

  const safeNumber = (v) => (isNaN(Number(v)) ? 0 : Number(v));

  const status =
    Number(invoice.paid_amount || 0) >= Number(netTotal || 0) &&
    Number(netTotal || 0) > 0
      ? "paid"
      : "unpaid";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm p-5 border">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white p-2 rounded-xl">
              <Receipt size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Create Sales Invoice
              </h1>
              <p className="text-sm text-gray-500">
                Manage invoice items and payments
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border hover:bg-gray-50"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl">
            {error}
          </div>
        )}

        {/* TOP SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT - ITEMS */}
          <div className="lg:col-span-2 space-y-4">
            {/* CUSTOMER + DATE */}
            <div className="bg-white border rounded-2xl p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <select
                className="border rounded-xl px-3 py-2"
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
                className="border rounded-xl px-3 py-2"
                value={invoice.date || ""}
                onChange={(e) =>
                  setInvoice((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>

            {/* ITEMS TABLE */}
            <div className="bg-white border rounded-2xl overflow-hidden">
              <div className="p-4 flex justify-between items-center border-b">
                <h2 className="font-semibold">Invoice Items</h2>

                <button
                  onClick={addItem}
                  className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-xl text-sm"
                >
                  <Plus size={14} />
                  Add Item
                </button>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="p-3 text-left">Product</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Total</th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="p-2">
                          <SearchableSelect
                            label=""
                            labelWidth="0"
                            placeholder="Select Products"
                            options={products}
                            selectedValue={item.product_id}
                            onChange={(e) => updateItem(i, "product_id", e.id)}
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            className="border rounded-xl px-2 py-1 w-full text-center"
                            value={item.quantity || 0}
                            onChange={(e) =>
                              updateItem(i, "quantity", e.target.value)
                            }
                          />
                        </td>

                        <td className="p-2">
                          <input
                            type="number"
                            className="border rounded-xl px-2 py-1 w-full text-center"
                            value={item.price || 0}
                            onChange={(e) =>
                              updateItem(i, "price", e.target.value)
                            }
                          />
                        </td>

                        <td className="p-2 text-center font-semibold">
                          {Number(item.total || 0).toFixed(2)}
                        </td>

                        <td className="p-2 text-center">
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
          </div>

          {/* RIGHT - SUMMARY (STICKY STYLE) */}
          <div className="space-y-4">
            <div className="bg-white border rounded-2xl p-5 space-y-4 lg:sticky lg:top-6">
              {/* SUMMARY */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{subtotal.toFixed(2)}</span>
                </div>

                {/* <div className="flex justify-between items-center">
                  <span>Discount</span>
                  <input
                    className="border rounded-xl px-2 py-1 w-24 text-right"
                    value={invoice.discount || 0}
                    onChange={(e) =>
                      setInvoice((p) => ({
                        ...p,
                        discount: safeNumber(e.target.value),
                      }))
                    }
                  />
                </div> */}

                <div className="flex justify-between items-center">
                  <span>Tax</span>
                  <select
                    className="border rounded-xl px-2 py-1"
                    value={invoice.tax_id || ""}
                    onChange={(e) => {
                      const t = taxes.find(
                        (x) => String(x.id) === String(e.target.value),
                      );
                      setInvoice((p) => ({
                        ...p,
                        tax_id: t?.id || "",
                        tax_rate: t?.rate || 0,
                      }));
                    }}
                  >
                    <option value="">Tax</option>
                    {taxes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <hr />

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-blue-600">{netTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-3 pt-3">
                <h3 className="font-semibold">Payment</h3>

                <input
                  type="number"
                  className="border rounded-xl px-2 py-2 w-full"
                  value={invoice.paid_amount || 0}
                  onChange={(e) =>
                    setInvoice((p) => ({
                      ...p,
                      paid_amount: safeNumber(e.target.value),
                    }))
                  }
                  placeholder="Paid Amount"
                />

                <div className="flex justify-between">
                  <span>Status</span>
                  <span
                    className={
                      status === "paid"
                        ? "text-green-600 font-bold"
                        : "text-red-500 font-bold"
                    }
                  >
                    {status.toUpperCase()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>Due</span>
                  <span className="font-bold text-red-500">
                    {dueAmount.toFixed(2)}
                  </span>
                </div>

                {status === "paid" && (
                  <SearchableSelect
                    label=""
                    labelWidth="0"
                    placeholder="Select Funds"
                    options={funds}
                    selectedValue={invoice.fund_id}
                    onChange={(e) => {
                      setInvoice((p) => ({
                        ...p,
                        fund_id: e.id,
                      }));
                      setStatus("paid");
                    }}
                  />
                )}
              </div>
            </div>

            {/* SAVE BUTTON (FLOAT STYLE) */}
            <button
              onClick={submit}
              disabled={saving}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl flex items-center justify-center gap-2 font-semibold"
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
