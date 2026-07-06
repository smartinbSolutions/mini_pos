export default function reverseSalesPayment(db, payment) {
  db.prepare(
    `
    UPDATE customers
    SET total_paid = COALESCE(total_paid, 0) - ?
    WHERE id = ?
  `,
  ).run(Number(payment.amount), payment.party_id);

  const invoice = db
    .prepare(
      `
      SELECT
        net_total,
        paid_amount
      FROM sales_invoices
      WHERE id = ?
    `,
    )
    .get(payment.invoice_id);

  if (!invoice) {
    throw new Error("SALES_INVOICE_NOT_FOUND");
  }

  const newPaid = Math.max(
    0,
    Number(invoice.paid_amount || 0) - Number(payment.amount),
  );

  const remaining = Number(invoice.net_total) - newPaid;

  const status =
    newPaid === 0 ? "unpaid" : remaining === 0 ? "paid" : "partial";

  db.prepare(
    `
    UPDATE sales_invoices
    SET
      paid_amount = ?,
      remaining_amount = ?,
      status = ?
    WHERE id = ?
  `,
  ).run(newPaid, remaining, status, payment.invoice_id);

  db.prepare(
    `
    UPDATE funds
    SET balance = balance - ?
    WHERE id = ?
  `,
  ).run(Number(payment.amount_fund_currency), payment.fund_id);
}
