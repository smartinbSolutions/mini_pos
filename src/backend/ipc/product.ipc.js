import { ipcMain } from "electron";
import db from "../db";

export default function registerProductIPC() {
  ipcMain.handle("get-products", () => {
    return db
      .prepare(
        `
      SELECT 
        products.*,
        unit.name as unit_name,
        unit.code as unit_code
      FROM products
      LEFT JOIN unit ON unit.id = products.unit_id
    `,
      )
      .all();
  });
  ipcMain.handle("get-product", (event, id) => {
    return db
      .prepare(
        ` SELECT 
        products.*,
        unit.name as unit_name,
        unit.code as unit_code
      FROM products
      LEFT JOIN unit ON unit.id = products.unit_id WHERE id=?`,
      )
      .get(id);
  });

  ipcMain.handle("create-product", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO products (name, latinName, costPrice, price, quantity, unit_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        data.name,
        data.latinName,
        data.costPrice,
        data.price,
        data.quantity,
        data.unit_id,
      );

    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle("update-product", (event, data) => {
    db.prepare(
      `
      UPDATE products
      SET name=?, latinName=?, costPrice=?, price=?, quantity=?, unit_id=?
      WHERE id=?
    `,
    ).run(
      data.name,
      data.latinName,
      data.costPrice,
      data.price,
      data.quantity,
      data.unit_id,
      data.id,
    );

    return { success: true };
  });

  ipcMain.handle("delete-product", (event, id) => {
    db.prepare("DELETE FROM products WHERE id=?").run(id);
    return { success: true };
  });
}
