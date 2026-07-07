import createPartyHistory from "../../../utils/createPaymentHistory";
import applyPurchaseInvoicePayment from "../invoice/updatePurchaseInvoiceStatus.service";
import allocateSupplierPayment from "./allocateSupplierPayment.service";

export default function applySupplierPayment(db, data) {
  if (data.invoiceId) {
    applyPurchaseInvoicePayment(db, data.invoiceId, data.amount, data.mode);
    createPartyHistory(db, {
      party_type: "supplier",
      party_id: data.party_id,
      record_type: "payment",
      invoice_id: data.invoiceId,
      invoice_type: data.mode,
      payment_id: data.paymentId,
      movement_type: "credit",
      fund_id: data.fund_id,
      amount: data.amount,
      note: data.note,
      currency_code: data.currency_code ?? "",
      exchange_rate: Number(data.exchange_rate || 0),
      effective_rate: Number(data.effective_rate || 0),
      amount_fund_currency: Number(data.collected_amount || 0),
    });
  } else {
    allocateSupplierPayment(db, {
      supplierId: data.party_id,
      paymentId: data.paymentId,
      amount: data.amount,
      mode: data.mode,
      fund_id: data.fund_id,
      note: data.note,
      currency_code: data.currency_code,
      exchange_rate: data.exchange_rate,
      effective_rate: data.effective_rate,
      amount_fund_currency: data.collected_amount,
    });
  }
}
