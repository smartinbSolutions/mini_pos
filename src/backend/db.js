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
  createdAt TEXT DEFAULT (datetime('now'))
  
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
  exchangeRate REAL DEFAULT 1
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
  customer_id INTEGER,
  date TEXT,
  subtotal REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  tax_id INTEGER,
  net_total REAL DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
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
  supplier_id INTEGER,
  date TEXT,
  total REAL DEFAULT 0,
  discount REAL DEFAULT 0,
  tax REAL DEFAULT 0,
  net_total REAL DEFAULT 0,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
)
`,
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER,
  product_id INTEGER,
  quantity REAL,
  price REAL,
  total REAL,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (invoice_id) REFERENCES purchase_invoices(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
)
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
  amount REAL,
  note TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (fund_id) REFERENCES funds(id)
)
`,
).run();

db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales_invoice_items(invoice_id)`,
).run();
db.prepare(
  `CREATE INDEX IF NOT EXISTS idx_purchase_invoice ON purchase_invoice_items(invoice_id)`,
).run();

export default db;
