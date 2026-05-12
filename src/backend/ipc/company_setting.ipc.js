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

    if (!settings) {
      return { exists: false };
    }

    return { exists: true, settings };
  });

  ipcMain.handle("create-company-settings", (event, data) => {
    console.log(data);

    const currencyResult = db
      .prepare(
        `
      INSERT INTO currencies (name, latinName, code, exchangeRate, symbol,isPrimary)
      VALUES (?,?,?,?,?,?)
    `,
      )
      .run(data.currency_name, data.latinName, data.code, 1, data.symbol, 1);
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
        currencyResult.lastInsertRowid,
        data.language,
        data.timezone,
      );

    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle("save-logo", (event, { base64, name }) => {
    const fs = require("fs");
    const path = require("path");
    const { app } = require("electron");

    const uploadDir = path.join(app.getPath("userData"), "uploads");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, name);

    const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");

    fs.writeFileSync(filePath, base64Data, "base64");

    return filePath;
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
