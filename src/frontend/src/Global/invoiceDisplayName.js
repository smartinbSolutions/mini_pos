// Custom name wins; otherwise "<type label> #<id>" in the current language.
export const getDocName = (t, type, doc, nameField = "invoice_name") =>
  doc?.[nameField]?.trim() ||
  `${t(`screens.invoices.invoiceType.${type}`)} #${doc?.id}`;
