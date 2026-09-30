const { ipcMain } = require("electron");
import db from "../db";
import {
  getOpeningBalance,
  upsertOpeningBalance,
  deleteOpeningBalance,
} from "../utils/openingBalance";

export default function registerOpeningBalanceIPC() {
  // Read-only: returns { id, amount, balance_type, date } or null
  ipcMain.handle("get-opening-balance", (event, params = {}) => {
    try {
      return getOpeningBalance(db, {
        owner_type: params.owner_type,
        owner_id: params.owner_id,
      });
    } catch (err) {
      console.error("Failed to load opening balance:", err);
      return null;
    }
  });

  ipcMain.handle("upsert-opening-balance", (event, data = {}) => {
    if (!data.owner_type || !data.owner_id) {
      return { success: false, error: "MISSING_REQUIRED_FIELDS" };
    }

    try {
      db.transaction(() => {
        upsertOpeningBalance(db, {
          owner_type: data.owner_type,
          owner_id: data.owner_id,
          amount: data.amount,
          balance_type: data.balance_type,
          date: data.date,
        });
      })();

      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("delete-opening-balance", (event, data = {}) => {
    if (!data.owner_type || !data.owner_id) {
      return { success: false, error: "MISSING_REQUIRED_FIELDS" };
    }

    try {
      db.transaction(() => {
        deleteOpeningBalance(db, {
          owner_type: data.owner_type,
          owner_id: data.owner_id,
        });
      })();

      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });
}
