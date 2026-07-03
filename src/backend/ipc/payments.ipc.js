const { ipcMain } = require("electron");
import db from "../db";
import applyCustomerPayment from "../services/payment/party/applyCustomerPayment.service";
import applyPartnerPayment from "../services/payment/party/applyPartnerPayment.service";
import applySupplierPayment from "../services/payment/party/applySupplierPayment.service";
import createFundHistory from "../utils/createFundHistory";

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
        !data.invoiceId
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
        const result = db
          .prepare(
            `
          INSERT INTO payments
          (
            type,
            party_type,
            party_id,
            fund_id,
            amount,
            note,
            currency_code,
            exchange_rate,
            amount_fund_currency,
            invoice_id,
            invoice_type
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
          )
          .run(
            data.type,
            data.party_type,
            data.party_id,
            data.fund_id,
            amount,
            data.note || null,
            data.currency_code,
            data.exchange_rate,
            data.collected_amount,
            data.invoiceId || null,
            data.mode || null,
          );

        const paymentId = result.lastInsertRowid;

        if (data.party_type === "supplier") {
          applySupplierPayment(db, {
            party_id: data.party_id,
            invoiceId: data.invoiceId,
            paymentId,
            fund_id: data.fund_id,
            amount,
            mode: data.mode,
            note: data.note,
          });
        }

        if (data.party_type === "customer") {
          applyCustomerPayment(db, {
            party_id: data.party_id,
            invoiceId: data.invoiceId,
            paymentId,
            fund_id: data.fund_id,
            amount,
            mode: data.mode,
            note: data.note,
          });
        }

        if (data.party_type === "partner") {
          applyPartnerPayment(db, {
            party_id: data.party_id,
            amount,
            type: data.type,
          });
        }

        createFundHistory(db, {
          fund_id: data.fund_id,
          record_type: "payment",
          payment_id: paymentId,
          invoice_id: data.invoiceId ?? null,
          invoice_type: data.mode ?? null,
          movement_type: data.type === "income" ? "in" : "out",
          amount: data.collected_amount,
          note: data.note || "",
        });
        const fundAmount =
          data.type === "income"
            ? Number(data.collected_amount)
            : -Number(data.collected_amount);

        db.prepare(
          `
        UPDATE funds
        SET balance = COALESCE(balance,0) + ?
        WHERE id = ?
      `,
        ).run(fundAmount, data.fund_id);

        if (data.party_type === "other") {
        }

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

  ipcMain.handle("get-payments", () => {
    return db
      .prepare(
        `
      SELECT 
        p.*,
        f.name AS fund_name,
        c.code AS fund_currency_code,
        c.symbol AS fund_currency_symbol
      FROM payments p
      LEFT JOIN funds f ON f.id = p.fund_id
      LEFT JOIN currencies c ON c.id = f.currency_id
      ORDER BY p.id DESC
    `,
      )
      .all();
  });

  ipcMain.handle("get-payment", (event, id) => {
    return db
      .prepare(
        `
      SELECT 
        p.*,
        f.name AS fund_name,
        c.code AS fund_currency_code,
        c.symbol AS fund_currency_symbol
      FROM payments p
      LEFT JOIN funds f ON f.id = p.fund_id
      LEFT JOIN currencies c ON c.id = f.currency_id
      WHERE p.id = ?
    `,
      )
      .get(id);
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
    `,
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
        `,
        )
        .all(partyId, partyType, limit, offset);
    },
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
        `,
        )
        .get(partyId, partyType);

      return row?.balance || 0;
    },
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
    `,
    ).run(
      data.type,
      data.party_type,
      data.party_id,
      data.fund_id,
      data.amount,
      data.note,
      data.id,
    );

    return { success: true };
  });

  ipcMain.handle("delete-payment", (event, id) => {
    db.prepare(`DELETE FROM payments WHERE id = ?`).run(id);

    return { success: true };
  });
}
