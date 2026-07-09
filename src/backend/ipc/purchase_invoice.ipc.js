const { ipcMain } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";
import createProductMovement from "../utils/createPorductMovment";
import { applyPartyCredit } from "../utils/partyCredit";
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
        const isCredit = payment?.source === "credit";

        if (isPaid && !isCredit) {
          if (!payment.fund_id) {
            throw new Error("FUND_REQUIRED");
          }
          if (!payment.amount || Number(payment.amount) <= 0) {
            throw new Error("INVALID_PAYMENT_AMOUNT");
          }
        }

        if (
          isPaid &&
          isCredit &&
          (!payment.amount || Number(payment.amount) <= 0)
        ) {
          throw new Error("INVALID_CREDIT_AMOUNT");
        }

        const dateOnly = data.date;
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        const invoiceResult = db
          .prepare(
            `
            INSERT INTO purchase_invoices
            (
              supplier_id,
              date,
              subtotal,
              discount,
              tax,
              net_total,
              taxValue    
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(
            data.supplier_id,
            fullDateTime,
            subtotal,
            discount,
            tax,
            netTotal,
            data.taxValue
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

        let insertPaymentId = null;
        let creditApplied = null;

        if (isPaid && isCredit) {
          creditApplied = applyPartyCredit(db, {
            partyId: data.payment.party_id,
            partyType: data.payment.party_type,
            invoiceId,
            invoiceType: "purchase",
            amount: data.payment.amount,
          });
        } else if (isPaid) {
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
          createFundHistory(db, {
            fund_id: data.payment.fund_id,
            record_type: "payment",
            payment_id: insertPaymentId,
            invoice_id: invoiceId,
            invoice_type: "purchase",
            movement_type: "out",
            amount: data.payment.collected_amount,
            note: `Payment for Purchase Invoice #${invoiceId}`,
          });
        }

        return {
          invoiceId,
          paymentId: insertPaymentId,
          creditApplied,
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
        code: err.code,
      };
    }
  });

  // GET ALL
  ipcMain.handle("get-purchase-invoices", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const invoices = db
      .prepare(
        `
      SELECT
        p.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,

        COALESCE(SUM(pa.amount), 0) AS paid_amount,

        p.net_total - COALESCE(SUM(pa.amount), 0) AS remaining_amount,

        CASE
          WHEN COALESCE(SUM(pa.amount), 0) >= p.net_total THEN 'paid'
          WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status

      FROM purchase_invoices p

      LEFT JOIN suppliers s
        ON s.id = p.supplier_id

      LEFT JOIN payment_allocations pa
        ON pa.invoice_id = p.id
       AND pa.invoice_type = 'purchase'

      GROUP BY p.id

      ORDER BY p.id DESC

      LIMIT ? OFFSET ?
      `
      )
      .all(limit, offset);

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM purchase_invoices`)
      .get();

    return {
      data: invoices,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });
  // GET ONE
  ipcMain.handle("get-purchase-invoice", (event, id) => {
    const invoice = db
      .prepare(
        `
      SELECT 
        pi.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        t.rate AS tax_rate,
  
        COALESCE(pa_sum.paid_amount, 0) AS paid_amount,
        pi.net_total - COALESCE(pa_sum.paid_amount, 0) AS remaining_amount,
  
        CASE
          WHEN COALESCE(pa_sum.paid_amount, 0) >= pi.net_total THEN 'paid'
          WHEN COALESCE(pa_sum.paid_amount, 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status
  
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON s.id = pi.supplier_id
      LEFT JOIN taxes t ON t.id = pi.tax
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS paid_amount
        FROM payment_allocations
        WHERE invoice_type = 'purchase'
        GROUP BY invoice_id
      ) pa_sum ON pa_sum.invoice_id = pi.id
      WHERE pi.id = ?
    `
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
    `
      )
      .all(id);

    const allocations = db
      .prepare(
        `
      SELECT
        pa.id,
        pa.payment_id,
        pa.amount,
        p.date,
        p.fund_id,
        f.name AS fund_name,
        c.code AS fund_currency_code,
        c.symbol AS fund_currency_symbol
      FROM payment_allocations pa
      LEFT JOIN payments p ON p.id = pa.payment_id
      LEFT JOIN funds f ON f.id = p.fund_id
      LEFT JOIN currencies c ON c.id = f.currency_id
      WHERE pa.invoice_id = ?
        AND pa.invoice_type = 'purchase'
      ORDER BY pa.id ASC
    `
      )
      .all(id);

    return {
      ...invoice,
      items,
      allocations,
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

    const oldInvoice = db
      .prepare(`SELECT * FROM purchase_invoices WHERE id = ?`)
      .get(data.id);

    if (!oldInvoice) {
      return { success: false, error: "Invoice not found" };
    }

    const existingPayment = db
      .prepare(
        `SELECT id FROM payments WHERE invoice_id = ? AND invoice_type = 'purchase'`
      )
      .get(data.id);

    if (existingPayment) {
      return {
        success: false,
        error: "Paid invoices cannot be edited",
      };
    }

    const transaction = db.transaction(() => {
      const oldItems = db
        .prepare(`SELECT * FROM purchase_invoice_items WHERE invoice_id = ?`)
        .all(data.id);

      // ---- Aggregate old vs new quantity per product ----
      const oldByProduct = new Map();
      for (const item of oldItems) {
        const cur = oldByProduct.get(item.product_id) || {
          quantity: 0,
          price: item.price,
        };
        oldByProduct.set(item.product_id, {
          quantity: cur.quantity + Number(item.quantity || 0),
          price: item.price,
        });
      }

      const newByProduct = new Map();
      for (const item of data.items) {
        if (!item.product_id) continue;
        const cur = newByProduct.get(item.product_id) || {
          quantity: 0,
          price: item.price,
        };
        newByProduct.set(item.product_id, {
          quantity: cur.quantity + Number(item.quantity || 0),
          price: item.price,
        });
      }

      const adjustStock = db.prepare(
        `UPDATE products SET quantity = quantity + ? WHERE id = ?`
      );
      const updateMovement = db.prepare(`
        UPDATE product_movements
        SET quantity = ?, enterPrice = ?, action = 'update'
        WHERE reference_type = 'purchase_invoice' AND reference_id = ? AND product_id = ?
      `);
      const deleteMovement = db.prepare(`
        DELETE FROM product_movements
        WHERE reference_type = 'purchase_invoice' AND reference_id = ? AND product_id = ?
      `);

      // ---- Removed products: reverse stock fully, delete their movement ----
      for (const [productId, old] of oldByProduct) {
        if (!newByProduct.has(productId)) {
          adjustStock.run(-old.quantity, productId);
          deleteMovement.run(data.id, productId);
        }
      }

      // ---- Present in new set: adjust stock by delta, update movement in place ----
      for (const [productId, next] of newByProduct) {
        const old = oldByProduct.get(productId);
        const oldQty = old ? old.quantity : 0;
        const delta = next.quantity - oldQty;

        if (delta !== 0) {
          adjustStock.run(delta, productId);
        }

        if (old) {
          updateMovement.run(next.quantity, next.price, data.id, productId);
        } else {
          createProductMovement(db, {
            product_id: productId,
            reference_id: data.id,
            reference_type: "purchase_invoice",
            action: "create",
            type: "in",
            quantity: next.quantity,
            enterPrice: next.price,
          });
        }
      }

      // ---- Replace line items ----
      db.prepare(`DELETE FROM purchase_invoice_items WHERE invoice_id = ?`).run(
        data.id
      );

      const insertItem = db.prepare(`
        INSERT INTO purchase_invoice_items (invoice_id, product_id, quantity, price, total)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const item of data.items) {
        if (!item.product_id) continue;
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        insertItem.run(
          data.id,
          item.product_id,
          quantity,
          price,
          quantity * price
        );
      }

      // ---- Update the invoice row ----
      const dateOnly = data.date.slice(0, 10);
      const time = new Date().toTimeString().slice(0, 8);
      const fullDateTime = `${dateOnly} ${time}`;

      db.prepare(
        `
        UPDATE purchase_invoices
        SET supplier_id = ?, date = ?, subtotal = ?, discount = ?, tax = ?, net_total = ?, taxValue = ?
        WHERE id = ?
      `
      ).run(
        data.supplier_id,
        fullDateTime,
        data.subtotal || 0,
        data.discount || 0,
        data.tax || 0,
        data.net_total || 0,
        data.taxValue || 0,
        data.id
      );

      const netDelta =
        Number(data.net_total || 0) - Number(oldInvoice.net_total || 0);

      db.prepare(
        `
        UPDATE suppliers
        SET total = total + ?
        WHERE id = ?
      `
      ).run(netDelta, data.supplier_id);

      // ---- Update the invoice ledger row in place ----
      db.prepare(
        `
        UPDATE party_history
        SET amount = ?, note = ?
        WHERE invoice_id = ? AND invoice_type = 'purchase' AND record_type = 'invoice'
      `
      ).run(data.net_total, `Purchase Invoice #${data.id}`, data.id);
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

      const invoice = db
        .prepare(`SELECT * FROM purchase_invoices WHERE id = ?`)
        .get(id);
      const reverseStock = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ?
    `);
      db.prepare(
        `
      UPDATE suppliers
      SET total = total - ?
      WHERE id = ?
    `
      ).run(Number(invoice.net_total || 0), invoice.supplier_id);
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
        id
      );
      db.prepare(`DELETE FROM party_history WHERE invoice_id = ?`).run(id);
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
