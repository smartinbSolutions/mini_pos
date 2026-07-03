const { ipcMain } = require("electron");
import db from "../db";

export default function registerPartyHistoryIPC() {
  ipcMain.handle(
    "get-party-history-ledger",
    (event, { partyId, partyType, limit = 50, offset = 0 }) => {
      return db
        .prepare(
          `
        SELECT
          p.*,
          SUM(
            CASE
              WHEN p.record_type = 'invoice' THEN p.amount
              WHEN p.record_type = 'payment' THEN -p.amount
              ELSE 0
            END
          ) OVER (
            PARTITION BY p.party_type, p.party_id
            ORDER BY p.id
          ) AS running_balance
        FROM party_history p
        WHERE p.party_id = ?
          AND p.party_type = ?
        ORDER BY p.id DESC
        LIMIT ? OFFSET ?
        `
        )
        .all(partyId, partyType, limit, offset);
    }
  );
}
