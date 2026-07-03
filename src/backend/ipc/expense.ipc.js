const { ipcMain } = require("electron");
import db from "../db";
import createPayment from "../utils/createPayment";

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

        const subtotal = Number(data.subtotal || 0);
        const netTotal = Number(data.net_total || 0);
        const paidAmount = Number(data.paymentInfundCurrency || 0);

        if (subtotal <= 0 || netTotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        const dateOnly = data.date;
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        const invoiceResult = db
          .prepare(
            `
        INSERT INTO expense
        (supplier_id, date, subtotal, net_total, status)
        VALUES (?, ?, ?, ?, ? )
      `,
          )
          .run(
            data.supplier_id,
            fullDateTime,
            subtotal,
            netTotal,
            data.status || "unpaid",
          );

        const invoiceId = invoiceResult.lastInsertRowid;

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

          insertItem.run(invoiceId, item.category_id, price);
        }
        let insertPaymentId = null;

        const updateSupplier = db.prepare(`
  UPDATE suppliers
  SET total = total + ?,
      total_paid = total_paid + ?
  WHERE id = ?
`);

        const supplierPaid = data.status === "paid" ? paidAmount : 0;

        // updateSupplier.run(
        //   Number(netTotal || 0),
        //   Number(data.paid_amount || 0),
        //   data.supplier_id,
        // );

        if (data.status === "paid") {
          const paymentId = createPayment(db, {
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
        error: err,
      };
    }
  });

  // GET ALL
  ipcMain.handle("get-expenses", () => {
    return db
      .prepare(
        `
      SELECT 
        expense.*,
        suppliers.name AS supplier_name,
        suppliers.phone AS supplier_phone
      FROM expense
      LEFT JOIN suppliers ON suppliers.id = expense.supplier_id
      ORDER BY expense.id DESC
    `,
      )
      .all();
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
    `,
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
    `,
      )
      .all(id);

    return {
      ...invoice,
      items,
    };
  });
  // UPDATE
  ipcMain.handle("update-expense", (event, data) => {
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
        .prepare(`SELECT * FROM expense_items WHERE expense_id = ?`)
        .all(data.id);
      const oldInvoice = db
        .prepare(`SELECT * FROM expense WHERE id = ?`)
        .get(data.id);

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

      db.prepare(`DELETE FROM expense_items WHERE expense_id = ?`).run(data.id);

      const dateOnly = data.date.slice(0, 10);
      const now = new Date();
      const time = now.toTimeString().slice(0, 8);
      const fullDateTime = `${dateOnly} ${time}`;

      db.prepare(
        `
      UPDATE expense
      SET supplier_id = ?,
          date = ?,
          subtotal = ?,
          net_total = ?
      WHERE id = ?
    `,
      ).run(
        data.supplier_id,
        fullDateTime,
        data.subtotal || 0,
        data.net_total || 0,
        data.id,
      );

      const insertItem = db.prepare(`
      INSERT INTO expense_items
      (expense_id, category_id, price)
      VALUES (?, ?, ?)
    `);

      for (const item of data.items) {
        const price = Number(item.price || 0);

        if (!item.category_id) continue;

        insertItem.run(data.id, item.category_id, price);
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
  ipcMain.handle("delete-expense", (event, id) => {
    const transaction = db.transaction(() => {
      const items = db
        .prepare(`SELECT * FROM expense_items WHERE expense_id = ?`)
        .all(id);

      db.prepare(`DELETE FROM expense_items WHERE expense_id = ?`).run(id);

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
