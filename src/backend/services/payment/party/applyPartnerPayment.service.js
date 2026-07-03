import createPartyHistory from "../../../utils/createPaymentHistory";

export default function applyPartnerPayment(db, data) {
  const amount =
    data.type === "income" ? Number(data.amount) : -Number(data.amount);

  db.prepare(
    `
    UPDATE partners
    SET total_paid = COALESCE(total_paid, 0) + ?
    WHERE id = ?
  `,
  ).run(amount, data.party_id);

  createPartyHistory(db, {
    party_type: "partner",
    party_id: data.party_id,
    record_type: "payment",
    payment_id: data.paymentId,
    fund_id: data.fund_id,
    movement_type: data.type === "income" ? "credit" : "debit",
    amount: Math.abs(data.amount),
    note: data.note || "",
    currency_code: data.currency_code ?? "",
    exchange_rate: Number(data.exchange_rate || 0),
    effective_rate: Number(data.effective_rate || 0),
    amount_fund_currency: Number(data.amount_fund_currency || 0),
  });
}
