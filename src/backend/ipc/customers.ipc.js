const { ipcMain } = require("electron");
import db from "../db";
import createPartyHistory from "../utils/createPaymentHistory";

export default function registerCustomersIPC() {
  // CREATE
  ipcMain.handle("create-customer", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const result = db
      .prepare(
        `
      INSERT INTO customers (name, phone, address)
      VALUES (?,?,?)
    `,
      )
      .run(data.name, data.phone, data.address);

    const openingBalance = Number(data.opening_balance || 0);

    if (openingBalance !== 0) {
      createPartyHistory(db, {
        party_type: "customer",
        party_id: result.lastInsertRowid,
        invoice_id: null,
        invoice_type: "opening_balance",
        record_type: "opening_balance",
        movement_type: "deposit",
        amount: openingBalance,
        note: "Opening Balance",
        date: new Date().toISOString(),
      });
    }

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-customers", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const customers = db
      .prepare(
        `
     SELECT
  c.*,

  COALESCE(
  SUM(
    CASE
      WHEN ph.record_type = 'invoice'
        OR (ph.record_type = 'opening_balance' AND ph.movement_type = 'deposit')
      THEN ph.amount
      ELSE 0
    END
  ),
  0
) AS total,

COALESCE(
  SUM(
    CASE
      WHEN ph.record_type = 'payment'
        OR (ph.record_type = 'opening_balance' AND ph.movement_type = 'withdrawal')
      THEN ph.amount
      ELSE 0
    END
  ),
  0
) AS total_paid,

COALESCE(
  SUM(
    CASE
      WHEN ph.record_type = 'invoice'
        OR (ph.record_type = 'opening_balance' AND ph.movement_type = 'deposit')
      THEN ph.amount
      ELSE 0
    END
  ),
  0
)
-
COALESCE(
  SUM(
    CASE
      WHEN ph.record_type = 'payment'
        OR (ph.record_type = 'opening_balance' AND ph.movement_type = 'withdrawal')
      THEN ph.amount
      ELSE 0
    END
  ),
  0
) AS balance

      FROM customers c
      LEFT JOIN party_history ph
        ON ph.party_type = 'customer'
       AND ph.party_id = c.id

      GROUP BY c.id
      ORDER BY c.name

      LIMIT ? OFFSET ?
      `,
      )
      .all(limit, offset);

    const { total } = db
      .prepare(
        `
      SELECT COUNT(*) AS total
      FROM customers
      `,
      )
      .get();

    return {
      data: customers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });

  ipcMain.handle("get-customer", (event, id) => {
    const customer = db
      .prepare(
        `
    SELECT
  c.*,

  COALESCE(
    SUM(
      CASE
        WHEN (
          ph.record_type = 'invoice'
          OR (
            ph.record_type = 'opening_balance'
            AND ph.movement_type = 'deposit'
          )
        )
        THEN ph.amount
        ELSE 0
      END
    ),
    0
  ) AS total,

  COALESCE(
    SUM(
      CASE
        WHEN (
          ph.record_type = 'payment'
          OR (
            ph.record_type = 'opening_balance'
            AND ph.movement_type = 'withdrawal'
          )
        )
        THEN ph.amount
        ELSE 0
      END
    ),
    0
  ) AS total_paid,

  COALESCE(
    SUM(
      CASE
        WHEN (
          ph.record_type = 'invoice'
          OR (
            ph.record_type = 'opening_balance'
            AND ph.movement_type = 'deposit'
          )
        )
        THEN ph.amount
        ELSE 0
      END
    ),
    0
  )
  -
  COALESCE(
    SUM(
      CASE
        WHEN (
          ph.record_type = 'payment'
          OR (
            ph.record_type = 'opening_balance'
            AND ph.movement_type = 'withdrawal'
          )
        )
        THEN ph.amount
        ELSE 0
      END
    ),
    0
  ) AS balance

FROM customers c
LEFT JOIN party_history ph
  ON ph.party_type = 'customer'
 AND ph.party_id = c.id

WHERE c.id = ?

GROUP BY c.id;
      `,
      )
      .get(id);

    return customer;
  });

  ipcMain.handle("update-customer", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    db.prepare(
      `
      UPDATE customers
      SET name = ?, phone = ?, address = ?
      WHERE id = ?
    `,
    ).run(data.name, data.phone, data.address, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-customer", (event, id) => {
    const partyHistory = db
      .prepare(
        `
      SELECT id
      FROM party_history
      WHERE party_type = 'customer'
        AND party_id = ?
      LIMIT 1
    `,
      )
      .get(id);

    if (partyHistory) {
      return {
        success: false,
        message: "Cannot delete customer because it has transactions.",
      };
    }

    db.prepare(
      `
    DELETE FROM customers
    WHERE id = ?
  `,
    ).run(id);

    return { success: true };
  });
}
