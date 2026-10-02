const { ipcMain } = require("electron");
import db from "../db";
import { upsertOpeningBalance } from "../utils/openingBalance";

export default function registerSuppliersIPC() {
  // CREATE
  ipcMain.handle("create-supplier", (event, data) => {
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
        INSERT INTO suppliers (name, phone, address)
        VALUES (?,?,?)
      `,
        )
        .run(name, phone, address);

      const openingBalance = Number(data.opening_balance || 0);
      if (openingBalance !== 0) {
        upsertOpeningBalance(db, {
          owner_type: "supplier",
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

  ipcMain.handle("get-suppliers", (event, params = {}) => {
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
    const whereClause = search ? "WHERE s.name LIKE ? OR s.phone LIKE ?" : "";
    const whereValues = search ? [`%${search}%`, `%${search}%`] : [];

    // Supplier view of the contact's account: credit raises the balance
    // (you owe him), debit lowers it. Both joins are one-to-one
    // (unique indexes), so they never multiply history rows.
    const perSupplierCTE = `
      SELECT
        s.id,
        s.name,
        s.phone,
        s.address,
        s.createdAt,
        lc.id AS linked_customer_id,
        ct.id AS contact_id,
        ct.is_customer,
        ct.is_supplier,
        ROUND(COALESCE(SUM(CASE WHEN ph.side = 'credit' THEN ph.amount ELSE 0 END), 0), 2) AS total,
        ROUND(COALESCE(SUM(CASE WHEN ph.side = 'debit' THEN ph.amount ELSE 0 END), 0), 2) AS total_paid,
        ROUND(COALESCE(SUM(CASE WHEN ph.side = 'credit' THEN ph.amount ELSE -ph.amount END), 0), 2) AS balance
      FROM suppliers s
      LEFT JOIN customers lc
        ON lc.linked_supplier_id = s.id
      LEFT JOIN contacts ct
        ON ct.legacy_supplier_id = s.id
      LEFT JOIN party_history ph
        ON ph.contact_id = ct.id
      ${whereClause}
      GROUP BY s.id
      ${havingClause}
    `;

    try {
      const suppliers = db
        .prepare(
          `
        SELECT * FROM (${perSupplierCTE})
        ORDER BY createdAt DESC, id DESC
        LIMIT ? OFFSET ?
        `,
        )
        .all(...whereValues, limit, offset);

      const { total } = db
        .prepare(`SELECT COUNT(*) AS total FROM (${perSupplierCTE})`)
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
        FROM (${perSupplierCTE})
        `,
        )
        .get(...whereValues);

      // Counts per filter bucket, independent of which filter is currently applied,
      // so the chip labels ("Owing (12)") are always accurate regardless of selection.
      // Search still applies here, so counts reflect the searched set.
      const unfilteredCTE = perSupplierCTE.replace(havingClause, "");
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
        data: suppliers,
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

  ipcMain.handle("get-supplier", (event, id) => {
    try {
      const supplier = db
        .prepare(
          `
      SELECT
        s.*,
        lc.id AS linked_customer_id,
        lc.name AS linked_customer_name,

        -- Supplier view of the contact's account: credit raises the balance
        -- (you owe him), debit lowers it.
        COALESCE(
          SUM(CASE WHEN ph.side = 'credit' THEN ph.amount ELSE 0 END),
          0
        ) AS total,

        COALESCE(
          SUM(CASE WHEN ph.side = 'debit' THEN ph.amount ELSE 0 END),
          0
        ) AS total_paid,

        COALESCE(
          SUM(
            CASE
              WHEN ph.side = 'credit' THEN ph.amount
              WHEN ph.side = 'debit' THEN -ph.amount
              ELSE 0
            END
          ),
          0
        ) AS balance

      FROM suppliers s

      LEFT JOIN customers lc
        ON lc.linked_supplier_id = s.id

      LEFT JOIN contacts ct
        ON ct.legacy_supplier_id = s.id

      LEFT JOIN party_history ph
        ON ph.contact_id = ct.id

      WHERE s.id = ?

      GROUP BY s.id;
      `,
        )
        .get(id);

      return { success: true, data: supplier };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("update-supplier", (event, data) => {
    const name = (data.name || "").trim();
    const phone = (data.phone || "").trim();
    const address = (data.address || "").trim();

    if (!name) {
      return { success: false, error: "ERROR ENTER DATA" }; // TODO: no generic error-string builder exists yet — see note below
    }

    try {
      db.prepare(
        `
        UPDATE suppliers
        SET name = ?, phone = ?, address = ?
        WHERE id = ?
      `,
      ).run(name, phone, address, data.id);

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("delete-supplier", (event, id) => {
    try {
      const partyHistory = db
        .prepare(
          `
        SELECT id
        FROM party_history
        WHERE party_type = 'supplier'
          AND party_id = ?
          AND record_type <> 'opening_balance'
        LIMIT 1
      `,
        )
        .get(id);

      if (partyHistory) {
        return {
          success: false,
          error: "Cannot delete supplier because it has transactions.",
        };
      }

      db.transaction(() => {
        db.prepare(
          `
          DELETE FROM party_history
          WHERE party_type = 'supplier'
            AND party_id = ?
            AND record_type = 'opening_balance'
        `,
        ).run(id);

        db.prepare(
          `
          DELETE FROM suppliers WHERE id = ?
        `,
        ).run(id);
      })();

      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
