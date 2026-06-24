const Database = require("better-sqlite3");

const db = new Database("pos.db");

db.pragma("foreign_keys = ON");

db.prepare(
  `
CREATE TABLE IF NOT EXISTS unit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  latinName TEXT,
  code TEXT UNIQUE
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  latinName TEXT,
  costPrice REAL DEFAULT 0,
  price REAL DEFAULT 0,
  quantity REAL DEFAULT 0,
  logo TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  unit_id INTEGER,
  FOREIGN KEY (unit_id) REFERENCES unit(id)
)
`,
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS product_barcodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER,
  barcode TEXT UNIQUE,
  FOREIGN KEY (product_id) REFERENCES products(id)
)
  `,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  address TEXT,
  total REAL DEFAULT 0,
  total_paid REAL DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now'))
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  phone TEXT,
  address TEXT,
  total REAL DEFAULT 0,
  total_paid REAL DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now'))
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS currencies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  latinName TEXT,
  code TEXT UNIQUE,
  exchangeRate REAL DEFAULT 1,
  symbol TEXT,
  isPrimary INTEGER DEFAULT 0
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS funds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  currency_id INTEGER,
  balance REAL DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (currency_id) REFERENCES currencies(id)
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS taxes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  rate REAL DEFAULT 0
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS sales_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_name TEXT,
  customer_id INTEGER,
  date TEXT,
  subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  tax_id INTEGER,
  taxValue REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  status TEXT DEFAULT unpaid,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (tax_id) REFERENCES taxes(id)
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER,
  product_id INTEGER,
  quantity REAL,
  price REAL,
  total REAL,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES sales_invoices(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_name TEXT,
  supplier_id INTEGER,
  date TEXT,
  subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  taxValue REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  status TEXT DEFAULT unpaid,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (supplier_id)
    REFERENCES suppliers(id)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity REAL NOT NULL,
  price REAL NOT NULL,
  total REAL NOT NULL,
  product_name TEXT,
  unit_name TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id)
    REFERENCES purchase_invoices(id)
    ON DELETE CASCADE,

  FOREIGN KEY (product_id)
    REFERENCES products(id)
    ON DELETE RESTRICT
);
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT, -- income / expense
  party_type TEXT, -- customer / supplier / other
  party_id INTEGER,
  fund_id INTEGER,
  amount REAL, -- 
  currency_code TEXT, -- USD / TRY / EUR
  exchange_rate REAL, -- Exchange rate at time of payment
  amount_fund_currency REAL, 
  note TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (fund_id) REFERENCES funds(id)
)
`,
).run();

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS company_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company_name TEXT NOT NULL,
    company_latin_name TEXT,
    phone TEXT,
    address TEXT,
    email TEXT,
    logo TEXT,
    base_currency_id INTEGER,
    language TEXT DEFAULT 'ar',
    timezone TEXT DEFAULT 'Asia/Damascus',
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (base_currency_id) REFERENCES currencies(id)
  )`,
).run();

db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales_invoice_items(invoice_id)`,
).run();
db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_purchase_invoice ON purchase_invoice_items(invoice_id)`,
).run();

export default db;
