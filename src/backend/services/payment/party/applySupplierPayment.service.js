import createPartyHistory from "../../../utils/createPaymentHistory";
import allocateSupplierPayment from "./allocateSupplierPayment.service";

export default function applySupplierPayment(db, data) {
  if (data.invoiceId) {
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
