const { ipcMain } = require("electron");
import db from "../db";
export default function registerPurchaseInvoicesIPC() {
  // CREATE
  ipcMain.handle("create-purchase-invoice", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO purchase_invoices
      (supplier_id, date,subtotal, discount, tax_id, net_total)
      VALUES (?, ?, ?, ?, ?)
    `,
      )
      .run(
        data.supplier_id,
        data.date,
        data.subtotal || 0,
        data.discount || 0,
        data.tax || 0,
        data.net_total || 0,
      );

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  // GET ALL
  ipcMain.handle("get-purchase-invoices", () => {
    return db
      .prepare(
        `
      SELECT * FROM purchase_invoices ORDER BY id DESC
    `,
      )
      .all();
  });

  // GET ONE
  ipcMain.handle("get-purchase-invoice", (event, id) => {
    return db
      .prepare(
        `
      SELECT * FROM purchase_invoices WHERE id = ?
    `,
      )
      .get(id);
  });

  // UPDATE
  ipcMain.handle("update-purchase-invoice", (event, data) => {
    db.prepare(
      `
      UPDATE purchase_invoices
      SET supplier_id = ?, date = ?,subtotal = ?, discount = ?, tax = ?, net_total = ?
      WHERE id = ?
    `,
    ).run(
      data.supplier_id,
      data.date,
      data.discount,
      data.tax,
      data.total,
      data.id,
    );

    return { success: true };
  });

  // DELETE
  ipcMain.handle("delete-purchase-invoice", (event, id) => {
    db.prepare(
      `
      DELETE FROM purchase_invoices WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}

module.exports = registerPurchaseInvoicesIPC;
