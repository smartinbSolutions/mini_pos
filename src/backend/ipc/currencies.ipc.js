const { ipcMain } = require("electron");
import db from "../db";
export default function registerCurrenciesIPC() {
  // CREATE
  ipcMain.handle("create-currencies", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO currencies (name, latinName, code, exchangeRate)
      VALUES (?,?,?,?)
    `,
      )
      .run(data.name, data.latinName, data.code, data.exchangeRate);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-currencies", () => {
    const currencies = db
      .prepare(
        `
      SELECT * FROM currencies
    `,
      )
      .all();

    return currencies;
  });

  ipcMain.handle("get-currency", (event, id) => {
    const currency = db
      .prepare(
        `
      SELECT * FROM currencies WHERE id = ?
    `,
      )
      .get(id);

    return currency;
  });

  ipcMain.handle("update-currency", (event, data) => {
    db.prepare(
      `
      UPDATE currencies
      SET name = ?, latinName = ?, code = ?, exchangeRate = ?
      WHERE id = ?
    `,
    ).run(data.name, data.latinName, data.code, data.exchangeRate, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-currency", (event, id) => {
    db.prepare(
      `
      DELETE FROM currencies WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}
