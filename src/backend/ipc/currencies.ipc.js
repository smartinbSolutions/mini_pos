const { ipcMain } = require("electron");
import db from "../db";
export default function registerCurrenciesIPC() {
  // CREATE
  ipcMain.handle("create-currencies", (event, data) => {
    if (!data.name || !data.code || !data.exchangeRate) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const rate = Number(data.exchangeRate);

    // Only the primary currency may have a rate of exactly 1 — that rate
    // is reserved to mean "this is the base currency everything else is
    // converted against." A newly created currency is never primary.
    if (rate === 1) {
      return { message: "RATE_RESERVED_FOR_PRIMARY", status: 400 };
    }

    const result = db
      .prepare(
        `
      INSERT INTO currencies (name, latinName, code, exchangeRate,symbol,isPrimary)
      VALUES (?,?,?,?,?,?)
    `
      )
      .run(data.name, data.latinName, data.code, rate, data.symbol, 0);

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
    `
      )
      .all();

    return currencies;
  });

  ipcMain.handle("get-currency", (event, id) => {
    const currency = db
      .prepare(
        `
      SELECT * FROM currencies WHERE id = ?
    `
      )
      .get(id);

    return currency;
  });

  ipcMain.handle("update-currency", (event, data) => {
    if (!data.name || !data.code || !data.exchangeRate) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const existing = db
      .prepare(`SELECT isPrimary FROM currencies WHERE id = ?`)
      .get(data.id);

    if (!existing) {
      return { message: "CURRENCY_NOT_FOUND", status: 404 };
    }

    const rate = Number(data.exchangeRate);

    if (existing.isPrimary) {
      // The primary currency's rate is the reference point for every
      // other currency's conversion — it must always stay exactly 1.
      if (rate !== 1) {
        return { message: "PRIMARY_RATE_MUST_BE_ONE", status: 400 };
      }
    } else if (rate === 1) {
      // A non-primary currency claiming rate 1 would be indistinguishable
      // from the primary in every calculation that divides/multiplies by it.
      return { message: "RATE_RESERVED_FOR_PRIMARY", status: 400 };
    }

    db.prepare(
      `
      UPDATE currencies
      SET name = ?, latinName = ?, code = ?, exchangeRate = ?, symbol = ?
      WHERE id = ?
    `
    ).run(data.name, data.latinName, data.code, rate, data.symbol, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-currency", (event, id) => {
    const currency = db
      .prepare(`SELECT isPrimary FROM currencies WHERE id = ?`)
      .get(id);

    if (!currency) {
      return { success: true }; // already gone, nothing to do
    }

    if (currency.isPrimary) {
      return { success: false, message: "CANNOT_DELETE_PRIMARY", status: 400 };
    }

    db.prepare(
      `
      DELETE FROM currencies WHERE id = ?
    `
    ).run(id);

    return { success: true };
  });
}
