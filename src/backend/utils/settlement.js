import {
  getOpenDocuments,
  proposeAllocation,
  validateAllocations,
} from "./paymentAllocation";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const sumRemaining = (documents) =>
  round2(documents.reduce((sum, d) => sum + d.remaining, 0));

// Both sides of one contact's account, with a FIFO proposal for each.
//   receivable — he owes you  (sales, purchase returns, debit opening)
//   payable    — you owe him  (purchases, expenses, sales returns, credit opening)
// The settle amount can never exceed the smaller side.
export function previewSettlement(db, { contactId, amount }) {
  const receivableDocs = getOpenDocuments(db, { contactId, direction: "in" });
  const payableDocs = getOpenDocuments(db, { contactId, direction: "out" });

  const receivableTotal = sumRemaining(receivableDocs);
  const payableTotal = sumRemaining(payableDocs);
  const max = round2(Math.min(receivableTotal, payableTotal));

  const requested = Number(amount);
  const target = requested > 0 ? round2(Math.min(requested, max)) : max;

  return {
    max,
    amount: target,
    receivableTotal,
    payableTotal,
    receivable: proposeAllocation(receivableDocs, target),
    payable: proposeAllocation(payableDocs, target),
  };
}

export function createSettlement(
  db,
  { contactId, amount, receivable, payable, date, note, created_by },
) {
  const value = round2(amount);
  if (!(value > 0)) throw new Error("INVALID_SETTLEMENT_AMOUNT");

  // Both sides re-validated against live data — open, this contact's,
  // right side, within remaining.
  const receivableLines = validateAllocations(db, {
    contactId,
    direction: "in",
    amount: value,
    allocations: receivable,
  });
  const payableLines = validateAllocations(db, {
    contactId,
    direction: "out",
    amount: value,
    allocations: payable,
  });

  const sum = (lines) => round2(lines.reduce((s, l) => s + l.amount, 0));
  if (
    Math.abs(sum(receivableLines) - value) > 0.001 ||
    Math.abs(sum(payableLines) - value) > 0.001
  ) {
    throw new Error("SETTLEMENT_SIDES_MUST_MATCH");
  }

  const dateOnly = (date || new Date().toISOString()).slice(0, 10);
  const time = new Date().toTimeString().slice(0, 8);
  const settlementDate = `${dateOnly} ${time}`;

  const settlementId = db
    .prepare(
      `
      INSERT INTO settlements (source_type, contact_id, amount, date, note, created_by)
      VALUES ('contact', ?, ?, ?, ?, ?)
      `,
    )
    .run(
      contactId,
      value,
      settlementDate,
      note || null,
      created_by || null,
    ).lastInsertRowid;

  const insertAllocation = db.prepare(`
    INSERT INTO payment_allocations (invoice_id, invoice_type, amount, settlement_id)
    VALUES (?, ?, ?, ?)
  `);

  for (const line of [...receivableLines, ...payableLines]) {
    insertAllocation.run(
      line.invoice_id,
      line.invoice_type,
      line.amount,
      settlementId,
    );
  }

  // Ledger: a credit row (closes what he owes you) and a debit row
  // (closes what you owe him) — net zero, so the balance is unchanged,
  // exactly as the two payment rows used to produce.
  const insertHistory = db.prepare(`
    INSERT INTO party_history
      (party_type, party_id, record_type, invoice_type, movement_type,
       amount, date, note, contact_id, side, settlement_id)
    VALUES
      (?, NULL, 'payment', 'payment', ?, ?, ?, ?, ?, ?, ?)
  `);

  // party_type on a settlement row is nominal (contact_id is what the
  // reads actually scope by) — 'customer' keeps the CHECK happy without
  // implying a legacy id exists.
  insertHistory.run(
    "customer",
    "decrease", // credit side, re-oriented like createPaymentHistory does
    value,
    settlementDate,
    note || null,
    contactId,
    "credit",
    settlementId,
  );
  insertHistory.run(
    "customer",
    "increase", // debit side
    value,
    settlementDate,
    note || null,
    contactId,
    "debit",
    settlementId,
  );

  return settlementId;
}

export function deleteSettlement(db, { settlementId }) {
  const settlement = db
    .prepare(`SELECT * FROM settlements WHERE id = ?`)
    .get(settlementId);
  if (!settlement) throw new Error("SETTLEMENT_NOT_FOUND");

  db.prepare(`DELETE FROM payment_allocations WHERE settlement_id = ?`).run(
    settlementId,
  );
  db.prepare(`DELETE FROM party_history WHERE settlement_id = ?`).run(
    settlementId,
  );
  db.prepare(`DELETE FROM settlements WHERE id = ?`).run(settlementId);
}
