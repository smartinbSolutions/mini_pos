import createPartyHistory from "./createPaymentHistory";
import createFundHistory from "./createFundHistory";
import { buildOpeningBalanceNote } from "./helpers";

const OWNER_TABLES = {
  customer: "customers",
  supplier: "suppliers",
  partner: "partners",
  fund: "funds",
};

// Opening rows live in party_history (customer/supplier/partner) or fund_history (fund)
function ledgerFor(ownerType) {
  if (ownerType === "fund") {
    return {
      table: "fund_history",
      where: "fund_id = ?",
      params: (ownerId) => [ownerId],
    };
  }
  return {
    table: "party_history",
    where: "party_type = ? AND party_id = ?",
    params: (ownerId) => [ownerType, ownerId],
  };
}

function assertOwner(db, ownerType, ownerId) {
  const table = OWNER_TABLES[ownerType];
  if (!table) throw new Error("INVALID_OWNER_TYPE");

  const owner = db.prepare(`SELECT id FROM ${table} WHERE id = ?`).get(ownerId);
  if (!owner) throw new Error("OWNER_NOT_FOUND");
}

function findOpeningRow(db, ownerType, ownerId) {
  const ledger = ledgerFor(ownerType);
  return db
    .prepare(
      `SELECT id, amount, movement_type, date FROM ${ledger.table}
       WHERE ${ledger.where} AND record_type = 'opening_balance'`,
    )
    .get(...ledger.params(ownerId));
}

export function getOpeningBalance(db, { owner_type, owner_id }) {
  assertOwner(db, owner_type, owner_id);

  const row = findOpeningRow(db, owner_type, owner_id);
  if (!row) return null;

  return {
    id: row.id,
    amount: Number(row.amount || 0),
    balance_type:
      row.movement_type === "out" || row.movement_type === "decrease"
        ? "decrease"
        : "increase",
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

  const ledger = ledgerFor(owner_type);
  const existing = findOpeningRow(db, owner_type, owner_id);

  // No date sent: keep the existing date, or default to Jan 1 for a new row
  const openingDate = date
    ? `${date.slice(0, 10)} 00:00:00`
    : existing?.date || `${new Date().getFullYear()}-01-01 00:00:00`;

  const { earliest } = db
    .prepare(
      `SELECT MIN(date) AS earliest FROM ${ledger.table}
       WHERE ${ledger.where} AND record_type <> 'opening_balance'`,
    )
    .get(...ledger.params(owner_id));

  if (earliest && openingDate > earliest) {
    throw new Error("OPENING_BALANCE_AFTER_FIRST_MOVEMENT");
  }

  if (existing) {
    db.prepare(
      `UPDATE ${ledger.table} SET amount = ?, movement_type = ?, date = ? WHERE id = ?`,
    ).run(value, movement, openingDate, existing.id);
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

  const ledger = ledgerFor(owner_type);
  const result = db
    .prepare(
      `DELETE FROM ${ledger.table}
       WHERE ${ledger.where} AND record_type = 'opening_balance'`,
    )
    .run(...ledger.params(owner_id));

  if (result.changes === 0) throw new Error("OPENING_BALANCE_NOT_FOUND");
}
