const round4 = (n) => Math.round((n + Number.EPSILON) * 1e4) / 1e4;

// Default: no Latin mode, always the original name.
const originalOnly = (_latin, original) => original;

export const toEnteredLine = (item, pick = originalOnly) => {
  const factor = Number(item.unit_conversion_factor || 1) || 1;
  return {
    factor,
    quantity: round4(Number(item.quantity || 0) / factor),
    price: Number(item.price || 0) * factor,
    baseQuantity: Number(item.quantity || 0),
    productName: pick(item.product_latin_name, item.product_name || item.name),
    unitName: pick(item.unit_latin_name, item.unit_name),
  };
};
