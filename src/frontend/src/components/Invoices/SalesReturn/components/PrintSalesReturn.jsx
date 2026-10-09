import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePrintDocument from "../../../../Global/Print/usePrintDocument";
import PrintDocument from "../../../../Global/Print/PrintDocument";

export default function PrintSalesReturn() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { doc, company, pick } = usePrintDocument(
    (id) => window.api.getSalesReturnById(id),
    id,
  );
  if (!doc) return null;

  return (
    <PrintDocument
      doc={doc}
      company={company}
      pick={pick}
      title={t("DOCS.INVOICE_TYPE_SALES_RETURN")}
      numberLabel={t("DOCS.RETURN_NO")}
      number={`#${doc.id}`}
      badge={doc.channel === "pos" ? t("DOCS.POS_BADGE") : null}
      meta={[
        { label: t("DOCS.RETURN_DATE"), value: doc.date },
        {
          label: t("DOCS.ORIGINAL_INVOICE"),
          value: `#${doc.sales_invoice_id}`,
        },
      ]}
      party={{
        label: t("DOCS.ISSUED_TO"),
        name: doc.customer_name,
        phone: doc.customer_phone,
      }}
      showUnitConversion
    />
  );
}
