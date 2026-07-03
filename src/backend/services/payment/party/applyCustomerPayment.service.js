import createPartyHistory from "../../../utils/createPaymentHistory";
import updateSalesInvoiceStatus from "../invoice/updateSalesInvoiceStatus.service";
import allocateCustomerPayment from "./allocateCustomerPayment.service";

export default function applyCustomerPayment(db, data) {
  db.prepare(
    `
    UPDATE customers
    SET total_paid = COALESCE(total_paid, 0) + ?
    WHERE id = ?
  `,
  ).run(data.amount, data.party_id);

  if (data.invoiceId) {
    updateSalesInvoiceStatus(db, data.invoiceId, data.amount);
  } else {
    allocateCustomerPayment(db, {
      customerId: data.party_id,
      paymentId: data.paymentId,
      amount: data.amount,
    });
  }

  createPartyHistory(db, {
    party_type: "customer",
    party_id: data.party_id,
    record_type: "payment",
    invoice_id: data.invoiceId ?? null,
    invoice_type: "sales",
    payment_id: data.paymentId,
    movement_type: "debit",
    fund_id: data.fund_id,
    amount: data.amount,
    note: data.note,
    currency_code: data.currency_code ?? "",
    exchange_rate: Number(data.exchange_rate || 0),
    effective_rate: Number(data.effective_rate || 0),
    amount_fund_currency: Number(data.amount_fund_currency || 0),
  });
}
