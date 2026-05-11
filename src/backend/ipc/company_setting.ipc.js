const { ipcMain } = require("electron");
import db from "../db";

export default function registerCompanySettingsIPC() {
  ipcMain.handle("get-company-settings", () => {
    const settings = db
      .prepare(
        `
      SELECT * FROM company_settings LIMIT 1
    `,
      )
      .get();

    return { exists: true, settings };
  });

  ipcMain.handle("create-company-settings", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO company_settings (
        company_name,
        company_latin_name,
        phone,
        address,
        email,
        logo,
        base_currency_id,
        language,
        timezone
      ) VALUES (?,?,?,?,?,?,?,?,?)
    `,
      )
      .run(
        data.company_name,
        data.company_latin_name,
        data.phone,
        data.address,
        data.email,
        data.logo,
        data.base_currency_id,
        data.language,
        data.timezone,
      );

    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle("update-company-settings", (event, data) => {
    db.prepare(
      `
      UPDATE company_settings SET
        company_name = ?,
        company_latin_name = ?,
        phone = ?,
        address = ?,
        email = ?,
        logo = ?,
        base_currency_id = ?,
        language = ?,
        timezone = ?,
        updatedAt = datetime('now')
      WHERE id = ?
    `,
    ).run(
      data.company_name,
      data.company_latin_name,
      data.phone,
      data.address,
      data.email,
      data.logo,
      data.base_currency_id,
      data.language,
      data.timezone,
      data.id,
    );

    return { success: true };
  });
}
