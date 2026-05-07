const { ipcMain } = require("electron");
import db from "../db";
export default function registerSalesInvoiceIPC() {
  // CREATE
  ipcMain.handle("create-sales-invoice", (event, data) => {
    const invoiceResult = db
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
        data.tax_id || 0,
        data.net_total || 0,
      );

    const invoiceId = invoiceResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO sales_invoice_items
      (invoice_id, product_id, quantity, price, total)
      VALUES (?, ?, ?, ?, ?)
    `);
    const updateStock = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ?
    `);
    for (const item of data.items) {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const total = quantity * price;

      insertItem.run(invoiceId, item.product_id, quantity, price, total);

      updateStock.run(quantity, item.product_id);
    }

    return { success: true, invoiceId };
  });

  // GET ALL
  ipcMain.handle("get-sales-invoices", () => {
    return db
      .prepare(
        `
      SELECT 
      sales_invoices.*, 
      customers.name AS customer_name,
      customers.phone AS customer_phone
      FROM sales_invoices  LEFT JOIN customers ON customers.id = sales_invoices.customer_id
      ORDER BY sales_invoices.id DESC
    `,
      )
      .all();
  });

  // GET ONE
  ipcMain.handle("get-sales-invoice", (event, id) => {
    const invoice = db
      .prepare(
        `
      SELECT sa.*,
       c.name AS customer_name,
       t.rate AS tax_rate
      FROM sales_invoices sa
      LEFT JOIN customers c ON c.id = sa.customer_id
      LEFT JOIN taxes t ON t.id = sa.tax_id
      WHERE sa.id = ?
    `,
      )
      .get(id);

    if (!invoice) return null;

    const items = db
      .prepare(
        `
      SELECT 
        si.*,
        p.name AS name
      FROM sales_invoice_items si
      LEFT JOIN products p ON p.id = si.product_id
      WHERE si.invoice_id = ?
    `,
      )
      .all(id);

    return {
      ...invoice,
      items,
    };
  });

  // UPDATE
  ipcMain.handle("update-sales-invoice", (event, data) => {
    const transaction = db.transaction(() => {
      const oldItems = db
        .prepare(`SELECT * FROM sales_invoice_items WHERE invoice_id = ?`)
        .all(data.id);

      const reverseStock = db.prepare(`
      UPDATE products
      SET quantity = quantity + ?
      WHERE id = ?
    `);

      for (const item of oldItems) {
        reverseStock.run(item.quantity || 0, item.product_id);
      }

      db.prepare(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`).run(
        data.id,
      );

      db.prepare(
        `
      UPDATE sales_invoices
      SET customer_id = ?,
         date = ?, 
         subtotal = ?,
         discount = ?,
         tax_id = ?,
         net_total = ?
      WHERE id = ?
    `,
      ).run(
        data.customer_id,
        data.date,
        data.subtotal || 0,
        data.discount || 0,
        data.tax_id || 0,
        data.net_total || 0,
        data.id,
      );
      const insertItem = db.prepare(`
      INSERT INTO sales_invoice_items
      (invoice_id, product_id, quantity, price, total)
      VALUES (?, ?, ?, ?, ?)
    `);

      const addStock = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ?
    `);
      for (const item of data.items) {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);

        if (!item.product_id) continue;

        const total = quantity * price;

        insertItem.run(data.id, item.product_id, quantity, price, total);

        addStock.run(quantity, item.product_id);
      }
    });

    try {
      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  // DELETE
  ipcMain.handle("delete-sales-invoice", (event, id) => {
    const transaction = db.transaction(() => {
      const items = db
        .prepare(`SELECT * FROM sales_invoice_items WHERE invoice_id = ?`)
        .all(id);

      const reverseStock = db.prepare(`
      UPDATE products
      SET quantity = quantity + ?
      WHERE id = ?
    `);

      for (const item of items) {
        reverseStock.run(item.quantity || 0, item.product_id);
      }

      db.prepare(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`).run(
        id,
      );

      db.prepare(`DELETE FROM sales_invoices WHERE id = ?`).run(id);
    });

    try {
      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });
}
