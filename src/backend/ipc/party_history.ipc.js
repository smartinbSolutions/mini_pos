const { ipcMain } = require("electron");
import db from "../db";

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
              WHEN p.party_type = 'partner' AND p.movement_type = 'withdrawal' THEN -p.amount
              WHEN p.party_type = 'partner' AND p.movement_type = 'deposit' THEN p.amount
              WHEN p.party_type != 'partner' AND p.record_type = 'invoice' THEN p.amount
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

      // Single static summary for the whole party (not per-page, not per-movement).
      const summary = db
        .prepare(
          `
        SELECT
          SUM(CASE WHEN p.party_type != 'partner' AND p.record_type = 'invoice' THEN p.amount ELSE 0 END) AS total_invoice,
          SUM(CASE WHEN p.party_type != 'partner' AND p.record_type = 'payment' THEN p.amount ELSE 0 END) AS total_payment,
          SUM(CASE WHEN p.party_type = 'partner' AND p.movement_type = 'deposit' THEN p.amount ELSE 0 END) AS total_deposit,
          SUM(CASE WHEN p.party_type = 'partner' AND p.movement_type = 'withdrawal' THEN p.amount ELSE 0 END) AS total_withdrawal
        FROM party_history p
        WHERE p.party_id = ?
          AND p.party_type = ?
        `
        )
        .get(partyId, partyType);

      return {
        rows,
        summary: {
          total_invoice: summary?.total_invoice || 0,
          total_payment: summary?.total_payment || 0,
          total_deposit: summary?.total_deposit || 0,
          total_withdrawal: summary?.total_withdrawal || 0,
        },
      };
    }
  );
}
