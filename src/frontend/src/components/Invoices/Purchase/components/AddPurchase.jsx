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

  const status =
    Number(invoice.paid_amount || 0) >= Number(netTotal || 0) &&
    Number(netTotal || 0) > 0
      ? "paid"
      : "unpaid";

  const Input =
    "border rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-400 outline-none bg-white";
  const Card = "bg-white rounded-2xl shadow-sm border";

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
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

        {/* BASIC INFO */}
        <div className={`${Card} p-5`}>
          <div className="grid md:grid-cols-2 gap-4">
            <SearchableSelect
              placeholder="Select Supplier"
              options={suppliers}
              selectedValue={invoice?.supplier_id}
              onChange={(e) => setInvoice({ ...invoice, supplier_id: e })}
            />
            <input
              type="date"
              className={Input}
              value={invoice.date}
              onChange={(e) => setInvoice({ ...invoice, date: e.target.value })}
            />
          </div>
        </div>

        {/* ITEMS TABLE */}
        <div className={`${Card} overflow-hidden`}>
          <div className="flex justify-between items-center p-4 border-b bg-gray-50">
            <h2 className="font-semibold">Items</h2>

            <button
              onClick={addItem}
              className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
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
                      onChange={(e) => updateItem(index, "product_id", e.id)}
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
                    {Number(item.total || 0).toFixed(2)}
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

        {/* SUMMARY + PAYMENT */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* SUMMARY */}
          <div className={`${Card} p-5 space-y-4`}>
            <h3 className="font-semibold">Summary</h3>

            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between items-center">
              <span>Discount</span>
              <input
                className="border rounded-lg px-2 py-1 w-28 text-right"
                value={invoice.discount}
                onChange={(e) =>
                  setInvoice({ ...invoice, discount: e.target.value })
                }
              />
            </div>

            <div className="flex justify-between items-center">
              <span>Tax</span>
              <select
                className="border rounded-lg px-2 py-1 w-40"
                value={invoice.tax_id}
                onChange={(e) => {
                  const selected = taxes.find((t) => t.id == e.target.value);

                  setInvoice({
                    ...invoice,
                    tax: e.target.value || "",
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

            <div className="border-t pt-3 flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-blue-600">{netTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* PAYMENT */}
          <div className={`${Card} p-5 space-y-4`}>
            <h3 className="font-semibold">Payment</h3>

            <select
              className={Input}
              value={invoice.payment_method || "cash"}
              onChange={(e) =>
                setInvoice((p) => ({
                  ...p,
                  payment_method: e.target.value,
                }))
              }
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="bank">Bank</option>
            </select>

            <input
              type="number"
              className={Input}
              value={invoice.paid_amount || 0}
              onChange={(e) =>
                setInvoice((p) => ({
                  ...p,
                  paid_amount: Number(e.target.value || 0),
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
              <span className="text-red-500 font-bold">
                {dueAmount.toFixed(2)}
              </span>
            </div>

            {status === "paid" && (
              <SearchableSelect
                placeholder="Select fund / customer"
                options={[{ id: "", name: "Walk-in customer" }, ...funds]}
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

        {/* SUBMIT */}
        <div className="flex justify-end">
          <button
            onClick={submit}
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
