import createPaymentAllocation from "./createPaymentAllocations";
import createPartyHistory from "./createPaymentHistory";
import { ensureContactRole } from "./contacts";
import { buildDefaultPaymentNote } from "./helpers";

export default function createPayment(db, data) {
  // data.party_id / data.partyId IS the contact id. Resolve the legacy id
  // from it for the legacy party_id column; contact_id gets the contact
  // id directly.
  const contactId = data.party_id || data.partyId || null;
  const legacyPartyId =
    contactId && data.party_type !== "partner"
      ? ensureContactRole(db, contactId, data.party_type)
      : null;

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
      date,
      created_by,
      contact_id
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
      @date,
      @created_by,
      @contact_id
    )
  `);

  const paymentDate = data.date;
  console.log("row data", data);
  console.log("paymentDate", paymentDate);
  const result = insertPayment.run({
    type: data.type,
    party_type: data.party_type,
    party_id: legacyPartyId,
    fund_id: data.fund_id,
    amount: Number(data.amount || 0),
    note: data.note || "",
    currency_code: data.currency_code,
    exchange_rate: Number(data.exchange_rate || 1),
    effective_rate: Number(data.effective_rate || 1),
    amount_fund_currency: Number(data.amount_fund_currency || 0),
    invoice_type: data.invoice_type || null,
    date: paymentDate,
    created_by: data.created_by,
    contact_id: data.party_type === "partner" ? null : contactId,
  });

  if (data.invoice_id != null) {
    createPaymentAllocation(db, {
      payment_id: result.lastInsertRowid,
      invoice_id: data.invoice_id,
      invoice_type: data.invoice_type || null,
      amount: data.amount || 0,
    });
  }

  // Reverse direction = money flows opposite to the party's normal flow:
  // cash OUT to a customer, or cash IN from a supplier. This covers return
  // refunds (sales_return / purchase_return) and free-voucher refunds or
  // advances alike — the balance moves back up instead of down.
  // Normal direction (customer pays you, you pay supplier) always decreases
  // the amount owed.
  // For partners, direction depends on which way the money moved:
  // a deposit (income) increases what the company owes the partner,
  // a withdrawal (expense) decreases it.
  const isReverse =
    (data.party_type === "customer" && data.type === "expense") ||
    (data.party_type === "supplier" && data.type === "income");

  const isPartner = data.party_type === "partner";
  const movementType = isPartner
    ? data.type === "income"
      ? "increase"
      : "decrease"
    : isReverse
      ? "increase"
      : "decrease";

  if (data.party_type !== "walk-in") {
    createPartyHistory(db, {
      party_type: data.party_type,
      party_id: legacyPartyId,
      contact_id: contactId,
      record_type: "payment",
      invoice_id: data.invoice_id,
      invoice_type: "payment",
      amount: data.amount,
      movement_type: movementType,
      note:
        data.note ||
        buildDefaultPaymentNote(
          db,
          isReverse ? "refund" : "payment",
          result.lastInsertRowid,
        ),
      payment_id: result.lastInsertRowid,
      date: paymentDate,
    });
  }

  return result.lastInsertRowid;
}
