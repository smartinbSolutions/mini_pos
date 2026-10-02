const { ipcMain } = require("electron");
import db from "../db";
import { upsertOpeningBalance } from "../utils/openingBalance";

// Normalizes + validates the customer → supplier link.
// Returns the supplier id to store, or null for "not linked".
function resolveLinkedSupplier(db, value, customerId = null) {
  const supplierId = Number(value) || null;
  if (!supplierId) return null;

  const supplier = db
    .prepare(`SELECT id FROM suppliers WHERE id = ?`)
    .get(supplierId);
  if (!supplier) {
    throw new Error("SUPPLIER_NOT_FOUND");
  }

  // One-to-one: the supplier must not already be linked to another customer.
  const takenBy = db
    .prepare(
      `SELECT id FROM customers WHERE linked_supplier_id = ? AND id IS NOT ?`,
    )
    .get(supplierId, customerId);
  if (takenBy) {
    throw new Error("SUPPLIER_ALREADY_LINKED");
  }

  return supplierId;
}

export default function registerCustomersIPC() {
  // CREATE
  ipcMain.handle("create-customer", (event, data) => {
    const name = (data.name || "").trim();
    const phone = (data.phone || "").trim();
    const address = (data.address || "").trim();

    if (!name) {
      return { success: false, error: "ERROR ENTER DATA" };
    }

    const createTx = db.transaction(() => {
      let linkedSupplierId = resolveLinkedSupplier(db, data.linked_supplier_id);

      // "Create a supplier with the same details" — made in the same
      // transaction, so a failure never leaves a half-made supplier behind.
      if (!linkedSupplierId && data.create_linked_supplier) {
        linkedSupplierId = db
          .prepare(
            `INSERT INTO suppliers (name, phone, address) VALUES (?,?,?)`,
          )
          .run(name, phone, address).lastInsertRowid;
      }

      const result = db
        .prepare(
          `
        INSERT INTO customers (name, phone, address, linked_supplier_id)
        VALUES (?,?,?,?)
      `,
        )
        .run(name, phone, address, linkedSupplierId);

      const openingBalance = Number(data.opening_balance || 0);
      if (openingBalance !== 0) {
        upsertOpeningBalance(db, {
          owner_type: "customer",
          owner_id: result.lastInsertRowid,
          amount: openingBalance,
          balance_type: data.balance_type,
          date: data.date,
        });
      }

      return result.lastInsertRowid;
    });

    try {
      const id = createTx();
      return { success: true, id };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("get-customers", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    // Fixed enum only — never interpolate raw user input into HAVING.
    const balanceFilter = ["owing", "settled"].includes(params.balance_filter)
      ? params.balance_filter
      : "all";
    const havingClause =
      balanceFilter === "owing"
        ? "HAVING balance > 0"
        : balanceFilter === "settled"
          ? "HAVING balance <= 0"
          : "";

    // Search is bound as a parameter — never interpolated.
    const search = String(params.search || "").trim();
    const whereClause = search ? "WHERE c.name LIKE ? OR c.phone LIKE ?" : "";
    const whereValues = search ? [`%${search}%`, `%${search}%`] : [];

    // Balance must be computed here (not just selected) so HAVING can filter on it.
    const perCustomerCTE = `
      SELECT
        c.id,
        c.name,
        c.phone,
        c.address,
        c.createdAt,
        c.linked_supplier_id,
        ls.name AS linked_supplier_name,
        COALESCE(SUM(CASE WHEN ph.movement_type = 'increase' THEN ph.amount ELSE 0 END), 0) AS total,
        COALESCE(SUM(CASE WHEN ph.movement_type = 'decrease' THEN ph.amount ELSE 0 END), 0) AS total_paid,
        COALESCE(SUM(CASE WHEN ph.movement_type = 'increase' THEN ph.amount ELSE 0 END), 0)
          - COALESCE(SUM(CASE WHEN ph.movement_type = 'decrease' THEN ph.amount ELSE 0 END), 0) AS balance
      FROM customers c
      LEFT JOIN suppliers ls
        ON ls.id = c.linked_supplier_id
      LEFT JOIN party_history ph
        ON ph.party_type = 'customer'
       AND ph.party_id = c.id
      ${whereClause}
      GROUP BY c.id
      ${havingClause}
    `;

    try {
      const customers = db
        .prepare(
          `
        SELECT * FROM (${perCustomerCTE})
        ORDER BY createdAt DESC, id DESC
        LIMIT ? OFFSET ?
        `,
        )
        .all(...whereValues, limit, offset);

      const { total } = db
        .prepare(`SELECT COUNT(*) AS total FROM (${perCustomerCTE})`)
        .get(...whereValues);

      // Cross-page aggregates for the currently applied filter — not just this page.
      const stats = db
        .prepare(
          `
        SELECT
          COUNT(*) AS count,
          COALESCE(SUM(total), 0) AS totalPayable,
          COALESCE(SUM(total_paid), 0) AS totalPaid,
          COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) AS netOutstanding
        FROM (${perCustomerCTE})
        `,
        )
        .get(...whereValues);

      // Counts per filter bucket, independent of which filter is currently applied.
      // Search still applies here, so counts reflect the searched set.
      const unfilteredCTE = perCustomerCTE.replace(havingClause, "");
      const counts = db
        .prepare(
          `
        SELECT
          COUNT(*) AS all_count,
          SUM(CASE WHEN balance > 0 THEN 1 ELSE 0 END) AS owing_count,
          SUM(CASE WHEN balance <= 0 THEN 1 ELSE 0 END) AS settled_count
        FROM (${unfilteredCTE})
        `,
        )
        .get(...whereValues);

      return {
        success: true,
        data: customers,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        stats,
        counts: {
          all: counts.all_count || 0,
          owing: counts.owing_count || 0,
          settled: counts.settled_count || 0,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("get-customer", (event, id) => {
    try {
      const customer = db
        .prepare(
          `
      SELECT
        c.*,
        ls.name AS linked_supplier_name,

        COALESCE(
          SUM(CASE WHEN ph.movement_type = 'increase' THEN ph.amount ELSE 0 END),
          0
        ) AS total,

        COALESCE(
          SUM(CASE WHEN ph.movement_type = 'decrease' THEN ph.amount ELSE 0 END),
          0
        ) AS total_paid,

        COALESCE(
          SUM(
            CASE
              WHEN ph.movement_type = 'increase' THEN ph.amount
              WHEN ph.movement_type = 'decrease' THEN -ph.amount
              ELSE 0
            END
          ),
          0
        ) AS balance

      FROM customers c

      LEFT JOIN suppliers ls
        ON ls.id = c.linked_supplier_id

      LEFT JOIN party_history ph
        ON ph.party_type = 'customer'
       AND ph.party_id = c.id

      WHERE c.id = ?

      GROUP BY c.id;
      `,
        )
        .get(id);

      return { success: true, data: customer };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("update-customer", (event, data) => {
    const name = (data.name || "").trim();
    const phone = (data.phone || "").trim();
    const address = (data.address || "").trim();

    if (!name) {
      return { success: false, error: "ERROR ENTER DATA" };
    }

    try {
      db.transaction(() => {
        db.prepare(
          `
          UPDATE customers
          SET name = ?, phone = ?, address = ?
          WHERE id = ?
        `,
        ).run(name, phone, address, data.id);

        // Only touch the link when the form actually sends it — callers that
        // don't send the field can never clear an existing link by accident.
        // Sending null / "" unlinks.
        if ("linked_supplier_id" in data || data.create_linked_supplier) {
          let linkedSupplierId = resolveLinkedSupplier(
            db,
            data.linked_supplier_id,
            data.id,
          );

          if (!linkedSupplierId && data.create_linked_supplier) {
            linkedSupplierId = db
              .prepare(
                `INSERT INTO suppliers (name, phone, address) VALUES (?,?,?)`,
              )
              .run(name, phone, address).lastInsertRowid;
          }

          db.prepare(
            `UPDATE customers SET linked_supplier_id = ? WHERE id = ?`,
          ).run(linkedSupplierId, data.id);
        }
      })();

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("delete-customer", (event, id) => {
    try {
      const partyHistory = db
        .prepare(
          `
        SELECT id
        FROM party_history
        WHERE party_type = 'customer'
          AND party_id = ?
          AND record_type <> 'opening_balance'
        LIMIT 1
      `,
        )
        .get(id);

      if (partyHistory) {
        return {
          success: false,
          error: "Cannot delete customer because it has transactions.",
        };
      }

      db.transaction(() => {
        db.prepare(
          `
          DELETE FROM party_history
          WHERE party_type = 'customer'
            AND party_id = ?
            AND record_type = 'opening_balance'
        `,
        ).run(id);

        db.prepare(
          `
          DELETE FROM customers
          WHERE id = ?
        `,
        ).run(id);
      })();

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
