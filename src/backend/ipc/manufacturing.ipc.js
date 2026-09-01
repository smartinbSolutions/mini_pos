const { ipcMain } = require("electron");
import db from "../db";
import createProductMovement from "../utils/createPorductMovment";
import { buildDefaultInvoiceName } from "../utils/helpers";

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

export default function registerManufacturingOrdersIPC() {
  // CREATE
  ipcMain.handle("create-manufacturing-order", (event, data) => {
    try {
      const transaction = db.transaction(() => {
        if (
          !data.output_product_id ||
          !data.output_quantity ||
          Number(data.output_quantity) <= 0 ||
          !Array.isArray(data.items) ||
          data.items.length === 0
        ) {
          throw new Error("ERROR ENTER DATA");
        }

        const dateOnly = (data.date || new Date().toISOString()).slice(0, 10);
        const time = new Date().toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        assertProductIsPhysical(
          data.output_product_id,
          "SERVICE_PRODUCTS_CANNOT_BE_MANUFACTURED",
        );

        const outputFactor = Number(data.output_unit_conversion_factor || 1);
        const outputQuantity = Number(data.output_quantity);
        const outputBaseQuantity = outputQuantity * outputFactor;

        // ---- Raw material lines — recomputed from raw inputs only ----
        const seen = new Set();
        const preparedItems = [];
        let rawMaterialCost = 0;

        for (const item of data.items) {
          if (
            !item.raw_material_product_id ||
            !item.quantity ||
            Number(item.quantity) <= 0
          ) {
            throw new Error("INVALID_MANUFACTURING_ITEM");
          }
          if (
            Number(item.raw_material_product_id) ===
            Number(data.output_product_id)
          ) {
            throw new Error("RAW_MATERIAL_CANNOT_BE_OUTPUT_PRODUCT");
          }
          if (seen.has(item.raw_material_product_id)) {
            throw new Error("DUPLICATE_RAW_MATERIAL_IN_ORDER");
          }
          seen.add(item.raw_material_product_id);

          const rawProduct = db
            .prepare(
              `SELECT id, type, quantity, costPrice FROM products WHERE id = ?`,
            )
            .get(item.raw_material_product_id);

          if (!rawProduct) {
            throw new Error("PRODUCT_NOT_FOUND");
          }
          if (rawProduct.type === "service") {
            throw new Error("SERVICE_PRODUCTS_CANNOT_BE_RAW_MATERIALS");
          }

          const factor = Number(item.unit_conversion_factor || 1);
          const quantity = Number(item.quantity);
          const baseQuantity = quantity * factor;

          // Hard stock check — manufacturing can never consume more than
          // what's physically on hand, regardless of allow_negative_stock
          // (that setting governs selling to customers, not production input).
          if (Number(rawProduct.quantity) < baseQuantity) {
            throw new Error("INSUFFICIENT_RAW_MATERIAL_STOCK");
          }

          const unitCostSnapshot = Number(rawProduct.costPrice || 0);
          const lineCost = Number((baseQuantity * unitCostSnapshot).toFixed(2));

          rawMaterialCost += lineCost;

          preparedItems.push({
            raw_material_product_id: item.raw_material_product_id,
            quantity,
            unit_name: item.unit_name || null,
            unit_conversion_factor: factor,
            baseQuantity,
            unitCostSnapshot,
            lineCost,
          });
        }

        rawMaterialCost = Number(rawMaterialCost.toFixed(2));
        const laborCost = Number(data.labor_cost || 0);
        const overheadCost = Number(data.overhead_cost || 0);
        const totalCost = Number(
          (rawMaterialCost + laborCost + overheadCost).toFixed(2),
        );
        const unitCost = Number(
          (outputBaseQuantity > 0 ? totalCost / outputBaseQuantity : 0).toFixed(
            2,
          ),
        );

        // ---- Insert header ----
        const orderResult = db
          .prepare(
            `
            INSERT INTO manufacturing_orders
            (
              order_name, bom_id, output_product_id,
              output_quantity, output_unit_name, output_unit_conversion_factor,
              labor_cost, overhead_cost, raw_material_cost, total_cost, unit_cost,
              date, description, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
          )
          .run(
            data.order_name?.trim() || null,
            data.bom_id || null,
            data.output_product_id,
            outputQuantity,
            data.output_unit_name || null,
            outputFactor,
            laborCost,
            overheadCost,
            rawMaterialCost,
            totalCost,
            unitCost,
            fullDateTime,
            data.description?.trim() || null,
            data.created_by,
          );

        const orderId = orderResult.lastInsertRowid;

        let orderName = data.order_name?.trim();
        if (!orderName) {
          orderName = buildDefaultInvoiceName(db, "manufacturing", orderId);
          db.prepare(
            `UPDATE manufacturing_orders SET order_name = ? WHERE id = ?`,
          ).run(orderName, orderId);
        }

        // ---- Insert raw material lines + stock OUT + movements ----
        const insertItem = db.prepare(`
          INSERT INTO manufacturing_order_items
          (manufacturing_order_id, raw_material_product_id, quantity, unit_name,
           unit_conversion_factor, unit_cost_snapshot, line_cost)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const decrementStock = db.prepare(
          `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
        );

        for (const item of preparedItems) {
          insertItem.run(
            orderId,
            item.raw_material_product_id,
            item.quantity,
            item.unit_name,
            item.unit_conversion_factor,
            item.unitCostSnapshot,
            item.lineCost,
          );

          const rawUnitInfo = db
            .prepare(
              `
              SELECT pu.unit_name AS base_unit_name
              FROM product_units pu
              WHERE pu.product_id = ? AND pu.is_base = 1
              `,
            )
            .get(item.raw_material_product_id);

          decrementStock.run(item.baseQuantity, item.raw_material_product_id);

          createProductMovement(db, {
            product_id: item.raw_material_product_id,
            reference_id: orderId,
            reference_type: "manufacturing",
            type: "out",
            action: "create",
            quantity: item.baseQuantity,
            outPrice: item.unitCostSnapshot,
            date: fullDateTime,
            base_unit_name: rawUnitInfo?.base_unit_name || null,
            unit_name: item.unit_name,
            conversion_factor: item.unit_conversion_factor,
          });
        }

        // ---- Output product: stock IN + costPrice overwrite + movement ----
        const outputUnitInfo = db
          .prepare(
            `
            SELECT pu.unit_name AS base_unit_name
            FROM product_units pu
            WHERE pu.product_id = ? AND pu.is_base = 1
            `,
          )
          .get(data.output_product_id);

        db.prepare(
          `UPDATE products SET quantity = quantity + ?, costPrice = ? WHERE id = ?`,
        ).run(outputBaseQuantity, unitCost, data.output_product_id);

        createProductMovement(db, {
          product_id: data.output_product_id,
          reference_id: orderId,
          reference_type: "manufacturing",
          type: "in",
          action: "create",
          quantity: outputBaseQuantity,
          enterPrice: unitCost,
          date: fullDateTime,
          base_unit_name: outputUnitInfo?.base_unit_name || null,
          unit_name: data.output_unit_name || null,
          conversion_factor: outputFactor,
        });

        return { orderId, orderName };
      });

      return { success: true, ...transaction() };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("get-manufacturing-orders", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const whereConditions = [];
    const whereParams = [];

    if (params.search) {
      whereConditions.push(`mo.order_name LIKE ?`);
      whereParams.push(`%${params.search.trim()}%`);
    }
    if (params.output_product_id) {
      whereConditions.push(`mo.output_product_id = ?`);
      whereParams.push(params.output_product_id);
    }
    if (params.unit_id) {
      whereConditions.push(`p.unit_id = ?`);
      whereParams.push(params.unit_id);
    }
    if (params.dateFrom) {
      whereConditions.push(`DATE(mo.date) >= ?`);
      whereParams.push(params.dateFrom);
    }
    if (params.dateTo) {
      whereConditions.push(`DATE(mo.date) <= ?`);
      whereParams.push(params.dateTo);
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";

    try {
      const { total } = db
        .prepare(
          `SELECT COUNT(*) AS total
         FROM manufacturing_orders mo
         JOIN products p ON p.id = mo.output_product_id
         ${whereClause}`,
        )
        .get(...whereParams);

      const orders = db
        .prepare(
          `
        SELECT
          mo.*,
          p.name AS output_product_name,
          p.code AS output_product_code,
          creator.full_name AS created_by_name,
          updater.full_name AS updated_by_name,
          (
            SELECT COUNT(*) FROM manufacturing_order_items moi
            WHERE moi.manufacturing_order_id = mo.id
          ) AS item_count
        FROM manufacturing_orders mo
        JOIN products p ON p.id = mo.output_product_id
        LEFT JOIN users creator ON creator.id = mo.created_by
        LEFT JOIN users updater ON updater.id = mo.updated_by
        ${whereClause}
        ORDER BY mo.id DESC
        LIMIT ? OFFSET ?
        `,
        )
        .all(...whereParams, limit, offset);

      return {
        success: true,
        data: orders,
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

  ipcMain.handle("get-manufacturing-order", (event, id) => {
    if (!id) {
      return { success: false, error: "MISSING_MANUFACTURING_ORDER_ID" };
    }

    try {
      const order = db
        .prepare(
          `
        SELECT
          mo.*,
          p.name AS output_product_name,
          p.code AS output_product_code
        FROM manufacturing_orders mo
        JOIN products p ON p.id = mo.output_product_id
        WHERE mo.id = ?
        `,
        )
        .get(id);

      if (!order) {
        return { success: false, error: "MANUFACTURING_ORDER_NOT_FOUND" };
      }

      const items = db
        .prepare(
          `
        SELECT
          moi.*,
          p.name AS raw_material_name,
          p.code AS raw_material_code
        FROM manufacturing_order_items moi
        JOIN products p ON p.id = moi.raw_material_product_id
        WHERE moi.manufacturing_order_id = ?
        ORDER BY moi.id ASC
        `,
        )
        .all(id);

      // Batch-fetch each raw material's full unit list, same pattern as
      // get-bom — lets the edit form's unit dropdown populate immediately.
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

      // Same for the output product itself, since its unit may also need
      // to be switchable on edit.
      const outputUnits = db
        .prepare(
          `SELECT id, product_id, unit_name, conversion_factor, is_base, sale_price, barcode
         FROM product_units
         WHERE product_id = ?`,
        )
        .all(order.output_product_id);

      return {
        success: true,
        data: { ...order, items, output_available_units: outputUnits },
      };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("update-manufacturing-order", (event, data) => {
    if (
      !data.id ||
      !data.output_product_id ||
      !data.output_quantity ||
      Number(data.output_quantity) <= 0 ||
      !Array.isArray(data.items) ||
      data.items.length === 0
    ) {
      return { success: false, error: "ERROR ENTER DATA" };
    }

    const oldOrder = db
      .prepare(`SELECT * FROM manufacturing_orders WHERE id = ?`)
      .get(data.id);

    if (!oldOrder) {
      return { success: false, error: "MANUFACTURING_ORDER_NOT_FOUND" };
    }

    try {
      const transaction = db.transaction(() => {
        const dateOnly = (data.date || new Date().toISOString()).slice(0, 10);
        const time = new Date().toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        assertProductIsPhysical(
          data.output_product_id,
          "SERVICE_PRODUCTS_CANNOT_BE_MANUFACTURED",
        );

        const outputFactor = Number(data.output_unit_conversion_factor || 1);
        const outputQuantity = Number(data.output_quantity);
        const outputBaseQuantity = outputQuantity * outputFactor;

        // ---- Guard: output product can't change on edit — reversing/reapplying
        // against a different product entirely is a "create new order" case ----
        if (
          Number(data.output_product_id) !== Number(oldOrder.output_product_id)
        ) {
          throw new Error("CANNOT_CHANGE_OUTPUT_PRODUCT_ON_EDIT");
        }

        // ---- Guard: if reducing output quantity, enough must still be in stock
        // to reverse the difference (some may have already been sold/consumed) ----
        const oldOutputBaseQuantity =
          Number(oldOrder.output_quantity) *
          Number(oldOrder.output_unit_conversion_factor || 1);
        const outputDelta = outputBaseQuantity - oldOutputBaseQuantity;

        if (outputDelta < 0) {
          const outputProduct = db
            .prepare(`SELECT quantity FROM products WHERE id = ?`)
            .get(data.output_product_id);
          if (Number(outputProduct.quantity) < Math.abs(outputDelta)) {
            throw new Error("CANNOT_REVERSE_STOCK_ALREADY_CONSUMED");
          }
        }

        // ---- Recompute raw material lines from raw inputs only ----
        const seen = new Set();
        const preparedItems = [];
        let rawMaterialCost = 0;

        for (const item of data.items) {
          if (
            !item.raw_material_product_id ||
            !item.quantity ||
            Number(item.quantity) <= 0
          ) {
            throw new Error("INVALID_MANUFACTURING_ITEM");
          }
          if (
            Number(item.raw_material_product_id) ===
            Number(data.output_product_id)
          ) {
            throw new Error("RAW_MATERIAL_CANNOT_BE_OUTPUT_PRODUCT");
          }
          if (seen.has(item.raw_material_product_id)) {
            throw new Error("DUPLICATE_RAW_MATERIAL_IN_ORDER");
          }
          seen.add(item.raw_material_product_id);

          const rawProduct = db
            .prepare(
              `SELECT id, type, quantity, costPrice FROM products WHERE id = ?`,
            )
            .get(item.raw_material_product_id);

          if (!rawProduct) {
            throw new Error("PRODUCT_NOT_FOUND");
          }
          if (rawProduct.type === "service") {
            throw new Error("SERVICE_PRODUCTS_CANNOT_BE_RAW_MATERIALS");
          }

          const factor = Number(item.unit_conversion_factor || 1);
          const quantity = Number(item.quantity);
          const baseQuantity = quantity * factor;

          preparedItems.push({
            raw_material_product_id: item.raw_material_product_id,
            quantity,
            unit_name: item.unit_name || null,
            unit_conversion_factor: factor,
            baseQuantity,
            currentStock: Number(rawProduct.quantity),
            costPrice: Number(rawProduct.costPrice || 0),
          });
        }

        // ---- Diff old vs new raw material lines by product ----
        const oldItems = db
          .prepare(
            `SELECT * FROM manufacturing_order_items WHERE manufacturing_order_id = ?`,
          )
          .all(data.id);

        const oldByProduct = new Map();
        for (const item of oldItems) {
          oldByProduct.set(item.raw_material_product_id, item);
        }

        const newByProduct = new Map();
        for (const item of preparedItems) {
          newByProduct.set(item.raw_material_product_id, item);
        }

        // For lines being removed entirely: raw material was consumed
        // (subtracted) originally, so removing the line means adding it
        // BACK — never needs a stock-sufficiency check (adding can't go
        // negative).
        // For lines with an increased quantity: additional stock must be
        // consumed now — check sufficiency.
        // For lines with a decreased quantity: some was already reversed
        // effectively (less will be consumed) — always safe.
        for (const [productId, newItem] of newByProduct) {
          const oldItem = oldByProduct.get(productId);
          const oldBaseQty = oldItem
            ? Number(oldItem.quantity) *
              Number(oldItem.unit_conversion_factor || 1)
            : 0;
          const delta = newItem.baseQuantity - oldBaseQty;

          if (delta > 0 && newItem.currentStock < delta) {
            throw new Error("INSUFFICIENT_RAW_MATERIAL_STOCK");
          }
        }

        const adjustStock = db.prepare(
          `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
        );
        const updateMovement = db.prepare(`
        UPDATE product_movements
        SET quantity = ?, outPrice = ?, action = 'update', date = ?,
            unit_name = ?, conversion_factor = ?
        WHERE reference_type = 'manufacturing' AND reference_id = ? AND product_id = ? AND type = 'out'
      `);
        const deleteMovement = db.prepare(`
        DELETE FROM product_movements
        WHERE reference_type = 'manufacturing' AND reference_id = ? AND product_id = ? AND type = 'out'
      `);

        // Lines removed entirely — add stock back, delete movement
        for (const [productId, oldItem] of oldByProduct) {
          if (!newByProduct.has(productId)) {
            const oldBaseQty =
              Number(oldItem.quantity) *
              Number(oldItem.unit_conversion_factor || 1);
            adjustStock.run(-oldBaseQty, productId); // negative delta = add back (since adjustStock subtracts)
            deleteMovement.run(data.id, productId);
          }
        }

        // Lines present in new set — apply delta (positive delta = consume more)
        let rawMaterialCostTotal = 0;
        for (const [productId, newItem] of newByProduct) {
          const oldItem = oldByProduct.get(productId);
          const oldBaseQty = oldItem
            ? Number(oldItem.quantity) *
              Number(oldItem.unit_conversion_factor || 1)
            : 0;
          const delta = newItem.baseQuantity - oldBaseQty;

          if (delta !== 0) {
            adjustStock.run(delta, productId);
          }

          const lineCost = Number(
            (newItem.baseQuantity * newItem.costPrice).toFixed(2),
          );
          rawMaterialCostTotal += lineCost;
          newItem.lineCost = lineCost;
          newItem.unitCostSnapshot = newItem.costPrice;

          if (oldItem) {
            updateMovement.run(
              newItem.baseQuantity,
              newItem.costPrice,
              fullDateTime,
              newItem.unit_name,
              newItem.unit_conversion_factor,
              data.id,
              productId,
            );
          } else {
            const rawUnitInfo = db
              .prepare(
                `SELECT unit_name AS base_unit_name FROM product_units WHERE product_id = ? AND is_base = 1`,
              )
              .get(productId);

            createProductMovement(db, {
              product_id: productId,
              reference_id: data.id,
              reference_type: "manufacturing",
              action: "create",
              type: "out",
              quantity: newItem.baseQuantity,
              outPrice: newItem.costPrice,
              date: fullDateTime,
              base_unit_name: rawUnitInfo?.base_unit_name || null,
              unit_name: newItem.unit_name,
              conversion_factor: newItem.unit_conversion_factor,
            });
          }
        }

        rawMaterialCost = Number(rawMaterialCostTotal.toFixed(2));
        const laborCost = Number(data.labor_cost || 0);
        const overheadCost = Number(data.overhead_cost || 0);
        const totalCost = Number(
          (rawMaterialCost + laborCost + overheadCost).toFixed(2),
        );
        const unitCost = Number(
          (outputBaseQuantity > 0 ? totalCost / outputBaseQuantity : 0).toFixed(
            2,
          ),
        );

        // ---- Apply output delta + overwrite costPrice ----
        if (outputDelta !== 0) {
          db.prepare(
            `UPDATE products SET quantity = quantity + ? WHERE id = ?`,
          ).run(outputDelta, data.output_product_id);
        }
        db.prepare(`UPDATE products SET costPrice = ? WHERE id = ?`).run(
          unitCost,
          data.output_product_id,
        );

        db.prepare(
          `
        UPDATE product_movements
        SET quantity = ?, enterPrice = ?, action = 'update', date = ?,
            unit_name = ?, conversion_factor = ?
        WHERE reference_type = 'manufacturing' AND reference_id = ? AND product_id = ? AND type = 'in'
      `,
        ).run(
          outputBaseQuantity,
          unitCost,
          fullDateTime,
          data.output_unit_name || null,
          outputFactor,
          data.id,
          data.output_product_id,
        );

        // ---- Replace item rows ----
        db.prepare(
          `DELETE FROM manufacturing_order_items WHERE manufacturing_order_id = ?`,
        ).run(data.id);

        const insertItem = db.prepare(`
        INSERT INTO manufacturing_order_items
        (manufacturing_order_id, raw_material_product_id, quantity, unit_name,
         unit_conversion_factor, unit_cost_snapshot, line_cost)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

        for (const item of preparedItems) {
          insertItem.run(
            data.id,
            item.raw_material_product_id,
            item.quantity,
            item.unit_name,
            item.unit_conversion_factor,
            item.unitCostSnapshot,
            item.lineCost,
          );
        }

        // ---- Update header ----
        const orderName = data.order_name?.trim() || oldOrder.order_name;

        db.prepare(
          `
        UPDATE manufacturing_orders
        SET order_name = ?, bom_id = ?, output_quantity = ?, output_unit_name = ?,
            output_unit_conversion_factor = ?, labor_cost = ?, overhead_cost = ?,
            raw_material_cost = ?, total_cost = ?, unit_cost = ?, date = ?,
            description = ?, updated_by = ?, updatedAt = datetime('now')
        WHERE id = ?
      `,
        ).run(
          orderName,
          data.bom_id || null,
          outputQuantity,
          data.output_unit_name || null,
          outputFactor,
          laborCost,
          overheadCost,
          rawMaterialCost,
          totalCost,
          unitCost,
          fullDateTime,
          data.description?.trim() || null,
          data.updated_by,
          data.id,
        );
      });

      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle("delete-manufacturing-order", (event, id) => {
    const order = db
      .prepare(`SELECT * FROM manufacturing_orders WHERE id = ?`)
      .get(id);

    if (!order) {
      return { success: false, error: "MANUFACTURING_ORDER_NOT_FOUND" };
    }

    try {
      const transaction = db.transaction(() => {
        const outputBaseQuantity =
          Number(order.output_quantity) *
          Number(order.output_unit_conversion_factor || 1);

        // ---- Guard: enough of the output must still be in stock to reverse ----
        const outputProduct = db
          .prepare(`SELECT quantity FROM products WHERE id = ?`)
          .get(order.output_product_id);

        if (Number(outputProduct.quantity) < outputBaseQuantity) {
          throw new Error("CANNOT_DELETE_ORDER_STOCK_ALREADY_CONSUMED");
        }

        const now = new Date();
        const date =
          now.getFullYear() +
          "-" +
          String(now.getMonth() + 1).padStart(2, "0") +
          "-" +
          String(now.getDate()).padStart(2, "0") +
          " " +
          String(now.getHours()).padStart(2, "0") +
          ":" +
          String(now.getMinutes()).padStart(2, "0") +
          ":" +
          String(now.getSeconds()).padStart(2, "0");

        const items = db
          .prepare(
            `SELECT * FROM manufacturing_order_items WHERE manufacturing_order_id = ?`,
          )
          .all(id);

        // ---- Reverse output: subtract what manufacturing had added ----
        db.prepare(
          `UPDATE products SET quantity = quantity - ? WHERE id = ?`,
        ).run(outputBaseQuantity, order.output_product_id);

        createProductMovement(db, {
          product_id: order.output_product_id,
          reference_id: id,
          reference_type: "manufacturing",
          action: "delete",
          type: "out",
          quantity: outputBaseQuantity,
          outPrice: order.unit_cost,
          date,
        });

        // ---- Reverse raw materials: add back what manufacturing had consumed ----
        for (const item of items) {
          const baseQuantity =
            Number(item.quantity) * Number(item.unit_conversion_factor || 1);

          db.prepare(
            `UPDATE products SET quantity = quantity + ? WHERE id = ?`,
          ).run(baseQuantity, item.raw_material_product_id);

          createProductMovement(db, {
            product_id: item.raw_material_product_id,
            reference_id: id,
            reference_type: "manufacturing",
            action: "delete",
            type: "in",
            quantity: baseQuantity,
            enterPrice: item.unit_cost_snapshot,
            date,
          });
        }

        db.prepare(
          `DELETE FROM manufacturing_order_items WHERE manufacturing_order_id = ?`,
        ).run(id);
        db.prepare(`DELETE FROM manufacturing_orders WHERE id = ?`).run(id);
      });

      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });
}
