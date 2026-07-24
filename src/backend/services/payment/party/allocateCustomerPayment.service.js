import createPaymentAllocation from "../../../utils/createPaymentAllocations";

export default function allocateCustomerPayment(db, data) {
  let remainingAmount = Number(data.amount);

  if (remainingAmount <= 0) {
    return {
      allocations: [],
      remainingAmount: 0,
    };
  }

  const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  // Targeted mode: a specific sales invoice was named. Allocate strictly to
  // that one invoice, capped at its own remaining balance — never spill
  // into any other invoice, same rule as allocateSupplierPayment.
  if (data.invoiceId && data.invoiceType === "sales") {
    const invoice = db
      .prepare(
        `
      SELECT
        i.id,
        i.net_total,
        i.net_total - COALESCE((
          SELECT SUM(amount)
          FROM payment_allocations
          WHERE invoice_id = i.id
            AND invoice_type = 'sales'
        ), 0) AS remaining
      FROM sales_invoices i
      WHERE i.id = ? AND i.customer_id = ?
      `
      )
      .get(data.invoiceId, data.customerId);

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
      invoice_type: "sales",
      amount: paymentAmount,
    });

    return {
      allocations: [
        {
          invoiceId: invoice.id,
          amount: paymentAmount,
        },
      ],
      remainingAmount: roundToTwo(remainingAmount - paymentAmount),
    };
  }

  // Account-level mode (no specific invoice named): FIFO across every open
  // sales invoice for this customer, oldest first — unchanged.
  const invoices = db
    .prepare(
      `
    SELECT
      i.id,
      i.net_total,
      COALESCE(SUM(pa.amount), 0) AS paid_amount,
      i.net_total - COALESCE(SUM(pa.amount), 0) AS remaining
    FROM sales_invoices i
    LEFT JOIN payment_allocations pa
      ON pa.invoice_id = i.id
     AND pa.invoice_type = 'sales'
    WHERE i.customer_id = ?
    GROUP BY i.id, i.net_total
    HAVING i.net_total - COALESCE(SUM(pa.amount), 0) > 0
    ORDER BY i.date ASC, i.id ASC
    `
    )
    .all(data.customerId);

  const allocations = [];

  for (const invoice of invoices) {
    if (remainingAmount <= 0) break;

    const invoiceRemaining = Number(invoice.remaining);

    if (invoiceRemaining <= 0) continue;

    const paymentAmount = Math.min(remainingAmount, invoiceRemaining);

    allocations.push({
      invoiceId: invoice.id,
      amount: paymentAmount,
    });

    createPaymentAllocation(db, {
      payment_id: data.paymentId,
      invoice_id: invoice.id,
      invoice_type: "sales",
      amount: paymentAmount,
    });

    remainingAmount = roundToTwo(remainingAmount - paymentAmount);
  }
  return {
    allocations,
    remainingAmount,
  };
}
