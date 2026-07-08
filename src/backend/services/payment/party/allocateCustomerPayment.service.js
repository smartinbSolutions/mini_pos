import createPaymentAllocation from "../../../utils/createPaymentAllocations";
import createPartyHistory from "../../../utils/createPaymentHistory";
import updateSalesInvoiceStatus from "../invoice/updateSalesInvoiceStatus.service";

export default function allocateCustomerPayment(db, data) {
  let remainingAmount = Number(data.amount);

  if (remainingAmount <= 0) {
    return {
      allocations: [],
      remainingAmount: 0,
    };
  }
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
    `,
    )
    .all(data.customerId);

  const allocations = [];

  const roundToTwo = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  for (const invoice of invoices) {
    if (remainingAmount <= 0) break;

    const invoiceRemaining = Number(invoice.remaining);

    if (invoiceRemaining <= 0) continue;

    const paymentAmount = Math.min(remainingAmount, invoiceRemaining);

    updateSalesInvoiceStatus(db, invoice.id, paymentAmount);

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
