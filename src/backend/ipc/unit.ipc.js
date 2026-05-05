const { ipcMain } = require("electron");
import db from "../db";
export default function registerUnitIPC() {
  ipcMain.handle("create-unit", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO unit 
      (name, latinName, code)
      VALUES (?, ?, ?)
    `,
      )
      .run(data.name, data.latinName, data.code);

    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle("get-units", () => {
    const units = db
      .prepare(
        `
      SELECT * FROM unit
    `,
      )
      .all();

    return units;
  });

  ipcMain.handle("get-unit", (event, id) => {
    const unit = db
      .prepare(
        `
      SELECT * FROM unit WHERE id = ?
    `,
      )
      .get(id);

    return unit;
  });

  ipcMain.handle("update-unit", (event, data) => {
    db.prepare(
      `
      UPDATE unit
      SET name = ?, latinName = ?, code = ?
      WHERE id = ?
    `,
    ).run(data.name, data.latinName, data.code, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-unit", (event, id) => {
    db.prepare(`DELETE FROM unit WHERE id = ?`).run(id);

    return { success: true };
  });
}
