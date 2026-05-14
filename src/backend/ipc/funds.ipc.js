const { ipcMain } = require("electron");
import db from "../db";
export default function registerFundIPC() {
  ipcMain.handle("create-fund", (event, data) => {
    if (!data.name || !data.currency_id) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const result = db
      .prepare(
        `
      INSERT INTO funds (name, currency_id, balance)
      VALUES (?, ?, ?)
    `,
      )
      .run(data.name, data.currency_id, data.balance || 0);

    if (data.balance !== 0) {
      db.prepare(
        `
        INSERT INTO payments 
        (type, party_type, party_id, fund_id, amount, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      ).run(
        data.balance > 0 ? "income" : "expense",
        "other",
        null,
        result.lastInsertRowid,
        Math.abs(data.balance),
        "Open Balance",
      );
    }

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
        c.code as currency_code,
        c.exchangeRate as currency_exchangeRate
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
    if (!data.name || !data.currency_id) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
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
