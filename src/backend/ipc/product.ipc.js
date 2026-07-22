import { ipcMain, dialog } from "electron";
import fs from "fs";
import db from "../db";
import createProductMovement from "../utils/createPorductMovment";
import {
  generateProductImportTemplate,
  parseProductImport,
} from "../utils/productImport";

export default function registerProductIPC() {
  ipcMain.handle("create-product", (event, data) => {
    if (!data.name || !data.unit_id) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const createProductTxn = db.transaction((data) => {
      const result = db
        .prepare(
          `
          INSERT INTO products (name, latinName, costPrice, quantity, unit_id, tax_id, logo)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `
        )
        .run(
          data.name,
          data.latinName,
          data.costPrice,
          data.quantity,
          data.unit_id,
          data.tax_id || null,
          data.logo
        );

      const productId = result.lastInsertRowid;

      // Resolve the measurement unit's display name to seed the base product_units row
      const unitRow = db
        .prepare(`SELECT name FROM unit WHERE id = ?`)
        .get(data.unit_id);
      const baseUnitName = unitRow?.name || "Unit";

      db.prepare(
        `
        INSERT INTO product_units (product_id, unit_name, conversion_factor, is_base, sale_price)
        VALUES (?, ?, 1, 1, ?)
      `
      ).run(productId, baseUnitName, data.salePrice ?? 0);

      // Insert any additional (non-base) selling units the user defined
      const insertUnit = db.prepare(
        `
        INSERT INTO product_units (product_id, unit_name, conversion_factor, is_base, sale_price)
        VALUES (?, ?, ?, 0, ?)
      `
      );

      for (const unit of data.productUnits || []) {
        if (!unit.unit_name || !unit.conversion_factor) continue;
        insertUnit.run(
          productId,
          unit.unit_name,
          unit.conversion_factor,
          unit.sale_price ?? 0
        );
      }

      createProductMovement(db, {
        product_id: productId,
        reference_id: productId,
        reference_type: "products",
        action: "create",
        type: "in",
        quantity: data.quantity,
        enterPrice: data.costPrice,
      });

      return productId;
    });

    const productId = createProductTxn(data);

    return { success: true, id: productId };
  });

  ipcMain.handle("update-product", (event, data) => {
    if (!data.name || !data.unit_id || data.costPrice <= 0) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }

    const updateProductTxn = db.transaction((data) => {
      db.prepare(
        `
        UPDATE products
        SET name=?, latinName=?, costPrice=?, quantity=?, unit_id=?, tax_id=?, logo=?
        WHERE id=?
      `
      ).run(
        data.name,
        data.latinName,
        data.costPrice,
        data.quantity,
        data.unit_id,
        data.tax_id || null,
        data.logo,
        data.id
      );

      if (data.quantity !== data.oldQuantity) {
        const delta = data.quantity - data.oldQuantity;
        createProductMovement(db, {
          product_id: data.id,
          reference_id: data.id,
          reference_type: "products",
          action: "update",
          type: delta > 0 ? "in" : "out",
          quantity: Math.abs(delta),
          enterPrice: data.costPrice,
        });
      }

      // Keep the base unit's sale price in sync with the "Base Sale Price" field
      db.prepare(
        `
        UPDATE product_units
        SET sale_price = ?
        WHERE product_id = ? AND is_base = 1
      `
      ).run(data.salePrice ?? 0, data.id);

      // Sync additional (non-base) selling units: update existing, insert new, delete removed
      const existingUnits = db
        .prepare(
          `SELECT id FROM product_units WHERE product_id = ? AND is_base = 0`
        )
        .all(data.id);

      const incomingUnits = data.productUnits || [];
      const incomingIds = new Set(
        incomingUnits.filter((u) => u.id).map((u) => u.id)
      );

      const deleteUnit = db.prepare(`DELETE FROM product_units WHERE id = ?`);
      for (const existing of existingUnits) {
        if (!incomingIds.has(existing.id)) {
          deleteUnit.run(existing.id);
        }
      }

      const updateUnit = db.prepare(
        `
        UPDATE product_units
        SET unit_name = ?, conversion_factor = ?, sale_price = ?
        WHERE id = ?
      `
      );
      const insertUnit = db.prepare(
        `
        INSERT INTO product_units (product_id, unit_name, conversion_factor, is_base, sale_price)
        VALUES (?, ?, ?, 0, ?)
      `
      );

      for (const unit of incomingUnits) {
        if (!unit.unit_name || !unit.conversion_factor) continue;

        if (unit.id) {
          updateUnit.run(
            unit.unit_name,
            unit.conversion_factor,
            unit.sale_price ?? 0,
            unit.id
          );
        } else {
          insertUnit.run(
            data.id,
            unit.unit_name,
            unit.conversion_factor,
            unit.sale_price ?? 0
          );
        }
      }
    });

    updateProductTxn(data);

    return { success: true };
  });

  ipcMain.handle("get-products", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const search = (params.search || "").trim();

    let whereClause = "";
    const queryParams = [];

    if (search) {
      whereClause = `
      WHERE
        products.name LIKE ?
      `;

      const keyword = `%${search}%`;

      queryParams.push(keyword);
    }

    const data = db
      .prepare(
        `
      SELECT
        products.*,
        unit.name AS unit_name,
        unit.code AS unit_code,
        taxes.name AS tax_name,
        taxes.rate AS tax_rate,
        (
          SELECT sale_price FROM product_units
          WHERE product_units.product_id = products.id AND product_units.is_base = 1
          LIMIT 1
        ) AS salePrice,
        (
          SELECT COUNT(*) FROM product_units
          WHERE product_units.product_id = products.id AND product_units.is_base = 0
        ) AS unitCount
  
      FROM products
  
      LEFT JOIN unit
        ON unit.id = products.unit_id
  
      LEFT JOIN taxes
        ON taxes.id = products.tax_id
  
      ${whereClause}
  
      ORDER BY products.id DESC
  
      LIMIT ? OFFSET ?
      `
      )
      .all(...queryParams, limit, offset);

    const countQuery = db.prepare(`
      SELECT COUNT(*) AS total
      FROM products
      LEFT JOIN unit
        ON unit.id = products.unit_id
      ${whereClause}
  `);

    const { total } = countQuery.get(...queryParams);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });

  ipcMain.handle("get-product", (event, id) => {
    const product = db
      .prepare(
        `
        SELECT 
          products.*,
          unit.name as unit_name,
          unit.code as unit_code,
          taxes.name as tax_name,
          taxes.rate as tax_rate
        FROM products
        LEFT JOIN unit ON unit.id = products.unit_id
        LEFT JOIN taxes ON taxes.id = products.tax_id
        WHERE products.id = ?
      `
      )
      .get(id);

    if (!product) return null;

    const productUnits = db
      .prepare(
        `
        SELECT id, unit_name, conversion_factor, is_base, sale_price
        FROM product_units
        WHERE product_id = ?
        ORDER BY is_base DESC, id ASC
      `
      )
      .all(id);

    const baseUnit = productUnits.find((u) => u.is_base);

    return {
      ...product,
      salePrice: baseUnit?.sale_price ?? 0,
      productUnits,
    };
  });

  ipcMain.handle("delete-product", (event, id) => {
    try {
      const transaction = db.transaction(() => {
        const usedInPurchase = db
          .prepare(
            `SELECT COUNT(*) as count FROM purchase_invoice_items WHERE product_id = ?`
          )
          .get(id);
        const usedInSales = db
          .prepare(
            `SELECT COUNT(*) as count FROM sales_invoice_items WHERE product_id = ?`
          )
          .get(id);

        if (usedInPurchase.count > 0 || usedInSales.count > 0) {
          throw new Error("Product is used in invoices");
        }

        db.prepare(`DELETE FROM product_units WHERE product_id = ?`).run(id);
        db.prepare(`DELETE FROM product_barcodes WHERE product_id = ?`).run(id);
        db.prepare(`DELETE FROM product_movements WHERE product_id = ?`).run(
          id
        );
        db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
      });

      transaction();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("get-product-by-barcode", (event, barcode) => {
    const row = db
      .prepare(
        `
      SELECT p.*
      FROM product_barcodes pb
      JOIN products p ON p.id = pb.product_id
      WHERE pb.barcode = ?
    `
      )
      .get(barcode);

    return row;
  });

  ipcMain.handle("get-product-movements", (event, params = {}) => {
    const product_id = typeof params === "object" ? params.product_id : params; // backward-compat: still accept a bare id

    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    let whereClause = "";
    const queryParams = [];

    if (product_id) {
      whereClause = `WHERE product_movements.product_id = ?`;
      queryParams.push(product_id);
    }

    const data = db
      .prepare(
        `
        SELECT 
          product_movements.*,
          products.name as product_name,
          unit.code as unit_code
        FROM product_movements
        LEFT JOIN products ON products.id = product_movements.product_id
        LEFT JOIN unit ON unit.id = products.unit_id
        ${whereClause}
        ORDER BY product_movements.createdAt DESC, product_movements.id DESC
        LIMIT ? OFFSET ?
        `
      )
      .all(...queryParams, limit, offset);

    const { total } = db
      .prepare(
        `
        SELECT COUNT(*) AS total
        FROM product_movements
        ${whereClause}
        `
      )
      .get(...queryParams);

    return {
      data,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });

  ipcMain.handle("download-product-import-template", async () => {
    const buffer = await generateProductImportTemplate(db);
    const { filePath, canceled } = await dialog.showSaveDialog({
      title: "Save Product Import Template",
      defaultPath: "product-import-template.xlsx",
      filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    fs.writeFileSync(filePath, buffer);
    return { success: true, filePath };
  });

  ipcMain.handle("import-products", async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      title: "Select Product Import File",
      filters: [{ name: "Excel Files", extensions: ["xlsx"] }],
      properties: ["openFile"],
    });
    if (canceled || !filePaths[0]) return { success: false, canceled: true };

    try {
      const fileName = filePaths[0].split(/[\\/]/).pop();
      const summary = await parseProductImport(db, filePaths[0], fileName);

      return { success: true, ...summary };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("get-product-imports", () => {
    const imports = db
      .prepare(`SELECT * FROM product_imports ORDER BY id DESC`)
      .all();

    const statsRow = db
      .prepare(
        `
        SELECT
          COUNT(*) AS total_imports,
          COALESCE(SUM(created_count), 0) AS total_created,
          COALESCE(SUM(skipped_products_count), 0) AS total_skipped_products,
          COALESCE(SUM(skipped_barcodes_count), 0) AS total_skipped_barcodes
        FROM product_imports
      `
      )
      .get();

    return {
      data: imports,
      stats: {
        total_imports: statsRow?.total_imports || 0,
        total_created: statsRow?.total_created || 0,
        total_skipped:
          (statsRow?.total_skipped_products || 0) +
          (statsRow?.total_skipped_barcodes || 0),
      },
    };
  });

  ipcMain.handle("get-product-import-items", (event, importId) => {
    return db
      .prepare(
        `SELECT * FROM product_import_items WHERE import_id = ? ORDER BY row_number ASC`
      )
      .all(importId);
  });
}
