const { ipcMain } = require("electron");
import db from "../db";

export default function registerPurchaseInvoiceItemsIPC() {
  ipcMain.handle("create-purchase-invoice-item", (event, data) => {
    const total = data.quantity * data.price;

    const result = db
      .prepare(
        `
      INSERT INTO purchase_invoice_items
      (invoice_id, product_id, quantity, price, total)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(data.invoice_id, data.product_id, data.quantity, data.price, total);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-purchase-invoice-items", () => {
    return db
      .prepare(
        `
      SELECT 
        sii.*,
        p.name AS product_name,
        p.latinName AS product_latinName
      FROM purchase_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id
    `,
      )
      .all();
  });

  ipcMain.handle("get-purchase-invoice-item", (event, id) => {
    return db
      .prepare(
        `
      SELECT 
        sii.*,
        p.name AS product_name,
        p.latinName AS product_latinName
      FROM purchase_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id
      WHERE sii.id = ?
    `,
      )
      .get(id);
  });

  ipcMain.handle("get-items-by-invoice", (event, invoice_id) => {
    return db
      .prepare(
        `
      SELECT 
        sii.*,
        p.name,
        p.barcode
      FROM purchase_invoice_items sii
      LEFT JOIN products p ON p.id = sii.product_id
      WHERE sii.invoice_id = ?
    `,
      )
      .all(invoice_id);
  });

  ipcMain.handle("update-purchase-invoice-item", (event, data) => {
    const total = data.quantity * data.price;

    db.prepare(
      `
      UPDATE purchase_invoice_items
      SET 
        invoice_id = ?,
        product_id = ?,
        quantity = ?,
        price = ?,
        total = ?
      WHERE id = ?
    `,
    ).run(
      data.invoice_id,
      data.product_id,
      data.quantity,
      data.price,
      total,
      data.id,
    );

    return { success: true };
  });

  ipcMain.handle("delete-purchase-invoice-item", (event, id) => {
    db.prepare(
      `
      DELETE FROM purchase_invoice_items WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}
