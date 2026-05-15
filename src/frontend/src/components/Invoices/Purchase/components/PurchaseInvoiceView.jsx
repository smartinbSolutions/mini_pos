import React, { useEffect, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

export default function SalesInvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadInvoice = async () => {
      try {
        setLoading(true);

        const data = await window.api.getPurchaseInvoiceById(id);

        if (!cancelled) {
          setInvoice(data);
        }
      } catch (error) {
        console.error("Failed to load invoice:", error);

        if (!cancelled) {
          setInvoice(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const printInvoice = () => {
    window.print();
  };

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatDate = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString();
  };

  const items = invoice?.items || [];
  const status = invoice?.status || "unpaid";
  const isPaid = status === "paid";

  if (loading) {
    return <div className="p-6 text-gray-500">Loading invoice...</div>;
  }

  if (!invoice) {
    return <div className="p-6 text-red-500">Invoice not found</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen print:bg-white">
      <div className="print:hidden flex justify-between items-center mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-black"
        >
          <ArrowLeft size={18} />
          Back
        </button>

        {/* <button
          type="button"
          onClick={printInvoice}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg"
        >
          <Printer size={18} />
          Print
        </button> */}
      </div>

      <div className="bg-white shadow rounded-xl p-6 print:shadow-none print:rounded-none">
        <div className="flex justify-between gap-6 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Invoice #{invoice.id}</h1>
            <p className="text-gray-500">Date: {formatDate(invoice.date)}</p>
          </div>

          <div className="text-right">
            <p className="font-semibold">{invoice.supplier_name || "-"}</p>
            <p className="text-gray-500">Supplier</p>

            <span
              className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${
                isPaid
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-600"
              }`}
            >
              {isPaid ? "PAID" : status.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-center">Price</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-center">Tax</th>
                <th className="p-3 text-center">Total</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="p-3 text-center text-gray-500" colSpan={5}>
                    No items found
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3">
                      {item.product_name || item.name || "-"}
                    </td>
                    <td className="p-3 text-center">
                      {formatMoney(item.price)}
                    </td>
                    <td className="p-3 text-center">
                      {Number(item.quantity || 0)}
                    </td>
                    <td className="p-3 text-center">
                      {Number(item.tax || 0)}%
                    </td>
                    <td className="p-3 text-center font-semibold">
                      {formatMoney(item.total)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end mt-6">
          <div className="w-80 max-w-full space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatMoney(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span>{formatMoney(invoice.net_total - invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Total</span>
              <span>{formatMoney(invoice.net_total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
