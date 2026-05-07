const { ipcMain } = require("electron");
import db from "../db";
export default function registerTaxesIPC() {
  ipcMain.handle("create-tax", (event, data) => {
    if (!data.name || !data.rate) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const result = db
      .prepare(
        `
      INSERT INTO taxes (name, rate)
      VALUES (?, ?)
    `,
      )
      .run(data.name, data.rate || 0);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-taxes", () => {
    return db
      .prepare(
        `
      SELECT * FROM taxes
    `,
      )
      .all();
  });

  ipcMain.handle("get-tax", (event, id) => {
    return db
      .prepare(
        `
      SELECT * FROM taxes WHERE id = ?
    `,
      )
      .get(id);
  });

  ipcMain.handle("update-tax", (event, data) => {
    if (!data.name || !data.rate) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    db.prepare(
      `
      UPDATE taxes
      SET name = ?, rate = ?
      WHERE id = ?
    `,
    ).run(data.name, data.rate, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-tax", (event, id) => {
    db.prepare(
      `
      DELETE FROM taxes WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}
