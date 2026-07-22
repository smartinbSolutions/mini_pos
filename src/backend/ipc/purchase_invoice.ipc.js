const { ipcMain } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";
import createProductMovement from "../utils/createPorductMovment";
import {
  buildDefaultInvoiceName,
  buildDefaultPaymentNote,
} from "../utils/helpers";
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
        const discount = Number(data.discount || 0);
        const taxId = data.tax ?? null;

        if (subtotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        let taxRate = 0;
        if (taxId) {
          const taxRow = db
            .prepare(`SELECT rate FROM taxes WHERE id = ?`)
            .get(taxId);
          if (!taxRow) {
            throw new Error("INVALID_TAX_ID");
          }
          taxRate = Number(taxRow.rate || 0);
        }

        const taxableAmount = subtotal - discount;
        const taxValue = Number(((taxableAmount * taxRate) / 100).toFixed(2));
        const netTotal = Number((taxableAmount + taxValue).toFixed(2));

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
              invoice_name,
              date,
              subtotal,
              discount,
              tax,
              net_total,
              taxValue,
              created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(
            data.supplier_id,
            data.invoice_name?.trim() || null,
            fullDateTime,
            subtotal,
            discount,
            taxId,
            netTotal,
            taxValue,
            data.created_by
          );

        const invoiceId = invoiceResult.lastInsertRowid;

        let invoiceName = data.invoice_name?.trim();
        if (!invoiceName) {
          invoiceName = buildDefaultInvoiceName(db, "purchase", invoiceId);
          db.prepare(
            `UPDATE purchase_invoices SET invoice_name = ? WHERE id = ?`
          ).run(invoiceName, invoiceId);
        }

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
          note: invoiceName,
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
            note: invoiceName,
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
            note: buildDefaultPaymentNote(db, "payment", invoiceName),
          });
        }

        return {
          invoiceId,
          invoiceName,
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

    const whereConditions = [];
    const whereParams = [];
    const havingConditions = [];
    const havingParams = [];

    if (params.dateFrom) {
      whereConditions.push("DATE(p.date) >= ?");
      whereParams.push(params.dateFrom);
    }
    if (params.dateTo) {
      whereConditions.push("DATE(p.date) <= ?");
      whereParams.push(params.dateTo);
    }
    if (params.supplierId) {
      whereConditions.push("p.supplier_id = ?");
      whereParams.push(params.supplierId);
    }
    if (
      params.minTotal !== undefined &&
      params.minTotal !== "" &&
      params.minTotal !== null
    ) {
      whereConditions.push("p.net_total >= ?");
      whereParams.push(Number(params.minTotal));
    }
    if (
      params.maxTotal !== undefined &&
      params.maxTotal !== "" &&
      params.maxTotal !== null
    ) {
      whereConditions.push("p.net_total <= ?");
      whereParams.push(Number(params.maxTotal));
    }

    if (params.status) {
      havingConditions.push(`
        CASE
          WHEN COALESCE(SUM(pa.amount), 0) >= p.net_total THEN 'paid'
          WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END = ?
      `);
      havingParams.push(params.status);
    }

    if (params.returnStatus) {
      havingConditions.push(`
        CASE
          WHEN COALESCE(ret.total_returned, 0) <= 0 THEN 'none'
          WHEN ret.total_returned >= ret.total_quantity THEN 'full'
          ELSE 'partial'
        END = ?
      `);
      havingParams.push(params.returnStatus);
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";
    const havingClause = havingConditions.length
      ? `HAVING ${havingConditions.join(" AND ")}`
      : "";

    const invoices = db
      .prepare(
        `
      SELECT
        p.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name,
        t.name AS tax_name,
        t.rate AS tax_rate,
        COALESCE(SUM(pa.amount), 0) AS paid_amount,
    
        p.net_total - COALESCE(SUM(pa.amount), 0) AS remaining_amount,
    
        CASE
          WHEN COALESCE(SUM(pa.amount), 0) >= p.net_total THEN 'paid'
          WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status,
    
        CASE
          WHEN COALESCE(ret.total_returned, 0) <= 0 THEN 'none'
          WHEN ret.total_returned >= ret.total_quantity THEN 'full'
          ELSE 'partial'
        END AS return_status
    
      FROM purchase_invoices p
    
      LEFT JOIN suppliers s
        ON s.id = p.supplier_id
    
      LEFT JOIN taxes t
        ON t.id = p.tax
    
      LEFT JOIN payment_allocations pa
        ON pa.invoice_id = p.id
       AND pa.invoice_type = 'purchase'
    
      LEFT JOIN users creator
        ON creator.id = p.created_by
    
      LEFT JOIN users updater
        ON updater.id = p.updated_by
    
      LEFT JOIN (
        SELECT
          pi.invoice_id,
          SUM(pi.quantity) AS total_quantity,
          SUM(COALESCE(pri.returned_qty, 0)) AS total_returned
        FROM purchase_invoice_items pi
        LEFT JOIN (
          SELECT purchase_invoice_item_id, SUM(quantity) AS returned_qty
          FROM purchase_return_items
          GROUP BY purchase_invoice_item_id
        ) pri ON pri.purchase_invoice_item_id = pi.id
        GROUP BY pi.invoice_id
      ) ret ON ret.invoice_id = p.id
    
        ${whereClause}
      GROUP BY p.id
        ${havingClause}
    
      ORDER BY p.id DESC
    
      LIMIT ? OFFSET ?
      `
      )
      .all(...whereParams, ...havingParams, limit, offset);

    const { total } = db
      .prepare(
        `
        SELECT COUNT(*) AS total FROM (
          SELECT p.id
          FROM purchase_invoices p
          LEFT JOIN payment_allocations pa
            ON pa.invoice_id = p.id AND pa.invoice_type = 'purchase'
          LEFT JOIN (
            SELECT
              pi.invoice_id,
              SUM(pi.quantity) AS total_quantity,
              SUM(COALESCE(pri.returned_qty, 0)) AS total_returned
            FROM purchase_invoice_items pi
            LEFT JOIN (
              SELECT purchase_invoice_item_id, SUM(quantity) AS returned_qty
              FROM purchase_return_items
              GROUP BY purchase_invoice_item_id
            ) pri ON pri.purchase_invoice_item_id = pi.id
            GROUP BY pi.invoice_id
          ) ret ON ret.invoice_id = p.id
          ${whereClause}
          GROUP BY p.id
          ${havingClause}
        ) t
        `
      )
      .get(...whereParams, ...havingParams);

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
      Number(data.subtotal) <= 0
    ) {
      return { success: false, error: "ERROR ENTER DATA" };
    }

    const oldInvoice = db
      .prepare(`SELECT * FROM purchase_invoices WHERE id = ?`)
      .get(data.id);

    if (!oldInvoice) {
      return { success: false, error: "Invoice not found" };
    }

    const hasReturn = db
      .prepare(
        `
        SELECT 1
        FROM purchase_return_items pri
        JOIN purchase_invoice_items pii ON pii.id = pri.purchase_invoice_item_id
        WHERE pii.invoice_id = ?
        LIMIT 1
      `
      )
      .get(data.id);

    if (hasReturn) {
      return { success: false, error: "CANNOT_MODIFY_INVOICE_WITH_RETURN" };
    }

    const oldSupplierId = oldInvoice.supplier_id || null;
    const newSupplierId = data.supplier_id || null;

    const transaction = db.transaction(() => {
      const oldItems = db
        .prepare(`SELECT * FROM purchase_invoice_items WHERE invoice_id = ?`)
        .all(data.id);

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

      for (const [productId, old] of oldByProduct) {
        if (!newByProduct.has(productId)) {
          adjustStock.run(-old.quantity, productId);
          deleteMovement.run(data.id, productId);
        }
      }

      const dateOnly = data.date.slice(0, 10);
      const time = new Date().toTimeString().slice(0, 8);
      const fullDateTime = `${dateOnly} ${time}`;

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

      const subtotal = Number(data.subtotal || 0);
      const discount = Number(data.discount || 0);
      const taxId = data.tax ?? null;

      let taxRate = 0;
      if (taxId) {
        const taxRow = db
          .prepare(`SELECT rate FROM taxes WHERE id = ?`)
          .get(taxId);
        if (!taxRow) {
          throw new Error("INVALID_TAX_ID");
        }
        taxRate = Number(taxRow.rate || 0);
      }

      const taxableAmount = subtotal - discount;
      const taxValue = Number(((taxableAmount * taxRate) / 100).toFixed(2));
      const netTotal = Number((taxableAmount + taxValue).toFixed(2));

      const invoiceName = data.invoice_name?.trim() || oldInvoice.invoice_name;

      db.prepare(
        `
        UPDATE purchase_invoices
        SET supplier_id = ?, invoice_name = ?, date = ?, subtotal = ?, discount = ?, tax = ?, net_total = ?, taxValue = ?, updated_by = ?
        WHERE id = ?
      `
      ).run(
        newSupplierId,
        invoiceName,
        fullDateTime,
        subtotal,
        discount,
        taxId,
        netTotal,
        taxValue,
        data.updated_by,
        data.id
      );

      if (oldSupplierId && oldSupplierId === newSupplierId) {
        db.prepare(
          `
          UPDATE party_history
          SET amount = ?, date = ?, note = ?
          WHERE invoice_id = ? AND invoice_type = 'purchase' AND record_type = 'invoice'
        `
        ).run(netTotal, fullDateTime, invoiceName, data.id);
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
            amount: netTotal,
            date: fullDateTime,
            note: invoiceName,
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
    const invoice = db
      .prepare(`SELECT * FROM purchase_invoices WHERE id = ?`)
      .get(id);

    if (!invoice) {
      return { success: false, error: "PURCHASE INVOICE NOT FOUND" };
    }

    const hasReturn = db
      .prepare(
        `
        SELECT 1
        FROM purchase_return_items pri
        JOIN purchase_invoice_items pii ON pii.id = pri.purchase_invoice_item_id
        WHERE pii.invoice_id = ?
        LIMIT 1
      `
      )
      .get(id);

    if (hasReturn) {
      return { success: false, error: "CANNOT_DELETE_INVOICE_WITH_RETURN" };
    }

    const hasPayment = db
      .prepare(
        `
        SELECT 1 FROM payment_allocations
        WHERE invoice_id = ? AND invoice_type = 'purchase'
        LIMIT 1
      `
      )
      .get(id);

    if (hasPayment) {
      return { success: false, error: "CANNOT_DELETE_PAID_INVOICE" };
    }

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
      db.prepare(
        `
        DELETE FROM party_history
        WHERE invoice_id = ? AND invoice_type = 'purchase'
      `
      ).run(id);
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
