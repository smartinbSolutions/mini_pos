import updatePurchaseInvoiceStatus from "../invoice/updatePurchaseInvoiceStatus.service";

export default function allocateSupplierPayment(db, data) {
  let remainingAmount = Number(data.amount);

  if (remainingAmount <= 0) {
    return [];
  }

  const table = data.mode === "expense" ? "expense" : "purchase_invoices";

  const invoices = db
    .prepare(
      `
    SELECT
      id,
      remaining_amount
    FROM ${table}
    WHERE supplier_id = ?
      AND remaining_amount > 0
    ORDER BY date ASC, id ASC
  `,
    )
    .all(data.supplierId);

  const allocations = [];

  const insertAllocation = db.prepare(`
    INSERT INTO payment_allocations
    (payment_id, invoice_id, invoice_type, amount)
    VALUES (?, ?, ?, ?)
  `);

  for (const invoice of invoices) {
    if (remainingAmount <= 0) break;

    const paymentAmount = Math.min(
      remainingAmount,
      Number(invoice.remaining_amount),
    );

    updatePurchaseInvoiceStatus(db, invoice.id, paymentAmount, data.mode);

    insertAllocation.run(data.paymentId, invoice.id, data.mode, paymentAmount);

    allocations.push({
      invoiceId: invoice.id,
      amount: paymentAmount,
    });

    remainingAmount -= paymentAmount;
  }

  return allocations;
}
