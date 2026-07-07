const { ipcMain } = require("electron");
import db from "../db";
export default function registerPartnersIPC() {
  // CREATE
  ipcMain.handle("create-partner", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const result = db
      .prepare(
        `
      INSERT INTO partners (name, phone, address)
      VALUES (?,?,?)
    `
      )
      .run(data.name, data.phone, data.address);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });
  ipcMain.handle("get-partners", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const partners = db
      .prepare(
        `
        SELECT
          p.*,
          COALESCE(SUM(CASE WHEN ph.movement_type = 'deposit' THEN ph.amount ELSE 0 END), 0) AS total_deposit,
          COALESCE(SUM(CASE WHEN ph.movement_type = 'withdrawal' THEN ph.amount ELSE 0 END), 0) AS total_withdrawal,
          COALESCE(SUM(CASE WHEN ph.movement_type = 'withdrawal' THEN ph.amount ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN ph.movement_type = 'deposit' THEN ph.amount ELSE 0 END), 0) AS balance
        FROM partners p
        LEFT JOIN party_history ph
          ON ph.party_type = 'partner' AND ph.party_id = p.id
        GROUP BY p.id
        ORDER BY p.name
        LIMIT ? OFFSET ?
      `
      )
      .all(limit, offset);

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM partners`)
      .get();

    return {
      data: partners,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });
  ipcMain.handle("get-partner", (event, id) => {
    const partner = db
      .prepare(
        `
      SELECT * FROM partners WHERE id = ?
    `
      )
      .get(id);

    if (!partner) return null;

    const totals = db
      .prepare(
        `
      SELECT
        SUM(CASE WHEN movement_type = 'deposit' THEN amount ELSE 0 END) AS total_deposit,
        SUM(CASE WHEN movement_type = 'withdrawal' THEN amount ELSE 0 END) AS total_withdrawal
      FROM party_history
      WHERE party_id = ?
        AND party_type = 'partner'
    `
      )
      .get(id);

    return {
      ...partner,
      total_deposit: totals?.total_deposit || 0,
      total_withdrawal: totals?.total_withdrawal || 0,
    };
  });

  ipcMain.handle("update-partner", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    db.prepare(
      `
      UPDATE partners
      SET name = ?, phone = ?, address = ?
      WHERE id = ?
    `
    ).run(data.name, data.phone, data.address, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-partner", (event, id) => {
    const { count } = db
      .prepare(
        `
      SELECT COUNT(*) AS count FROM party_history
      WHERE party_type = 'partner' AND party_id = ?
    `
      )
      .get(id);

    if (count > 0) {
      throw new Error(
        "Cannot delete a partner that already has transaction history."
      );
    }

    db.prepare(
      `
      DELETE FROM partners WHERE id = ?
    `
    ).run(id);

    return { success: true };
  });
}
