import createPaymentAllocation from "./createPaymentAllocations";
import createPartyHistory from "./createPaymentHistory";

export default function createPayment(db, data) {
  const insertPayment = db.prepare(`
    INSERT INTO payments (
      type,
      party_type,
      party_id,
      fund_id,
      amount,
      note,
      currency_code,
      exchange_rate,
      effective_rate,
      amount_fund_currency,
      
      invoice_type,
      date
    )
    VALUES (
      @type,
      @party_type,
      @party_id,
      @fund_id,
      @amount,
      @note,
      @currency_code,
      @exchange_rate,
      @effective_rate,
      @amount_fund_currency,
    
      @invoice_type,
      @date
    )
  `);

  const result = insertPayment.run({
    type: data.type,
    party_type: data.party_type,
    party_id: data.party_id || null,
    fund_id: data.fund_id,
    amount: Number(data.amount || 0),
    note: data.note || "",
    currency_code: data.currency_code,
    exchange_rate: Number(data.exchange_rate || 1),
    effective_rate: Number(data.effective_rate || 1),
    amount_fund_currency: Number(data.amount_fund_currency || 0),
    invoice_type: data.invoice_type || null,
    date: data.date || new Date().toISOString(),
  });
  if (data.invoice_id !== null) {
    createPaymentAllocation(db, {
      payment_id: result.lastInsertRowid,
      invoice_id: data.invoice_id || null,
      invoice_type: data.invoice_type || null,
      amount: data.amount || 0,
    });
  }

  createPartyHistory(db, {
    party_type: data.party_type,
    party_id: data.party_id,
    record_type: "payment",
    invoice_id: data.invoice_id,
    invoice_type: data.invoice_type,
    amount: data.amount,
    movement_type: data.type === "income" ? "deposit" : "withdrawal",
    note: data.note,
    payment_id: result.lastInsertRowid,
    fund_id: data.fund_id,
    currency_code: data.currency_code ?? "",
    exchange_rate: Number(data.exchange_rate || 0),
    effective_rate: Number(data.effective_rate || 0),
    amount_fund_currency: Number(data.amount_fund_currency || 0),
  });

  return result.lastInsertRowid;
}
