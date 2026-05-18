const { ipcMain } = require("electron");
import db from "../db";
export default function registerPurchaseInvoicesIPC() {
  // CREATE
  ipcMain.handle("create-purchase-invoice", (event, data) => {
    try {
      const transaction = db.transaction(() => {
        if (
          !data.supplier_id ||
          !data.date ||
          !Array.isArray(data.items) ||
          data.items.length === 0
        ) {
          throw new Error("ERROR ENTER DATA");
        }

        const subtotal = Number(data.subtotal || 0);
        const netTotal = Number(data.net_total || 0);
        const discount = Number(data.discount || 0);
        const tax = Number(data.tax || 0);
        const paidAmount = Number(data.paymentInfundCurrency || 0);

        if (subtotal <= 0 || netTotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        const invoiceResult = db
          .prepare(
            `
        INSERT INTO purchase_invoices
        (supplier_id, date, subtotal, discount, tax, net_total, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
          )
          .run(
            data.supplier_id,
            data.date,
            subtotal,
            discount,
            tax,
            netTotal,
            data.status || "unpaid",
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

          if (!item.product_id || quantity <= 0 || price < 0) {
            throw new Error("INVALID ITEM DATA");
          }

          const total = quantity * price;

          insertItem.run(invoiceId, item.product_id, quantity, price, total);
          updateStock.run(quantity, item.product_id);
        }

        let insertPaymentId = null;
        const updateSupplier = db.prepare(`
  UPDATE suppliers
  SET total = total + ?,
      total_paid = total_paid + ?
  WHERE id = ?
`);

        const supplierPaid = data.status === "paid" ? paidAmount : 0;

        updateSupplier.run(
          Number(netTotal || 0),
          Number(supplierPaid || 0),
          data.supplier_id,
        );

        if (data.status === "paid") {
          if (paidAmount <= 0) {
            throw new Error("PAID INVOICE MUST HAVE PAID AMOUNT");
          }

          if (data.fund_id) {
            const fundCheck = db
              .prepare(`SELECT balance FROM funds WHERE id = ?`)
              .get(data.fund_id);

            if (!fundCheck) throw new Error("FUND NOT FOUND");

            db.prepare(
              `
            UPDATE funds
            SET balance = balance - ?
            WHERE id = ?
          `,
            ).run(paidAmount, data.fund_id);
          }

          insertPaymentId = db
            .prepare(
              `
          INSERT INTO payments
          (type, party_type, party_id, fund_id, amount, note,
         currency_code, exchange_rate, amount_fund_currency)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            )
            .run(
              "expense",
              "supplier",
              data.supplier_id,
              data.fund_id || null,
              paidAmount,
              `Purchase Invoice #${invoiceId}`,
              data.currency_code,
              data.exchange_rate,
              data.paymentInfundCurrency,
            ).lastInsertRowid;
        }

        return {
          invoiceId,
          paymentId: insertPaymentId,
        };
      });

      return {
        success: true,
        ...transaction(),
      };
    } catch (err) {
      return {
        success: false,
        error: err,
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
      const oldInvoice = db
        .prepare(`SELECT * FROM purchase_invoices WHERE id = ?`)
        .get(data.id);
      const reverseStock = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ?
    `);
      const oldPaid =
        oldInvoice.status === "paid" ? Number(oldInvoice.net_total || 0) : 0;

      db.prepare(
        `
      UPDATE suppliers
      SET total = total - ?,
          total_paid = total_paid - ?
      WHERE id = ?
    `,
      ).run(Number(oldInvoice.net_total || 0), oldPaid, oldInvoice.supplier_id);

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
      const newPaid = data.status === "paid" ? Number(data.net_total || 0) : 0;

      db.prepare(
        `
        UPDATE suppliers
        SET total = total + ?,
            total_paid = total_paid + ?
        WHERE id = ?
      `,
      ).run(Number(data.net_total || 0), newPaid, data.supplier_id);
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
