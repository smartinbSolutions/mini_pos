const { ipcMain } = require("electron");
import db from "../db";

export default function registerTaxesIPC() {
  ipcMain.handle("create-tax", (event, data) => {
    if (!data.name || data.rate < 0) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const category = ["product", "invoice", "both"].includes(data.category)
      ? data.category
      : "product";

    const result = db
      .prepare(
        `
      INSERT INTO taxes (name, rate, category)
      VALUES (?, ?, ?)
    `
      )
      .run(data.name, data.rate || 0, category);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-taxes", (event, params = {}) => {
    const category = params?.category;

    if (category && ["product", "invoice", "both"].includes(category)) {
      // e.g. product dropdown asks for taxes usable on a product: 'product' or 'both'
      return db
        .prepare(
          `
        SELECT * FROM taxes
        WHERE category = ? OR category = 'both'
      `
        )
        .all(category);
    }

    return db.prepare(`SELECT * FROM taxes`).all();
  });

  ipcMain.handle("get-tax", (event, id) => {
    return db
      .prepare(
        `
      SELECT * FROM taxes WHERE id = ?
    `
      )
      .get(id);
  });

  ipcMain.handle("update-tax", (event, data) => {
    if (!data.name || data.rate < 0) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const category = ["product", "invoice", "both"].includes(data.category)
      ? data.category
      : "product";

    db.prepare(
      `
      UPDATE taxes
      SET name = ?, rate = ?, category = ?
      WHERE id = ?
    `
    ).run(data.name, data.rate, category, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-tax", (event, id) => {
    const usedByProduct = db
      .prepare(`SELECT id FROM products WHERE tax_id = ? LIMIT 1`)
      .get(id);

    if (usedByProduct) {
      return {
        message: "ERROR TAX IN USE",
        status: 409,
      };
    }

    db.prepare(
      `
      DELETE FROM taxes WHERE id = ?
    `
    ).run(id);

    return { success: true };
  });
}
