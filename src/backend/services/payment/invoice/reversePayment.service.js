export default function reversePayment(db, payment) {
  db.prepare(
    `
    UPDATE funds
    SET balance = balance - ?
    WHERE id = ?
    `,
  ).run(Number(payment.amount_fund_currency), payment.fund_id);

  db.prepare(
    `
    DELETE FROM payment_allocations
    WHERE payment_id = ?
      AND invoice_type = 'sales'
    `,
  ).run(payment.id);
}
