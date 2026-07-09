import createPartyHistory from "../../../utils/createPaymentHistory";
import allocateCustomerPayment from "./allocateCustomerPayment.service";

export default function applyCustomerPayment(db, data) {
  allocateCustomerPayment(db, {
    customerId: data.party_id,
    paymentId: data.paymentId,
    amount: data.amount,
    fund_id: data.fund_id,
    note: data.note,
    currency_code: data.currency_code,
    exchange_rate: data.exchange_rate,
    effective_rate: data.effective_rate,
    amount_fund_currency: data.collected_amount,
    date: data.date,
  });
}
