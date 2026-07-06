const { ipcMain } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";

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
        const subtotal = Number(data.subtotal || 0);
        const netTotal = Number(data.net_total || 0);
        const paidAmount = isPaid ? Number(payment.amount) : 0;
        const remainingAmount = netTotal - paidAmount;

        if (subtotal <= 0 || netTotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        const dateOnly = data.date;
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        const status =
          paidAmount <= 0
            ? "unpaid"
            : remainingAmount <= 0
              ? "paid"
              : "partial";

        const invoiceResult = db
          .prepare(
            `
                INSERT INTO expense
                (supplier_id, invoice_name, description, date, subtotal, net_total, status, paid_amount, remaining_amount)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `
          )
          .run(
            data.supplier_id || null,
            data.invoice_name || null,
            data.description || null,
            fullDateTime,
            subtotal,
            netTotal,
            status,
            paidAmount,
            remainingAmount
          );
        const invoiceId = invoiceResult.lastInsertRowid;

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
            amount: netTotal,
            note: data.note || `Expense Invoice #${invoiceId}`,
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

        if (paidAmount > 0) {
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
            invoice_type: "expense",
            movement_type: "out",
            amount: data.payment.collected_amount,
            note: `${data.payment.note} #${invoiceId}`,
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
      };
    }
  });

  // GET ALL
  ipcMain.handle("get-expenses", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const rows = db
      .prepare(
        `
        SELECT 
          expense.*,
          suppliers.name AS supplier_name,
          suppliers.phone AS supplier_phone
        FROM expense
        LEFT JOIN suppliers ON suppliers.id = expense.supplier_id
        ORDER BY expense.id DESC
        LIMIT ? OFFSET ?
      `
      )
      .all(limit, offset);

    const { total } = db.prepare(`SELECT COUNT(*) AS total FROM expense`).get();

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
          pi.*,
          s.name AS supplier_name
        FROM expense pi
        LEFT JOIN suppliers s ON s.id = pi.supplier_id
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
          c.name AS category_name
        FROM expense_items pii
        LEFT JOIN expence_category c ON c.id = pii.category_id
        WHERE pii.expense_id = ?
      `
      )
      .all(id);

    let payments = [];

    if (invoice.status !== "unpaid") {
      if (invoice.supplier_id) {
        // Party has a ledger — pull the payment trail from party_history
        payments = db
          .prepare(
            `
            SELECT 
              ph.id,
              ph.payment_id,
              ph.amount,
              ph.note,
              ph.currency_code,
              ph.exchange_rate,
              ph.effective_rate,
              ph.amount_fund_currency,
              ph.createdAt,
              p.fund_id,
              f.name AS fund_name
            FROM party_history ph
            LEFT JOIN payments p ON p.id = ph.payment_id
            LEFT JOIN funds f ON f.id = p.fund_id
            WHERE ph.invoice_id = ?
              AND ph.invoice_type = 'expense'
              AND ph.record_type = 'payment'
            ORDER BY ph.createdAt ASC
          `
          )
          .all(id);
      } else {
        // No supplier -> no party_history rows exist for this invoice.
        // Read directly from payments instead.
        payments = db
          .prepare(
            `
            SELECT 
              p.id,
              p.id AS payment_id,
              p.amount,
              p.note,
              p.currency_code,
              p.exchange_rate,
              p.effective_rate,
              p.amount_fund_currency,
              p.createdAt,
              p.fund_id,
              f.name AS fund_name
            FROM payments p
            LEFT JOIN funds f ON f.id = p.fund_id
            WHERE p.invoice_id = ? AND p.invoice_type = 'expense'
            ORDER BY p.createdAt ASC
          `
          )
          .all(id);
      }
    }

    return {
      ...invoice,
      items,
      payments,
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
            `SELECT id FROM payments WHERE invoice_id = ? AND invoice_type = 'expense'`
          )
          .get(data.id);

        if (existingPayment) {
          throw new Error("CANNOT EDIT A PAID EXPENSE INVOICE");
        }

        const oldSupplierId = oldInvoice.supplier_id || null;
        const newSupplierId = data.supplier_id || null;

        const oldNetTotal = Number(oldInvoice.net_total || 0);
        const newNetTotal = Number(data.net_total || 0);
        const newSubtotal = Number(data.subtotal || 0);

        const payment = data.payment || null;
        const paidAmount = payment ? Number(payment.amount || 0) : 0;
        const remainingAmount = newNetTotal - paidAmount;
        const status =
          paidAmount <= 0
            ? "unpaid"
            : remainingAmount <= 0
              ? "paid"
              : "partial";

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
              status = ?,
              paid_amount = ?,
              remaining_amount = ?
          WHERE id = ?
        `
        ).run(
          newSupplierId,
          data.invoice_name || null,
          data.description || null,
          fullDateTime,
          newSubtotal,
          newNetTotal,
          status,
          paidAmount,
          remainingAmount,
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
          const delta = newNetTotal - oldNetTotal;
          if (delta !== 0) {
            db.prepare(
              `UPDATE suppliers SET total = total + ? WHERE id = ?`
            ).run(delta, newSupplierId);
          }

          db.prepare(
            `
            UPDATE party_history
            SET amount = ?, note = ?
            WHERE invoice_id = ? AND invoice_type = 'expense' AND record_type = 'invoice'
          `
          ).run(
            newNetTotal,
            data.note || `Expense Invoice #${data.id}`,
            data.id
          );
        } else {
          if (oldSupplierId) {
            db.prepare(
              `UPDATE suppliers SET total = total - ? WHERE id = ?`
            ).run(oldNetTotal, oldSupplierId);

            db.prepare(
              `
              DELETE FROM party_history
              WHERE invoice_id = ? AND invoice_type = 'expense' AND record_type = 'invoice'
            `
            ).run(data.id);
          }

          if (newSupplierId) {
            db.prepare(
              `UPDATE suppliers SET total = total + ? WHERE id = ?`
            ).run(newNetTotal, newSupplierId);

            createPartyHistory(db, {
              party_type: "supplier",
              party_id: newSupplierId,
              invoice_id: data.id,
              invoice_type: "expense",
              record_type: "invoice",
              amount: newNetTotal,
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
          });

          createFundHistory(db, {
            fund_id: payment.fund_id,
            record_type: "payment",
            payment_id: insertPaymentId,
            invoice_id: data.id,
            invoice_type: "expense",
            movement_type: "out",
            amount: payment.collected_amount,
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
