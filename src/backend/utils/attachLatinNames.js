// Invoice/return/quotation items only store name snapshots (product_name,
// unit_name). This resolves the current Latin names for display, in two
// batched queries per document — never per row.
//   product → products.latinName
//   base unit (factor 1) → unit.latinName
//   selling unit → product_units.latin_name, matched by product + unit_name
export default function attachLatinNames(db, items = []) {
  const ids = [...new Set(items.map((i) => i.product_id).filter(Boolean))];

  if (!ids.length) {
    return items.map((i) => ({
      ...i,
      product_latin_name: null,
      unit_latin_name: null,
    }));
  }

  const ph = ids.map(() => "?").join(",");

  const products = db
    .prepare(
      `SELECT p.id, p.latinName, u.latinName AS base_unit_latin_name
       FROM products p
       LEFT JOIN unit u ON u.id = p.unit_id
       WHERE p.id IN (${ph})`,
    )
    .all(...ids);

  const sellingUnits = db
    .prepare(
      `SELECT product_id, unit_name, latin_name
       FROM product_units
       WHERE is_base = 0 AND product_id IN (${ph})`,
    )
    .all(...ids);

  const productById = new Map(products.map((p) => [p.id, p]));
  const unitLatinByKey = new Map(
    sellingUnits.map((u) => [`${u.product_id}::${u.unit_name}`, u.latin_name]),
  );

  return items.map((item) => {
    const product = productById.get(item.product_id);
    const isBase = Number(item.unit_conversion_factor || 1) === 1;

    return {
      ...item,
      product_latin_name: product?.latinName || null,
      unit_latin_name: isBase
        ? product?.base_unit_latin_name || null
        : unitLatinByKey.get(`${item.product_id}::${item.unit_name}`) || null,
    };
  });
}
