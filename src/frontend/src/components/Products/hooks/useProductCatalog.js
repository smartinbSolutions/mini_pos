import { useCallback, useEffect, useMemo, useState } from "react";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeBarcodes = (barcodes) => {
  const seen = new Set();

  return barcodes
    .map((barcode) => ({
      ...barcode,
      barcode: String(barcode.barcode || "").trim(),
    }))
    .filter((barcode) => {
      if (!barcode.barcode || seen.has(barcode.barcode)) return false;
      seen.add(barcode.barcode);
      return true;
    });
};

const productPayload = (product) => ({
  id: product.id,
  name: String(product.name || "").trim(),
  latinName: String(product.latinName || "").trim(),
  costPrice: toNumber(product.costPrice),
  price: toNumber(product.price),
  quantity: toNumber(product.quantity),
  unit_id: product.unit_id ? Number(product.unit_id) : null,
});

export default function useProductCatalog() {
  const [products, setProducts] = useState([]);
  const [barcodes, setBarcodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);

  const api = window.api;

  const refetch = useCallback(async () => {
    if (!api) {
      setError("Electron preload API is not available.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [productsResult, barcodesResult] = await Promise.allSettled([
        api.getProducts(),
        api.getProductBarcodes(),
      ]);

      if (productsResult.status === "rejected") {
        throw productsResult.reason;
      }

      if (barcodesResult.status === "rejected") {
        console.error(
          "Failed to load product barcodes:",
          barcodesResult.reason,
        );
      }

      const nextUnavailableHandlers = [];

      if (barcodesResult.status === "rejected") {
        nextUnavailableHandlers.push("product barcodes");
      }

      setProducts(productsResult.value || []);

      setBarcodes(
        barcodesResult.status === "fulfilled" ? barcodesResult.value || [] : [],
      );
      setUnavailableHandlers(nextUnavailableHandlers);
      setError(
        nextUnavailableHandlers.length
          ? "Products loaded, but units or barcodes are not available because their IPC handlers are not registered."
          : "",
      );
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setUnavailableHandlers([]);
      setError(err?.message || "Failed to load product catalog.");
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const barcodesByProduct = useMemo(() => {
    return barcodes.reduce((groups, barcode) => {
      const productId = barcode.product_id;
      if (!groups[productId]) groups[productId] = [];
      groups[productId].push(barcode);
      return groups;
    }, {});
  }, [barcodes]);

  const createProduct = async (form) => {
    setSaving(true);
    try {
      const result = await api.createProduct(productPayload(form));
      const productId = result?.id;

      for (const barcode of normalizeBarcodes(form.barcodes || [])) {
        await api.createProductBarcode({
          barcode: barcode.barcode,
          product_id: productId,
        });
      }

      await refetch();
      return result;
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = async (form) => {
    setSaving(true);
    try {
      await api.updateProduct(productPayload(form));

      const nextBarcodes = normalizeBarcodes(form.barcodes || []);
      const existingBarcodes = barcodesByProduct[form.id] || [];
      const nextIds = new Set(
        nextBarcodes.filter((b) => b.id).map((b) => b.id),
      );

      for (const barcode of existingBarcodes) {
        if (!nextIds.has(barcode.id)) {
          await api.deleteProductBarcode(barcode.id);
        }
      }

      for (const barcode of nextBarcodes) {
        if (barcode.id) {
          await api.updateProductBarcode({
            id: barcode.id,
            barcode: barcode.barcode,
            product_id: form.id,
          });
        } else {
          await api.createProductBarcode({
            barcode: barcode.barcode,
            product_id: form.id,
          });
        }
      }

      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product) => {
    setSaving(true);
    try {
      for (const barcode of barcodesByProduct[product.id] || []) {
        await api.deleteProductBarcode(barcode.id);
      }
      await api.deleteProduct(product.id);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  return {
    products,
    barcodes,
    barcodesByProduct,
    loading,
    saving,
    error,
    unavailableHandlers,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
