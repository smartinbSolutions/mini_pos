import {
  getOpenDocuments,
  proposeAllocation,
  validateAllocations,
} from "./paymentAllocation";
import createPayment from "./createPayment";
import createPaymentAllocation from "./createPaymentAllocations";

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

// Which legacy party each non-cash payment is recorded on.
//   receipt (money "in", closes his side)  → customer side if he has one
//   payment (money "out", closes your side) → supplier side if he has one
// Either way the ledger lands correctly: the receipt is a credit row and
// the payment a debit row of the same amount, so the balance is unchanged.
function settlementParties(db, contactId) {
  const contact = db
    .prepare(
      `SELECT legacy_customer_id, legacy_supplier_id FROM contacts WHERE id = ?`,
    )
    .get(contactId);
  if (!contact) throw new Error("CONTACT_NOT_FOUND");

  const asCustomer = contact.legacy_customer_id
    ? { party_type: "customer", party_id: contact.legacy_customer_id }
    : null;
  const asSupplier = contact.legacy_supplier_id
    ? { party_type: "supplier", party_id: contact.legacy_supplier_id }
    : null;

  return {
    receipt: asCustomer || asSupplier,
    payment: asSupplier || asCustomer,
  };
}

// Save a confirmed settlement. Must run inside a transaction (the caller
// wraps it) — any failure rolls back every row.
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

  const parties = settlementParties(db, contactId);

  const sides = [
    { type: "income", party: parties.receipt, lines: receivableLines },
    { type: "expense", party: parties.payment, lines: payableLines },
  ];

  for (const side of sides) {
    // Non-cash: fund_id NULL, no fund_history row. invoice_id NULL so
    // createPayment doesn't auto-allocate — the confirmed lines do.
    const paymentId = createPayment(db, {
      type: side.type,
      party_type: side.party.party_type,
      party_id: side.party.party_id,
      fund_id: null,
      amount: value,
      amount_fund_currency: 0,
      exchange_rate: 1,
      effective_rate: 1,
      currency_code: null,
      invoice_id: null,
      invoice_type: "settlement",
      note: note || null,
      date: settlementDate,
      created_by,
    });

    db.prepare(`UPDATE payments SET settlement_id = ? WHERE id = ?`).run(
      settlementId,
      paymentId,
    );

    for (const line of side.lines) {
      createPaymentAllocation(db, {
        payment_id: paymentId,
        invoice_id: line.invoice_id,
        invoice_type: line.invoice_type,
        amount: line.amount,
      });
    }
  }

  return settlementId;
}

// Delete a settlement and everything it wrote — the documents reopen.
// Must run inside a transaction.
export function deleteSettlement(db, { settlementId, deletedBy }) {
  const settlement = db
    .prepare(`SELECT * FROM settlements WHERE id = ?`)
    .get(settlementId);
  if (!settlement) throw new Error("SETTLEMENT_NOT_FOUND");

  const payments = db
    .prepare(`SELECT * FROM payments WHERE settlement_id = ?`)
    .all(settlementId);

  for (const payment of payments) {
    const allocations = db
      .prepare(`SELECT * FROM payment_allocations WHERE payment_id = ?`)
      .all(payment.id);

    // Same audit trail as a deleted payment.
    db.prepare(
      `INSERT INTO deleted_payments (payment_id, payload, deleted_by) VALUES (?, ?, ?)`,
    ).run(
      payment.id,
      JSON.stringify({ payment, allocations, settlement }),
      deletedBy ?? null,
    );

    db.prepare(`DELETE FROM payment_allocations WHERE payment_id = ?`).run(
      payment.id,
    );
    db.prepare(`DELETE FROM party_history WHERE payment_id = ?`).run(
      payment.id,
    );
    db.prepare(`DELETE FROM payments WHERE id = ?`).run(payment.id);
  }

  db.prepare(`DELETE FROM settlements WHERE id = ?`).run(settlementId);
}
