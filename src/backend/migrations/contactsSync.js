const path = require("path");

// Phase 2 — non-destructive sync from the old customer/supplier model into
// contacts. Safe to run on every startup: it only fills what is missing.
// Stops permanently once the cutover migration records 'contacts_cutover'.
//
// What it does NOT touch: party_type, movement_type, customer_id,
// supplier_id — everything the current handlers read stays exactly as is.
export function syncContacts(db, { dbPath }) {
  const isApplied = db.prepare(
    `SELECT 1 FROM schema_migrations WHERE name = ?`,
  );
  if (isApplied.get("contacts_cutover")) return;

  // ---- 1. One-time backup before the first sync ----
  if (!isApplied.get("contacts_backup_v1")) {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "-")
      .slice(0, 15); // YYYYMMDD-HHMMSS
    const backupPath = path.join(
      path.dirname(dbPath),
      `pos.backup-${stamp}.db`,
    );

    try {
      // VACUUM INTO writes a consistent copy; it can't run inside a transaction.
      db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`);
      db.prepare(
        `INSERT INTO schema_migrations (name) VALUES ('contacts_backup_v1')`,
      ).run();
    } catch (err) {
      console.error("[contacts] backup failed — sync skipped:", err);
      return;
    }
  }

  const sync = db.transaction(() => {
    // ---- 2. Customers → contacts (a linked supplier merges into the same row) ----
    const fromCustomers = db
      .prepare(
        `
        INSERT INTO contacts
          (name, phone, address, is_customer, is_supplier,
           legacy_customer_id, legacy_supplier_id, createdAt)
        SELECT
          COALESCE(c.name, ''),
          COALESCE(NULLIF(c.phone, ''), s.phone),
          COALESCE(NULLIF(c.address, ''), s.address),
          1,
          CASE WHEN s.id IS NOT NULL THEN 1 ELSE 0 END,
          c.id,
          s.id,
          c.createdAt
        FROM customers c
        LEFT JOIN suppliers s
          ON s.id = c.linked_supplier_id
         AND NOT EXISTS (
           SELECT 1 FROM contacts x WHERE x.legacy_supplier_id = s.id
         )
        WHERE NOT EXISTS (
          SELECT 1 FROM contacts x WHERE x.legacy_customer_id = c.id
        )
        `,
      )
      .run().changes;

    // ---- 3. Remaining suppliers → contacts ----
    const fromSuppliers = db
      .prepare(
        `
        INSERT INTO contacts
          (name, phone, address, is_customer, is_supplier,
           legacy_customer_id, legacy_supplier_id, createdAt)
        SELECT COALESCE(s.name, ''), s.phone, s.address, 0, 1, NULL, s.id, s.createdAt
        FROM suppliers s
        WHERE NOT EXISTS (
          SELECT 1 FROM contacts x WHERE x.legacy_supplier_id = s.id
        )
        `,
      )
      .run().changes;

    // ---- 4. Backfill contact_id on documents ----
    const byCustomer = (table) =>
      db
        .prepare(
          `
          UPDATE ${table}
          SET contact_id = (
            SELECT id FROM contacts WHERE legacy_customer_id = ${table}.customer_id
          )
          WHERE contact_id IS NULL AND customer_id IS NOT NULL
          `,
        )
        .run().changes;

    const bySupplier = (table) =>
      db
        .prepare(
          `
          UPDATE ${table}
          SET contact_id = (
            SELECT id FROM contacts WHERE legacy_supplier_id = ${table}.supplier_id
          )
          WHERE contact_id IS NULL AND supplier_id IS NOT NULL
          `,
        )
        .run().changes;

    const documents =
      byCustomer("sales_invoices") +
      byCustomer("sales_returns") +
      byCustomer("sales_quotations") +
      bySupplier("purchase_invoices") +
      bySupplier("purchase_returns") +
      bySupplier("expense");

    const payments = db
      .prepare(
        `
        UPDATE payments
        SET contact_id = CASE party_type
          WHEN 'customer' THEN (SELECT id FROM contacts WHERE legacy_customer_id = payments.party_id)
          WHEN 'supplier' THEN (SELECT id FROM contacts WHERE legacy_supplier_id = payments.party_id)
        END
        WHERE contact_id IS NULL
          AND party_type IN ('customer', 'supplier')
          AND party_id IS NOT NULL
        `,
      )
      .run().changes;

    // ---- 5. party_history: contact_id + side (company's books) ----
    //   customer: increase → debit,  decrease → credit
    //   supplier: increase → credit, decrease → debit
    //   partner:  increase → credit, decrease → debit (side only, no contact)
    const history = db
      .prepare(
        `
        UPDATE party_history
        SET
          side = CASE
            WHEN party_type = 'customer' AND movement_type = 'increase' THEN 'debit'
            WHEN party_type = 'customer' THEN 'credit'
            WHEN movement_type = 'increase' THEN 'credit'
            ELSE 'debit'
          END,
          contact_id = CASE party_type
            WHEN 'customer' THEN (SELECT id FROM contacts WHERE legacy_customer_id = party_history.party_id)
            WHEN 'supplier' THEN (SELECT id FROM contacts WHERE legacy_supplier_id = party_history.party_id)
            ELSE NULL
          END
        WHERE side IS NULL
           OR (party_type IN ('customer', 'supplier') AND contact_id IS NULL)
        `,
      )
      .run().changes;

    // ---- 6. Verify: side-based balance must equal the old balance ----
    // Per contact: Σ(debit − credit) == customer(inc − dec) − supplier(inc − dec)
    const mismatches = db
      .prepare(
        `
        SELECT
          contact_id,
          SUM(CASE WHEN side = 'debit' THEN amount ELSE -amount END) AS by_side,
          SUM(
            CASE
              WHEN party_type = 'customer'
                THEN CASE WHEN movement_type = 'increase' THEN amount ELSE -amount END
              ELSE -(CASE WHEN movement_type = 'increase' THEN amount ELSE -amount END)
            END
          ) AS by_legacy
        FROM party_history
        WHERE party_type IN ('customer', 'supplier')
          AND contact_id IS NOT NULL
        GROUP BY contact_id
        HAVING ABS(by_side - by_legacy) > 0.005
        `,
      )
      .all();

    if (mismatches.length > 0) {
      throw new Error(
        `CONTACT_BALANCE_MISMATCH: ${JSON.stringify(mismatches.slice(0, 5))}`,
      );
    }

    // Orphans: history rows whose old customer/supplier no longer exists.
    // Logged, not fatal — they can't be mapped and the old model ignores
    // them the same way.
    const { orphans } = db
      .prepare(
        `
        SELECT COUNT(*) AS orphans
        FROM party_history
        WHERE party_type IN ('customer', 'supplier') AND contact_id IS NULL
        `,
      )
      .get();

    return {
      fromCustomers,
      fromSuppliers,
      documents,
      payments,
      history,
      orphans,
    };
  });

  try {
    const stats = sync();
    const changed =
      stats.fromCustomers +
      stats.fromSuppliers +
      stats.documents +
      stats.payments +
      stats.history;
    if (changed > 0 || stats.orphans > 0) {
      console.info("[contacts] sync:", stats);
    }
  } catch (err) {
    // Whole sync rolled back — the app keeps running on the old model.
    console.error("[contacts] sync rolled back:", err);
  }
}
