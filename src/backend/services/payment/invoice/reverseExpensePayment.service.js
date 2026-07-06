export default function reverseExpensePayment(db, payment) {
  db.prepare(
    `
    UPDATE suppliers
    SET total_paid = COALESCE(total_paid, 0) - ?
    WHERE id = ?
  `,
  ).run(Number(payment.amount), payment.party_id);

  const expense = db
    .prepare(
      `
    SELECT
      net_total,
      paid_amount
    FROM expense
    WHERE id = ?
  `,
    )
    .get(payment.invoice_id);

  if (!expense) {
    throw new Error("EXPENSE_NOT_FOUND");
  }

  const newPaid = Math.max(
    0,
    Number(expense.paid_amount || 0) - Number(payment.amount),
  );

  const remaining = Number(expense.net_total) - newPaid;

  const status =
    newPaid === 0 ? "unpaid" : remaining === 0 ? "paid" : "partial";

  db.prepare(
    `
    UPDATE expense
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
    SET balance = balance + ?
    WHERE id = ?
  `,
  ).run(Number(payment.amount_fund_currency), payment.fund_id);
}
