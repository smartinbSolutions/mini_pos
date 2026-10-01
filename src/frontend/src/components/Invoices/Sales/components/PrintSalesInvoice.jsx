// PrintSalesInvoice.jsx
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePrintDocument from "../../../../Global/Print/usePrintDocument";
import PrintDocument from "../../../../Global/Print/PrintDocument";

export default function PrintSalesInvoice() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { doc, company, pick } = usePrintDocument(
    (id) => window.api.getSalesInvoiceById(id),
    id,
  );
  if (!doc) return null;

  return (
    <PrintDocument
      doc={doc}
      company={company}
      pick={pick}
      numberLabel={t("DOCS.INVOICE_NO")}
      number={doc.invoice_name}
      badge={doc.channel === "pos" ? t("DOCS.POS_BADGE") : null}
      meta={[{ label: t("DOCS.INVOICE_DATE"), value: doc.date }]}
      party={{
        label: t("DOCS.ISSUED_TO"),
        name: doc.customer_name,
        phone: doc.customer_phone,
      }}
    />
  );
}
