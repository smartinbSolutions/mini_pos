const { ipcMain } = require("electron");
import db from "../db";
export default function registerPurchaseInvoicesIPC() {
  // CREATE
  ipcMain.handle("create-purchase-invoice", (event, data) => {
    const transaction = db.transaction(() => {
      if (
        !data.supplier_id ||
        !data.date ||
        data.subtotal <= 0 ||
        data.net_total <= 0
      ) {
        return { message: "ERROR ENTER DATA", status: 500 };
      }
      const invoiceResult = db
        .prepare(
          `
      INSERT INTO purchase_invoices
      (supplier_id, date, subtotal, discount, tax, net_total)
      VALUES (?, ?, ?, ?, ?, ?)
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

      const invoiceId = invoiceResult.lastInsertRowid;

      const insertItem = db.prepare(`
      INSERT INTO purchase_invoice_items
      (invoice_id, product_id, quantity, price, total)
      VALUES (?, ?, ?, ?, ?)
    `);

      const updateStock = db.prepare(`
      UPDATE products
      SET quantity = quantity + ?
      WHERE id = ?
    `);

      for (const item of data.items) {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const total = quantity * price;

        insertItem.run(invoiceId, item.product_id, quantity, price, total);

        updateStock.run(quantity, item.product_id);
      }

      return invoiceId;
    });

    try {
      const id = transaction();

      return {
        success: true,
        id,
      };
    } catch (err) {
      return {
        success: false,
        error: err.message,
      };
    }
  });

  // GET ALL
  ipcMain.handle("get-purchase-invoices", () => {
    return db
      .prepare(
        `
      SELECT 
        purchase_invoices.*,
        suppliers.name AS supplier_name,
        suppliers.phone AS supplier_phone
      FROM purchase_invoices
      LEFT JOIN suppliers ON suppliers.id = purchase_invoices.supplier_id
      ORDER BY purchase_invoices.id DESC
    `,
      )
      .all();
  });

  // GET ONE
  ipcMain.handle("get-purchase-invoice", (event, id) => {
    const invoice = db
      .prepare(
        `
      SELECT 
        pi.*,
        s.name AS supplier_name,
        t.rate AS tax_rate
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON s.id = pi.supplier_id
      LEFT JOIN taxes t ON t.id = pi.tax
      WHERE pi.id = ?
    `,
      )
      .get(id);

    if (!invoice) return null;

    const items = db
      .prepare(
        `
      SELECT 
        pii.*,
        p.name AS name
      FROM purchase_invoice_items pii
      LEFT JOIN products p ON p.id = pii.product_id
      WHERE pii.invoice_id = ?
    `,
      )
      .all(id);

    return {
      ...invoice,
      items,
    };
  });
  // UPDATE
  ipcMain.handle("update-purchase-invoice", (event, data) => {
    if (
      !data.supplier_id ||
      !data.date ||
      data.subtotal <= 0 ||
      data.net_total <= 0
    ) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const transaction = db.transaction(() => {
      const oldItems = db
        .prepare(`SELECT * FROM purchase_invoice_items WHERE invoice_id = ?`)
        .all(data.id);

      const reverseStock = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ?
    `);

      for (const item of oldItems) {
        reverseStock.run(item.quantity || 0, item.product_id);
      }

      db.prepare(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`).run(
        data.id,
      );

      db.prepare(
        `
      UPDATE purchase_invoices
      SET supplier_id = ?,
          date = ?,
          subtotal = ?,
          discount = ?,
          tax = ?,
          net_total = ?
      WHERE id = ?
    `,
      ).run(
        data.supplier_id,
        data.date,
        data.subtotal || 0,
        data.discount || 0,
        data.tax || 0,
        data.net_total || 0,
        data.id,
      );

      const insertItem = db.prepare(`
      INSERT INTO purchase_invoice_items
      (invoice_id, product_id, quantity, price, total)
      VALUES (?, ?, ?, ?, ?)
    `);

      const addStock = db.prepare(`
      UPDATE products
      SET quantity = quantity + ?
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
  ipcMain.handle("delete-purchase-invoice", (event, id) => {
    const transaction = db.transaction(() => {
      const items = db
        .prepare(`SELECT * FROM purchase_invoice_items WHERE invoice_id = ?`)
        .all(id);

      const reverseStock = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ?
    `);

      for (const item of items) {
        reverseStock.run(item.quantity || 0, item.product_id);
      }

      db.prepare(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`).run(
        id,
      );

      db.prepare(`DELETE FROM purchase_invoices WHERE id = ?`).run(id);
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
