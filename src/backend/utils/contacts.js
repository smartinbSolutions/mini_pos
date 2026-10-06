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

// Picker sent a contact → make sure it has this role, adding it on first use
// (first purchase makes a contact a supplier, first sale a customer).
// Returns the legacy customer / supplier id the handlers still use.
// Must run inside the caller's transaction.
export function ensureContactRole(db, contactId, role) {
  const cfg =
    role === "customer"
      ? {
          table: "customers",
          legacy: "legacy_customer_id",
          flag: "is_customer",
        }
      : {
          table: "suppliers",
          legacy: "legacy_supplier_id",
          flag: "is_supplier",
        };

  const contact = db
    .prepare(`SELECT * FROM contacts WHERE id = ?`)
    .get(Number(contactId));
  if (!contact) throw new Error("CONTACT_NOT_FOUND");

  if (contact[cfg.legacy]) {
    if (!contact[cfg.flag]) {
      db.prepare(`UPDATE contacts SET ${cfg.flag} = 1 WHERE id = ?`).run(
        contact.id,
      );
    }
    return contact[cfg.legacy];
  }

  const legacyId = db
    .prepare(`INSERT INTO ${cfg.table} (name, phone, address) VALUES (?, ?, ?)`)
    .run(
      contact.name,
      contact.phone || null,
      contact.address || null,
    ).lastInsertRowid;

  db.prepare(
    `UPDATE contacts SET ${cfg.legacy} = ?, ${cfg.flag} = 1 WHERE id = ?`,
  ).run(legacyId, contact.id);

  return legacyId;
}
