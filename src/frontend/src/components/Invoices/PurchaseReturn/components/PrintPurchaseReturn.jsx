// PrintPurchaseReturn.jsx
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePrintDocument from "../../../../Global/Print/usePrintDocument";
import PrintDocument from "../../../../Global/Print/PrintDocument";

export default function PrintPurchaseReturn() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { doc, company, pick } = usePrintDocument(
    (id) => window.api.getPurchaseReturnById(id),
    id,
  );
  if (!doc) return null;

  return (
    <PrintDocument
      doc={doc}
      company={company}
      pick={pick}
      title={t("DOCS.INVOICE_TYPE_PURCHASE_RETURN")}
      numberLabel={t("DOCS.RETURN_NO")}
      number={`#${doc.id}`}
      meta={[
        { label: t("DOCS.RETURN_DATE"), value: doc.date },
        {
          label: t("DOCS.ORIGINAL_INVOICE"),
          value: `#${doc.purchase_invoice_id}`,
        },
      ]}
      party={{ label: t("DOCS.ISSUED_FROM"), name: doc.supplier_name }}
    />
  );
}
