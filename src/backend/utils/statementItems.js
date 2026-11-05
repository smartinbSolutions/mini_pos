const PRODUCT_SOURCES = {
  sales: ["sales_invoice_items", "invoice_id"],
  sales_return: ["sales_return_items", "return_id"],
  purchase: ["purchase_invoice_items", "invoice_id"],
  purchase_return: ["purchase_return_items", "return_id"],
};
const CHUNK = 500;
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Attaches r.items to each document row. Informational only.
export default function attachStatementItems(db, rows) {
  const idsByType = {};
  for (const r of rows) {
    if (!["invoice", "return"].includes(r.record_type) || !r.invoice_id)
      continue;
    (idsByType[r.invoice_type] ||= new Set()).add(r.invoice_id);
  }

  const byDoc = new Map();
  for (const [type, set] of Object.entries(idsByType)) {
    const ids = [...set];
    for (let i = 0; i < ids.length; i += CHUNK) {
      const part = ids.slice(i, i + CHUNK);
      const ph = part.map(() => "?").join(",");
      let found;
      if (type === "expense") {
        found = db
          .prepare(
            `SELECT ei.expense_id AS doc_id, c.name AS name, NULL AS unit_name,
                    NULL AS quantity, ei.price, ei.discount, ei.taxValue,
                    ei.total, ei.description
             FROM expense_items ei
             LEFT JOIN expence_category c ON c.id = ei.category_id
             WHERE ei.expense_id IN (${ph}) ORDER BY ei.id`,
          )
          .all(...part);
      } else if (PRODUCT_SOURCES[type]) {
        const [table, fk] = PRODUCT_SOURCES[type];
        found = db
          .prepare(
            `SELECT ${fk} AS doc_id, product_name AS name, unit_name, quantity,
                    price, discount, taxValue, total, description
             FROM ${table} WHERE ${fk} IN (${ph}) ORDER BY id`,
          )
          .all(...part);
      } else continue;

      for (const it of found) {
        const key = `${type}:${it.doc_id}`;
        if (!byDoc.has(key)) byDoc.set(key, []);
        // net of item discount, incl. item tax
        byDoc.get(key).push({
          ...it,
          line_total: r2(it.total - it.discount + it.taxValue),
        });
      }
    }
  }

  for (const r of rows) {
    r.items = byDoc.get(`${r.invoice_type}:${r.invoice_id}`) || [];
  }
}
