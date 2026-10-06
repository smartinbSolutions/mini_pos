const { ipcMain } = require("electron");
import db from "../db";
import { upsertOpeningBalance } from "../utils/openingBalance";

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
      const result = db
        .prepare(
          `
       INSERT INTO customers (name, phone, address)
        VALUES (?,?,?)
      `,
        )
        .run(name, phone, address);

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

    // Customer view of the contact's account: debit raises the balance
    // (he owes you), credit lowers it. The contacts join is one-to-one
    // (legacy_customer_id is UNIQUE), so it never multiplies history rows.
    const perCustomerCTE = `
      SELECT
        c.id,
        c.name,
        c.phone,
        c.address,
        c.createdAt,
        ct.id AS contact_id,
        ct.is_customer,
        ct.is_supplier,
        ROUND(COALESCE(SUM(CASE WHEN ph.side = 'debit' THEN ph.amount ELSE 0 END), 0), 2) AS total,
        ROUND(COALESCE(SUM(CASE WHEN ph.side = 'credit' THEN ph.amount ELSE 0 END), 0), 2) AS total_paid,
        ROUND(COALESCE(SUM(CASE WHEN ph.side = 'debit' THEN ph.amount ELSE -ph.amount END), 0), 2) AS balance
      FROM customers c
      LEFT JOIN contacts ct
        ON ct.legacy_customer_id = c.id
      LEFT JOIN party_history ph
        ON ph.contact_id = ct.id
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

        -- Customer view of the contact's account: debit raises the balance
        -- (he owes you), credit lowers it.
        COALESCE(
          SUM(CASE WHEN ph.side = 'debit' THEN ph.amount ELSE 0 END),
          0
        ) AS total,

        COALESCE(
          SUM(CASE WHEN ph.side = 'credit' THEN ph.amount ELSE 0 END),
          0
        ) AS total_paid,

        COALESCE(
          SUM(
            CASE
              WHEN ph.side = 'debit' THEN ph.amount
              WHEN ph.side = 'credit' THEN -ph.amount
              ELSE 0
            END
          ),
          0
        ) AS balance

      FROM customers c

      LEFT JOIN contacts ct
        ON ct.legacy_customer_id = c.id

      LEFT JOIN party_history ph
        ON ph.contact_id = ct.id

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
