import { ipcMain } from "electron";
import db from "../db";
import { hashPin, isPinTaken } from "../utils/authCrypto";
import { seedData } from "../utils/data";
const toAppFileUrl = (filePath) =>
  `app-file://local/${encodeURIComponent(filePath)}`;

// ---------------------------------------------------------------------------
// Dashboard stats helpers
// ---------------------------------------------------------------------------

function getModuleStats(db, { table, invoiceType, dateColumn = "date" }) {
  const total =
    db
      .prepare(`SELECT COALESCE(SUM(net_total), 0) AS value FROM ${table}`)
      .get()?.value || 0;

  const today =
    db
      .prepare(
        `
        SELECT COALESCE(SUM(net_total), 0) AS value
        FROM ${table}
        WHERE date(${dateColumn}) = date('now')
      `
      )
      .get()?.value || 0;

  const count =
    db.prepare(`SELECT COUNT(*) AS value FROM ${table}`).get()?.value || 0;

  const trend = db
    .prepare(
      `
      WITH RECURSIVE days(day) AS (
        SELECT date('now', '-6 days')
        UNION ALL
        SELECT date(day, '+1 day') FROM days WHERE day < date('now')
      )
      SELECT
        days.day,
        COALESCE(SUM(t.net_total), 0) AS total
      FROM days
      LEFT JOIN ${table} t ON date(t.${dateColumn}) = days.day
      GROUP BY days.day
      ORDER BY days.day
    `
    )
    .all();

  const statusBreakdown = db
    .prepare(
      `
      SELECT
        COUNT(CASE WHEN COALESCE(pa.allocated, 0) = 0 THEN 1 END) AS unpaid,
        COUNT(CASE WHEN COALESCE(pa.allocated, 0) > 0 AND COALESCE(pa.allocated, 0) < t.net_total THEN 1 END) AS partial,
        COUNT(CASE WHEN COALESCE(pa.allocated, 0) >= t.net_total AND t.net_total > 0 THEN 1 END) AS paid
      FROM ${table} t
      LEFT JOIN (
        SELECT invoice_id, SUM(amount) AS allocated
        FROM payment_allocations
        WHERE invoice_type = ?
        GROUP BY invoice_id
      ) pa ON pa.invoice_id = t.id
    `
    )
    .get(invoiceType);

  return {
    total,
    today,
    count,
    trend,
    paid: statusBreakdown?.paid || 0,
    partial: statusBreakdown?.partial || 0,
    unpaid: statusBreakdown?.unpaid || 0,
  };
}

function getProfitLoss(db) {
  const cogs =
    db
      .prepare(
        `
        SELECT COALESCE(SUM(quantity * buyingPrice), 0) AS value
        FROM sales_invoice_items
        WHERE buyingPrice IS NOT NULL
      `
      )
      .get()?.value || 0;

  const salesTotal =
    db
      .prepare(
        `SELECT COALESCE(SUM(net_total), 0) AS value FROM sales_invoices`
      )
      .get()?.value || 0;

  const expenseTotal =
    db.prepare(`SELECT COALESCE(SUM(net_total), 0) AS value FROM expense`).get()
      ?.value || 0;

  const grossProfit = salesTotal - cogs;
  const netProfit = grossProfit - expenseTotal;

  return { cogs, grossProfit, netProfit };
}

function getCashFlow(db) {
  const row = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS totalIncome,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS totalExpense
      FROM payments
    `
    )
    .get();

  return {
    totalIncome: row.totalIncome,
    totalExpense: row.totalExpense,
    net: row.totalIncome - row.totalExpense,
  };
}

function getTopSellingProducts(db, limit = 5) {
  const baseQuery = (orderBy) => `
    SELECT
      COALESCE(p.name, 'Unknown') AS name,
      sii.product_id,
      COALESCE(SUM(sii.quantity), 0) AS quantity,
      COALESCE(SUM(sii.total), 0) AS revenue,
      COALESCE(SUM(sii.quantity * sii.buyingPrice), 0) AS cogs
    FROM sales_invoice_items sii
    LEFT JOIN products p ON p.id = sii.product_id
    GROUP BY sii.product_id
    ORDER BY ${orderBy} DESC
    LIMIT ?
  `;

  const byQuantity = db.prepare(baseQuery("quantity")).all(limit);
  const byRevenue = db.prepare(baseQuery("revenue")).all(limit);

  return { byQuantity, byRevenue };
}

function getFundBalances(db) {
  return db
    .prepare(
      `
      SELECT
        f.id,
        f.name,
        c.code AS currency_code,
        c.symbol AS currency_symbol,
        COALESCE(SUM(
          CASE WHEN fh.movement_type = 'in' THEN fh.amount ELSE -fh.amount END
        ), 0) AS balance
      FROM funds f
      LEFT JOIN currencies c ON c.id = f.currency_id
      LEFT JOIN fund_history fh ON fh.fund_id = f.id
      GROUP BY f.id
      ORDER BY f.id
    `
    )
    .all();
}

// ---------------------------------------------------------------------------

export default function registerCompanySettingsIPC() {
  ipcMain.handle("get-company-settings", () => {
    const settings = db
      .prepare(
        `
      SELECT * FROM company_settings LIMIT 1
    `
      )
      .get();

    if (!settings) {
      return { exists: false };
    }

    return { exists: true, settings };
  });

  ipcMain.handle("create-company-settings", (event, data) => {
    if (!/^\d{6}$/.test(data.admin_pin || "")) {
      return { success: false, error: "Admin PIN must be exactly 6 digits" };
    }
    if (!data.admin_username?.trim()) {
      return { success: false, error: "Admin username is required" };
    }
    if (isPinTaken(db, data.admin_pin)) {
      return { success: false, error: "PIN already in use" };
    }

    const currencyResult = db
      .prepare(
        `
        INSERT INTO currencies (name, latinName, code, exchangeRate, symbol, isPrimary)
        VALUES (?,?,?,?,?,?)
      `
      )
      .run(data.currency_name, data.latinName, data.code, 1, data.symbol, 1);

    const result = db
      .prepare(
        `
        INSERT INTO company_settings (
          company_name, company_latin_name, phone, address, email, logo,
          base_currency_id, language, timezone
        ) VALUES (?,?,?,?,?,?,?,?,?)
      `
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
        data.timezone
      );

    db.prepare(
      `
      INSERT INTO users (username, pin_hash, role, full_name, is_active)
      VALUES (?, ?, 'admin', ?, 1)
    `
    ).run(data.admin_username, hashPin(data.admin_pin), data.admin_username);

    seedData(db);
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
    `
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
      data.id
    );

    return { success: true };
  });

  ipcMain.handle("get-dashboard-stats", () => {
    const sales = getModuleStats(db, {
      table: "sales_invoices",
      invoiceType: "sales",
    });
    const purchase = getModuleStats(db, {
      table: "purchase_invoices",
      invoiceType: "purchase",
    });
    const expense = getModuleStats(db, {
      table: "expense",
      invoiceType: "expense",
    });
    const profitLoss = getProfitLoss(db);
    const cashFlow = getCashFlow(db);
    const topProducts = getTopSellingProducts(db);
    const fundBalances = getFundBalances(db);

    const products =
      db.prepare(`SELECT COUNT(*) AS count FROM products`).get()?.count || 0;
    const customers =
      db.prepare(`SELECT COUNT(*) AS count FROM customers`).get()?.count || 0;
    const inventoryValue =
      db
        .prepare(
          `SELECT COALESCE(SUM(quantity * costPrice), 0) AS value FROM products`
        )
        .get()?.value || 0;
    const lowStockProducts =
      db
        .prepare(
          `SELECT COUNT(*) AS value FROM products WHERE COALESCE(quantity, 0) <= 5`
        )
        .get()?.value || 0;

    return {
      sales,
      purchase,
      expense,
      profitLoss,
      cashFlow,
      topProducts,
      fundBalances,
      products,
      customers,
      inventoryValue,
      lowStockProducts,
    };
  });
}
