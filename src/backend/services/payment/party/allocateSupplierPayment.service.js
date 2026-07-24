import createPaymentAllocation from "../../../utils/createPaymentAllocations";

export default function allocateSupplierPayment(db, data) {
  let remainingAmount = Number(data.amount);

  if (remainingAmount <= 0) {
    return {
      allocations: [],
      remainingAmount: 0,
    };
  }

  // Targeted mode: a specific invoice/expense was named (paying from that
  // invoice's own context). Allocate strictly to that one record, capped at
  // its own remaining balance — never spill into any other invoice.
  if (data.invoiceId && data.invoiceType) {
    const table =
      data.invoiceType === "expense" ? "expense" : "purchase_invoices";

    const invoice = db
      .prepare(
        `
        SELECT
          id,
          net_total,
          net_total - COALESCE((
            SELECT SUM(amount)
            FROM payment_allocations
            WHERE invoice_id = ${table}.id
              AND invoice_type = ?
          ), 0) AS remaining
        FROM ${table}
        WHERE id = ? AND supplier_id = ?
        `
      )
      .get(data.invoiceType, data.invoiceId, data.supplierId);

    if (!invoice || Number(invoice.remaining) <= 0) {
      return {
        allocations: [],
        remainingAmount,
      };
    }

    const invoiceRemaining = Number(invoice.remaining);
    const paymentAmount = Math.min(remainingAmount, invoiceRemaining);

    createPaymentAllocation(db, {
      payment_id: data.paymentId,
      invoice_id: invoice.id,
      invoice_type: data.invoiceType,
      amount: paymentAmount,
    });

    return {
      allocations: [
        {
          invoiceId: invoice.id,
          invoiceType: data.invoiceType,
          amount: paymentAmount,
        },
      ],
      remainingAmount: remainingAmount - paymentAmount,
    };
  }

  // Account-level mode (no specific invoice named): FIFO across every open
  // invoice/expense for this supplier, oldest first — unchanged.
  const purchaseInvoices = db
    .prepare(
      `
      SELECT
        id,
        date,
        net_total,
        net_total - COALESCE((
          SELECT SUM(amount)
          FROM payment_allocations
          WHERE invoice_id = purchase_invoices.id
            AND invoice_type = 'purchase'
        ), 0) AS remaining,
        'purchase' AS invoice_type
      FROM purchase_invoices
      WHERE supplier_id = ?
      `
    )
    .all(data.supplierId);

  const expenseInvoices = db
    .prepare(
      `
      SELECT
        id,
        date,
        net_total,
        net_total - COALESCE((
          SELECT SUM(amount)
          FROM payment_allocations
          WHERE invoice_id = expense.id
            AND invoice_type = 'expense'
        ), 0) AS remaining,
        'expense' AS invoice_type
      FROM expense
      WHERE supplier_id = ?
      `
    )
    .all(data.supplierId);

  const invoices = [...purchaseInvoices, ...expenseInvoices]
    .filter((invoice) => Number(invoice.remaining) > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const allocations = [];

  for (const invoice of invoices) {
    if (remainingAmount <= 0) break;

    const invoiceRemaining = Number(invoice.remaining);

    if (invoiceRemaining <= 0) continue;

    const paymentAmount = Math.min(remainingAmount, invoiceRemaining);

    createPaymentAllocation(db, {
      payment_id: data.paymentId,
      invoice_id: invoice.id,
      invoice_type: invoice.invoice_type,
      amount: paymentAmount,
    });

    allocations.push({
      invoiceId: invoice.id,
      invoiceType: invoice.invoice_type,
      amount: paymentAmount,
    });

    remainingAmount -= paymentAmount;
  }

  return {
    allocations,
    remainingAmount,
  };
}
