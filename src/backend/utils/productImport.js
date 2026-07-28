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

  // Raw type codes, not translated labels — same convention unit_code
  // already uses (the code itself in the dropdown, not a display name).
  const typeCodes = ["normal", "service"];

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");

  const unitsSheet = workbook.addWorksheet("Units");
  unitsSheet.state = "veryHidden";

  const taxesSheet = workbook.addWorksheet("Taxes");
  taxesSheet.state = "veryHidden";

  const typesSheet = workbook.addWorksheet("Types");
  typesSheet.state = "veryHidden";

  units.forEach((code, i) => {
    unitsSheet.getCell(`A${i + 1}`).value = code;
  });

  taxLabels.forEach((label, i) => {
    taxesSheet.getCell(`A${i + 1}`).value = label;
  });

  typeCodes.forEach((code, i) => {
    typesSheet.getCell(`A${i + 1}`).value = code;
  });

  sheet.columns = [
    { header: "name", key: "name", width: 24 },
    { header: "latinName", key: "latinName", width: 24 },
    { header: "type", key: "type", width: 12 },
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
    { header: "unit2_name", key: "unit2_name", width: 18 },
    {
      header: "unit2_conversion_factor",
      key: "unit2_conversion_factor",
      width: 20,
      style: { numFmt: "@" },
    },
    {
      header: "unit2_price",
      key: "unit2_price",
      width: 14,
      style: { numFmt: "@" },
    },
    { header: "unit2_barcode", key: "unit2_barcode", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  // One optional additional-selling-unit slot is pre-built here
  // (unit2_*). More can be added by copying that same 4-column group
  // rightward as unit3_*, unit4_*, etc. — the importer discovers any
  // "unitN_name" header dynamically rather than expecting a fixed count.
  sheet.getCell("J1").note = {
    texts: [
      {
        text: "Optional. To add another selling unit beyond this one, copy these 4 columns (name/conversion_factor/price/barcode) and rename them unit3_*, unit4_*, and so on.",
      },
    ],
  };

  if (units.length > 0) {
    const ref = `Units!$A$1:$A$${units.length}`;
    for (let row = 2; row <= 500; row++) {
      sheet.getCell(`D${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [ref],
      };
    }
  }

  if (taxLabels.length > 0) {
    const ref = `Taxes!$A$1:$A$${taxLabels.length}`;
    for (let row = 2; row <= 500; row++) {
      sheet.getCell(`G${row}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [ref],
      };
    }
  }

  {
    const ref = `Types!$A$1:$A$${typeCodes.length}`;
    for (let row = 2; row <= 500; row++) {
      sheet.getCell(`C${row}`).dataValidation = {
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

  // Separate namespace from product_barcodes — unit-level barcodes live on
  // product_units.barcode, checked independently of the product-level table.
  const existingUnitBarcodes = new Set(
    db
      .prepare(`SELECT barcode FROM product_units WHERE barcode IS NOT NULL`)
      .all()
      .map((u) => u.barcode)
  );

  const insertProduct = db.prepare(`
        INSERT INTO products (name, latinName, costPrice, quantity, unit_id, tax_id, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
  const insertBaseProductUnit = db.prepare(`
        INSERT INTO product_units (product_id, unit_name, conversion_factor, is_base, sale_price)
        VALUES (?, ?, 1, 1, ?)
      `);
  // Additional (non-base) selling units — same table, is_base = 0, and
  // these DO carry their own optional barcode (unlike the base unit, whose
  // barcode still lives on product_barcodes, untouched by this).
  const insertAdditionalProductUnit = db.prepare(`
        INSERT INTO product_units (product_id, unit_name, conversion_factor, is_base, sale_price, barcode)
        VALUES (?, ?, ?, 0, ?, ?)
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
        SET total_rows = ?, created_count = ?, skipped_products_count = ?, skipped_barcodes_count = ?, skipped_units_count = ?
        WHERE id = ?
      `);

  const created = [];
  const skippedProducts = [];
  const skippedBarcodes = [];
  const skippedUnits = [];
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

  // ---- Header-name lookup instead of fixed column indices ----
  // Lets columns move around and, critically, lets the additional-unit
  // groups (unit2_*, unit3_*, ...) be discovered by name rather than
  // assumed to live at one hardcoded position.
  const headerRow = sheet.getRow(1);
  const headerMap = {};
  headerRow.eachCell((cell, colNumber) => {
    const header = String(cell.value || "").trim();
    if (header) headerMap[header] = colNumber;
  });

  const cellByHeader = (row, header) => {
    const col = headerMap[header];
    return col ? row.getCell(col).value : null;
  };

  // Discover every "unitN_name" header present, sorted by N, and pair each
  // with its sibling unitN_conversion_factor/unitN_price/unitN_barcode
  // columns (any of which may be absent — treated as blank if so).
  const unitGroupPattern = /^unit(\d+)_name$/;
  const additionalUnitGroups = Object.keys(headerMap)
    .map((header) => header.match(unitGroupPattern))
    .filter(Boolean)
    .map((match) => Number(match[1]))
    .sort((a, b) => a - b)
    .map((n) => ({
      n,
      nameHeader: `unit${n}_name`,
      factorHeader: `unit${n}_conversion_factor`,
      priceHeader: `unit${n}_price`,
      barcodeHeader: `unit${n}_barcode`,
    }));

  const transaction = db.transaction(() => {
    const importResult = insertImport.run(fileName);
    const importId = importResult.lastInsertRowid;

    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const name = String(cellByHeader(row, "name") || "").trim();
      if (!name) return;

      totalRows++;

      const latinName = String(cellByHeader(row, "latinName") || "").trim();
      const unitCode = String(cellByHeader(row, "unit_code") || "").trim();
      const taxName = stripTaxLabel(cellByHeader(row, "tax"));
      const barcodesRaw = String(cellByHeader(row, "barcodes") || "");

      const rawType = String(cellByHeader(row, "type") || "")
        .trim()
        .toLowerCase();

      // Blank defaults to 'normal'; anything present but not one of the
      // two known values is rejected outright — type drives downstream
      // stock/expiry behavior and is immutable once created, so a silent
      // guess here (the way tax falls back to "no tax" when unmatched)
      // would be the wrong failure mode.
      let type = "normal";
      if (rawType) {
        if (rawType !== "normal" && rawType !== "service") {
          const reason = `Invalid type "${rawType}" (must be normal or service)`;
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
        type = rawType;
      }

      const isService = type === "service";

      const costPriceCell = parseNumberCell(cellByHeader(row, "costPrice"));
      const priceCell = parseNumberCell(cellByHeader(row, "price"));
      const quantityCell = parseNumberCell(cellByHeader(row, "quantity"));

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
      // A service has no physical stock — quantity from the sheet is
      // ignored for it rather than trusted, same rule the product form
      // enforces on create/update.
      const quantity = isService ? 0 : quantityCell.value;

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
        taxId,
        type
      );
      const productId = result.lastInsertRowid;

      insertBaseProductUnit.run(productId, baseUnitName, price);

      // Per-row, case-insensitive — catches a unit name colliding with the
      // base unit OR with another additional unit on the SAME product.
      // Never checked against other products' unit names — "Box" on
      // Product A and "Box" on Product B are unrelated and both fine.
      const seenUnitNames = new Set([baseUnitName.toLowerCase()]);

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

      // ---- Additional selling units — best-effort per group. An invalid,
      // duplicate-name, or duplicate-barcode unit is skipped and logged;
      // it never blocks the product itself, since these are optional
      // extras on top of the base unit that's already been created above. ----
      for (const group of additionalUnitGroups) {
        const unitName = String(
          cellByHeader(row, group.nameHeader) || ""
        ).trim();
        if (!unitName) continue; // group left blank for this row — fine

        const factorCell = parseNumberCell(
          cellByHeader(row, group.factorHeader)
        );
        const unitPriceCell = parseNumberCell(
          cellByHeader(row, group.priceHeader)
        );
        const unitBarcode = String(
          cellByHeader(row, group.barcodeHeader) || ""
        ).trim();

        if (seenUnitNames.has(unitName.toLowerCase())) {
          const reason = `Duplicate unit name "${unitName}" for this product`;
          skippedUnits.push({ row: rowNumber, name, reason });
          insertImportItem.run(
            importId,
            rowNumber,
            "skipped_unit",
            productId,
            name,
            null,
            reason
          );
          continue;
        }

        if (!factorCell.valid || factorCell.value <= 0) {
          const reason = `Invalid conversion_factor for ${group.nameHeader}`;
          skippedUnits.push({ row: rowNumber, name, reason });
          insertImportItem.run(
            importId,
            rowNumber,
            "skipped_unit",
            productId,
            name,
            null,
            reason
          );
          continue;
        }

        if (!unitPriceCell.valid) {
          const reason = `Invalid price for ${group.nameHeader}`;
          skippedUnits.push({ row: rowNumber, name, reason });
          insertImportItem.run(
            importId,
            rowNumber,
            "skipped_unit",
            productId,
            name,
            null,
            reason
          );
          continue;
        }

        if (unitBarcode && existingUnitBarcodes.has(unitBarcode)) {
          const reason = `Barcode already used by another unit (${group.nameHeader})`;
          skippedUnits.push({ row: rowNumber, name, reason });
          insertImportItem.run(
            importId,
            rowNumber,
            "skipped_unit",
            productId,
            name,
            unitBarcode,
            reason
          );
          continue;
        }

        insertAdditionalProductUnit.run(
          productId,
          unitName,
          factorCell.value,
          unitPriceCell.value,
          unitBarcode || null
        );

        seenUnitNames.add(unitName.toLowerCase());

        if (unitBarcode) {
          existingUnitBarcodes.add(unitBarcode);
        }
      }

      createProductMovement(db, {
        product_id: productId,
        reference_id: productId,
        reference_type: "import",
        action: "create",
        type: "in",
        quantity,
        enterPrice: costPrice,
        base_unit_name: baseUnitName,
        unit_name: baseUnitName,
        conversion_factor: 1,
      });

      created.push({ row: rowNumber, name, id: productId });
    });

    updateImportCounts.run(
      totalRows,
      created.length,
      skippedProducts.length,
      skippedBarcodes.length,
      skippedUnits.length,
      importId
    );

    return importId;
  });

  const importId = transaction();

  return { importId, created, skippedProducts, skippedBarcodes, skippedUnits };
}
