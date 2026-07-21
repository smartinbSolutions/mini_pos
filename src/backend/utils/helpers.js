// Reuses the same three-language convention as seedData's TRANSLATIONS.
const INVOICE_LABELS = {
  sales: { en: "Sales Invoice", ar: "فاتورة مبيعات", tr: "Satış Faturası" },
  purchase: {
    en: "Purchase Invoice",
    ar: "فاتورة مشتريات",
    tr: "Alış Faturası",
  },
  expense: { en: "Expense", ar: "مصروف", tr: "Gider" },
  sales_return: {
    en: "Sales Return",
    ar: "مرتجع مبيعات",
    tr: "Satış İadesi",
  },
  purchase_return: {
    en: "Purchase Return",
    ar: "مرتجع مشتريات",
    tr: "Alış İadesi",
  },
};

const PAYMENT_LABELS = {
  payment: { en: "Payment", ar: "دفعة", tr: "Ödeme" },
  refund: { en: "Refund", ar: "استرداد", tr: "İade" },
};

const FOR_INVOICE_LABEL = {
  en: "for Invoice",
  ar: "لفاتورة",
  tr: "faturası için",
};

export function getCompanyLanguage(db) {
  const row = db
    .prepare(`SELECT language FROM company_settings ORDER BY id LIMIT 1`)
    .get();
  const lang = row?.language;
  return ["ar", "en", "tr"].includes(lang) ? lang : "ar";
}

export function buildDefaultInvoiceName(db, type, invoiceId) {
  const lang = getCompanyLanguage(db);
  const label = INVOICE_LABELS[type][lang];
  return `${label} #${invoiceId}`;
}

// e.g. "Purchase Return #7 for Invoice #3" / "مرتجع مشتريات #7 لفاتورة #3"
export function buildDefaultReturnNote(db, type, returnId, originalInvoiceId) {
  const lang = getCompanyLanguage(db);
  const label = INVOICE_LABELS[type][lang];
  const forWord = FOR_INVOICE_LABEL[lang];
  return `${label} #${returnId} ${forWord} #${originalInvoiceId}`;
}

// e.g. "Refund #7" / "استرداد #7"
export function buildDefaultPaymentNote(db, kind, referenceId) {
  const lang = getCompanyLanguage(db);
  const label = PAYMENT_LABELS[kind][lang];
  return `${label} #${referenceId}`;
}
