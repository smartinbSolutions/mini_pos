import updateSalesInvoiceStatus from "../invoice/updateSalesInvoiceStatus.service";

export default function allocateCustomerPayment(db, data) {
  let remainingAmount = Number(data.amount);

  if (remainingAmount <= 0) {
    return [];
  }

  const invoices = db
    .prepare(
      `
    SELECT
      id,
      remaining_amount
    FROM sales_invoices
    WHERE customer_id = ?
      AND remaining_amount > 0
    ORDER BY date ASC, id ASC
  `,
    )
    .all(data.customerId);

  const allocations = [];

  const insertAllocation = db.prepare(`
    INSERT INTO payment_allocations
    (
      payment_id,
      invoice_id,
      invoice_type,
      amount
    )
    VALUES (?, ?, ?, ?)
  `);

  for (const invoice of invoices) {
    if (remainingAmount <= 0) break;

    const paymentAmount = Math.min(
      remainingAmount,
      Number(invoice.remaining_amount),
    );

    updateSalesInvoiceStatus(db, invoice.id, paymentAmount);

    insertAllocation.run(data.paymentId, invoice.id, "sales", paymentAmount);

    allocations.push({
      invoiceId: invoice.id,
      amount: paymentAmount,
    });

    remainingAmount -= paymentAmount;
  }

  return allocations;
}
