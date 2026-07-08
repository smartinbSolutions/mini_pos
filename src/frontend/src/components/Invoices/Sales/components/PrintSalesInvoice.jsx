import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

export default function PrintSalesInvoice() {
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    window.api.getSalesInvoiceById(id).then(setInvoice);
  }, [id]);

  if (!invoice) return null;

  return (
    <div className="w-[210mm] min-h-[297mm] bg-white p-10">
      <h1 className="text-3xl font-bold">Sales Invoice</h1>

      <div className="mt-6">
        <p>Invoice : #{invoice.id}</p>
        <p>Customer : {invoice.customer_name}</p>
        <p>Date : {invoice.date}</p>
      </div>

      {/* جدول المنتجات */}

      <table className="mt-10 w-full border-collapse">
        <thead>
          <tr>
            <th>Name</th>
            <th>Qty</th>
            <th>Price</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td>{item.quantity}</td>
              <td>{item.price}</td>
              <td>{item.total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-8 text-right">
        <h2>Total : {invoice.net_total}</h2>
      </div>
    </div>
  );
}
