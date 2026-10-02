// Bridge between the old party model (customer/supplier ids) and contacts.
// Used by the write helpers during the transition; retired at cutover.

// Company's-books side for a party_history row.
//   customer: increase → debit,  decrease → credit
//   supplier / partner: increase → credit, decrease → debit
export function sideFor(partyType, movementType) {
  const isIncrease = movementType === "increase";
  if (partyType === "customer") return isIncrease ? "debit" : "credit";
  return isIncrease ? "credit" : "debit";
}

// Returns the contact id for an old customer / supplier id, creating the
// contact on the fly if this party was added after the last startup sync.
// Partners and other party types have no contact → null.
export function ensureLegacyContact(db, partyType, partyId) {
  const id = Number(partyId);
  if (!id || (partyType !== "customer" && partyType !== "supplier")) {
    return null;
  }

  const column =
    partyType === "customer" ? "legacy_customer_id" : "legacy_supplier_id";

  const existing = db
    .prepare(`SELECT id FROM contacts WHERE ${column} = ?`)
    .get(id);
  if (existing) return existing.id;

  const table = partyType === "customer" ? "customers" : "suppliers";
  const party = db
    .prepare(
      `SELECT name, phone, address, createdAt FROM ${table} WHERE id = ?`,
    )
    .get(id);
  if (!party) return null;

  const result = db
    .prepare(
      `
      INSERT INTO contacts
        (name, phone, address, is_customer, is_supplier, ${column}, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      party.name || "",
      party.phone || null,
      party.address || null,
      partyType === "customer" ? 1 : 0,
      partyType === "supplier" ? 1 : 0,
      id,
      party.createdAt || new Date().toISOString(),
    );

  return result.lastInsertRowid;
}

// Read-only: contact id for an old customer / supplier id, or null.
export function findLegacyContact(db, partyType, partyId) {
  const id = Number(partyId);
  if (!id || (partyType !== "customer" && partyType !== "supplier")) {
    return null;
  }
  const column =
    partyType === "customer" ? "legacy_customer_id" : "legacy_supplier_id";
  return (
    db.prepare(`SELECT id FROM contacts WHERE ${column} = ?`).get(id)?.id ??
    null
  );
}
