export default function createPartyHistory(db, data) {
  const stmt = db.prepare(`
    INSERT INTO party_history (
      party_type,
      party_id,
      record_type,
      invoice_id,
      invoice_type,
      payment_id,
      movement_type,
      fund_id,
      amount,
      note,
      currency_code,
      exchange_rate,
      effective_rate,
      amount_fund_currency
    )
    VALUES (
      @party_type,
      @party_id,
      @record_type,
      @invoice_id,
      @invoice_type,
      @payment_id,
      @movement_type,
      @fund_id,
      @amount,
      @note,
      @currency_code,
      @exchange_rate,
      @effective_rate,
      @amount_fund_currency
    )
  `);

  return stmt.run({
    party_type: data.party_type,
    party_id: data.party_id,
    record_type: data.record_type,
    invoice_id: data.invoice_id ?? null,
    invoice_type: data.invoice_type ?? null,
    payment_id: data.payment_id ?? null,
    movement_type: data.movement_type,
    fund_id: data.fund_id ?? null,
    amount: Number(data.amount || 0),
    note: data.note ?? "",
    currency_code: data.currency_code ?? "",
    exchange_rate: Number(data.exchange_rate || 0),
    effective_rate: Number(data.effective_rate || 0),
    amount_fund_currency: Number(data.amount_fund_currency || 0),
  });
}
