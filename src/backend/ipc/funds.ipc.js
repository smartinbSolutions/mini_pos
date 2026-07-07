const { ipcMain } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";

export default function registerFundIPC() {
  ipcMain.handle("create-fund", (event, data) => {
    if (!data.name || !data.currency_id) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const result = db
      .prepare(
        `
      INSERT INTO funds (name, currency_id, balance)
      VALUES (?, ?, ?)
    `
      )
      .run(data.name, data.currency_id, 0);

    if (data.balance !== 0 && data.paymentInfundCurrency !== 0) {
      createFundHistory(db, {
        fund_id: result.lastInsertRowid,
        record_type: "opening_balance",
        movement_type: data.balance > 0 ? "in" : "out",
        amount: Math.abs(data.paymentInfundCurrency),
        note: "Opening Balance",
      });
    }

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-funds", () => {
    const funds = db
      .prepare(
        `
      SELECT
        f.*,
        c.name as currency_name,
        c.code as currency_code,
        c.symbol as currency_symbol,
        c.exchangeRate as currency_exchangeRate,
        COALESCE(
          SUM(
            CASE
              WHEN fh.movement_type = 'in' THEN fh.amount
              WHEN fh.movement_type = 'out' THEN -fh.amount
              ELSE 0
            END
          ),
          0
        ) AS computed_balance
      FROM funds f
      LEFT JOIN currencies c ON c.id = f.currency_id
      LEFT JOIN fund_history fh ON fh.fund_id = f.id
      GROUP BY f.id
    `
      )
      .all();

    return funds.map((f) => ({
      ...f,
      balance: f.computed_balance,
    }));
  });

  ipcMain.handle("get-fund", (event, id) => {
    const fund = db
      .prepare(
        `
      SELECT 
        f.*,
        c.name as currency_name,
        c.code as currency_code,
        c.symbol as currency_symbol,
        c.exchangeRate as currency_exchangeRate
      FROM funds f
      LEFT JOIN currencies c ON c.id = f.currency_id
      WHERE f.id = ?
    `
      )
      .get(id);

    return fund;
  });

  ipcMain.handle(
    "get-fund-history",
    (event, { fundId, limit = 50, offset = 0 }) => {
      return db
        .prepare(
          `
        SELECT
          h.*,
          SUM(
            CASE
              WHEN h.movement_type = 'in' THEN h.amount
              WHEN h.movement_type = 'out' THEN -h.amount
              ELSE 0
            END
          ) OVER (
            PARTITION BY h.fund_id
            ORDER BY h.id
          ) AS running_balance
        FROM fund_history h
        WHERE h.fund_id = ?
        ORDER BY h.id DESC
        LIMIT ? OFFSET ?
        `
        )
        .all(fundId, limit, offset);
    }
  );

  ipcMain.handle("update-fund", (event, data) => {
    if (!data.name || !data.currency_id) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    db.prepare(
      `
      UPDATE funds
      SET name = ?
      WHERE id = ?
    `
    ).run(data.name, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-fund", (event, id) => {
    db.prepare(
      `
      DELETE FROM funds WHERE id = ?
    `
    ).run(id);

    return { success: true };
  });

  ipcMain.handle("transfer-fund-to-fund", (event, transferData) => {
    try {
      const { from_fund_id, to_fund_id, deduct_amount, receive_amount, note } =
        transferData;

      if (!from_fund_id || !to_fund_id) {
        return {
          success: false,
          message: "Source and destination funds are required.",
        };
      }

      if (from_fund_id === to_fund_id) {
        return {
          success: false,
          message: "Cannot transfer to the same fund.",
        };
      }

      if (Number(deduct_amount) <= 0) {
        return {
          success: false,
          message: "Invalid transfer amount.",
        };
      }

      if (Number(receive_amount) <= 0) {
        return {
          success: false,
          message: "Invalid receive amount.",
        };
      }

      const fromFund = db
        .prepare("SELECT * FROM funds WHERE id = ?")
        .get(from_fund_id);

      const toFund = db
        .prepare("SELECT * FROM funds WHERE id = ?")
        .get(to_fund_id);

      if (!fromFund || !toFund) {
        return {
          success: false,
          message: "Selected fund not found.",
        };
      }

      // Server-derived, never trusted from the client — same principle as
      // status/effective_rate elsewhere: the funds' own rates are authoritative.
      const nominalRate =
        Number(toFund.currency_exchangeRate || 1) /
        Number(fromFund.currency_exchangeRate || 1);

      const effectiveRate = Number(receive_amount) / Number(deduct_amount);

      const transaction = db.transaction(() => {
        const now = new Date().toISOString();

        const transferResult = db
          .prepare(
            `
          INSERT INTO fund_transfers
          (from_fund_id, to_fund_id, deduct_amount, receive_amount, exchange_rate, effective_rate, note, date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
          )
          .run(
            from_fund_id,
            to_fund_id,
            Number(deduct_amount),
            Number(receive_amount),
            nominalRate,
            effectiveRate,
            note || null,
            now
          );

        const transferId = transferResult.lastInsertRowid;

        const insertHistory = db.prepare(`
          INSERT INTO fund_history
          (fund_id, record_type, movement_type, amount, note, date, transfer_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        insertHistory.run(
          from_fund_id,
          "transfer_out",
          "out",
          Number(deduct_amount),
          note || `Transferred to ${toFund.name}`,
          now,
          transferId
        );

        insertHistory.run(
          to_fund_id,
          "transfer_in",
          "in",
          Number(receive_amount),
          note || `Received from ${fromFund.name}`,
          now,
          transferId
        );

        return {
          success: true,
          message: "Transfer completed successfully.",
          transferId,
        };
      });

      return transaction();
    } catch (error) {
      console.error("Transfer Fund Error:", error);

      return {
        success: false,
        message: error.message || "Transfer failed.",
      };
    }
  });
}
