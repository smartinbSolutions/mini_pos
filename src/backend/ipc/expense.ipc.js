const { ipcMain } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";
import { buildDefaultInvoiceName } from "../utils/helpers";
import { applyPartyCredit } from "../utils/partyCredit";

export default function registerExpenseIPC() {
  ipcMain.handle("create-expense", (event, data) => {
    try {
      const transaction = db.transaction(() => {
        if (
          !data.date ||
          !Array.isArray(data.items) ||
          data.items.length === 0
        ) {
          throw new Error("ERROR ENTER DATA");
        }

        const payment = data.payment || null;
        const isPaid = !!payment;
        const isCredit = payment?.source === "credit";
        const subtotal = Number(data.subtotal || 0);
        const netTotal = Number(data.net_total || 0);

        if (subtotal <= 0 || netTotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

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
                INSERT INTO expense
                (supplier_id, invoice_name,
                 description, date, subtotal, net_total, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `
          )
          .run(
            data.supplier_id || null,
            data.invoice_name?.trim() || null,
            data.description || null,
            fullDateTime,
            subtotal,
            netTotal,
            data.created_by
          );
        const invoiceId = invoiceResult.lastInsertRowid;

        let invoiceName = data.invoice_name?.trim();
        if (!invoiceName) {
          invoiceName = buildDefaultInvoiceName(db, "expense", invoiceId);
          db.prepare(`UPDATE expense SET invoice_name = ? WHERE id = ?`).run(
            invoiceName,
            invoiceId
          );
        }

        const insertItem = db.prepare(`
          INSERT INTO expense_items
          (expense_id, category_id, price)
          VALUES (?, ?, ?)
        `);

        if (data.supplier_id) {
          createPartyHistory(db, {
            party_type: "supplier",
            party_id: data.supplier_id,
            invoice_id: invoiceId,
            invoice_type: "expense",
            record_type: "invoice",
            movement_type: "increase",
            amount: netTotal,
            date: fullDateTime,
            note: invoiceName,
          });
        }

        for (const item of data.items) {
          const price = Number(item.price || 0);

          if (!item.category_id || price < 0) {
            throw new Error("INVALID ITEM DATA");
          }

          insertItem.run(invoiceId, item.category_id, price);
        }

        let insertPaymentId = null;
        let creditApplied = null;

        if (isPaid && isCredit) {
          creditApplied = applyPartyCredit(db, {
            partyId: payment.party_id,
            partyType: payment.party_type,
            invoiceId,
            invoiceType: "expense",
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
            note: `${invoiceName}`,
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
            note: invoiceName,
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
      };
    }
  });

  ipcMain.handle("get-expenses", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const {
      startDate,
      endDate,
      supplier_id,
      status,
      minTotal,
      maxTotal,
      category_id,
    } = params;

    const whereConditions = [];
    const whereValues = [];

    if (startDate) {
      whereConditions.push("date(e.date) >= date(?)");
      whereValues.push(startDate);
    }
    if (endDate) {
      whereConditions.push("date(e.date) <= date(?)");
      whereValues.push(endDate);
    }
    if (supplier_id === "none") {
      whereConditions.push("e.supplier_id IS NULL");
    } else if (supplier_id) {
      whereConditions.push("e.supplier_id = ?");
      whereValues.push(supplier_id);
    }
    if (minTotal !== undefined && minTotal !== "" && minTotal !== null) {
      whereConditions.push("e.net_total >= ?");
      whereValues.push(Number(minTotal));
    }
    if (maxTotal !== undefined && maxTotal !== "" && maxTotal !== null) {
      whereConditions.push("e.net_total <= ?");
      whereValues.push(Number(maxTotal));
    }
    if (category_id) {
      whereConditions.push(
        "EXISTS (SELECT 1 FROM expense_items ei WHERE ei.expense_id = e.id AND ei.category_id = ?)"
      );
      whereValues.push(category_id);
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    const havingClause = status ? `HAVING status = ?` : "";
    const havingValues = status ? [status] : [];

    const rows = db
      .prepare(
        `
      SELECT
        e.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name,
  
        COALESCE(SUM(pa.amount), 0) AS paid_amount,
  
        e.net_total - COALESCE(SUM(pa.amount), 0) AS remaining_amount,
  
        CASE
          WHEN COALESCE(SUM(pa.amount), 0) >= e.net_total THEN 'paid'
          WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status,
  
        (
          SELECT GROUP_CONCAT(DISTINCT ec.name)
          FROM expense_items ei2
          JOIN expence_category ec ON ec.id = ei2.category_id
          WHERE ei2.expense_id = e.id
        ) AS category_names
  
      FROM expense e
  
      LEFT JOIN suppliers s
        ON s.id = e.supplier_id
  
    LEFT JOIN users creator
    ON creator.id = e.created_by
    
    LEFT JOIN users updater
    ON updater.id = e.updated_by
  
  
      LEFT JOIN payment_allocations pa
        ON pa.invoice_id = e.id
       AND pa.invoice_type = 'expense'
  
      ${whereClause}
  
      GROUP BY e.id
  
      ${havingClause}
  
      ORDER BY e.id DESC
  
      LIMIT ? OFFSET ?
      `
      )
      .all(...whereValues, ...havingValues, limit, offset);

    const { total } = db
      .prepare(
        `
      SELECT COUNT(*) AS total FROM (
        SELECT
          e.id,
          CASE
            WHEN COALESCE(SUM(pa.amount), 0) >= e.net_total THEN 'paid'
            WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
            ELSE 'unpaid'
          END AS status
        FROM expense e
        LEFT JOIN payment_allocations pa
          ON pa.invoice_id = e.id
         AND pa.invoice_type = 'expense'
        ${whereClause}
        GROUP BY e.id
        ${havingClause}
      )
      `
      )
      .get(...whereValues, ...havingValues).total;

    return {
      data: rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });

  // GET ONE
  ipcMain.handle("get-expense", (event, id) => {
    const invoice = db
      .prepare(
        `
        SELECT 
          e.*,
          s.name AS supplier_name,
          s.phone AS supplier_phone,
          creator.full_name AS created_by_name,
          updater.full_name AS updated_by_name,
          COALESCE(pa_sum.paid_amount, 0) AS paid_amount,
          e.net_total - COALESCE(pa_sum.paid_amount, 0) AS remaining_amount,
  
          CASE
            WHEN COALESCE(pa_sum.paid_amount, 0) >= e.net_total THEN 'paid'
            WHEN COALESCE(pa_sum.paid_amount, 0) > 0 THEN 'partial'
            ELSE 'unpaid'
          END AS status
  
        FROM expense e
            LEFT JOIN users creator
    ON creator.id = e.created_by
    
    LEFT JOIN users updater
    ON updater.id = e.updated_by
        LEFT JOIN suppliers s ON s.id = e.supplier_id
        LEFT JOIN (
          SELECT invoice_id, SUM(amount) AS paid_amount
          FROM payment_allocations
          WHERE invoice_type = 'expense'
          GROUP BY invoice_id
        ) pa_sum ON pa_sum.invoice_id = e.id
        WHERE e.id = ?
      `
      )
      .get(id);

    if (!invoice) return null;

    const items = db
      .prepare(
        `
        SELECT 
          pii.*,
          c.name AS category_name
        FROM expense_items pii
        LEFT JOIN expence_category c ON c.id = pii.category_id
        WHERE pii.expense_id = ?
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
          AND pa.invoice_type = 'expense'
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
  ipcMain.handle("update-expense", (event, data) => {
    if (
      !data.id ||
      !data.date ||
      !Array.isArray(data.items) ||
      data.items.length === 0 ||
      Number(data.subtotal) <= 0 ||
      Number(data.net_total) <= 0
    ) {
      return { success: false, error: "ERROR ENTER DATA" };
    }

    try {
      const transaction = db.transaction(() => {
        const oldInvoice = db
          .prepare(`SELECT * FROM expense WHERE id = ?`)
          .get(data.id);

        if (!oldInvoice) {
          throw new Error("EXPENSE NOT FOUND");
        }

        // Block editing if this invoice already has a payment against it
        const existingPayment = db
          .prepare(
            `
          SELECT pa.id
          FROM payment_allocations pa
          WHERE pa.invoice_id = ? AND pa.invoice_type = 'expense'
          LIMIT 1
          `
          )
          .get(data.id);

        if (existingPayment) {
          throw new Error("CANNOT EDIT A PAID EXPENSE INVOICE");
        }

        const oldSupplierId = oldInvoice.supplier_id || null;
        const newSupplierId = data.supplier_id || null;

        const newNetTotal = Number(data.net_total || 0);
        const newSubtotal = Number(data.subtotal || 0);

        const payment = data.payment || null;
        const paidAmount = payment ? Number(payment.amount || 0) : 0;

        const dateOnly = data.date.slice(0, 10);
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        // Update the invoice row
        db.prepare(
          `
          UPDATE expense
          SET supplier_id = ?,
              invoice_name = ?,
              description = ?,
              date = ?,
              subtotal = ?,
              net_total = ?,
              updated_by = ?
          WHERE id = ?
        `
        ).run(
          newSupplierId,
          data.invoice_name || null,
          data.description || null,
          fullDateTime,
          newSubtotal,
          newNetTotal,
          data.updated_by,
          data.id
        );

        // Replace items
        db.prepare(`DELETE FROM expense_items WHERE expense_id = ?`).run(
          data.id
        );

        const insertItem = db.prepare(`
          INSERT INTO expense_items
          (expense_id, category_id, price)
          VALUES (?, ?, ?)
        `);

        for (const item of data.items) {
          const price = Number(item.price || 0);
          if (!item.category_id || price < 0) {
            throw new Error("INVALID ITEM DATA");
          }
          insertItem.run(data.id, item.category_id, price);
        }

        // Supplier ledger + party history reconciliation for the invoice amount
        if (oldSupplierId && oldSupplierId === newSupplierId) {
          db.prepare(
            `
            UPDATE party_history
            SET amount = ?, date = ?, note = ?
            WHERE invoice_id = ? AND invoice_type = 'expense' AND record_type = 'invoice'
          `
          ).run(
            newNetTotal,
            fullDateTime,
            data.note || `Expense Invoice #${data.id}`,
            data.id
          );
        } else {
          if (oldSupplierId) {
            db.prepare(
              `
              DELETE FROM party_history
              WHERE invoice_id = ? AND invoice_type = 'expense' AND record_type = 'invoice'
            `
            ).run(data.id);
          }

          if (newSupplierId) {
            createPartyHistory(db, {
              party_type: "supplier",
              party_id: newSupplierId,
              invoice_id: data.id,
              invoice_type: "expense",
              record_type: "invoice",
              movement_type: "increase",
              amount: newNetTotal,
              date: fullDateTime,
              note: data.note || `Expense Invoice #${data.id}`,
            });
          }
        }

        // New payment attached in this same edit
        let insertPaymentId = null;

        if (paidAmount > 0) {
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
            invoice_id: data.id,
            invoice_type: payment.mode,
            note: `${payment.note} #${data.id}`,
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
            note: `${payment.note} #${data.id}`,
          });
        }

        return { invoiceId: data.id, paymentId: insertPaymentId };
      });

      const result = transaction();
      return { success: true, ...result };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });
  // DELETE
  ipcMain.handle("delete-expense", (event, id) => {
    const transaction = db.transaction(() => {
      const items = db
        .prepare(`SELECT * FROM expense_items WHERE expense_id = ?`)
        .all(id);

      db.prepare(`DELETE  FROM expense_items WHERE expense_id = ?`).run(id);
      db.prepare(
        `
  DELETE FROM party_history
  WHERE invoice_id = ?
    AND invoice_type = 'expense'
    AND record_type = 'invoice'
`
      ).run(id);
      db.prepare(`DELETE FROM expense WHERE id = ?`).run(id);
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
