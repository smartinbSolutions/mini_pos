export default function createProductMovement(db, data) {
  const stmt = db.prepare(`
    INSERT INTO product_movements (
      product_id,
      reference_id,
      reference_type,
      type,
      action,
      enterPrice,
      outPrice,
      date,
      quantity
    )
    VALUES (
      @product_id,
      @reference_id,
      @reference_type,
      @type,
      @action,
      @enterPrice,
      @outPrice,
      @date,
      @quantity
    )
  `);

  return stmt.run({
    product_id: data.product_id,
    reference_id: data.reference_id ?? null,
    reference_type: data.reference_type ?? null,
    type: data.type,
    action: data.action,
    date: data.date,
    enterPrice: Number(data.enterPrice || 0),
    outPrice: Number(data.outPrice || 0),
    quantity: Number(data.quantity || 0),
  });
}
