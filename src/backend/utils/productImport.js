import ExcelJS from "exceljs";
import createProductMovement from "./createPorductMovment";

export async function generateProductImportTemplate(db) {
  const units = db
    .prepare(`SELECT code FROM unit WHERE code IS NOT NULL`)
    .all()
    .map((u) => u.code);

  const taxRows = db
    .prepare(
      `SELECT name, rate FROM taxes
       WHERE category IN ('product', 'both') AND name IS NOT NULL
       ORDER BY name`
    )
    .all();
  const taxLabels = taxRows.map((t) => `${t.name} (${t.rate}%)`);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");

  const unitsSheet = workbook.addWorksheet("Units");
  unitsSheet.state = "veryHidden";

  const taxesSheet = workbook.addWorksheet("Taxes");
  taxesSheet.state = "veryHidden";

  units.forEach((code, i) => {
    unitsSheet.getCell(`A${i + 1}`).value = code;
  });

  taxLabels.forEach((label, i) => {
    taxesSheet.getCell(`A${i + 1}`).value = label;
  });

  sheet.columns = [
    { header: "name", key: "name", width: 24 },
    { header: "latinName", key: "latinName", width: 24 },
    { header: "unit_code", key: "unit_code", width: 14 },
    {
      header: "costPrice",
      key: "costPrice",
      width: 14,
      style: { numFmt: "@" },
    },
    { header: "price", key: "price", width: 14, style: { numFmt: "@" } },
    { header: "tax", key: "tax", width: 20 },
    { header: "quantity", key: "quantity", width: 14, style: { numFmt: "@" } },
    { header: "barcodes", key: "barcodes", width: 32 },
  ];
  sheet.getRow(1).font = { bold: true };

  if (units.length > 0) {
    const ref = `Units!$A$1:$A$${units.length}`;
    for (let row = 2; row <= 500; row++) {
      sheet.getCell(`C${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [ref],
      };
    }
  }

  if (taxLabels.length > 0) {
    const ref = `Taxes!$A$1:$A$${taxLabels.length}`;
    for (let row = 2; row <= 500; row++) {
      sheet.getCell(`F${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [ref],
      };
    }
  }

  return workbook.xlsx.writeBuffer();
}

export async function parseProductImport(db, filePath, fileName) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  const unitRows = db.prepare(`SELECT id, code, name FROM unit`).all();
  const unitByCode = new Map(unitRows.map((u) => [u.code, u]));

  const taxByName = new Map(
    db
      .prepare(
        `SELECT id, name FROM taxes WHERE category IN ('product', 'both')`
      )
      .all()
      .map((t) => [t.name, t.id])
  );

  const existingBarcodes = new Set(
    db
      .prepare(`SELECT barcode FROM product_barcodes`)
      .all()
      .map((b) => b.barcode)
  );

  const insertProduct = db.prepare(`
        INSERT INTO products (name, latinName, costPrice, quantity, unit_id, tax_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
  const insertBaseProductUnit = db.prepare(`
        INSERT INTO product_units (product_id, unit_name, conversion_factor, is_base, sale_price)
        VALUES (?, ?, 1, 1, ?)
      `);
  const insertBarcode = db.prepare(`
        INSERT INTO product_barcodes (product_id, barcode) VALUES (?, ?)
      `);
  const getProductByName = db.prepare(`SELECT id FROM products WHERE name = ?`);

  const insertImport = db.prepare(`
        INSERT INTO product_imports (file_name, total_rows, created_count, skipped_products_count, skipped_barcodes_count, report_path)
        VALUES (?, 0, 0, 0, 0, NULL)
      `);
  const insertImportItem = db.prepare(`
        INSERT INTO product_import_items (import_id, row_number, status, product_id, product_name, barcode, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
  const updateImportCounts = db.prepare(`
        UPDATE product_imports
        SET total_rows = ?, created_count = ?, skipped_products_count = ?, skipped_barcodes_count = ?
        WHERE id = ?
      `);

  const created = [];
  const skippedProducts = [];
  const skippedBarcodes = [];
  let totalRows = 0;

  const stripTaxLabel = (raw) =>
    String(raw || "")
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();

  // Distinguishes "blank/zero, that's on the user" from "malformed input we
  // can't trust" (e.g. a cell Excel silently reinterpreted as a Date, turning
  // 7.5 into a multi-trillion epoch-timestamp number). Blank cells pass
  // through as 0; anything that looks like a misread value fails validation.
  const parseNumberCell = (raw) => {
    if (raw === null || raw === undefined || raw === "") {
      return { value: 0, valid: true };
    }

    if (raw instanceof Date) {
      return { value: null, valid: false };
    }

    // Text-formatted cells can come back with a comma decimal separator
    // depending on the user's Excel locale (e.g. "7,5" instead of "7.5").
    const normalized =
      typeof raw === "string" ? raw.trim().replace(",", ".") : raw;

    const n = Number(normalized);

    if (!Number.isFinite(n)) {
      return { value: null, valid: false };
    }

    return { value: n, valid: true };
  };
  const transaction = db.transaction(() => {
    const importResult = insertImport.run(fileName);
    const importId = importResult.lastInsertRowid;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const name = String(row.getCell(1).value || "").trim();
      if (!name) return;

      totalRows++;

      const latinName = String(row.getCell(2).value || "").trim();
      const unitCode = String(row.getCell(3).value || "").trim();
      const taxName = stripTaxLabel(row.getCell(6).value);
      const barcodesRaw = String(row.getCell(8).value || "");

      const costPriceCell = parseNumberCell(row.getCell(4).value);
      const priceCell = parseNumberCell(row.getCell(5).value);
      const quantityCell = parseNumberCell(row.getCell(7).value);

      if (!costPriceCell.valid || !priceCell.valid || !quantityCell.valid) {
        const badField = !costPriceCell.valid
          ? "costPrice"
          : !priceCell.valid
            ? "price"
            : "quantity";
        const reason = `Invalid number in ${badField}`;
        skippedProducts.push({ row: rowNumber, name, reason });
        insertImportItem.run(
          importId,
          rowNumber,
          "skipped_product",
          null,
          name,
          null,
          reason
        );
        return;
      }

      const costPrice = costPriceCell.value;
      const price = priceCell.value;
      const quantity = quantityCell.value;

      if (getProductByName.get(name)) {
        const reason = "Product name already exists";
        skippedProducts.push({ row: rowNumber, name, reason });
        insertImportItem.run(
          importId,
          rowNumber,
          "skipped_product",
          null,
          name,
          null,
          reason
        );
        return;
      }

      const matchedUnit = unitByCode.get(unitCode) || null;
      if (!matchedUnit) {
        const reason = unitCode
          ? "Unit code not found"
          : "Unit code is required";
        skippedProducts.push({ row: rowNumber, name, reason });
        insertImportItem.run(
          importId,
          rowNumber,
          "skipped_product",
          null,
          name,
          null,
          reason
        );
        return;
      }

      const unitId = matchedUnit.id;
      const baseUnitName = matchedUnit.name || "Unit";

      const taxId = taxName ? taxByName.get(taxName) || null : null;

      const result = insertProduct.run(
        name,
        latinName,
        costPrice,
        quantity,
        unitId,
        taxId
      );
      const productId = result.lastInsertRowid;

      insertBaseProductUnit.run(productId, baseUnitName, price);

      const barcodes = barcodesRaw
        .split(",")
        .map((b) => b.trim())
        .filter(Boolean);
      for (const barcode of barcodes) {
        if (existingBarcodes.has(barcode)) {
          const reason = "Barcode already used by another product";
          skippedBarcodes.push({ row: rowNumber, barcode, reason });
          insertImportItem.run(
            importId,
            rowNumber,
            "skipped_barcode",
            productId,
            name,
            barcode,
            reason
          );
          continue;
        }
        insertBarcode.run(productId, barcode);
        existingBarcodes.add(barcode);
      }

      createProductMovement(db, {
        product_id: productId,
        reference_id: productId,
        reference_type: "import",
        action: "create",
        type: "in",
        quantity,
        enterPrice: costPrice,
      });

      created.push({ row: rowNumber, name, id: productId });
    });

    updateImportCounts.run(
      totalRows,
      created.length,
      skippedProducts.length,
      skippedBarcodes.length,
      importId
    );

    return importId;
  });

  const importId = transaction();

  return { importId, created, skippedProducts, skippedBarcodes };
}
