export default function reversePayment(db, payment) {
  db.prepare(
    `
    DELETE FROM payment_allocations
    WHERE payment_id = ?
      AND invoice_type = 'sales'
    `,
  ).run(payment.id);
}
