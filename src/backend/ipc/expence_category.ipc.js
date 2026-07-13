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
      `
      )
      .run(data.name, data.latinName);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-expence_category", (event, params = {}) => {
    const { startDate, endDate } = params || {};

    const conditions = [];
    const values = [];

    if (startDate) {
      conditions.push("date(e.date) >= date(?)");
      values.push(startDate);
    }
    if (endDate) {
      conditions.push("date(e.date) <= date(?)");
      values.push(endDate);
    }

    const dateCondition = conditions.length ? conditions.join(" AND ") : "1=1";

    return db
      .prepare(
        `
      SELECT
        ec.id,
        ec.name,
        ec.latinName,
        ec.createdAt,
        COALESCE(SUM(CASE WHEN ${dateCondition} THEN ei.price ELSE 0 END), 0) AS total_spent,
        COUNT(CASE WHEN ${dateCondition} THEN ei.id END) AS items_count,
        COUNT(ei.id) AS total_items_count
      FROM expence_category ec
      LEFT JOIN expense_items ei ON ei.category_id = ec.id
      LEFT JOIN expense e ON e.id = ei.expense_id
      GROUP BY ec.id
      ORDER BY ec.id DESC
      `
      )
      .all(...values, ...values);
  });

  ipcMain.handle("get-expence_category-by-id", (event, id) => {
    return db
      .prepare(
        `
      SELECT *
      FROM expence_category
      WHERE id = ?
      `
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
      `
    ).run(data.name, data.latinName, data.id);

    return {
      success: true,
    };
  });

  ipcMain.handle("delete-expence_category", (event, id) => {
    const usageCount = db
      .prepare(
        `SELECT COUNT(*) as count FROM expense_items WHERE category_id = ?`
      )
      .get(id).count;

    if (usageCount > 0) {
      return {
        success: false,
        error:
          "This category is used by existing expenses and cannot be deleted",
      };
    }

    db.prepare(
      `
      DELETE FROM expence_category
      WHERE id = ?
      `
    ).run(id);

    return {
      success: true,
    };
  });
}
