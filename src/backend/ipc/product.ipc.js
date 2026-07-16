import { ipcMain, dialog } from "electron";
import fs from "fs";
import db from "../db";
import createProductMovement from "../utils/createPorductMovment";
import {
  generateProductImportTemplate,
  parseProductImport,
} from "../utils/productImport";

export default function registerProductIPC() {
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
        unit.code AS unit_code
      FROM products

      LEFT JOIN unit
        ON unit.id = products.unit_id

      ${whereClause}

      ORDER BY products.id DESC

      LIMIT ? OFFSET ?
      `,
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
    return db
      .prepare(
        ` SELECT 
        products.*,
        unit.name as unit_name,
        unit.code as unit_code
      FROM products
      LEFT JOIN unit ON unit.id = products.unit_id WHERE id=?`,
      )
      .get(id);
  });

  ipcMain.handle("create-product", (event, data) => {
    if (!data.name || !data.unit_id) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const result = db
      .prepare(
        `
      INSERT INTO products (name, latinName, costPrice, price, quantity, unit_id, logo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        data.name,
        data.latinName,
        data.costPrice,
        data.price,
        data.quantity,
        data.unit_id,
        data.logo,
      );
    createProductMovement(db, {
      product_id: result.lastInsertRowid,
      reference_id: result.lastInsertRowid,
      reference_type: "products",
      action: "create",
      type: "in",
      quantity: data.quantity,
      enterPrice: data.costPrice,
    });
    return { success: true, id: result.lastInsertRowid };
  });

  ipcMain.handle("update-product", (event, data) => {
    if (!data.name || !data.unit_id || data.costPrice <= 0 || data.price <= 0) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    db.prepare(
      `
      UPDATE products
      SET name=?, latinName=?, costPrice=?, price=?, quantity=?, unit_id=?, logo=?
      WHERE id=?
    `,
    ).run(
      data.name,
      data.latinName,
      data.costPrice,
      data.price,
      data.quantity,
      data.unit_id,
      data.logo,
      data.id,
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
    return { success: true };
  });

  ipcMain.handle("delete-product", (event, id) => {
    try {
      const transaction = db.transaction(() => {
        const usedInPurchase = db
          .prepare(
            `SELECT COUNT(*) as count FROM purchase_invoice_items WHERE product_id = ?`,
          )
          .get(id);

        const usedInSales = db
          .prepare(
            `SELECT COUNT(*) as count FROM sales_invoice_items WHERE product_id = ?`,
          )
          .get(id);

        if (usedInPurchase.count > 0 || usedInSales.count > 0) {
          throw new Error("Product is used in invoices");
        }

        db.prepare(`DELETE FROM product_barcodes WHERE product_id = ?`).run(id);
        db.prepare(`DELETE FROM product_movements WHERE product_id = ?`).run(
          id,
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
    `,
      )
      .get(barcode);

    return row;
  });

  ipcMain.handle("get-product-movements", (event, product_id) => {
    if (product_id) {
      return db
        .prepare(
          `
        SELECT 
          product_movements.*,
          products.name as product_name,
          unit.code as unit_code
        FROM product_movements
        LEFT JOIN products ON products.id = product_movements.product_id
        LEFT JOIN unit ON unit.id = products.unit_id
        WHERE product_movements.product_id = ?
        ORDER BY product_movements.createdAt DESC, product_movements.id DESC
        `,
        )
        .all(product_id);
    }

    return db
      .prepare(
        `
        SELECT 
          product_movements.*,
          products.name as product_name,
          unit.code as unit_code
        FROM product_movements
        LEFT JOIN products ON products.id = product_movements.product_id
        LEFT JOIN unit ON unit.id = products.unit_id
        ORDER BY product_movements.createdAt DESC, product_movements.id DESC
        `,
      )
      .all();
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
      `,
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
        `SELECT * FROM product_import_items WHERE import_id = ? ORDER BY row_number ASC`,
      )
      .all(importId);
  });
}
