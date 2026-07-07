const { ipcMain } = require("electron");
import db from "../db";
export default function registerSuppliersIPC() {
  // CREATE
  ipcMain.handle("create-supplier", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const result = db
      .prepare(
        `
      INSERT INTO suppliers (name, phone, address)
      VALUES (?,?,?,?,?)
    `,
      )
      .run(data.name, data.phone, data.address);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-suppliers", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const suppliers = db
      .prepare(
        `
        SELECT
          s.*,
          COALESCE(SUM(CASE WHEN ph.record_type = 'invoice' THEN ph.amount ELSE 0 END), 0) AS total,
          COALESCE(SUM(CASE WHEN ph.record_type = 'payment' THEN ph.amount ELSE 0 END), 0) AS total_paid,
          COALESCE(SUM(CASE WHEN ph.record_type = 'invoice' THEN ph.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN ph.record_type = 'payment' THEN ph.amount ELSE 0 END), 0) AS balance
        FROM suppliers s
        LEFT JOIN party_history ph
          ON ph.party_type = 'supplier' AND ph.party_id = s.id
        GROUP BY s.id
        ORDER BY s.name
        LIMIT ? OFFSET ?
      `,
      )
      .all(limit, offset);

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM suppliers`)
      .get();

    return {
      data: suppliers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });

  ipcMain.handle("get-supplier", (event, id) => {
    const supplier = db
      .prepare(
        `
        SELECT
          s.*,
          COALESCE(SUM(CASE WHEN ph.record_type = 'invoice' THEN ph.amount ELSE 0 END), 0) AS total,
          COALESCE(SUM(CASE WHEN ph.record_type = 'payment' THEN ph.amount ELSE 0 END), 0) AS total_paid,
          COALESCE(SUM(CASE WHEN ph.record_type = 'invoice' THEN ph.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN ph.record_type = 'payment' THEN ph.amount ELSE 0 END), 0) AS balance
        FROM suppliers s
        LEFT JOIN party_history ph
          ON ph.party_type = 'supplier' AND ph.party_id = s.id
        WHERE s.id = ?
        GROUP BY s.id
      `,
      )
      .get(id);

    return supplier;
  });

  ipcMain.handle("update-supplier", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    db.prepare(
      `
      UPDATE suppliers
      SET name = ?, phone = ?, address = ?
      WHERE id = ?
    `,
    ).run(data.name, data.phone, data.address, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-supplier", (event, id) => {
    db.prepare(
      `
      DELETE FROM suppliers WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}
