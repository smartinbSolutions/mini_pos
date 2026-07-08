import createPaymentAllocation from "../../../utils/createPaymentAllocations";
import createPartyHistory from "../../../utils/createPaymentHistory";
import updatePurchaseInvoiceStatus from "../invoice/updatePurchaseInvoiceStatus.service";

export default function allocateSupplierPayment(db, data) {
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
    FROM purchase_invoices i
    LEFT JOIN payment_allocations pa
      ON pa.invoice_id = i.id
     AND pa.invoice_type = 'purchase'
    WHERE i.supplier_id = ?
    GROUP BY i.id, i.net_total
    HAVING i.net_total - COALESCE(SUM(pa.amount), 0) > 0
    ORDER BY i.date ASC, i.id ASC
    `,
    )
    .all(data.supplierId);

  const allocations = [];

  const totalAmount = Number(data.amount);
  const totalFundAmount = Number(data.amount_fund_currency || 0);

  for (const invoice of invoices) {
    if (remainingAmount <= 0) break;

    const invoiceRemaining = Number(invoice.remaining);

    if (invoiceRemaining <= 0) continue;

    const paymentAmount = Math.min(remainingAmount, invoiceRemaining);

    const paymentFundCurrency =
      totalAmount > 0 ? (paymentAmount * totalFundAmount) / totalAmount : 0;

    updatePurchaseInvoiceStatus(db, invoice.id, paymentAmount, "purchase");

    allocations.push({
      invoiceId: invoice.id,
      amount: paymentAmount,
    });

    createPaymentAllocation(db, {
      payment_id: data.paymentId,
      invoice_id: invoice.id,
      invoice_type: "purchase",
      amount: paymentAmount,
    });

    remainingAmount -= paymentAmount;
  }

  return {
    allocations,
    remainingAmount,
  };
}
