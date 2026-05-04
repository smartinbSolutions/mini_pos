const { ipcMain } = require("electron");
const db = require("../backend/db");

function registerPaymentIPC() {
  ipcMain.handle("create-payment", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO payments 
      (type, party_type, party_id, fund_id, amount, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        data.type,
        data.party_type,
        data.party_id,
        data.fund_id,
        data.amount,
        data.note || null,
      );

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-payments", () => {
    return db
      .prepare(
        `
      SELECT 
        p.*,
        f.name AS fund_name
      FROM payments p
      LEFT JOIN funds f ON f.id = p.fund_id
      ORDER BY p.id DESC
    `,
      )
      .all();
  });

  ipcMain.handle("get-payment", (event, id) => {
    return db
      .prepare(
        `
      SELECT 
        p.*,
        f.name AS fund_name
      FROM payments p
      LEFT JOIN funds f ON f.id = p.fund_id
      WHERE p.id = ?
    `,
      )
      .get(id);
  });

  ipcMain.handle("update-payment", (event, data) => {
    db.prepare(
      `
      UPDATE payments
      SET 
        type = ?,
        party_type = ?,
        party_id = ?,
        fund_id = ?,
        amount = ?,
        note = ?
      WHERE id = ?
    `,
    ).run(
      data.type,
      data.party_type,
      data.party_id,
      data.fund_id,
      data.amount,
      data.note,
      data.id,
    );

    return { success: true };
  });

  ipcMain.handle("delete-payment", (event, id) => {
    db.prepare(`DELETE FROM payments WHERE id = ?`).run(id);

    return { success: true };
  });
}

module.exports = registerPaymentIPC;
