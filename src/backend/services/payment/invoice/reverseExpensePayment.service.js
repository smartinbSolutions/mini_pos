export default function reverseExpensePayment(db, payment) {
  const expense = db
    .prepare(
      `
      SELECT id
      FROM expense
      WHERE id = ?
      `,
    )
    .get(payment.invoice_id);

  if (!expense) {
    throw new Error("EXPENSE_NOT_FOUND");
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
      AND invoice_type = 'expense'
    `,
  ).run(payment.id);
}
