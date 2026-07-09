export default function reversePurchasePayment(db, payment) {
  const invoice = db
    .prepare(
      `
    SELECT id
    FROM purchase_invoices
    WHERE id = ?
    `,
    )
    .get(payment.invoice_id);

  if (!invoice) {
    throw new Error("INVOICE_NOT_FOUND");
  }

  db.prepare(
    `
    UPDATE funds
    SET balance = balance + ?
    WHERE id = ?
    `,
  ).run(Number(payment.amount_fund_currency), payment.fund_id);

  db.prepare(
    `
    DELETE FROM payment_allocations
    WHERE payment_id = ?
      AND invoice_type = 'purchase'
    `,
  ).run(payment.id);
}
