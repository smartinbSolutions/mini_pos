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
    if (!data.name || !data.unit_id) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
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
    if (!data.name || !data.unit_id || data.costPrice <= 0 || data.price <= 0) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
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
    db.prepare(
      `
      DELETE FROM product_barcodes WHERE product_id = ?
    `,
    ).run(id);

    const used = db
      .prepare(
        `
      SELECT COUNT(*) as count
      FROM purchase_invoice_items
      WHERE product_id = ?
    `,
      )
      .get(id);

    if (used.count > 0) {
      throw new Error("Product is used in invoices");
    }

    db.prepare(
      `
      DELETE FROM products WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });

  ipcMain.handle("get-product-by-barcode", (event, barcode) => {
    const row = db
      .prepare(
        `
      SELECT p.*
      FROM product_barcodes pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.barcode = ?
    `,
      )
      .get(barcode);

    return row;
  });
}
