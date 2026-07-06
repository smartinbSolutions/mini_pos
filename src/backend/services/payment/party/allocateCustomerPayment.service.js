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

    const invoiceRemaining = Number(invoice.remaining_amount);

    if (invoiceRemaining <= 0) continue;

    const paymentAmount = Math.min(remainingAmount, invoiceRemaining);

    const paymentFundCurrency =
      Number(data.amount) > 0
        ? (paymentAmount * Number(data.amount_fund_currency || 0)) /
          Number(data.amount)
        : 0;
    updateSalesInvoiceStatus(db, invoice.id, paymentAmount);

    insertAllocation.run(data.paymentId, invoice.id, "sales", paymentAmount);

    allocations.push({
      invoiceId: invoice.id,
      amount: paymentAmount,
    });

    createPartyHistory(db, {
      party_type: "customer",
      party_id: data.customerId,
      record_type: "payment",
      invoice_id: invoice.id,
      invoice_type: "sales",
      payment_id: data.paymentId,
      movement_type: "debit",
      fund_id: data.fund_id,
      amount: paymentAmount,
      note: data.note || "",
      currency_code: data.currency_code ?? "",
      exchange_rate: Number(data.exchange_rate || 0),
      effective_rate: Number(data.effective_rate || 0),
      amount_fund_currency: paymentFundCurrency,
      date: data.date,
    });

    remainingAmount -= paymentAmount;
  }

  return {
    allocations,
    remainingAmount,
  };
}
