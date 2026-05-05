const { ipcMain } = require("electron");
import db from "../db";
export default function registerFundIPC() {
  ipcMain.handle("create-fund", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO funds (name, currency_id, balance)
      VALUES (?, ?, ?)
    `,
      )
      .run(data.name, data.currency_id, data.balance || 0);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-funds", () => {
    const funds = db
      .prepare(
        `
      SELECT 
        f.*,
        c.name as currency_name,
        c.code as currency_code
      FROM funds f
      LEFT JOIN currencies c ON c.id = f.currency_id
    `,
      )
      .all();

    return funds;
  });

  ipcMain.handle("get-fund", (event, id) => {
    const fund = db
      .prepare(
        `
      SELECT 
        f.*,
        c.name as currency_name,
        c.code as currency_code
      FROM funds f
      LEFT JOIN currencies c ON c.id = f.currency_id
      WHERE f.id = ?
    `,
      )
      .get(id);

    return fund;
  });

  ipcMain.handle("update-fund", (event, data) => {
    db.prepare(
      `
      UPDATE funds
      SET name = ?, currency_id = ?, balance = ?
      WHERE id = ?
    `,
    ).run(data.name, data.currency_id, data.balance, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-fund", (event, id) => {
    db.prepare(
      `
      DELETE FROM funds WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}
