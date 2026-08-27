// packages/app/src/main/ipc/tags.ipc.js

import { ipcMain } from "electron";
import db from "../db"; // adjust to your actual db import path/alias

const ENTITY_TYPES = [
  "product",
  "customer",
  "supplier",
  "partner",
  "sales_invoice",
  "sales_return",
  "sales_quotation",
  "purchase_invoice",
  "purchase_return",
  "expense",
  "payment",
];

function isValidScope(scope) {
  return scope === null || scope === undefined || ENTITY_TYPES.includes(scope);
}

export default function registerTagsIPC() {
  // ---- CREATE ----
  ipcMain.handle("create-tag", (event, { name, latinName, color, scope }) => {
    try {
      if (!name || !name.trim()) {
        return { success: false, error: "TAG_NAME_REQUIRED" };
      }
      if (!isValidScope(scope)) {
        return { success: false, error: "INVALID_TAG_SCOPE" };
      }

      const normalizedScope = scope || null;

      const existing = db
        .prepare(`SELECT id FROM tags WHERE name = ? AND scope IS ?`)
        .get(name.trim(), normalizedScope);
      if (existing) {
        return { success: false, error: "TAG_NAME_ALREADY_EXISTS" };
      }

      const result = db
        .prepare(
          `INSERT INTO tags (name, latinName, color, scope) VALUES (?, ?, ?, ?)`,
        )
        .run(name.trim(), latinName || null, color || null, normalizedScope);

      return { success: true, data: { id: result.lastInsertRowid } };
    } catch (err) {
      return { success: false, error: "TAG_CREATE_FAILED" };
    }
  });

  // ---- LIST ----
  ipcMain.handle("list-tags", (event, { scope } = {}) => {
    try {
      let rows;
      if (scope) {
        rows = db
          .prepare(
            `SELECT * FROM tags WHERE scope = ? OR scope IS NULL ORDER BY name`,
          )
          .all(scope);
      } else {
        rows = db.prepare(`SELECT * FROM tags ORDER BY name`).all();
      }
      return { success: true, data: rows };
    } catch (err) {
      return { success: false, error: "TAG_LIST_FAILED" };
    }
  });

  // ---- UPDATE ----
  ipcMain.handle(
    "update-tag",
    (event, { id, name, latinName, color, scope, force }) => {
      try {
        const tag = db.prepare(`SELECT * FROM tags WHERE id = ?`).get(id);
        if (!tag) {
          return { success: false, error: "TAG_NOT_FOUND" };
        }
        if (!isValidScope(scope)) {
          return { success: false, error: "INVALID_TAG_SCOPE" };
        }

        const normalizedScope = scope === undefined ? tag.scope : scope || null;
        const scopeChanged = normalizedScope !== tag.scope;

        if (scopeChanged && !force) {
          const mismatched = db
            .prepare(
              `SELECT entity_type, COUNT(*) as count
               FROM taggables
               WHERE tag_id = ? AND entity_type != ?
               GROUP BY entity_type`,
            )
            .all(id, normalizedScope || "");

          if (mismatched.length > 0) {
            return {
              success: false,
              error: "TAG_SCOPE_MISMATCH_NEEDS_CONFIRMATION",
              data: { mismatched },
            };
          }
        }

        if (name !== undefined) {
          const dup = db
            .prepare(
              `SELECT id FROM tags WHERE name = ? AND scope IS ? AND id != ?`,
            )
            .get(name.trim(), normalizedScope, id);
          if (dup) {
            return { success: false, error: "TAG_NAME_ALREADY_EXISTS" };
          }
        }

        db.prepare(
          `UPDATE tags SET name = ?, latinName = ?, color = ?, scope = ? WHERE id = ?`,
        ).run(
          name !== undefined ? name.trim() : tag.name,
          latinName !== undefined ? latinName : tag.latinName,
          color !== undefined ? color : tag.color,
          normalizedScope,
          id,
        );

        return { success: true };
      } catch (err) {
        return { success: false, error: "TAG_UPDATE_FAILED" };
      }
    },
  );

  // ---- DELETE ----
  ipcMain.handle("delete-tag", (event, { id, force }) => {
    try {
      const tag = db.prepare(`SELECT id FROM tags WHERE id = ?`).get(id);
      if (!tag) {
        return { success: false, error: "TAG_NOT_FOUND" };
      }

      const { count } = db
        .prepare(`SELECT COUNT(*) as count FROM taggables WHERE tag_id = ?`)
        .get(id);

      if (count > 0 && !force) {
        return {
          success: false,
          error: "TAG_IN_USE_NEEDS_CONFIRMATION",
          data: { count },
        };
      }

      db.prepare(`DELETE FROM tags WHERE id = ?`).run(id); // cascades to taggables
      return { success: true };
    } catch (err) {
      return { success: false, error: "TAG_DELETE_FAILED" };
    }
  });

  // ---- GET TAGS FOR ENTITY ----
  ipcMain.handle("get-entity-tags", (event, { entityType, entityId }) => {
    try {
      const rows = db
        .prepare(
          `SELECT t.* FROM tags t
         JOIN taggables tg ON tg.tag_id = t.id
         WHERE tg.entity_type = ? AND tg.entity_id = ?
         ORDER BY t.name`,
        )
        .all(entityType, entityId);
      return { success: true, data: rows };
    } catch (err) {
      return { success: false, error: "ENTITY_TAGS_LIST_FAILED" };
    }
  });

  // ---- SET TAGS FOR ENTITY (replace-all, on save) ----
  ipcMain.handle(
    "set-entity-tags",
    (event, { entityType, entityId, tagIds }) => {
      try {
        if (!ENTITY_TYPES.includes(entityType)) {
          return { success: false, error: "INVALID_TAG_SCOPE" };
        }

        const ids = Array.isArray(tagIds) ? [...new Set(tagIds)] : [];

        const runTransaction = db.transaction(() => {
          // Validate every tag either matches this entity_type or is global
          if (ids.length > 0) {
            const placeholders = ids.map(() => "?").join(",");
            const validTags = db
              .prepare(
                `SELECT id FROM tags
               WHERE id IN (${placeholders})
               AND (scope = ? OR scope IS NULL)`,
              )
              .all(...ids, entityType);

            if (validTags.length !== ids.length) {
              throw new Error("TAG_SCOPE_NOT_ALLOWED");
            }
          }

          db.prepare(
            `DELETE FROM taggables WHERE entity_type = ? AND entity_id = ?`,
          ).run(entityType, entityId);

          const insert = db.prepare(
            `INSERT INTO taggables (tag_id, entity_type, entity_id) VALUES (?, ?, ?)`,
          );
          for (const tagId of ids) {
            insert.run(tagId, entityType, entityId);
          }
        });

        runTransaction();
        return { success: true };
      } catch (err) {
        if (err.message === "TAG_SCOPE_NOT_ALLOWED") {
          return { success: false, error: "TAG_SCOPE_NOT_ALLOWED" };
        }
        return { success: false, error: "SET_ENTITY_TAGS_FAILED" };
      }
    },
  );

  // ---- GET TAGS FOR MULTIPLE ENTITIES (batch, for list views) ----
  ipcMain.handle("get-entities-tags", (event, { entityType, entityIds }) => {
    try {
      if (!Array.isArray(entityIds) || entityIds.length === 0) {
        return { success: true, data: {} };
      }

      const placeholders = entityIds.map(() => "?").join(",");
      const rows = db
        .prepare(
          `SELECT tg.entity_id, t.id, t.name, t.color, t.scope
         FROM taggables tg
         JOIN tags t ON t.id = tg.tag_id
         WHERE tg.entity_type = ? AND tg.entity_id IN (${placeholders})
         ORDER BY t.name`,
        )
        .all(entityType, ...entityIds);

      const grouped = {};
      for (const row of rows) {
        if (!grouped[row.entity_id]) grouped[row.entity_id] = [];
        grouped[row.entity_id].push({
          id: row.id,
          name: row.name,
          color: row.color,
          scope: row.scope,
        });
      }

      return { success: true, data: grouped };
    } catch (err) {
      return { success: false, error: "ENTITY_TAGS_LIST_FAILED" };
    }
  });
}
