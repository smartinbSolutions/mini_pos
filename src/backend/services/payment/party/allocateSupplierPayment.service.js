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
    (
      payment_id,
      invoice_id,
      invoice_type,
      amount
    )
    VALUES (?, ?, ?, ?)
  `);

  const totalAmount = Number(data.amount);
  const totalFundAmount = Number(data.amount_fund_currency || 0);

  for (const invoice of invoices) {
    if (remainingAmount <= 0) break;

    const invoiceRemaining = Number(invoice.remaining_amount);

    if (invoiceRemaining <= 0) continue;

    const paymentAmount = Math.min(remainingAmount, invoiceRemaining);

    const paymentFundCurrency =
      totalAmount > 0 ? (paymentAmount * totalFundAmount) / totalAmount : 0;

    updatePurchaseInvoiceStatus(db, invoice.id, paymentAmount, data.mode);

    insertAllocation.run(data.paymentId, invoice.id, data.mode, paymentAmount);

    allocations.push({
      invoiceId: invoice.id,
      amount: paymentAmount,
    });

    createPartyHistory(db, {
      party_type: "supplier",
      party_id: data.supplierId,
      record_type: "payment",
      invoice_id: invoice.id,
      invoice_type: data.mode,
      payment_id: data.paymentId,
      movement_type: "credit",
      fund_id: data.fund_id,
      amount: paymentAmount,
      note: data.note || "",
      currency_code: data.currency_code ?? "",
      exchange_rate: Number(data.exchange_rate || 0),
      effective_rate: Number(data.effective_rate || 0),
      amount_fund_currency: paymentFundCurrency,
    });

    remainingAmount -= paymentAmount;
  }

  return {
    allocations,
    remainingAmount,
  };
}
