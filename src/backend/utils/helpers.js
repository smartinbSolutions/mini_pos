// Reuses the same three-language convention as seedData's TRANSLATIONS.
const INVOICE_LABELS = {
  sales: { en: "Sales Invoice", ar: "فاتورة مبيعات", tr: "Satış Faturası" },
  purchase: {
    en: "Purchase Invoice",
    ar: "فاتورة مشتريات",
    tr: "Alış Faturası",
  },
  expense: { en: "Expense", ar: "مصروف", tr: "Gider" },
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
