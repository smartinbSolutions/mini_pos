const { ipcMain } = require("electron");
import db from "../db";
import createPartyHistory from "../utils/createPaymentHistory";
export default function registerSuppliersIPC() {
  // CREATE
  ipcMain.handle("create-supplier", (event, data) => {
    if (!data.name) {
      return { success: false, error: "ERROR ENTER DATA" };
    }
    const result = db
      .prepare(
        `
      INSERT INTO suppliers (name, phone, address)
      VALUES (?,?,?)
    `
      )
      .run(data.name, data.phone, data.address);

    const openingBalance = Number(data.opening_balance || 0);
    if (openingBalance !== 0) {
      const openingBalanceDate = `${data.opening_balance_year || new Date().getFullYear()}-01-01 00:00:00`;

      createPartyHistory(db, {
        party_type: "supplier",
        party_id: result.lastInsertRowid,
        invoice_id: null,
        invoice_type: "opening_balance",
        record_type: "opening_balance",
        movement_type: "increase",
        amount: openingBalance,
        note: "Opening Balance",
        date: openingBalanceDate,
      });
    }
    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-suppliers", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const suppliers = db
      .prepare(
        `
      SELECT
        s.*,
  
        COALESCE(
          SUM(CASE WHEN ph.movement_type = 'increase' THEN ph.amount ELSE 0 END),
          0
        ) AS total,
  
        COALESCE(
          SUM(CASE WHEN ph.movement_type = 'decrease' THEN ph.amount ELSE 0 END),
          0
        ) AS total_paid,
  
        COALESCE(
          SUM(
            CASE
              WHEN ph.movement_type = 'increase' THEN ph.amount
              WHEN ph.movement_type = 'decrease' THEN -ph.amount
              ELSE 0
            END
          ),
          0
        ) AS balance
  
      FROM suppliers s
      LEFT JOIN party_history ph
        ON ph.party_type = 'supplier'
       AND ph.party_id = s.id
  
      GROUP BY s.id
      ORDER BY s.name
  
      LIMIT ? OFFSET ?
      `
      )
      .all(limit, offset);

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM suppliers`)
      .get();

    return {
      data: suppliers,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });
  ipcMain.handle("get-supplier", (event, id) => {
    const supplier = db
      .prepare(
        `
    SELECT
      s.*,

      COALESCE(
        SUM(
          CASE
            WHEN ph.invoice_type = 'purchase' AND 
            ph.record_type = 'invoice' THEN ph.amount

            WHEN ph.record_type = 'opening_balance' AND
             ph.movement_type = 'deposit' THEN ph.amount
            
            WHEN ph.invoice_type = 'purchase_return' AND
             ph.record_type = 'return' THEN -ABS(ph.amount)

            ELSE 0
          END
        ),
        0
      ) AS total,

      COALESCE(
        SUM(
          CASE
            WHEN ph.invoice_type = 'purchase' AND
             ph.record_type = 'payment' THEN ph.amount

            WHEN ph.record_type = 'opening_balance' AND
             ph.movement_type = 'withdrawal' THEN ph.amount
            
            WHEN ph.invoice_type = 'purchase_return' AND ph.record_type = 'payment' THEN -ph.amount

            ELSE 0
          END
        ),
        0
      ) AS total_paid,

      COALESCE(
        SUM(
          CASE
            WHEN ph.invoice_type = 'purchase' AND 
            ph.record_type = 'invoice' THEN ph.amount
            
            WHEN ph.record_type = 'opening_balance' AND 
            ph.movement_type = 'deposit' THEN ph.amount

            WHEN ph.invoice_type = 'purchase_return' AND 
            ph.record_type = 'payment' THEN ph.amount

            WHEN ph.invoice_type = 'purchase_return' AND 
            ph.record_type = 'return' THEN -ph.amount

            WHEN ph.invoice_type = 'purchase' AND
             ph.record_type = 'payment' THEN -ph.amount

            WHEN ph.record_type = 'opening_balance' AND
             ph.movement_type = 'withdrawal' THEN -ph.amount

            ELSE 0
          END
        ),
        0
      ) AS balance

    FROM suppliers s

    LEFT JOIN party_history ph
      ON ph.party_type = 'supplier'
     AND ph.party_id = s.id

    WHERE s.id = ?

    GROUP BY s.id;
    `
      )
      .get(id);

    return supplier;
  });

  ipcMain.handle("update-supplier", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    db.prepare(
      `
      UPDATE suppliers
      SET name = ?, phone = ?, address = ?
      WHERE id = ?
    `
    ).run(data.name, data.phone, data.address, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-supplier", (event, id) => {
    const partyHistory = db
      .prepare(
        `
      SELECT id
      FROM party_history
      WHERE party_type = 'supplier'
        AND party_id = ?
      LIMIT 1
    `
      )
      .get(id);

    if (partyHistory) {
      return {
        success: false,
        message: "Cannot delete supplier because it has transactions.",
      };
    }

    db.prepare(
      `
      DELETE FROM suppliers WHERE id = ?
    `
    ).run(id);

    return { success: true };
  });
}
