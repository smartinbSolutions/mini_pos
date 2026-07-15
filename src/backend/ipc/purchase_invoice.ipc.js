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

        const dateOnly = data.date.slice(0, 10);
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
              taxValue,
              created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(
            data.supplier_id,
            fullDateTime,
            subtotal,
            discount,
            tax,
            netTotal,
            data.taxValue,
            data.created_by
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
            date: fullDateTime,
          });
        }

        createPartyHistory(db, {
          party_type: "supplier",
          party_id: data.supplier_id,
          invoice_id: invoiceId,
          invoice_type: "purchase",
          record_type: "invoice",
          movement_type: "increase",
          amount: netTotal,
          date: fullDateTime,
          note: `Purchase Invoice #${invoiceId}`,
        });

        let insertPaymentId = null;
        let creditApplied = null;

        if (isPaid && isCredit) {
          creditApplied = applyPartyCredit(db, {
            partyId: payment.party_id,
            partyType: payment.party_type,
            invoiceId,
            invoiceType: "purchase",
            amount: payment.amount,
          });
        } else if (isPaid) {
          insertPaymentId = createPayment(db, {
            type: payment.type,
            party_type: payment.party_type,
            party_id: payment.party_id,
            fund_id: payment.fund_id,
            amount: payment.amount,
            amount_fund_currency: payment.collected_amount,
            currency_code: payment.currency_code,
            exchange_rate: payment.exchange_rate,
            effective_rate: payment.effective_rate,
            invoice_id: invoiceId,
            invoice_type: payment.mode,
            note: `${payment.note} #${invoiceId}`,
            fundOperation: "subtract",
            date: fullDateTime,
            created_by: data.created_by,
          });
          createFundHistory(db, {
            fund_id: payment.fund_id,
            record_type: "payment",
            payment_id: insertPaymentId,
            movement_type: "out",
            amount: payment.collected_amount,
            date: fullDateTime,
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
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name,
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

    LEFT JOIN users creator
    ON creator.id = p.created_by
    
    LEFT JOIN users updater
    ON updater.id = p.updated_by

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
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name,
        COALESCE(pa_sum.paid_amount, 0) AS paid_amount,
        pi.net_total - COALESCE(pa_sum.paid_amount, 0) AS remaining_amount,
  
        CASE
          WHEN COALESCE(pa_sum.paid_amount, 0) >= pi.net_total THEN 'paid'
          WHEN COALESCE(pa_sum.paid_amount, 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status
  
      FROM purchase_invoices pi
      LEFT JOIN suppliers s ON s.id = pi.supplier_id

    LEFT JOIN users creator
    ON creator.id = pi.created_by
    
    LEFT JOIN users updater
    ON updater.id = pi.updated_by

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
      p.name AS name,

      COALESCE(r.returned_quantity, 0) AS returned_quantity,

      (
        pii.quantity - COALESCE(r.returned_quantity, 0)
      ) AS available_quantity

    FROM purchase_invoice_items pii

    LEFT JOIN products p
      ON p.id = pii.product_id


    LEFT JOIN (
      SELECT
        pri.purchase_invoice_item_id,
        SUM(pri.quantity) AS returned_quantity
      FROM purchase_return_items pri
      INNER JOIN purchase_returns pr
        ON pr.id = pri.return_id
      GROUP BY pri.purchase_invoice_item_id
    ) r
      ON r.purchase_invoice_item_id = pii.id

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
      !data.id ||
      !data.supplier_id ||
      !data.date ||
      !Array.isArray(data.items) ||
      data.items.length === 0 ||
      Number(data.subtotal) <= 0 ||
      Number(data.net_total) <= 0
    ) {
      return { success: false, error: "ERROR ENTER DATA" };
    }

    const oldInvoice = db
      .prepare(`SELECT * FROM purchase_invoices WHERE id = ?`)
      .get(data.id);

    if (!oldInvoice) {
      return { success: false, error: "Invoice not found" };
    }

    const oldSupplierId = oldInvoice.supplier_id || null;
    const newSupplierId = data.supplier_id || null;

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
        SET quantity = ?, enterPrice = ?, action = 'update', date = ?
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

      const dateOnly = data.date.slice(0, 10);
      const time = new Date().toTimeString().slice(0, 8);
      const fullDateTime = `${dateOnly} ${time}`;

      // ---- Present in new set: adjust stock by delta, update movement in place ----
      for (const [productId, next] of newByProduct) {
        const old = oldByProduct.get(productId);
        const oldQty = old ? old.quantity : 0;
        const delta = next.quantity - oldQty;

        if (delta !== 0) {
          adjustStock.run(delta, productId);
        }

        if (old) {
          updateMovement.run(
            next.quantity,
            next.price,
            fullDateTime,
            data.id,
            productId
          );
        } else {
          createProductMovement(db, {
            product_id: productId,
            reference_id: data.id,
            reference_type: "purchase_invoice",
            action: "create",
            type: "in",
            quantity: next.quantity,
            enterPrice: next.price,
            date: fullDateTime,
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
      db.prepare(
        `
        UPDATE purchase_invoices
        SET supplier_id = ?, date = ?, subtotal = ?, discount = ?, tax = ?, net_total = ?, taxValue = ?, updated_by = ?
        WHERE id = ?
      `
      ).run(
        newSupplierId,
        fullDateTime,
        data.subtotal || 0,
        data.discount || 0,
        data.tax || 0,
        data.net_total || 0,
        data.taxValue || 0,
        data.id,
        data.updated_by
      );

      // ---- Supplier party_history reconciliation for the invoice amount ----
      if (oldSupplierId && oldSupplierId === newSupplierId) {
        db.prepare(
          `
          UPDATE party_history
          SET amount = ?, date = ?, note = ?
          WHERE invoice_id = ? AND invoice_type = 'purchase' AND record_type = 'invoice'
        `
        ).run(
          data.net_total,
          fullDateTime,
          `Purchase Invoice #${data.id}`,
          data.id
        );
      } else {
        if (oldSupplierId) {
          db.prepare(
            `
            DELETE FROM party_history
            WHERE invoice_id = ? AND invoice_type = 'purchase' AND record_type = 'invoice'
          `
          ).run(data.id);
        }

        if (newSupplierId) {
          createPartyHistory(db, {
            party_type: "supplier",
            party_id: newSupplierId,
            invoice_id: data.id,
            invoice_type: "purchase",
            record_type: "invoice",
            movement_type: "increase",
            amount: data.net_total,
            date: fullDateTime,
            note: `Purchase Invoice #${data.id}`,
          });
        }
      }
    });

    try {
      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  // DELETE
  ipcMain.handle("delete-purchase-invoice", (event, id) => {
    const transaction = db.transaction(() => {
      const items = db
        .prepare(`SELECT * FROM purchase_invoice_items WHERE invoice_id = ?`)
        .all(id);
      const now = new Date();

      const date =
        now.getFullYear() +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0") +
        "-" +
        String(now.getDate()).padStart(2, "0") +
        " " +
        String(now.getHours()).padStart(2, "0") +
        ":" +
        String(now.getMinutes()).padStart(2, "0") +
        ":" +
        String(now.getSeconds()).padStart(2, "0");
      const invoice = db
        .prepare(`SELECT * FROM purchase_invoices WHERE id = ?`)
        .get(id);
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
          date: date,
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
