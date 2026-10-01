import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePrintDocument from "../../../../Global/Print/usePrintDocument";
import PrintDocument from "../../../../Global/Print/PrintDocument";

export default function PrintExpense() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { doc, company, pick } = usePrintDocument(
    (id) => window.api.getExpense(id),
    id,
  );
  if (!doc) return null;

  return (
    <PrintDocument
      doc={doc}
      company={company}
      pick={pick}
      variant="expense"
      numberLabel={t("DOCS.INVOICE_NO")}
      number={doc.invoice_name || `#${doc.id}`}
      meta={[{ label: t("DOCS.INVOICE_DATE"), value: doc.date }]}
      party={{
        label: t("DOCS.ISSUED_FROM"),
        name: doc.supplier_name || t("ui.noSupplier"),
        phone: doc.supplier_phone,
      }}
    />
  );
}
