const { ipcMain } = require("electron");
import db from "../db";

function assertProductIsPhysical(productId, errorCode) {
  const product = db
    .prepare(`SELECT id, type FROM products WHERE id = ?`)
    .get(productId);

  if (!product) {
    throw new Error("PRODUCT_NOT_FOUND");
  }
  if (product.type === "service") {
    throw new Error(errorCode);
  }

  return product;
}

function validateBomItems(items, productId) {
  if (!Array.isArray(items) || items.length === 0) {
    return "BOM_ITEMS_REQUIRED";
  }

  const seen = new Set();
  for (const item of items) {
    if (
      !item.raw_material_product_id ||
      !item.quantity ||
      Number(item.quantity) <= 0
    ) {
      return "INVALID_BOM_ITEM";
    }
    if (Number(item.raw_material_product_id) === Number(productId)) {
      return "RAW_MATERIAL_CANNOT_BE_OUTPUT_PRODUCT";
    }
    if (seen.has(item.raw_material_product_id)) {
      return "DUPLICATE_RAW_MATERIAL_IN_BOM";
    }
    seen.add(item.raw_material_product_id);

    try {
      assertProductIsPhysical(
        item.raw_material_product_id,
        "SERVICE_PRODUCTS_CANNOT_BE_RAW_MATERIALS",
      );
    } catch (err) {
      return err.message;
    }
  }

  return null;
}

function insertBomItems(bomId, items) {
  const insertItem = db.prepare(
    `INSERT INTO bom_items
       (bom_id, raw_material_product_id, unit_id, unit_name, unit_conversion_factor, quantity)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  for (const item of items) {
    let unitId = null;
    let unitName = null;
    let conversionFactor = 1;

    if (item.unit_id) {
      const unitRow = db
        .prepare(
          `SELECT id, unit_name, conversion_factor
           FROM product_units
           WHERE id = ? AND product_id = ?`,
        )
        .get(item.unit_id, item.raw_material_product_id);

      if (!unitRow) {
        throw new Error("INVALID_UNIT_FOR_RAW_MATERIAL");
      }

      unitId = unitRow.id;
      unitName = unitRow.unit_name;
      conversionFactor = unitRow.conversion_factor;
    }

    insertItem.run(
      bomId,
      item.raw_material_product_id,
      unitId,
      unitName,
      conversionFactor,
      Number(item.quantity),
    );
  }
}

export default function registerBomsIPC() {
  // CREATE
  ipcMain.handle("create-bom", (event, data) => {
    const productId = data.product_id;

    if (!productId) {
      return { success: false, error: "MISSING_PRODUCT_ID" };
    }

    try {
      assertProductIsPhysical(
        productId,
        "SERVICE_PRODUCTS_CANNOT_BE_MANUFACTURED",
      );
    } catch (err) {
      return { success: false, error: err.message };
    }

    const itemsError = validateBomItems(data.items, productId);
    if (itemsError) {
      return { success: false, error: itemsError };
    }

    try {
      const transaction = db.transaction(() => {
        const existingCount = db
          .prepare(`SELECT COUNT(*) AS cnt FROM boms WHERE product_id = ?`)
          .get(productId).cnt;

        const isFirstBom = existingCount === 0;
        const isDefault = isFirstBom ? 1 : data.is_default ? 1 : 0;

        if (isDefault === 1 && !isFirstBom) {
          db.prepare(
            `UPDATE boms SET is_default = 0 WHERE product_id = ? AND is_default = 1`,
          ).run(productId);
        }

        const bomName =
          data.name && data.name.trim() ? data.name.trim() : "Standard";

        const insertBom = db
          .prepare(
            `INSERT INTO boms (product_id, name, is_default, notes)
           VALUES (?, ?, ?, ?)`,
          )
          .run(productId, bomName, isDefault, data.notes || null);

        const bomId = insertBom.lastInsertRowid;

        insertBomItems(bomId, data.items);

        return bomId;
      });

      const bomId = transaction();

      return { success: true, id: bomId };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  // GET (by product)
  ipcMain.handle("get-boms", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const productId = params.product_id || null;
    const relatedProductId = params.related_product_id || null;
    const search = params.search ? params.search.trim() : null;

    try {
      const whereClauses = [];
      const whereParams = [];

      if (productId) {
        whereClauses.push(`b.product_id = ?`);
        whereParams.push(productId);
      }

      if (relatedProductId) {
        whereClauses.push(
          `EXISTS (SELECT 1 FROM bom_items bi WHERE bi.bom_id = b.id AND bi.raw_material_product_id = ?)`,
        );
        whereParams.push(relatedProductId);
      }

      if (search) {
        whereClauses.push(`b.name LIKE ?`);
        whereParams.push(`%${search}%`);
      }

      const whereSql = whereClauses.length
        ? `WHERE ${whereClauses.join(" AND ")}`
        : "";

      const { total } = db
        .prepare(`SELECT COUNT(*) AS total FROM boms b ${whereSql}`)
        .get(...whereParams);

      const boms = db
        .prepare(
          `SELECT
           b.id,
           b.product_id,
           p.name AS product_name,
           p.code AS product_code,
           b.name,
           b.is_default,
           b.notes,
           b.createdAt,
           b.updatedAt,
           COALESCE((
             SELECT SUM(bi.quantity * bi.unit_conversion_factor * rp.costPrice)
             FROM bom_items bi
             JOIN products rp ON rp.id = bi.raw_material_product_id
             WHERE bi.bom_id = b.id
           ), 0) AS estimated_cost
         FROM boms b
         JOIN products p ON p.id = b.product_id
         ${whereSql}
         ORDER BY b.is_default DESC, b.createdAt ASC
         LIMIT ? OFFSET ?`,
        )
        .all(...whereParams, limit, offset);

      if (boms.length === 0) {
        return {
          success: true,
          data: [],
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        };
      }

      const bomIds = boms.map((b) => b.id);
      const placeholders = bomIds.map(() => "?").join(",");

      const items = db
        .prepare(
          `SELECT
           bi.id, bi.bom_id, bi.raw_material_product_id,
           p.name AS raw_material_name, p.code AS raw_material_code, p.costPrice AS raw_material_cost_price,
           bi.unit_id, bi.unit_name, bi.unit_conversion_factor, bi.quantity,
           (bi.quantity * bi.unit_conversion_factor * p.costPrice) AS line_estimated_cost
         FROM bom_items bi
         JOIN products p ON p.id = bi.raw_material_product_id
         WHERE bi.bom_id IN (${placeholders})
         ORDER BY bi.id ASC`,
        )
        .all(...bomIds);

      const itemsByBom = new Map();
      for (const item of items) {
        if (!itemsByBom.has(item.bom_id)) itemsByBom.set(item.bom_id, []);
        itemsByBom.get(item.bom_id).push(item);
      }

      const result = boms.map((bom) => ({
        ...bom,
        items: itemsByBom.get(bom.id) || [],
      }));

      return {
        success: true,
        data: result,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("get-bom", (event, id) => {
    if (!id) {
      return { success: false, error: "MISSING_BOM_ID" };
    }

    try {
      const bom = db
        .prepare(
          `SELECT
         b.id,
         b.product_id,
         p.name AS product_name,
         p.code AS product_code,
         b.name,
         b.is_default,
         b.notes,
         b.createdAt,
         b.updatedAt
       FROM boms b
       JOIN products p ON p.id = b.product_id
       WHERE b.id = ?`,
        )
        .get(id);

      if (!bom) {
        return { success: false, error: "BOM_NOT_FOUND" };
      }

      const items = db
        .prepare(
          `SELECT
         bi.id,
         bi.bom_id,
         bi.raw_material_product_id,
         p.name AS raw_material_name,
         p.code AS raw_material_code,
         p.costPrice AS raw_material_cost_price,
         bi.unit_id,
         bi.unit_name,
         bi.unit_conversion_factor,
         bi.quantity,
         (bi.quantity * bi.unit_conversion_factor * p.costPrice) AS line_estimated_cost
       FROM bom_items bi
       JOIN products p ON p.id = bi.raw_material_product_id
       WHERE bi.bom_id = ?
       ORDER BY bi.id ASC`,
        )
        .all(id);

      // Batch-fetch each raw material's full unit list so the edit form's
      // unit dropdown is populated immediately, without re-selecting the product.
      if (items.length > 0) {
        const productIds = [
          ...new Set(items.map((i) => i.raw_material_product_id)),
        ];
        const placeholders = productIds.map(() => "?").join(",");

        const allUnits = db
          .prepare(
            `SELECT id, product_id, unit_name, conversion_factor, is_base, sale_price, barcode
         FROM product_units
         WHERE product_id IN (${placeholders})`,
          )
          .all(...productIds);

        const unitsByProduct = new Map();
        for (const u of allUnits) {
          if (!unitsByProduct.has(u.product_id)) {
            unitsByProduct.set(u.product_id, []);
          }
          unitsByProduct.get(u.product_id).push(u);
        }

        for (const item of items) {
          item.available_units =
            unitsByProduct.get(item.raw_material_product_id) || [];
        }
      }

      const estimatedCost = items.reduce(
        (sum, item) => sum + Number(item.line_estimated_cost || 0),
        0,
      );

      return {
        success: true,
        data: { ...bom, items, estimated_cost: estimatedCost },
      };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });
  // UPDATE
  ipcMain.handle("update-bom", (event, data) => {
    const bomId = data.id;

    if (!bomId) {
      return { success: false, error: "MISSING_BOM_ID" };
    }

    const existingBom = db
      .prepare(`SELECT id, product_id FROM boms WHERE id = ?`)
      .get(bomId);

    if (!existingBom) {
      return { success: false, error: "BOM_NOT_FOUND" };
    }

    const productId = existingBom.product_id;

    try {
      assertProductIsPhysical(
        productId,
        "SERVICE_PRODUCTS_CANNOT_BE_MANUFACTURED",
      );
    } catch (err) {
      return { success: false, error: err.message };
    }

    const itemsError = validateBomItems(data.items, productId);
    if (itemsError) {
      return { success: false, error: itemsError };
    }

    try {
      const transaction = db.transaction(() => {
        if (data.is_default === true) {
          db.prepare(
            `UPDATE boms SET is_default = 0 WHERE product_id = ? AND id != ? AND is_default = 1`,
          ).run(productId, bomId);
        }

        const bomName =
          data.name && data.name.trim() ? data.name.trim() : "Standard";

        if (data.is_default === true) {
          db.prepare(
            `UPDATE boms
           SET name = ?, notes = ?, is_default = 1, updatedAt = datetime('now')
           WHERE id = ?`,
          ).run(bomName, data.notes || null, bomId);
        } else {
          db.prepare(
            `UPDATE boms
           SET name = ?, notes = ?, updatedAt = datetime('now')
           WHERE id = ?`,
          ).run(bomName, data.notes || null, bomId);
        }

        db.prepare(`DELETE FROM bom_items WHERE bom_id = ?`).run(bomId);
        insertBomItems(bomId, data.items);
      });

      transaction();

      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  // DELETE
  ipcMain.handle("delete-bom", (event, id) => {
    const existingBom = db
      .prepare(`SELECT id, product_id, is_default FROM boms WHERE id = ?`)
      .get(id);

    if (!existingBom) {
      return { success: false, error: "BOM_NOT_FOUND" };
    }

    try {
      const transaction = db.transaction(() => {
        db.prepare(`DELETE FROM boms WHERE id = ?`).run(id);

        // If the deleted BOM was the default, promote the oldest remaining one.
        if (existingBom.is_default === 1) {
          const nextBom = db
            .prepare(
              `SELECT id FROM boms WHERE product_id = ? ORDER BY createdAt ASC LIMIT 1`,
            )
            .get(existingBom.product_id);

          if (nextBom) {
            db.prepare(`UPDATE boms SET is_default = 1 WHERE id = ?`).run(
              nextBom.id,
            );
          }
        }
      });

      transaction();

      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });
}
