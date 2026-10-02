import { ensureLegacyContact, sideFor } from "./contacts";

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
      amount,
      date,
      note,
      contact_id,
      side
    )
    VALUES (
      @party_type,
      @party_id,
      @record_type,
      @invoice_id,
      @invoice_type,
      @payment_id,
      @movement_type,
      @amount,
      @date,
      @note,
      @contact_id,
      @side
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
    amount: Number(data.amount || 0),
    date: data.date || new Date().toISOString(),
    note: data.note ?? "",
    // Derived at the source — callers don't change.
    contact_id: ensureLegacyContact(db, data.party_type, data.party_id),
    side: sideFor(data.party_type, data.movement_type),
  });
}
