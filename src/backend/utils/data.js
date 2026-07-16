import createProductMovement from "./createPorductMovment";

const TRANSLATIONS = {
  units: [
    { en: "Piece", ar: "قطعة", tr: "Adet", code: "PCS" },
    { en: "Kilogram", ar: "كيلوغرام", tr: "Kilogram", code: "KG" },
    { en: "Gram", ar: "غرام", tr: "Gram", code: "G" },
    { en: "Liter", ar: "لتر", tr: "Litre", code: "L" },
    { en: "Meter", ar: "متر", tr: "Metre", code: "M" },
    { en: "Box", ar: "علبة", tr: "Kutu", code: "BOX" },
    { en: "Carton", ar: "كرتون", tr: "Karton", code: "CTN" },
    { en: "Set", ar: "طقم", tr: "Set", code: "SET" },
  ],
  vatLabel: { en: "VAT", ar: "ضريبة القيمة المضافة", tr: "KDV" },
  expenseCategories: [
    { en: "Employee Salaries", ar: "مرتبات الموظفين", tr: "Personel Maaşları" },
    { en: "Services", ar: "خدمات", tr: "Hizmetler" },
    {
      en: "Administrative Expenses",
      ar: "مصاريف إدارية",
      tr: "İdari Giderler",
    },
    { en: "Sales Expenses", ar: "مصاريف مبيعات", tr: "Satış Giderleri" },
  ],
  fundName: { en: "Main Fund", ar: "الصندوق الرئيسي", tr: "Ana Kasa" },
  testProduct: { en: "Sample Product", ar: "منتج تجريبي", tr: "Örnek Ürün" },
};

// name = chosen setup language, latinName = secondary reference language
// (mirrors the original en/ar pairing, just made direction-aware)
function localize(entry, language) {
  const secondary = language === "en" ? "ar" : "en";
  return [entry[language], entry[secondary]];
}

export function seedData(db, { language = "ar", currencyId } = {}) {
  const lang = ["ar", "en", "tr"].includes(language) ? language : "ar";

  // Resolve the fund's currency: prefer the id we were just given,
  // fall back to whichever currency is flagged primary.
  const resolvedCurrencyId =
    currencyId ??
    db.prepare(`SELECT id FROM currencies WHERE isPrimary = 1 LIMIT 1`).get()
      ?.id ??
    1;

  const insertUnit = db.prepare(`
    INSERT OR IGNORE INTO unit(name, latinName, code)
    VALUES (?, ?, ?)
  `);

  TRANSLATIONS.units.forEach((unit) => {
    const [name, latinName] = localize(unit, lang);
    insertUnit.run(name, latinName, unit.code);
  });

  const insertTax = db.prepare(`
    INSERT OR IGNORE INTO taxes(name, rate)
    VALUES (?, ?)
  `);

  const vatLabel = TRANSLATIONS.vatLabel[lang];
  [0, 1, 5, 10, 18, 20].forEach((rate) => {
    const name =
      lang === "tr" ? `${vatLabel} %${rate}` : `${vatLabel} ${rate}%`;
    insertTax.run(name, rate);
  });

  const insertFund = db.prepare(`
    INSERT OR IGNORE INTO funds(name, currency_id)
    VALUES (?, ?)
  `);
  insertFund.run(TRANSLATIONS.fundName[lang], resolvedCurrencyId);

  const insertExpenseCategory = db.prepare(`
    INSERT OR IGNORE INTO expence_category(name, latinName)
    VALUES (?, ?)
  `);

  TRANSLATIONS.expenseCategories.forEach((category) => {
    const [name, latinName] = localize(category, lang);
    insertExpenseCategory.run(name, latinName);
  });

  // Sample product for testing, using the "Piece" unit seeded above
  const pieceUnitCode = "PCS";
  const pieceUnit = db
    .prepare(`SELECT id FROM unit WHERE code = ?`)
    .get(pieceUnitCode);

  const existingTestProduct = db
    .prepare(`SELECT id FROM products WHERE name = ? LIMIT 1`)
    .get(TRANSLATIONS.testProduct[lang]);

  if (!existingTestProduct && pieceUnit) {
    const [name, latinName] = localize(TRANSLATIONS.testProduct, lang);
    const costPrice = 50;
    const quantity = 10;

    const result = db
      .prepare(
        `
      INSERT INTO products (name, latinName, costPrice, price, quantity, unit_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `
      )
      .run(name, latinName, costPrice, 100, quantity, pieceUnit.id);

    createProductMovement(db, {
      product_id: result.lastInsertRowid,
      reference_id: result.lastInsertRowid,
      reference_type: "products",
      action: "create",
      type: "in",
      quantity,
      enterPrice: costPrice,
    });
  }
}
