const { ipcMain } = require("electron");
import db from "../db";
import { getPartyCredit, applyPartyCredit } from "../utils/partyCredit";

export default function registerPartyHistoryIPC() {
  ipcMain.handle(
    "get-party-history-ledger",
    (event, { partyId, partyType, page = 1, limit = 50 }) => {
      const currentPage = Math.max(1, Number(page) || 1);
      const perPage = Math.max(1, Number(limit) || 50);
      const offset = (currentPage - 1) * perPage;

      const rows = db
        .prepare(
          `
          SELECT
            p.*,
  
            -- invoice-side info, resolved by invoice_type
            COALESCE(si.invoice_name, pi.invoice_name, ex.invoice_name) AS invoice_name,
  
            -- payment-side info, resolved via payment_id
            pay.note AS payment_note,
            pay.fund_id AS payment_fund_id,
            f.name AS fund_name,
  
            SUM(
              CASE
                WHEN p.movement_type = 'increase' THEN p.amount
                WHEN p.movement_type = 'decrease' THEN -p.amount
                ELSE 0
              END
            ) OVER (
              PARTITION BY p.party_type, p.party_id
              ORDER BY p.id
            ) AS running_balance
  
          FROM party_history p
  
          LEFT JOIN sales_invoices si
            ON p.record_type IN ('invoice','return')
            AND p.invoice_type IN ('sales','sales_return')
            AND si.id = p.invoice_id
  
          LEFT JOIN purchase_invoices pi
            ON p.record_type IN ('invoice','return')
            AND p.invoice_type IN ('purchase','purchase_return')
            AND pi.id = p.invoice_id
  
          LEFT JOIN expense ex
            ON p.record_type = 'invoice'
            AND p.invoice_type = 'expense'
            AND ex.id = p.invoice_id
  
          LEFT JOIN payments pay
            ON p.record_type = 'payment'
            AND pay.id = p.payment_id
  
          LEFT JOIN funds f
            ON f.id = pay.fund_id
  
          WHERE p.party_id = ?
            AND p.party_type = ?
          ORDER BY p.id DESC
          LIMIT ? OFFSET ?
          `
        )
        .all(partyId, partyType, perPage, offset);

      const { total } = db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM party_history
          WHERE party_id = ?
            AND party_type = ?
          `
        )
        .get(partyId, partyType);

      const summary = db
        .prepare(
          `
          SELECT
            COALESCE(SUM(CASE WHEN movement_type = 'increase' THEN amount ELSE 0 END), 0) AS total_increase,
            COALESCE(SUM(CASE WHEN movement_type = 'decrease' THEN amount ELSE 0 END), 0) AS total_decrease,
            COALESCE(SUM(CASE WHEN record_type = 'invoice' THEN amount ELSE 0 END), 0) AS total_invoice,
            COALESCE(SUM(CASE WHEN record_type = 'return' THEN amount ELSE 0 END), 0) AS total_return,
            COALESCE(SUM(CASE WHEN record_type = 'payment' THEN amount ELSE 0 END), 0) AS total_payment,
            COALESCE(SUM(CASE WHEN record_type = 'opening_balance' THEN
              CASE WHEN movement_type = 'increase' THEN amount ELSE -amount END
            ELSE 0 END), 0) AS opening_balance
          FROM party_history
          WHERE party_id = ?
            AND party_type = ?
          `
        )
        .get(partyId, partyType);

      return {
        data: rows,
        page: currentPage,
        limit: perPage,
        total,
        totalPages: Math.ceil(total / perPage),
        summary: {
          total_increase: Number(summary?.total_increase || 0),
          total_decrease: Number(summary?.total_decrease || 0),
          total_invoice: Number(summary?.total_invoice || 0),
          total_return: Number(summary?.total_return || 0),
          total_payment: Number(summary?.total_payment || 0),
          opening_balance: Number(summary?.opening_balance || 0),
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
