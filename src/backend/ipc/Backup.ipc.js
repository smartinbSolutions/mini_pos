const { ipcMain, dialog, app } = require("electron");
const Database = require("better-sqlite3");
import fs from "fs";
import os from "os";
import path from "path";
import db from "../db";
import { verifyPin } from "../utils/authCrypto";
import {
  getBackupSettings,
  updateBackupSettings,
  writeRestoreAudit,
  runBackupNow,
} from "../services/backup/backupMeta.service";

/* ============================================================
   INTERNAL HELPERS
   ============================================================ */

function activeAdmin(id) {
  return db
    .prepare(
      "SELECT * FROM users WHERE id = ? AND role = 'admin' AND is_active = 1",
    )
    .get(id);
}

// Opens the candidate file read-only and checks it's actually a NoonPos
// database (has the users table) before we let it anywhere near restore.
// Prevents someone picking a random .db file and corrupting the app.
function validateBackupFile(filePath) {
  let checkDb;
  try {
    checkDb = new Database(filePath, { readonly: true, fileMustExist: true });
    const hasUsersTable = checkDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
      )
      .get();
    return !!hasUsersTable;
  } catch (_err) {
    console.error("validateBackupFile raw error:", _err);
    return false;
  } finally {
    if (checkDb) checkDb.close();
  }
}

/* ============================================================
   IPC HANDLERS
   ============================================================ */

export default function registerBackupIPC() {
  // GET BACKUP SETTINGS (default folder, schedule, last run status)
  ipcMain.handle("backup-get-settings", () => {
    return getBackupSettings();
  });

  // UPDATE BACKUP SETTINGS (default folder / schedule config)
  ipcMain.handle("backup-update-settings", (event, data) => {
    return updateBackupSettings(data);
  });

  // LET USER PICK THE DEFAULT BACKUP FOLDER
  ipcMain.handle("backup-choose-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths[0]) {
      return { success: false, error: "FOLDER_SELECTION_CANCELLED" };
    }
    return { success: true, folder: result.filePaths[0] };
  });

  // BROWSE FOR A SPECIFIC BACKUP FILE TO RESTORE, OUTSIDE THE DEFAULT
  // FOLDER — the escape hatch for a moved drive, USB backup, or a fresh
  // install with no folder configured yet. backup-list above stays the
  // primary path; this is secondary/advanced.
  ipcMain.handle("backup-choose-restore-file", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [{ name: "NoonPos Backup", extensions: ["db"] }],
    });
    if (result.canceled || !result.filePaths[0]) {
      return { success: false, error: "FILE_SELECTION_CANCELLED" };
    }
    return { success: true, filePath: result.filePaths[0] };
  });

  // LIST AVAILABLE BACKUPS IN THE CONFIGURED DEFAULT FOLDER
  // Restore picks from this list rather than a separate file-browse dialog,
  // since the folder is already the single source of truth set in settings.
  ipcMain.handle("backup-list", () => {
    try {
      const settingsResult = getBackupSettings();
      const folder = settingsResult.data?.default_folder || null;

      if (!folder) {
        return { success: false, error: "NO_BACKUP_FOLDER_CONFIGURED" };
      }
      if (!fs.existsSync(folder)) {
        return { success: false, error: "BACKUP_FOLDER_NOT_FOUND" };
      }

      const files = fs
        .readdirSync(folder)
        .filter((name) => name.endsWith(".db"))
        .map((name) => {
          const fullPath = path.join(folder, name);
          const stats = fs.statSync(fullPath);
          return {
            fileName: name,
            filePath: fullPath,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));

      return { success: true, data: files };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  // CREATE A BACKUP NOW — thin wrapper; the actual VACUUM INTO logic lives
  // in runBackupNow() so the scheduler (main.js) can call the exact same
  // path without going through an IPC round-trip to itself.
  ipcMain.handle("backup-create", (event, { targetFolder } = {}) => {
    return runBackupNow(db, { targetFolder });
  });

  // RESTORE FROM A BACKUP FILE — strict gate: active admin's own PIN AND
  // the recovery key, both required (mirrors auth:recover-admin-pin's
  // verification calls, but neither alone is sufficient here since restore
  // is more destructive than a PIN reset).
  ipcMain.handle("backup-restore", (event, data) => {
    const device = os.hostname();
    const backupFileName = path.basename(data.backupFilePath || "");

    const fail = (error) => {
      writeRestoreAudit({
        administratorUsername: data.administratorUsername || "unknown",
        authMethod: "pin_and_recovery_key",
        backupFileName: backupFileName || "unknown",
        device,
        status: "failed",
        errorMessage: error,
      });
      return { success: false, error };
    };

    try {
      if (!data.backupFilePath) return fail("BACKUP_FILE_REQUIRED");

      const admin = activeAdmin(data.administratorId);
      const setting = db
        .prepare("SELECT recovery_key_hash FROM security_settings WHERE id = 1")
        .get();

      if (
        !admin ||
        !verifyPin(data.administratorPin, admin.pin_hash) ||
        !setting ||
        !verifyPin(data.recoveryKey, setting.recovery_key_hash)
      ) {
        return fail("RESTORE_AUTH_FAILED");
      }

      if (!fs.existsSync(data.backupFilePath)) {
        return fail("BACKUP_FILE_NOT_FOUND");
      }
      if (!validateBackupFile(data.backupFilePath)) {
        return fail("INVALID_BACKUP_FILE");
      }

      const stats = fs.statSync(data.backupFilePath);
      const mainDbPath = db.name; // better-sqlite3 exposes the open filename here

      // Close the live connection before touching its file on disk —
      // required on every platform, but non-negotiable on Windows where
      // an open file handle blocks the copy outright.
      db.close();

      fs.copyFileSync(data.backupFilePath, mainDbPath);

      writeRestoreAudit({
        administratorUsername: admin.username,
        authMethod: "pin_and_recovery_key",
        backupFileName,
        backupFileMtime: stats.mtime.toISOString(),
        device,
        status: "success",
      });

      // Main process db connection is gone and the file underneath it has
      // changed — the only safe path forward is a full relaunch so every
      // module re-opens against the restored file from scratch.
      app.relaunch();
      app.exit(0);

      return { success: true };
    } catch (err) {
      return fail(err.message || String(err));
    }
  });
}
