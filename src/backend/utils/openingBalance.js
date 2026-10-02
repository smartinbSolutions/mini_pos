import createPartyHistory from "./createPaymentHistory";
import createFundHistory from "./createFundHistory";
import { buildOpeningBalanceNote } from "./helpers";
import { findLegacyContact, sideFor } from "./contacts";

const OWNER_TABLES = {
  customer: "customers",
  supplier: "suppliers",
  partner: "partners",
  fund: "funds",
};

// Opening rows live in party_history (contact / partner) or fund_history (fund).
// Customer & supplier resolve to their CONTACT. New contacts have one opening
// balance; old merged contacts may keep one per side until settled.
function ledgerFor(db, ownerType, ownerId) {
  if (ownerType === "fund") {
    return { table: "fund_history", where: "fund_id = ?", params: [ownerId] };
  }

  const contactId = findLegacyContact(db, ownerType, ownerId);
  if (contactId) {
    return {
      table: "party_history",
      where: "contact_id = ?",
      params: [contactId],
      contactId,
    };
  }

  return {
    table: "party_history",
    where: "party_type = ? AND party_id = ?",
    params: [ownerType, ownerId],
  };
}

function assertOwner(db, ownerType, ownerId) {
  const table = OWNER_TABLES[ownerType];
  if (!table) throw new Error("INVALID_OWNER_TYPE");

  const owner = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(ownerId);
  if (!owner) throw new Error("OWNER_NOT_FOUND");
}

// Contact with two legacy opening rows (one per side): prefer the row of the
// side being viewed. Single-row contacts just get their one row.
function findOpeningRow(db, ledger, ownerType) {
  const extraColumns =
    ledger.table === "party_history" ? ", side, party_type" : "";
  const prefer = ledger.contactId
    ? "ORDER BY CASE WHEN party_type = ? THEN 0 ELSE 1 END, id LIMIT 1"
    : "";
  const preferValues = ledger.contactId ? [ownerType] : [];

  return db
    .prepare(
      `SELECT id, amount, movement_type, date${extraColumns} FROM ${ledger.table}
       WHERE ${ledger.where} AND record_type = 'opening_balance'
       ${prefer}`,
    )
    .get(...ledger.params, ...preferValues);
}

// How much of this opening balance payments have already closed.
function allocatedToOpening(db, openingRowId) {
  const row = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM payment_allocations
       WHERE invoice_type = 'opening_balance' AND invoice_id = ?`,
    )
    .get(openingRowId);
  return Number(row?.total || 0);
}

export function getOpeningBalance(db, { owner_type, owner_id }) {
  assertOwner(db, owner_type, owner_id);

  const ledger = ledgerFor(db, owner_type, owner_id);
  const row = findOpeningRow(db, ledger, owner_type);
  if (!row) return null;

  // Contact rows: direction relative to the page asking —
  // customer page: debit = "they owe you"; supplier page: credit = "you owe them".
  let balanceType;
  if (ledger.contactId) {
    const increaseSide = owner_type === "customer" ? "debit" : "credit";
    balanceType = row.side === increaseSide ? "increase" : "decrease";
  } else {
    balanceType =
      row.movement_type === "out" || row.movement_type === "decrease"
        ? "decrease"
        : "increase";
  }

  return {
    id: row.id,
    amount: Number(row.amount || 0),
    balance_type: balanceType,
    date: row.date,
  };
}

export function upsertOpeningBalance(
  db,
  { owner_type, owner_id, amount, balance_type, date },
) {
  assertOwner(db, owner_type, owner_id);

  const value = Math.abs(Number(amount || 0));
  if (!value) throw new Error("INVALID_OPENING_BALANCE_AMOUNT");

  const isFund = owner_type === "fund";
  const isDecrease = balance_type === "decrease";
  const movement = isFund
    ? isDecrease
      ? "out"
      : "in"
    : isDecrease
      ? "decrease"
      : "increase";

  const ledger = ledgerFor(db, owner_type, owner_id);
  const existing = findOpeningRow(db, ledger, owner_type);

  // No date sent: keep the existing date, or default to Jan 1 for a new row
  const openingDate = date
    ? `${date.slice(0, 10)} 00:00:00`
    : existing?.date || `${new Date().getFullYear()}-01-01 00:00:00`;

  const { earliest } = db
    .prepare(
      `SELECT MIN(date) AS earliest FROM ${ledger.table}
       WHERE ${ledger.where} AND record_type <> 'opening_balance'`,
    )
    .get(...ledger.params);

  if (earliest && openingDate > earliest) {
    throw new Error("OPENING_BALANCE_AFTER_FIRST_MOVEMENT");
  }

  if (existing) {
    if (isFund) {
      db.prepare(
        `UPDATE fund_history SET amount = ?, movement_type = ?, date = ? WHERE id = ?`,
      ).run(value, movement, openingDate, existing.id);
      return;
    }

    // Dependency guard: payments already closed part of this opening
    // balance. It may not move to the other side, flip direction, or drop
    // below what's allocated — that would break those allocations.
    const allocated = allocatedToOpening(db, existing.id);
    if (allocated > 0) {
      const newSide = sideFor(owner_type, movement);
      const sideChanges =
        existing.party_type !== owner_type || existing.side !== newSide;
      if (sideChanges || value + 0.001 < allocated) {
        throw new Error("OPENING_BALANCE_ALLOCATED");
      }
    }

    // Re-point the row to the party it was set from, so party_type,
    // movement_type and side always agree.
    db.prepare(
      `UPDATE party_history
       SET party_type = ?, party_id = ?, amount = ?, movement_type = ?,
           side = ?, date = ?
       WHERE id = ?`,
    ).run(
      owner_type,
      owner_id,
      value,
      movement,
      sideFor(owner_type, movement),
      openingDate,
      existing.id,
    );
    return;
  }

  if (isFund) {
    createFundHistory(db, {
      fund_id: owner_id,
      record_type: "opening_balance",
      movement_type: movement,
      amount: value,
      date: openingDate,
      note: buildOpeningBalanceNote(db),
    });
  } else {
    createPartyHistory(db, {
      party_type: owner_type,
      party_id: owner_id,
      invoice_id: null,
      invoice_type: "opening_balance",
      record_type: "opening_balance",
      movement_type: movement,
      amount: value,
      note: buildOpeningBalanceNote(db),
      date: openingDate,
    });
  }
}

export function deleteOpeningBalance(db, { owner_type, owner_id }) {
  assertOwner(db, owner_type, owner_id);

  const ledger = ledgerFor(db, owner_type, owner_id);
  const row = findOpeningRow(db, ledger, owner_type);
  if (!row) throw new Error("OPENING_BALANCE_NOT_FOUND");

  // Dependency guard: deleting an opening balance that payments closed
  // would leave those allocations pointing at nothing.
  if (ledger.table === "party_history" && allocatedToOpening(db, row.id) > 0) {
    throw new Error("OPENING_BALANCE_ALLOCATED");
  }

  db.prepare(`DELETE FROM ${ledger.table} WHERE id = ?`).run(row.id);
}
