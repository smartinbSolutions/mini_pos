import { ipcMain } from "electron";
import db from "../db";
import { hashPin, isPinTaken, verifyPin } from "../utils/authCrypto";

export default function registerAuthHandlersIPC() {
  ipcMain.handle("auth:login", (event, { pin }) => {
    try {
      const users = db.prepare("SELECT * FROM users WHERE is_active = 1").all();
      const match = users.find((u) => verifyPin(pin, u.pin_hash));
      if (!match) return { success: false, error: "Invalid PIN" };
      return {
        success: true,
        user: {
          id: match.id,
          username: match.username,
          role: match.role,
          full_name: match.full_name,
        },
      };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("auth:get-users", () => {
    try {
      const users = db
        .prepare(
          "SELECT id, username, role, full_name, is_active, created_at FROM users ORDER BY created_at ASC"
        )
        .all();
      return { success: true, users };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("auth:create-user", (event, data) => {
    try {
      if (!/^\d{6}$/.test(data.pin || ""))
        return { success: false, error: "PIN must be exactly 6 digits" };
      if (
        db.prepare("SELECT id FROM users WHERE username = ?").get(data.username)
      )
        return { success: false, error: "Username already taken" };
      if (isPinTaken(db, data.pin))
        return { success: false, error: "PIN already in use" };

      const result = db
        .prepare(
          `INSERT INTO users (username, pin_hash, role, full_name, is_active) VALUES (?, ?, ?, ?, 1)`
        )
        .run(
          data.username,
          hashPin(data.pin),
          data.role,
          data.full_name || null
        );
      return { success: true, id: result.lastInsertRowid };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("auth:update-user", (event, data) => {
    try {
      const current = db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(data.id);
      if (!current) return { success: false, error: "User not found" };

      if (data.pin) {
        if (!/^\d{6}$/.test(data.pin))
          return { success: false, error: "PIN must be exactly 6 digits" };
        if (isPinTaken(db, data.pin, data.id))
          return { success: false, error: "PIN already in use" };
      }
      if (data.username) {
        const existing = db
          .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
          .get(data.username, data.id);
        if (existing)
          return { success: false, error: "Username already taken" };
      }

      // Guard: can't deactivate the last active admin
      const nextRole = data.role ?? current.role;
      const nextIsActive = data.is_active ?? current.is_active;
      const wasActiveAdmin = current.role === "admin" && current.is_active;
      const willBeActiveAdmin = nextRole === "admin" && nextIsActive;

      if (wasActiveAdmin && !willBeActiveAdmin) {
        const otherActiveAdmins = db
          .prepare(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND is_active = 1 AND id != ?"
          )
          .get(data.id).count;
        if (otherActiveAdmins === 0) {
          return {
            success: false,
            error: "At least one active admin must remain",
          };
        }
      }

      db.prepare(
        `
        UPDATE users SET
          username = COALESCE(?, username),
          full_name = COALESCE(?, full_name),
          role = COALESCE(?, role),
          is_active = COALESCE(?, is_active),
          pin_hash = COALESCE(?, pin_hash)
        WHERE id = ?
      `
      ).run(
        data.username ?? null,
        data.full_name ?? null,
        data.role ?? null,
        data.is_active ?? null,
        data.pin ? hashPin(data.pin) : null,
        data.id
      );
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("auth:delete-user", (event, { id }) => {
    try {
      const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
      if (!user) return { success: false, error: "User not found" };

      if (user.is_active) {
        return {
          success: false,
          error: "Deactivate this user before deleting",
        };
      }

      if (user.role === "admin") {
        const otherAdmins = db
          .prepare(
            "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND id != ?"
          )
          .get(id).count;
        if (otherAdmins === 0) {
          return {
            success: false,
            error: "At least one admin account must remain",
          };
        }
      }

      db.prepare("DELETE FROM users WHERE id = ?").run(id);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });
}
