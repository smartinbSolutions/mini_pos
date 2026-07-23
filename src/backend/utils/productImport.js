import ExcelJS from "exceljs";
import createProductMovement from "./createPorductMovment";

export async function generateProductImportTemplate(db) {
  const units = db
    .prepare(`SELECT code FROM unit WHERE code IS NOT NULL`)
    .all()
    .map((u) => u.code);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Products");
  const unitsSheet = workbook.addWorksheet("Units");
  unitsSheet.state = "veryHidden";

  units.forEach((code, i) => {
    unitsSheet.getCell(`A${i + 1}`).value = code;
  });

  sheet.columns = [
    { header: "name", key: "name", width: 24 },
    { header: "latinName", key: "latinName", width: 24 },
    { header: "unit_code", key: "unit_code", width: 14 },
    { header: "costPrice", key: "costPrice", width: 14 },
    { header: "price", key: "price", width: 14 },
    { header: "quantity", key: "quantity", width: 14 },
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

  return workbook.xlsx.writeBuffer();
}

export async function parseProductImport(db, filePath, fileName) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const sheet = workbook.worksheets[0];

  const unitByCode = new Map(
    db
      .prepare(`SELECT id, code FROM unit`)
      .all()
      .map((u) => [u.code, u.id])
  );
  const existingBarcodes = new Set(
    db
      .prepare(`SELECT barcode FROM product_barcodes`)
      .all()
      .map((b) => b.barcode)
  );

  const insertProduct = db.prepare(`
        INSERT INTO products (name, latinName, costPrice, price, quantity, unit_id)
        VALUES (?, ?, ?, ?, ?, ?)
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
      const costPrice = Number(row.getCell(4).value || 0);
      const price = Number(row.getCell(5).value || 0);
      const quantity = Number(row.getCell(6).value || 0);
      const barcodesRaw = String(row.getCell(7).value || "");

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

      const unitId = unitByCode.get(unitCode) || null;
      const result = insertProduct.run(
        name,
        latinName,
        costPrice,
        price,
        quantity,
        unitId
      );
      const productId = result.lastInsertRowid;

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
