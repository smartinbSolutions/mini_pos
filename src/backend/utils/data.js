export function seedData(db) {
  const insertUnit = db.prepare(`
    INSERT OR IGNORE INTO unit(name, latinName, code)
    VALUES (?, ?, ?)
  `);

  [
    ["Piece", "قطعة", "PCS"],
    ["Kilogram", "كيلوغرام", "KG"],
    ["Gram", "غرام", "G"],
    ["Liter", "لتر", "L"],
    ["Meter", "متر", "M"],
    ["Box", "علبة", "BOX"],
    ["Carton", "كرتون", "CTN"],
    ["Set", "طقم", "SET"],
  ].forEach((unit) => insertUnit.run(...unit));

  //   const insertCurrency = db.prepare(`
  //     INSERT OR IGNORE INTO currencies
  //     (name, latinName, code, exchangeRate, symbol, isPrimary)
  //     VALUES (?, ?, ?, ?, ?, ?)
  //   `);

  //   [
  //     ["Syrian Pound","ليرة سورية",  "SYP", 1, "£S", 1],
  //     ["US Dollar", "دولار أمريكي", "USD", 15000, "$", 0],
  //     ["Turkish Lira", "ليرة تركية", "TRY", 300, "₺", 0],
  //     ["Euro", "يورو", "EUR", 17000, "€", 0],
  //   ].forEach((currency) => insertCurrency.run(...currency));

  const insertTax = db.prepare(`
    INSERT OR IGNORE INTO taxes(name, rate)
    VALUES (?, ?)
  `);

  [
    ["VAT 0%", 0],
    ["VAT 1%", 1],
    ["VAT 5%", 5],
    ["VAT 10%", 10],
    ["VAT 18%", 18],
    ["VAT 20%", 20],
  ].forEach((tax) => insertTax.run(...tax));

  const insertFund = db.prepare(`
    INSERT OR IGNORE INTO funds(name, currency_id, balance)
    VALUES (?, ?, ?)
  `);

  insertFund.run("Mine Fund", 1, 0);

  const insertExpenseCategory = db.prepare(`
    INSERT OR IGNORE INTO expence_category(name, latinName)
    VALUES (?, ?)
  `);

  [
    ["Employee Salaries", "مرتبات الموظفين"],
    ["Services", "خدمات"],
    ["Administrative Expenses", "مصاريف إدارية"],
    ["Sales Expenses", "مصاريف مبيعات"],
  ].forEach((category) => insertExpenseCategory.run(...category));
}

