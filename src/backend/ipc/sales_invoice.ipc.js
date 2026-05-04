const { ipcMain } = require("electron");
const db = require("../backend/db");

function registerSalesInvoiceIPC() {
  // CREATE
  ipcMain.handle("create-sales-invoice", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO sales_invoices
      (customer_id, date, subtotal, discount, tax_id, net_total)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        data.customer_id,
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
  ipcMain.handle("get-sales-invoices", () => {
    return db
      .prepare(
        `
      SELECT * FROM sales_invoices ORDER BY id DESC
    `,
      )
      .all();
  });

  // GET ONE
  ipcMain.handle("get-sales-invoice", (event, id) => {
    return db
      .prepare(
        `
      SELECT * FROM sales_invoices WHERE id = ?
    `,
      )
      .get(id);
  });

  // UPDATE
  ipcMain.handle("update-sales-invoice", (event, data) => {
    db.prepare(
      `
      UPDATE sales_invoices
      SET customer_id = ?, date = ?, subtotal = ?, discount = ?, tax = ?, net_total = ?
      WHERE id = ?
    `,
    ).run(
      data.customer_id,
      data.date,
      data.subtotal,
      data.discount,
      data.tax,
      data.net_total,
      data.id,
    );

    return { success: true };
  });

  // DELETE
  ipcMain.handle("delete-sales-invoice", (event, id) => {
    db.prepare(
      `
      DELETE FROM sales_invoices WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}

module.exports = registerSalesInvoiceIPC;
