import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePrintDocument from "../../../../Global/Print/usePrintDocument";
import PrintDocument from "../../../../Global/Print/PrintDocument";

export default function PrintSalesQuotation() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { doc, company, pick } = usePrintDocument(
    (id) => window.api.getSalesQuotationById(id),
    id,
  );
  if (!doc) return null;

  return (
    <PrintDocument
      doc={doc}
      company={company}
      pick={pick}
      title={t("screens.quotations.quotation")}
      numberLabel={t("DOCS.QUOTATION_NO")}
      number={`#${doc.id}`}
      badge={
        doc.status
          ? t(`DOCS.QUOTATION_STATUS_${doc.status.toUpperCase()}`)
          : null
      }
      meta={[{ label: t("DOCS.QUOTATION_DATE"), value: doc.date }]}
      party={{
        label: t("DOCS.ISSUED_TO"),
        name: doc.customer_name || t("DOCS.NO_CUSTOMER"),
        phone: doc.customer_phone,
      }}
    />
  );
}
