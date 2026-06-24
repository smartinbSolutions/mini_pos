const { ipcMain } = require("electron");
import db from "../db";

const toAppFileUrl = (filePath) =>
  `app-file://local/${encodeURIComponent(filePath)}`;

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

    return toAppFileUrl(filePath);
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

  ipcMain.handle("get-dashboard-stats", () => {
    const scalar = (query) => db.prepare(query).get()?.value || 0;

    const totalSales =
      db.prepare(`SELECT SUM(net_total) as total FROM sales_invoices`).get()
        ?.total || 0;

    const products =
      db.prepare(`SELECT COUNT(*) as count FROM products`).get()?.count || 0;

    const customers =
      db.prepare(`SELECT COUNT(*) as count FROM customers`).get()?.count || 0;

    const purchaseTotal =
      db.prepare(`SELECT SUM(net_total) as total FROM purchase_invoices`).get()
        ?.total || 0;

    const profit = totalSales - purchaseTotal;

    const todaySales = scalar(`
      SELECT COALESCE(SUM(net_total), 0) AS value
      FROM sales_invoices
      WHERE date(date) = date('now')
    `);

    const todayPurchases = scalar(`
      SELECT COALESCE(SUM(net_total), 0) AS value
      FROM purchase_invoices
      WHERE date(date) = date('now')
    `);

    const invoiceCount = scalar(`
      SELECT COUNT(*) AS value
      FROM sales_invoices
    `);

    const paidInvoices = scalar(`
      SELECT COUNT(*) AS value
      FROM sales_invoices
      WHERE status = 'paid'
    `);

    const unpaidInvoices = scalar(`
      SELECT COUNT(*) AS value
      FROM sales_invoices
      WHERE status != 'paid' OR status IS NULL
    `);

    const inventoryValue = scalar(`
      SELECT COALESCE(SUM(quantity * costPrice), 0) AS value
      FROM products
    `);

    const lowStockProducts = scalar(`
      SELECT COUNT(*) AS value
      FROM products
      WHERE COALESCE(quantity, 0) <= 5
    `);

    const totalIncome = scalar(`
      SELECT COALESCE(SUM(amount), 0) AS value
      FROM payments
      WHERE type = 'income'
    `);

    const totalExpense = scalar(`
      SELECT COALESCE(SUM(amount), 0) AS value
      FROM payments
      WHERE type = 'expense'
    `);

    const salesTrend = db
      .prepare(
        `
        WITH RECURSIVE days(day) AS (
          SELECT date('now', '-6 days')
          UNION ALL
          SELECT date(day, '+1 day') FROM days WHERE day < date('now')
        )
        SELECT
          days.day,
          COALESCE(SUM(sales_invoices.net_total), 0) AS sales
        FROM days
        LEFT JOIN sales_invoices ON date(sales_invoices.date) = days.day
        GROUP BY days.day
        ORDER BY days.day
      `,
      )
      .all();

    const purchaseTrend = db
      .prepare(
        `
        WITH RECURSIVE days(day) AS (
          SELECT date('now', '-6 days')
          UNION ALL
          SELECT date(day, '+1 day') FROM days WHERE day < date('now')
        )
        SELECT
          days.day,
          COALESCE(SUM(purchase_invoices.net_total), 0) AS purchases
        FROM days
        LEFT JOIN purchase_invoices ON date(purchase_invoices.date) = days.day
        GROUP BY days.day
        ORDER BY days.day
      `,
      )
      .all();

    const topProducts = db
      .prepare(
        `
        SELECT
          COALESCE(products.name, 'Unknown') AS name,
          COALESCE(SUM(sales_invoice_items.quantity), 0) AS quantity,
          COALESCE(SUM(sales_invoice_items.total), 0) AS total
        FROM sales_invoice_items
        LEFT JOIN products ON products.id = sales_invoice_items.product_id
        GROUP BY sales_invoice_items.product_id
        ORDER BY quantity DESC
        LIMIT 5
      `,
      )
      .all();

    return {
      totalSales,
      products,
      customers,
      profit,
      todaySales,
      todayPurchases,
      invoiceCount,
      paidInvoices,
      unpaidInvoices,
      inventoryValue,
      lowStockProducts,
      totalIncome,
      totalExpense,
      salesTrend,
      purchaseTrend,
      topProducts,
    };
  });
}
