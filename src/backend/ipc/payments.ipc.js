const { ipcMain } = require("electron");
import db from "../db";
import reversePayment from "../services/payment/invoice/reversePayment.service";
import allocateCustomerPayment from "../services/payment/party/allocateCustomerPayment.service";
import allocateSupplierPayment from "../services/payment/party/allocateSupplierPayment.service";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";

export default function registerPaymentIPC() {
  ipcMain.handle("create-payment", (event, data) => {
    try {
      const amount = Number(data.amount);

      if (!data.type || !data.party_type || !data.fund_id || !amount) {
        return { message: "ERROR ENTER DATA", status: 400 };
      }

      if (
        data.party_type !== "other" &&
        data.party_type !== "partner" &&
        data.party_type !== "customer" &&
        data.party_type !== "supplier" &&
        !data.party_id
      ) {
        return { message: "ERROR ENTER INVOICE", status: 400 };
      }

      const validPartyTypes = ["supplier", "customer", "partner", "other"];
      const validTypes = ["income", "expense"];

      if (!validPartyTypes.includes(data.party_type)) {
        return { message: "INVALID PARTY TYPE", status: 400 };
      }

      if (!validTypes.includes(data.type)) {
        return { message: "INVALID PAYMENT TYPE", status: 400 };
      }

      const transaction = db.transaction(() => {
        const result = createPayment(db, {
          type: data.type,
          party_type: data.party_type,
          party_id: data.party_id,
          fund_id: data.fund_id,
          date: data.date || new Date().toISOString(),
          amount: amount,
          note: data.note || null,
          currency_code: data.currency_code,
          exchange_rate: data.exchange_rate,
          effective_rate: data.effective_rate,
          amount_fund_currency: data.collected_amount,
          invoice_id: data.invoiceId || null,
          invoice_type: data.mode || null,
        });

        const paymentId = result;

        if (data.party_type === "supplier") {
          allocateSupplierPayment(db, {
            supplierId: data.party_id,
            paymentId,
            amount,
            mode: data.mode,
            fund_id: data.fund_id,
            note: data.note,
            currency_code: data.currency_code,
            exchange_rate: data.exchange_rate,
            effective_rate: data.effective_rate,
            amount_fund_currency: data.collected_amount,
          });
        }

        if (data.party_type === "customer") {
          allocateCustomerPayment(db, {
            customerId: data.party_id,
            paymentId,
            amount,
            fund_id: data.fund_id,
            note: data.note,
            currency_code: data.currency_code,
            exchange_rate: data.exchange_rate,
            effective_rate: data.effective_rate,
            amount_fund_currency: data.collected_amount,
            date: data.date || new Date().toISOString(),
          });
        }

        createFundHistory(db, {
          fund_id: data.fund_id,
          record_type: "payment",
          payment_id: paymentId,
          movement_type: data.type === "income" ? "in" : "out",
          amount: data.collected_amount,
          note: data.note || "",
          date: data.date || new Date().toISOString(),
        });

        return paymentId;
      });

      const paymentId = transaction();

      return {
        success: true,
        id: paymentId,
        status: 200,
      };
    } catch (error) {
      console.error("Failed to create payment:", error);

      return {
        success: false,
        message: error.message || "FAILED TO CREATE PAYMENT",
        status: 500,
      };
    }
  });

  ipcMain.handle("get-payments", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions = [];
    const filterParams = [];

    if (params.type) {
      conditions.push(`p.type = ?`);
      filterParams.push(params.type);
    }

    if (params.party_type) {
      conditions.push(`p.party_type = ?`);
      filterParams.push(params.party_type);
    }

    if (params.invoice_type) {
      conditions.push(`p.invoice_type = ?`);
      filterParams.push(params.invoice_type);
    }

    if (params.fund_id) {
      conditions.push(`p.fund_id = ?`);
      filterParams.push(params.fund_id);
    }

    if (params.dateFrom) {
      conditions.push(`date(p.date) >= date(?)`);
      filterParams.push(params.dateFrom);
    }

    if (params.dateTo) {
      conditions.push(`date(p.date) <= date(?)`);
      filterParams.push(params.dateTo);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const payments = db
      .prepare(
        `
      SELECT 
        p.*,
        f.name AS fund_name,
        c.code AS fund_currency_code,
        c.symbol AS fund_currency_symbol,
        COALESCE(cust.name, supp.name, part.name) AS party_name,
        (
          SELECT COUNT(*) 
          FROM payment_allocations pa 
          WHERE pa.payment_id = p.id
        ) AS allocation_count,
        (
          SELECT COALESCE(SUM(pa.amount), 0) 
          FROM payment_allocations pa 
          WHERE pa.payment_id = p.id
        ) AS allocated_amount
      FROM payments p
      LEFT JOIN funds f ON f.id = p.fund_id
      LEFT JOIN currencies c ON c.id = f.currency_id
      LEFT JOIN customers cust ON cust.id = p.party_id AND p.party_type = 'customer'
      LEFT JOIN suppliers supp ON supp.id = p.party_id AND p.party_type = 'supplier'
      LEFT JOIN partners part ON part.id = p.party_id AND p.party_type = 'partner'
      ${whereClause}
      ORDER BY p.id DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...filterParams, limit, offset);

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM payments p ${whereClause}`)
      .get(...filterParams);

    const summary = db
      .prepare(
        `
      SELECT
        COUNT(CASE WHEN p.type = 'income' THEN 1 END) AS income_count,
        COALESCE(SUM(CASE WHEN p.type = 'income' THEN p.amount END), 0) AS income_total,
        COUNT(CASE WHEN p.type = 'expense' THEN 1 END) AS expense_count,
        COALESCE(SUM(CASE WHEN p.type = 'expense' THEN p.amount END), 0) AS expense_total
      FROM payments p
      ${whereClause}
    `
      )
      .get(...filterParams);

    return {
      data: payments,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary,
    };
  });

  ipcMain.handle("get-payment", (event, id) => {
    const payment = db
      .prepare(
        `
        SELECT
          p.*,
          f.name AS fund_name,
          c.code AS fund_currency_code,
          c.symbol AS fund_currency_symbol,
          COALESCE(cust.name, supp.name, part.name) AS party_name
        FROM payments p
        LEFT JOIN funds f ON f.id = p.fund_id
        LEFT JOIN currencies c ON c.id = f.currency_id
        LEFT JOIN customers cust ON cust.id = p.party_id AND p.party_type = 'customer'
        LEFT JOIN suppliers supp ON supp.id = p.party_id AND p.party_type = 'supplier'
        LEFT JOIN partners part ON part.id = p.party_id AND p.party_type = 'partner'
        WHERE p.id = ?
        `
      )
      .get(id);

    if (!payment) return null;

    const allocations = db
      .prepare(
        `SELECT * FROM payment_allocations WHERE payment_id = ? ORDER BY id ASC`
      )
      .all(id);

    return { ...payment, allocations };
  });

  ipcMain.handle("get-payment-allocations", (event, paymentId) => {
    return db
      .prepare(
        `
        SELECT *
        FROM payment_allocations
        WHERE payment_id = ?
        ORDER BY id ASC
      `
      )
      .all(paymentId);
  });

  ipcMain.handle("get-payment-fund", (event, id) => {
    return db
      .prepare(
        `
      SELECT 
        p.*,
        f.name AS fund_name,
        c.code AS fund_currency_code,
        c.symbol AS fund_currency_symbol,

        SUM(
          CASE
            WHEN p.type = 'income' THEN p.amount_fund_currency
            ELSE -p.amount_fund_currency
          END
        ) OVER (
          ORDER BY p.id ASC
        ) AS running_balance

      FROM payments p

      LEFT JOIN funds f 
        ON f.id = p.fund_id
      LEFT JOIN currencies c 
        ON c.id = f.currency_id

      WHERE p.fund_id = ?

      ORDER BY p.id DESC
    `
      )
      .all(id);
  });

  ipcMain.handle(
    "get-party-ledger",
    (event, { partyId, partyType, limit = 1, offset = 0 }) => {
      return db
        .prepare(
          `
        SELECT *
        FROM (
          SELECT 
            p.*,
            f.name AS fund_name,
            c.code AS fund_currency_code,
            c.symbol AS fund_currency_symbol,

            SUM(
              CASE 
                WHEN p.type = 'income' THEN p.amount
                WHEN p.type = 'expense' THEN -p.amount
                ELSE 0
              END
            ) OVER (
              PARTITION BY p.party_id
              ORDER BY p.id ASC
            ) AS running_balance

          FROM payments p
          LEFT JOIN funds f ON f.id = p.fund_id
          LEFT JOIN currencies c ON c.id = f.currency_id
          WHERE p.party_id = ?
            AND p.party_type = ?
        )

        ORDER BY id DESC
        LIMIT ? OFFSET ?
        `
        )
        .all(partyId, partyType, limit, offset);
    }
  );

  ipcMain.handle(
    "get-party-opening-balance",
    (event, { partyId, partyType }) => {
      const row = db
        .prepare(
          `
        SELECT COALESCE(SUM(
          CASE 
            WHEN type = 'income' THEN amount
            ELSE -amount
          END
        ), 0) AS balance
        FROM payments
        WHERE party_id = ?
          AND party_type = ?
        `
        )
        .get(partyId, partyType);

      return row?.balance || 0;
    }
  );

  ipcMain.handle("update-payment", (event, data) => {
    db.prepare(
      `
      UPDATE payments
      SET 
        type = ?,
        party_type = ?,
        party_id = ?,
        fund_id = ?,
        amount = ?,
        note = ?
      WHERE id = ?
    `
    ).run(
      data.type,
      data.party_type,
      data.party_id,
      data.fund_id,
      data.amount,
      data.note,
      data.id
    );

    return { success: true };
  });

  ipcMain.handle("delete-payment", (event, id) => {
    const transaction = db.transaction(() => {
      const payment = db
        .prepare(
          `
        SELECT *
        FROM payments
        WHERE id = ?
      `
        )
        .get(id);

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      const history = db
        .prepare(
          `
        SELECT *
        FROM party_history
        WHERE payment_id = ?
          AND record_type = 'payment'
      `
        )
        .all(id);

      if (history.length === 0) {
        throw new Error("PAYMENT_HISTORY_NOT_FOUND");
      }

      reversePayment(db, payment);

      db.prepare(
        `
      DELETE FROM party_history
      WHERE payment_id = ?
    `
      ).run(id);

      db.prepare(
        `
      DELETE FROM fund_history
      WHERE payment_id = ?
    `
      ).run(id);

      db.prepare(
        `
      DELETE FROM payments
      WHERE id = ?
    `
      ).run(id);
    });

    try {
      transaction();

      return {
        success: true,
      };
    } catch (err) {
      console.error(err);

      return {
        success: false,
        error: err.message,
      };
    }
  });
}
