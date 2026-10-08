import { findLegacyContact } from "./contacts";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Which documents a payment can close, by cash direction.
//   in  → the contact owes you on these
//   out → you owe the contact on these
// Table names are fixed here — never taken from input.
const OPEN_DOCUMENTS = {
  in: [
    { invoice_type: "sales", table: "sales_invoices" },
    { invoice_type: "purchase_return", table: "purchase_returns" },
  ],
  out: [
    { invoice_type: "purchase", table: "purchase_invoices" },
    { invoice_type: "expense", table: "expense" },
    { invoice_type: "sales_return", table: "sales_returns" },
  ],
};

// Opening balance a payment can close: debit (he owes you) for money in,
// credit (you owe him) for money out.
const OPENING_SIDE = { in: "debit", out: "credit" };

// Accepts a contact id directly, or a legacy customer / supplier id.
export function resolveContactId(db, { contactId, partyType, partyId }) {
  if (contactId) return Number(contactId);
  // partyId from the frontend is a contact id by convention — never a
  // legacy customer/supplier id.
  if (partyId) return Number(partyId);
  return null;
}

// Open documents of one contact for one direction, oldest first.
export function getOpenDocuments(db, { contactId, direction }) {
  const configs = OPEN_DOCUMENTS[direction];
  if (!configs) throw new Error("INVALID_DIRECTION");

  const documents = [];

  for (const { invoice_type, table } of configs) {
    const rows = db
      .prepare(
        `
        SELECT
          d.id AS invoice_id,
          d.invoice_name AS name,
          d.date,
          d.net_total AS total,
          d.net_total - COALESCE(SUM(pa.amount), 0) AS remaining
        FROM ${table} d
        LEFT JOIN payment_allocations pa
          ON pa.invoice_id = d.id AND pa.invoice_type = ?
        WHERE d.contact_id = ?
        GROUP BY d.id
        HAVING remaining > 0.005
        `,
      )
      .all(invoice_type, contactId);

    for (const r of rows) {
      documents.push({ ...r, invoice_type, remaining: round2(r.remaining) });
    }
  }

  // Opening balance on the matching side (allocations point at the
  // party_history row id, invoice_type 'opening_balance').
  const openings = db
    .prepare(
      `
      SELECT
        ph.id AS invoice_id,
        ph.date,
        ph.amount AS total,
        ph.amount - COALESCE(SUM(pa.amount), 0) AS remaining
      FROM party_history ph
      LEFT JOIN payment_allocations pa
        ON pa.invoice_id = ph.id AND pa.invoice_type = 'opening_balance'
      WHERE ph.contact_id = ?
        AND ph.record_type = 'opening_balance'
        AND ph.side = ?
      GROUP BY ph.id
      HAVING remaining > 0.005
      `,
    )
    .all(contactId, OPENING_SIDE[direction]);

  for (const r of openings) {
    documents.push({
      ...r,
      name: null,
      invoice_type: "opening_balance",
      remaining: round2(r.remaining),
    });
  }

  // Oldest first; the opening balance leads on the same date.
  documents.sort((a, b) => {
    const byDate = new Date(a.date) - new Date(b.date);
    if (byDate !== 0) return byDate;
    if (a.invoice_type === "opening_balance") return -1;
    if (b.invoice_type === "opening_balance") return 1;
    return a.invoice_id - b.invoice_id;
  });

  return documents;
}

// FIFO proposal: fill the oldest documents first; the rest is leftover.
export function proposeAllocation(documents, amount) {
  let remaining = round2(amount);

  const lines = documents.map((doc) => {
    const allocate = round2(Math.min(doc.remaining, Math.max(remaining, 0)));
    remaining = round2(remaining - allocate);
    return { ...doc, allocate };
  });

  const allocated = round2(lines.reduce((sum, l) => sum + l.allocate, 0));

  return {
    lines,
    allocated,
    leftover: round2(Number(amount) - allocated),
  };
}

// Re-check a user-confirmed allocation list against the live data.
// Only open documents of THIS contact, on THIS direction's side, can be
// allocated; never more than a document's remaining or the payment total.
export function validateAllocations(
  db,
  { contactId, direction, amount, allocations },
) {
  const open = getOpenDocuments(db, { contactId, direction });
  const byKey = new Map(
    open.map((d) => [`${d.invoice_type}:${d.invoice_id}`, d]),
  );

  const seen = new Set();
  const lines = [];
  let total = 0;

  for (const a of allocations || []) {
    const value = round2(a.amount);
    if (!(value > 0)) continue; // empty lines are just ignored

    const key = `${a.invoice_type}:${Number(a.invoice_id)}`;
    if (seen.has(key)) throw new Error("DUPLICATE_ALLOCATION");
    seen.add(key);

    const doc = byKey.get(key);
    if (!doc) throw new Error("ALLOCATION_DOCUMENT_NOT_OPEN");
    if (value > doc.remaining + 0.001) {
      throw new Error("ALLOCATION_EXCEEDS_REMAINING");
    }

    total += value;
    lines.push({
      invoice_type: doc.invoice_type,
      invoice_id: doc.invoice_id,
      amount: value,
    });
  }

  if (total > Number(amount) + 0.001) {
    throw new Error("ALLOCATION_EXCEEDS_PAYMENT");
  }

  return lines;
}
