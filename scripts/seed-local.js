/*
 * Local demo data for development: product categories, ~30 products
 * (plenty / low / empty stock, barcodes, carton units) and customers.
 *
 *   npm run seed                 seed the app's own database
 *   npm run seed -- --db <file>  seed another pos.db
 *
 * Rows are written the same way the app's own handlers write them
 * (create-product, create-contact, tags), so everything shows up in the
 * app exactly like hand-entered data. A backup of the database is taken
 * first, and the seed refuses to run twice (marker in schema_migrations).
 *
 * Runs under Electron's Node (better-sqlite3 is built for Electron), so
 * use `npm run seed` rather than `node` directly.
 */
const path = require("path");
const os = require("os");
const fs = require("fs");
const Database = require("better-sqlite3");

const MARKER = "seed:local-demo-v1";
const LOW_STOCK_LEVEL = 5;

/* ---------------------------------------------------------------- data */

// [tag key, Arabic name, English name, colour]
const TAGS = [
  ["drinks", "مشروبات", "Drinks", "#16a34a"],
  ["bakery", "مخبوزات", "Bakery", "#ea580c"],
  ["dairy", "ألبان وأجبان", "Dairy", "#2563eb"],
  ["grocery", "بقالة", "Grocery", "#9333ea"],
  ["cleaning", "منظفات", "Cleaning", "#0891b2"],
  ["snacks", "سناكات وحلويات", "Snacks", "#db2777"],
];

// Arabic name, English name, tag, unit code, cost, sale price, quantity,
// optional extra selling unit [name, latin name, factor, sale price]
const PRODUCTS = [
  ["مياه معدنية 1.5 لتر", "Mineral water 1.5L", "drinks", "PCS", 0.4, 0.75, 120, ["كرتون", "Carton", 12, 8.5]],
  ["مياه معدنية 500 مل", "Mineral water 500ml", "drinks", "PCS", 0.2, 0.4, 3],
  ["عصير برتقال 1 لتر", "Orange juice 1L", "drinks", "PCS", 1.1, 1.75, 24],
  ["مشروب غازي 330 مل", "Soft drink can 330ml", "drinks", "PCS", 0.35, 0.6, 96, ["كرتون", "Carton", 24, 13.5]],
  ["شاي أسود 100 كيس", "Black tea 100 bags", "drinks", "BOX", 2.9, 4.75, 18],
  ["قهوة عربية 250 غ", "Arabic coffee 250g", "drinks", "PCS", 3.2, 5.5, 0],
  ["خبز عربي", "Arabic bread", "bakery", "PCS", 0.6, 1, 40],
  ["خبز توست", "Toast bread", "bakery", "PCS", 0.9, 1.5, 4],
  ["كرواسون", "Croissant", "bakery", "PCS", 0.35, 0.75, 30],
  ["كعك بالسمسم", "Sesame ka'ak", "bakery", "PCS", 0.25, 0.5, 0],
  ["حليب كامل الدسم 1 لتر", "Full cream milk 1L", "dairy", "PCS", 0.95, 1.4, 36],
  ["لبن رائب 1 كغ", "Yogurt 1kg", "dairy", "PCS", 1.2, 1.9, 2],
  ["جبنة بيضاء", "White cheese", "dairy", "KG", 4.5, 6.75, 8.5],
  ["زبدة 200 غ", "Butter 200g", "dairy", "PCS", 1.6, 2.4, 15],
  ["بيض (طبق 30)", "Eggs tray of 30", "dairy", "PCS", 3.8, 5.25, 5],
  ["أرز بسمتي 5 كغ", "Basmati rice 5kg", "grocery", "PCS", 7.5, 9.5, 14],
  ["سكر 1 كغ", "Sugar 1kg", "grocery", "PCS", 0.85, 1.25, 50, ["كيس 10 كغ", "Sack 10kg", 10, 11.5]],
  ["زيت دوار الشمس 1.8 لتر", "Sunflower oil 1.8L", "grocery", "PCS", 3.1, 4.25, 20],
  ["معكرونة 500 غ", "Pasta 500g", "grocery", "PCS", 0.55, 0.9, 60],
  ["عدس أحمر 1 كغ", "Red lentils 1kg", "grocery", "PCS", 1.3, 1.95, 0],
  ["معجون طماطم", "Tomato paste", "grocery", "PCS", 0.45, 0.8, 3],
  ["تونة معلبة", "Canned tuna", "grocery", "PCS", 1.05, 1.6, 44, ["علبة 6", "Pack of 6", 6, 9]],
  ["مسحوق غسيل 3 كغ", "Washing powder 3kg", "cleaning", "PCS", 4.2, 6.5, 9],
  ["سائل جلي 750 مل", "Dish soap 750ml", "cleaning", "PCS", 0.9, 1.5, 1],
  ["مناديل ورقية", "Tissues box", "cleaning", "PCS", 0.6, 1, 35],
  ["مبيض 1 لتر", "Bleach 1L", "cleaning", "PCS", 0.7, 1.2, 0],
  ["شيبس بطاطا", "Potato chips", "snacks", "PCS", 0.3, 0.6, 80],
  ["شوكولاتة بالحليب", "Milk chocolate bar", "snacks", "PCS", 0.45, 0.85, 4],
  ["بسكويت", "Biscuits", "snacks", "PCS", 0.35, 0.65, 55],
  ["علكة", "Chewing gum", "snacks", "PCS", 0.1, 0.25, 150],
];

const CUSTOMERS = [
  ["أبو أحمد", "0933 111 222", "الحي الشرقي"],
  ["أم خالد", "0944 333 444", "شارع السوق"],
  ["محمد العلي", "0955 555 666", ""],
  ["سارة حسن", "0966 777 888", "قرب المدرسة"],
  ["مطعم الياسمين", "0977 999 000", "الشارع الرئيسي"],
  ["فندق النخيل", "0988 123 456", "وسط المدينة"],
];

/* ------------------------------------------------------------- helpers */

function defaultDbPath() {
  const home = os.homedir();
  const base =
    process.platform === "win32"
      ? process.env.APPDATA || path.join(home, "AppData", "Roaming")
      : process.platform === "darwin"
        ? path.join(home, "Library", "Application Support")
        : process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  // userData folder = package.json "productName"
  return path.join(base, "NOON POS", "pos.db");
}

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i !== -1 ? process.argv[i + 1] : null;
}

// Same "YYYY-MM-DD HH:MM:SS" convention as createProductMovement.
function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Deterministic 13-digit barcodes in the in-store range (prefix 2).
function barcode(n) {
  return `29900${String(n).padStart(8, "0")}`;
}

/* ---------------------------------------------------------------- main */

async function main() {
  const dbPath = argValue("--db") || defaultDbPath();
  if (!fs.existsSync(dbPath)) {
    console.error(`No database at ${dbPath}\nStart the app once (it creates the database), or pass --db <file>.`);
    process.exit(1);
  }

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");

  const already = db
    .prepare(`SELECT 1 FROM schema_migrations WHERE name = ?`)
    .get(MARKER);
  if (already) {
    console.log(`Demo data is already in ${dbPath} — nothing to do.`);
    return;
  }

  // Online backup: safe even while the app has the database open.
  const backupPath = `${dbPath}.before-seed-${Date.now()}`;
  await db.backup(backupPath);
  console.log(`Backup saved: ${backupPath}`);

  const unitByCode = Object.fromEntries(
    db.prepare(`SELECT id, code, name FROM unit`).all().map((u) => [u.code, u]),
  );

  const seed = db.transaction(() => {
    // ---- categories (product tags) ----
    const insertTag = db.prepare(
      `INSERT INTO tags (name, latinName, color, scope) VALUES (?, ?, ?, 'product')
       ON CONFLICT(name, scope) DO NOTHING`,
    );
    const findTag = db.prepare(
      `SELECT id FROM tags WHERE name = ? AND scope = 'product'`,
    );
    const tagId = {};
    for (const [key, name, latin, color] of TAGS) {
      insertTag.run(name, latin, color);
      tagId[key] = findTag.get(name).id;
    }

    // ---- products — mirrors the create-product handler ----
    const insertProduct = db.prepare(`
      INSERT INTO products (name, latinName, code, description, costPrice, quantity, unit_id, tax_id, logo, type)
      VALUES (?, ?, ?, NULL, ?, ?, ?, NULL, NULL, 'normal')`);
    const insertBaseUnit = db.prepare(`
      INSERT INTO product_units (product_id, unit_name, conversion_factor, is_base, sale_price)
      VALUES (?, ?, 1, 1, ?)`);
    const insertExtraUnit = db.prepare(`
      INSERT INTO product_units (product_id, unit_name, latin_name, conversion_factor, is_base, sale_price, barcode)
      VALUES (?, ?, ?, ?, 0, ?, ?)`);
    const insertBarcode = db.prepare(
      `INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)`,
    );
    const barcodeTaken = db.prepare(
      `SELECT 1 FROM product_barcodes WHERE barcode = ?
       UNION SELECT 1 FROM product_units WHERE barcode = ?`,
    );
    const insertMovement = db.prepare(`
      INSERT INTO product_movements (product_id, reference_id, reference_type, type, action,
        enterPrice, outPrice, date, quantity, base_unit_name, unit_name, conversion_factor)
      VALUES (?, ?, 'initial', 'in', 'create', ?, 0, ?, ?, ?, ?, 1)`);
    const tagProduct = db.prepare(
      `INSERT OR IGNORE INTO taggables (tag_id, entity_type, entity_id) VALUES (?, 'product', ?)`,
    );

    let codeSeq = 1;
    let barcodeSeq = 1;
    const nextBarcode = () => {
      let code;
      do code = barcode(barcodeSeq++);
      while (barcodeTaken.get(code, code));
      return code;
    };

    for (const [name, latin, tag, unitCode, cost, price, qty, extra] of PRODUCTS) {
      const unit = unitByCode[unitCode] || unitByCode.PCS;
      const productId = insertProduct.run(
        name,
        latin,
        `D-${String(codeSeq++).padStart(3, "0")}`,
        cost,
        qty,
        unit.id,
      ).lastInsertRowid;

      insertBaseUnit.run(productId, unit.name, price);
      if (extra) {
        const [unitName, unitLatin, factor, unitPrice] = extra;
        insertExtraUnit.run(productId, unitName, unitLatin, factor, unitPrice, nextBarcode());
      }
      insertBarcode.run(productId, nextBarcode());
      insertMovement.run(productId, productId, cost, nowStamp(), qty, unit.name, unit.name);
      tagProduct.run(tagId[tag], productId);
    }

    // ---- customers — mirrors create-contact (legacy row + contact) ----
    const insertCustomer = db.prepare(
      `INSERT INTO customers (name, phone, address) VALUES (?, ?, ?)`,
    );
    const insertContact = db.prepare(`
      INSERT INTO contacts (name, phone, address, is_customer, is_supplier, legacy_customer_id, legacy_supplier_id)
      VALUES (?, ?, ?, 1, 0, ?, NULL)`);
    for (const [name, phone, address] of CUSTOMERS) {
      const legacyId = insertCustomer.run(name, phone, address || null).lastInsertRowid;
      insertContact.run(name, phone, address || null, legacyId);
    }

    // ---- turn on "Running low" warnings if they were switched off ----
    const settings = db
      .prepare(`SELECT id, minimum_stock FROM company_settings LIMIT 1`)
      .get();
    let lowStockChanged = false;
    if (settings && !Number(settings.minimum_stock)) {
      db.prepare(`UPDATE company_settings SET minimum_stock = ? WHERE id = ?`).run(
        LOW_STOCK_LEVEL,
        settings.id,
      );
      lowStockChanged = true;
    }

    db.prepare(`INSERT INTO schema_migrations (name) VALUES (?)`).run(MARKER);
    return { lowStockChanged };
  });

  const { lowStockChanged } = seed();
  const low = PRODUCTS.filter((p) => p[6] > 0 && p[6] <= LOW_STOCK_LEVEL).length;
  const out = PRODUCTS.filter((p) => p[6] <= 0).length;

  console.log(`Seeded ${dbPath}`);
  console.log(`  ${TAGS.length} categories, ${PRODUCTS.length} products (${low} running low, ${out} out of stock), ${CUSTOMERS.length} customers`);
  if (lowStockChanged) {
    console.log(`  "Minimum stock" was 0 (warnings off) — set to ${LOW_STOCK_LEVEL}.`);
  }
  console.log(`To undo: close the app and copy the backup back over pos.db.`);
}

main().catch((err) => {
  console.error("Seed failed — nothing was changed:", err.message);
  process.exit(1);
});
