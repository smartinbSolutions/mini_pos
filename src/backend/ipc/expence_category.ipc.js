const { ipcMain } = require("electron");
import db from "../db";

export default function registerExpenceCategoryIPC() {
  ipcMain.handle("create-expence_category", (event, data) => {
    if (!data.name) {
      return {
        message: "ERROR ENTER DATA",
        status: 500,
      };
    }

    const result = db
      .prepare(
        `
      INSERT INTO expence_category 
      (name,latinName)
      VALUES (?, ?)
      `,
      )
      .run(data.name, data.latinName);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-expence_category", () => {
    return db
      .prepare(
        `
      SELECT * 
      FROM expence_category
      ORDER BY id DESC
      `,
      )
      .all();
  });

  ipcMain.handle("get-expence_category-by-id", (event, id) => {
    return db
      .prepare(
        `
      SELECT *
      FROM expence_category
      WHERE id = ?
      `,
      )
      .get(id);
  });

  ipcMain.handle("update-expence_category", (event, data) => {
    if (!data.name) {
      return {
        message: "ERROR ENTER DATA",
        status: 500,
      };
    }

    db.prepare(
      `
      UPDATE expence_category
      SET name = ?, latinName = ?
      WHERE id = ?
      `,
    ).run(data.name, data.latinName, data.id);

    return {
      success: true,
    };
  });

  ipcMain.handle("delete-expence_category", (event, id) => {
    db.prepare(
      `
      DELETE FROM expence_category
      WHERE id = ?
      `,
    ).run(id);

    return {
      success: true,
    };
  });
}
