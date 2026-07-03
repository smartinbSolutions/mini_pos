export default function applyPurchaseInvoicePayment(
  db,
  invoiceId,
  amount,
  mode,
) {
  const table = mode === "expense" ? "expense" : "purchase_invoices";

  const invoice = db
    .prepare(
      `
    SELECT
      net_total,
      paid_amount
    FROM ${table}
    WHERE id = ?
  `,
    )
    .get(invoiceId);

  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  const netTotal = Number(invoice.net_total);
  const currentPaid = Number(invoice.paid_amount || 0);

  const newPaid = Math.min(netTotal, currentPaid + Number(amount));

  const remaining = netTotal - newPaid;

  let status = "partial";

  if (newPaid <= 0) {
    status = "unpaid";
  } else if (remaining === 0) {
    status = "paid";
  }

  db.prepare(
    `
    UPDATE ${table}
    SET
      paid_amount = ?,
      remaining_amount = ?,
      status = ?
    WHERE id = ?
  `,
  ).run(newPaid, remaining, status, invoiceId);

  return {
    paid_amount: newPaid,
    remaining_amount: remaining,
    status,
  };
}
