import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function PrintSalesInvoice() {
  const { t } = useTranslation();
  const { id } = useParams();

  const [invoice, setInvoice] = useState(null);

  useEffect(() => {
    window.api.getSalesInvoiceById(id).then(setInvoice);
  }, [id]);

  if (!invoice) return null;

  return (
    <div className="w-[210mm] min-h-[297mm] bg-white p-10">
      <h1 className="text-3xl font-bold">{t("screens.invoices.salesInvoice")}</h1>

      <div className="mt-6">
        <p>{t("ui.invoice")} : #{invoice.id}</p>
        <p>{t("ui.customer")} : {invoice.customer_name}</p>
        <p>{t("ui.date")} : {invoice.date}</p>
      </div>

      {/* جدول المنتجات */}

      <table className="mt-10 w-full border-collapse">
        <thead>
          <tr>
            <th>{t("ui.name")}</th>
            <th>{t("ui.qty")}</th>
            <th>{t("ui.price")}</th>
            <th>{t("ui.total")}</th>
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
        <h2>{t("ui.total")} : {invoice.net_total}</h2>
      </div>
    </div>
  );
}
