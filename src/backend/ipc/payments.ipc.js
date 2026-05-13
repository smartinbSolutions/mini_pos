const { ipcMain } = require("electron");
import db from "../db";

export default function registerPaymentIPC() {
  ipcMain.handle("create-payment", (event, data) => {
    if (
      !data.type ||
      !data.party_type ||
      !data.party_id ||
      !data.fund_id ||
      !data.invoiceId ||
      !data.amount
    ) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const transaction = db.transaction(() => {
      const result = db
        .prepare(
          `
        INSERT INTO payments 
        (type, party_type, party_id, fund_id, amount, note)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
        )
        .run(
          data.type,
          data.party_type,
          data.party_id,
          data.fund_id,
          data.amount,
          data.note || null,
        );

      if (data.party_type === "supplier") {
        db.prepare(
          `
        UPDATE suppliers
        SET total_paid = total_paid + ?
        WHERE id = ?
      `,
        ).run(data.amount, data.party_id);

        db.prepare(
          `
        UPDATE purchase_invoices
        SET status = ?
        WHERE id = ?
      `,
        ).run("paid", data.invoiceId);

        const res = db
          .prepare(
            `
              UPDATE funds
              SET balance = balance - ?
              WHERE id = ?
            `,
          )
          .run(Number(data.amount), data.fund_id);
      }

      if (data.party_type === "customer") {
        db.prepare(
          `
        UPDATE customers
        SET total_paid = total_paid + ?
        WHERE id = ?
      `,
        ).run(data.amount, data.party_id);

        db.prepare(
          `
        UPDATE sales_invoices
        SET status = ?
        WHERE id = ?
      `,
        ).run("paid", data.invoiceId);

        db.prepare(
          `
            UPDATE funds
            SET balance = balance + ?
            WHERE id = ?
          `,
        ).run(data.amount, data.fund_id);
      }
    });

    const id = transaction();

    return {
      success: true,
      id,
    };
  });

  ipcMain.handle("get-payments", () => {
    return db
      .prepare(
        `
      SELECT 
        p.*,
        f.name AS fund_name
      FROM payments p
      LEFT JOIN funds f ON f.id = p.fund_id
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
        f.name AS fund_name
      FROM payments p
      LEFT JOIN funds f ON f.id = p.fund_id
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

        SUM(
          CASE
            WHEN p.type = 'income' THEN p.amount
            ELSE -p.amount
          END
        ) OVER (
          ORDER BY p.id ASC
        ) AS running_balance

      FROM payments p

      LEFT JOIN funds f 
        ON f.id = p.fund_id

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
