const { ipcMain } = require("electron");
import db from "../db";
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
    `,
      )
      .run(data.name, data.currency_id, data.paymentInfundCurrency || 0);

    if (data.balance !== 0 && data.paymentInfundCurrency !== 0) {
      db.prepare(
        `
        INSERT INTO payments 
        (type, party_type, party_id, fund_id, amount, note,
         currency_code, exchange_rate, amount_fund_currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      ).run(
        data.balance > 0 ? "income" : "expense",
        "other",
        null,
        result.lastInsertRowid,
        Math.abs(data.balance),
        "Open Balance",
        data.currency_code,
        data.exchange_rate,
        data.paymentInfundCurrency,
      );
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
        c.exchangeRate as currency_exchangeRate
      FROM funds f
      LEFT JOIN currencies c ON c.id = f.currency_id
    `,
      )
      .all();

    return funds;
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
    `,
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
        `,
        )
        .all(fundId, limit, offset);
    },
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
    `,
    ).run(data.name, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-fund", (event, id) => {
    db.prepare(
      `
      DELETE FROM funds WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });

  ipcMain.handle("transfer-fund-to-fund", (event, transferData) => {
    try {
      const { from_fund_id, to_fund_id, deduct_amount, receive_amount, note } =
        transferData;

      console.log(transferData);

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

      // if (Number(fromFund.balance) < Number(deduct_amount)) {
      //   return {
      //     success: false,
      //     message: "Insufficient balance.",
      //   };
      // }

      const transaction = db.transaction(() => {
        db.prepare(
          `
        UPDATE funds
        SET balance = balance - ?
        WHERE id = ?
      `,
        ).run(Number(deduct_amount), from_fund_id);

        db.prepare(
          `
        UPDATE funds
        SET balance = balance + ?
        WHERE id = ?
      `,
        ).run(Number(receive_amount), to_fund_id);

        const insertHistory = db.prepare(`
        INSERT INTO fund_history
        (
          fund_id,
          record_type,
          movement_type,
          amount,
          note,
          date
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

        const now = new Date().toISOString();

        insertHistory.run(
          from_fund_id,
          "transfer_out",
          "out",
          Number(deduct_amount),
          note || `Transferred to ${toFund.name}`,
          now,
        );

        insertHistory.run(
          to_fund_id,
          "transfer_in",
          "in",
          Number(receive_amount),
          note || `Received from ${fromFund.name}`,
          now,
        );

        return {
          success: true,
          message: "Transfer completed successfully.",
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
