const { ipcMain, BrowserWindow } = require("electron");
import db from "../db";

export default function registerPrinterSettingsIPC() {
  // LIST WINDOWS PRINTER QUEUES
  // Uses a throwaway hidden window's webContents.getPrintersAsync(), same
  // mechanism already used in receiptPrinter.js's printReceiptHtml(), since
  // that's the only surface Electron exposes this through.
  ipcMain.handle("list-printers", async () => {
    const win = new BrowserWindow({
      show: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    try {
      await win.loadURL("data:text/html,<html></html>");
      const printers = await win.webContents.getPrintersAsync();
      return {
        success: true,
        data: printers.map((p) => ({
          name: p.name,
          displayName: p.displayName,
          isDefault: !!p.isDefault,
        })),
      };
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      win.close();
    }
  });

  // GET ALL SAVED PRINTER SETTINGS
  ipcMain.handle("get-printer-settings", () => {
    try {
      const data = db
        .prepare(
          `SELECT * FROM printer_settings ORDER BY is_default DESC, label, device_name`,
        )
        .all();
      return { success: true, data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // SAVE (UPSERT) ONE PRINTER'S SETTINGS
  // Keyed on device_name — re-saving the same printer updates its row
  // instead of creating a duplicate.
  ipcMain.handle("save-printer-settings", (event, data) => {
    const deviceName = (data.device_name || "").trim();
    const paperSize = data.paper_size || "80mm";
    const backend = data.backend || "electron";
    const hasCutter = data.has_cutter ? 1 : 0;
    const isDefault = data.is_default ? 1 : 0;
    const label = (data.label || "").trim() || null;

    if (!deviceName) {
      return { success: false, error: "DEVICE_NAME_REQUIRED" };
    }
    if (!["58mm", "80mm", "a4"].includes(paperSize)) {
      return { success: false, error: "INVALID_PAPER_SIZE" };
    }
    if (!["electron", "raw_escpos"].includes(backend)) {
      return { success: false, error: "INVALID_BACKEND" };
    }

    try {
      const saveTx = db.transaction(() => {
        // Only one printer can be the default at a time — clear any
        // existing default before setting this one, same pattern as any
        // other single-selection flag in the schema.
        if (isDefault) {
          db.prepare(
            `UPDATE printer_settings SET is_default = 0 WHERE is_default = 1`,
          ).run();
        }

        db.prepare(
          `
          INSERT INTO printer_settings
            (device_name, label, paper_size, backend, has_cutter, is_default, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          ON CONFLICT(device_name) DO UPDATE SET
            label = excluded.label,
            paper_size = excluded.paper_size,
            backend = excluded.backend,
            has_cutter = excluded.has_cutter,
            is_default = excluded.is_default,
            updatedAt = datetime('now')
          `,
        ).run(deviceName, label, paperSize, backend, hasCutter, isDefault);
      });

      saveTx();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
