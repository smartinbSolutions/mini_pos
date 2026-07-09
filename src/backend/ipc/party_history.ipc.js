const { ipcMain } = require("electron");
import db from "../db";
import { getPartyCredit, applyPartyCredit } from "../utils/partyCredit";

export default function registerPartyHistoryIPC() {
  ipcMain.handle(
    "get-party-history-ledger",
    (event, { partyId, partyType, limit = 50, offset = 0 }) => {
      const rows = db
        .prepare(
          `
          SELECT
            p.*,
            f.name AS fund_name,
            SUM(
              CASE
                -- partner movements
                WHEN p.party_type = 'partner' AND p.movement_type = 'withdrawal' THEN -p.amount
                WHEN p.party_type = 'partner' AND p.movement_type = 'deposit'    THEN  p.amount

                -- customer/supplier opening balances
                WHEN p.party_type != 'partner' AND p.record_type = 'opening_balance' AND p.movement_type = 'deposit'    THEN  p.amount
                WHEN p.party_type != 'partner' AND p.record_type = 'opening_balance' AND p.movement_type = 'withdrawal' THEN -p.amount

                -- customer/supplier invoices and payments
                WHEN p.party_type != 'partner' AND p.record_type = 'invoice' THEN  p.amount
                WHEN p.party_type != 'partner' AND p.record_type = 'payment' THEN -p.amount

                ELSE 0
              END
            ) OVER (
              PARTITION BY p.party_type, p.party_id
              ORDER BY p.id
            ) AS running_balance
          FROM party_history p
          LEFT JOIN funds f ON f.id = p.fund_id
          WHERE p.party_id = ?
            AND p.party_type = ?
          ORDER BY p.id DESC
          LIMIT ? OFFSET ?
          `
        )
        .all(partyId, partyType, limit, offset);

      const summary = db
        .prepare(
          `
          SELECT
            SUM(
              CASE
                WHEN p.party_type != 'partner'
                     AND (
                       p.record_type = 'invoice'
                       OR (p.record_type = 'opening_balance' AND p.movement_type = 'deposit')
                     )
                THEN p.amount
                ELSE 0
              END
            ) AS total_invoice,

            SUM(
              CASE
                WHEN p.party_type != 'partner'
                     AND (
                       p.record_type = 'payment'
                       OR (p.record_type = 'opening_balance' AND p.movement_type = 'withdrawal')
                     )
                THEN p.amount
                ELSE 0
              END
            ) AS total_payment,

            SUM(
              CASE WHEN p.party_type = 'partner' AND p.movement_type = 'deposit' THEN p.amount ELSE 0 END
            ) AS total_deposit,

            SUM(
              CASE WHEN p.party_type = 'partner' AND p.movement_type = 'withdrawal' THEN p.amount ELSE 0 END
            ) AS total_withdrawal
          FROM party_history p
          WHERE p.party_id = ?
            AND p.party_type = ?
          `
        )
        .get(partyId, partyType);

      return {
        rows,
        summary: {
          total_invoice: Number(summary?.total_invoice || 0),
          total_payment: Number(summary?.total_payment || 0),
          total_deposit: Number(summary?.total_deposit || 0),
          total_withdrawal: Number(summary?.total_withdrawal || 0),
        },
      };
    }
  );

  ipcMain.handle("get-customer-credit", (event, customerId) => {
    return getPartyCredit(db, { partyId: customerId, partyType: "customer" });
  });

  ipcMain.handle("get-supplier-credit", (event, supplierId) => {
    return getPartyCredit(db, { partyId: supplierId, partyType: "supplier" });
  });

  ipcMain.handle(
    "apply-invoice-credit",
    (event, { partyId, partyType, invoiceId, invoiceType, amount }) => {
      try {
        const applied = applyPartyCredit(db, {
          partyId,
          partyType,
          invoiceId,
          invoiceType,
          amount,
        });
        return { success: true, applied };
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    }
  );
}
