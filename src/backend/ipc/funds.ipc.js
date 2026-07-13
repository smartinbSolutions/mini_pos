const { ipcMain } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";

export default function registerFundIPC() {
  ipcMain.handle("create-fund", (event, data) => {
    if (!data.name || !data.currency_id) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const initialBalance = Number(data.initial_balance || 0);

    const result = db
      .prepare(
        `
        INSERT INTO funds (name, currency_id)
        VALUES (?, ?)
      `
      )
      .run(data.name, data.currency_id);

    if (initialBalance !== 0) {
      createFundHistory(db, {
        fund_id: result.lastInsertRowid,
        record_type: "opening_balance",
        movement_type: initialBalance > 0 ? "in" : "out",
        amount: Math.abs(initialBalance),
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
    const { count } = db
      .prepare(
        `
      SELECT COUNT(*) AS count FROM fund_history WHERE fund_id = ?
    `
      )
      .get(id);

    if (count > 0) {
      return {
        success: false,
        message: "Cannot delete a fund that already has transaction history.",
      };
    }

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

        createFundHistory(db, {
          fund_id: from_fund_id,
          record_type: "transfer",
          movement_type: "out",
          payment_id: transferId,
          amount: Number(deduct_amount),
          note: note || `Transferred to ${toFund.name}`,
          date: now,
        });

        createFundHistory(db, {
          fund_id: to_fund_id,
          record_type: "transfer",
          movement_type: "in",
          payment_id: transferId,
          amount: Number(receive_amount),
          note: note || `Received from ${fromFund.name}`,
          date: now,
        });

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
  ipcMain.handle("update-fund-transfer", (event, data) => {
    try {
      const {
        id,
        from_fund_id,
        to_fund_id,
        deduct_amount,
        receive_amount,
        note,
      } = data;

      if (!id) {
        return { success: false, message: "Transfer id is required." };
      }

      if (!from_fund_id || !to_fund_id) {
        return {
          success: false,
          message: "Source and destination funds are required.",
        };
      }

      if (from_fund_id === to_fund_id) {
        return { success: false, message: "Cannot transfer to the same fund." };
      }

      if (Number(deduct_amount) <= 0 || Number(receive_amount) <= 0) {
        return { success: false, message: "Invalid transfer amounts." };
      }

      const existing = db
        .prepare("SELECT * FROM fund_transfers WHERE id = ?")
        .get(id);

      if (!existing) {
        return { success: false, message: "Transfer not found." };
      }

      const fromFund = db
        .prepare("SELECT * FROM funds WHERE id = ?")
        .get(from_fund_id);

      const toFund = db
        .prepare("SELECT * FROM funds WHERE id = ?")
        .get(to_fund_id);

      if (!fromFund || !toFund) {
        return { success: false, message: "Selected fund not found." };
      }

      // Verify both linked fund_history rows actually exist before touching
      // anything — if either is missing, this transfer's history is already
      // corrupted and we should fail loudly rather than silently no-op an
      // UPDATE that matches zero rows.
      const outRow = db
        .prepare(
          `
        SELECT * FROM fund_history
        WHERE payment_id = ? AND record_type = 'transfer_out' AND movement_type = 'out'
      `
        )
        .get(id);

      const inRow = db
        .prepare(
          `
        SELECT * FROM fund_history
        WHERE payment_id = ? AND record_type = 'transfer_in' AND movement_type = 'in'
      `
        )
        .get(id);

      if (!outRow || !inRow) {
        return {
          success: false,
          message:
            "This transfer's linked fund history is missing or corrupted — cannot safely update.",
        };
      }

      const nominalRate =
        Number(toFund.currency_exchangeRate || 1) /
        Number(fromFund.currency_exchangeRate || 1);

      const effectiveRate = Number(receive_amount) / Number(deduct_amount);

      const transaction = db.transaction(() => {
        db.prepare(
          `
          UPDATE fund_transfers
          SET from_fund_id = ?,
              to_fund_id = ?,
              deduct_amount = ?,
              receive_amount = ?,
              exchange_rate = ?,
              effective_rate = ?,
              note = ?
          WHERE id = ?
        `
        ).run(
          from_fund_id,
          to_fund_id,
          Number(deduct_amount),
          Number(receive_amount),
          nominalRate,
          effectiveRate,
          note || null,
          id
        );

        db.prepare(
          `
          UPDATE fund_history
          SET fund_id = ?,
              amount = ?,
              note = ?
          WHERE id = ?
        `
        ).run(
          from_fund_id,
          Number(deduct_amount),
          note || `Transferred to ${toFund.name}`,
          outRow.id
        );

        db.prepare(
          `
          UPDATE fund_history
          SET fund_id = ?,
              amount = ?,
              note = ?
          WHERE id = ?
        `
        ).run(
          to_fund_id,
          Number(receive_amount),
          note || `Received from ${fromFund.name}`,
          inRow.id
        );

        return { success: true, message: "Transfer updated successfully." };
      });

      return transaction();
    } catch (error) {
      console.error("Update Fund Transfer Error:", error);
      return {
        success: false,
        message: error.message || "Failed to update transfer.",
      };
    }
  });
  ipcMain.handle("delete-fund-transfer", (event, id) => {
    try {
      if (!id) {
        return { success: false, message: "Transfer id is required." };
      }

      const existing = db
        .prepare("SELECT * FROM fund_transfers WHERE id = ?")
        .get(id);

      if (!existing) {
        return { success: false, message: "Transfer not found." };
      }

      const transaction = db.transaction(() => {
        db.prepare(
          `
          DELETE FROM fund_history
          WHERE payment_id = ? AND record_type IN ('transfer_out', 'transfer_in')
        `
        ).run(id);

        db.prepare("DELETE FROM fund_transfers WHERE id = ?").run(id);

        return { success: true, message: "Transfer deleted successfully." };
      });

      return transaction();
    } catch (error) {
      console.error("Delete Fund Transfer Error:", error);
      return {
        success: false,
        message: error.message || "Failed to delete transfer.",
      };
    }
  });

  ipcMain.handle("get-fund-transfers", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const conditions = [];
    const values = [];

    // Optional: filter to transfers touching a specific fund (either side).
    if (params.fundId) {
      conditions.push("(t.from_fund_id = ? OR t.to_fund_id = ?)");
      values.push(params.fundId, params.fundId);
    }

    // Optional: filter to a specific direction from one fund's perspective.
    if (params.fromFundId) {
      conditions.push("t.from_fund_id = ?");
      values.push(params.fromFundId);
    }

    if (params.toFundId) {
      conditions.push("t.to_fund_id = ?");
      values.push(params.toFundId);
    }

    // Optional: date range (inclusive), expects ISO date strings.
    if (params.dateFrom) {
      conditions.push("t.date >= ?");
      values.push(params.dateFrom);
    }

    if (params.dateTo) {
      conditions.push("t.date <= ?");
      values.push(params.dateTo);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const transfers = db
      .prepare(
        `
      SELECT
        t.*,
        ff.name AS from_fund_name,
        ff.currency_code AS from_fund_currency,
        tf.name AS to_fund_name,
        tf.currency_code AS to_fund_currency
      FROM fund_transfers t
      LEFT JOIN (
        SELECT f.id, f.name, c.code AS currency_code
        FROM funds f
        LEFT JOIN currencies c ON c.id = f.currency_id
      ) ff ON ff.id = t.from_fund_id
      LEFT JOIN (
        SELECT f.id, f.name, c.code AS currency_code
        FROM funds f
        LEFT JOIN currencies c ON c.id = f.currency_id
      ) tf ON tf.id = t.to_fund_id
      ${whereClause}
      ORDER BY t.id DESC
      LIMIT ? OFFSET ?
    `
      )
      .all(...values, limit, offset);

    const { total } = db
      .prepare(
        `
      SELECT COUNT(*) AS total FROM fund_transfers t ${whereClause}
    `
      )
      .get(...values);

    return {
      data: transfers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });
}
