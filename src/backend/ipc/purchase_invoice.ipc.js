const { ipcMain } = require("electron");
import db from "../db";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";
import createProductMovement from "../utils/createPorductMovment";
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

        if (subtotal <= 0 || netTotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        const payment = data.payment || null;
        const isPaid = !!payment;

        if (isPaid) {
          if (!payment.fund_id) {
            throw new Error("FUND_REQUIRED");
          }
          if (!payment.amount || Number(payment.amount) <= 0) {
            throw new Error("INVALID_PAYMENT_AMOUNT");
          }
        }

        const dateOnly = data.date;
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        const invoiceResult = db
          .prepare(
            `
        INSERT INTO purchase_invoices
        (supplier_id, date, subtotal, discount, tax, net_total, status, taxValue)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
          )
          .run(
            data.supplier_id,
            fullDateTime,
            subtotal,
            discount,
            tax,
            netTotal,
            isPaid ? "paid" : "unpaid",
            data.taxValue,
          );

        const invoiceId = invoiceResult.lastInsertRowid;

        const insertItem = db.prepare(`
        INSERT INTO purchase_invoice_items
        (invoice_id, product_id, quantity, price, total)
        VALUES (?, ?, ?, ?, ?)
      `);

        const updateStock = db.prepare(`
        UPDATE products
        SET quantity = quantity + ?, costPrice = ?
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
          updateStock.run(quantity, price, item.product_id);

          createProductMovement(db, {
            product_id: item.product_id,
            reference_id: invoiceId,
            reference_type: "purchase_invoice",
            type: "in",
            action: "create",
            quantity: quantity,
            enterPrice: price,
          });
        }

        createPartyHistory(db, {
          party_type: "supplier",
          party_id: data.supplier_id,
          invoice_id: invoiceId,
          invoice_type: "purchase",
          record_type: "invoice",
          amount: netTotal,
          note: `Purchase Invoice #${invoiceId}`,
        });

        // Supplier balance always grows by the invoice total. total_paid only
        // grows by the base-currency payment.amount when actually paid.
        const updateSupplier = db.prepare(`
          UPDATE suppliers
          SET total = total + ?,
              total_paid = total_paid + ?
          WHERE id = ?
        `);

        updateSupplier.run(
          netTotal,
          isPaid ? Number(payment.amount) : 0,
          data.supplier_id,
        );

        let insertPaymentId = null;

        if (isPaid) {
          insertPaymentId = createPayment(db, {
            type: data.payment.type,
            party_type: data.payment.party_type,
            party_id: data.payment.party_id,
            fund_id: data.payment.fund_id,
            amount: data.payment.amount,
            amount_fund_currency: data.payment.collected_amount,
            currency_code: data.payment.currency_code,
            exchange_rate: data.payment.exchange_rate,
            effective_rate: data.payment.effective_rate,
            invoice_id: invoiceId,
            invoice_type: data.payment.mode,
            note: `${data.payment.note} #${invoiceId}`,
            fundOperation: "subtract",
          });
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
        error: err.message || String(err),
        code: err.code, // keep this too, useful for programmatic checks
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

        createProductMovement(db, {
          product_id: item.product_id,
          reference_id: oldInvoice.id,
          reference_type: "purchase_invoice",
          action: "update",
          type: "out",
          quantity: item.quantity,
          outPrice: item.price,
        });
      }

      db.prepare(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`).run(
        data.id,
      );

      const dateOnly = data.date.slice(0, 10);
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      const fullDateTime = `${dateOnly} ${time}`;

      db.prepare(
        `
      UPDATE purchase_invoices
      SET supplier_id = ?,
          date = ?,
          subtotal = ?,
          discount = ?,
          tax = ?,
          net_total = ?,
          taxValue = ?
      WHERE id = ?
    `,
      ).run(
        data.supplier_id,
        fullDateTime,
        data.subtotal || 0,
        data.discount || 0,
        data.tax || 0,
        data.net_total || 0,
        data.taxValue || 0,
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

        createProductMovement(db, {
          product_id: item.product_id,
          reference_id: data.id,
          reference_type: "purchase_invoice",
          action: "update",
          type: "in",
          quantity,
          enterPrice: price,
        });
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

      createPartyHistory(db, {
        party_type: "supplier",
        party_id: data.supplier_id,
        record_type: "invoice",
        invoice_id: data.id,
        invoice_type: "purchase",
        amount: data.net_total,
        note: `Purchase Invoice #${data.id}`,
      });
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

        createProductMovement(db, {
          product_id: item.product_id,
          reference_id: id,
          reference_type: "purchase_invoice",
          action: "delete",
          type: "out",
          quantity: item.quantity,
          enterPrice: item.price,
        });
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
