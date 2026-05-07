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
  const [search, setSearch] = useState("");
  const [activeProduct, setActiveProduct] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [units, setUnits] = useState([]);
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [selectDeleteProduct, setSelectDeleteProduct] = useState(null);

  const canUseUnits = !unavailableHandlers.includes("units");
  const canManageBarcodes = !unavailableHandlers.includes("product barcodes");

  const api = window.api;

  const refetch = useCallback(async () => {
    if (!api) {
      setError("Electron preload API is not available.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [productsResult, barcodesResult, unitResult] =
        await Promise.allSettled([
          api.getProducts(),
          api.getProductBarcodes(),
          api.getUnits(),
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

      setUnits(unitResult || []);
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
      const res = await api.deleteProduct(product.id);
      await refetch();
      setActionError("");
    } catch (e) {
      console.log("error", e);
      setActionError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) => {
      const productBarcodes = barcodesByProduct[product.id] || [];
      return [
        product.name,
        product.latinName,
        product.unit_name,
        product.unit_code,
        ...productBarcodes.map((barcode) => barcode.barcode),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [barcodesByProduct, products, search]);

  const openCreate = () => {
    setActiveProduct(null);
    setIsFormOpen(true);
    setActionError("");
  };

  const openEdit = (product) => {
    setActiveProduct(product);
    setIsFormOpen(true);
    setActionError("");
  };

  const submitProduct = async (form) => {
    try {
      if (activeProduct) {
        await updateProduct(form);
      } else {
        await createProduct(form);
      }
      setIsFormOpen(false);
      setActiveProduct(null);
      setActionError("");
    } catch (err) {
      console.error("Failed to save product:", err);
      setActionError(err?.message || "Failed to save product.");
    }
  };

  const handleDeleteProduct = async (product) => {
    // const confirmed = window.confirm(`Delete product "${product.name}"?`);
    // if (!confirmed) return;

    try {
      await deleteProduct(product);
      setActionError("");
      setOpenDeleteModel(false);
      setSelectDeleteProduct(null);
    } catch (err) {
      console.error("Failed to delete product:", err);
      setActionError(
        err?.message ||
          "Failed to delete product. It may be referenced by invoices.",
      );
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
    search,
    setSearch,
    openCreate,
    actionError,
    filteredProducts,
    openEdit,
    handleDeleteProduct,
    isFormOpen,
    activeProduct,
    canManageBarcodes,
    canUseUnits,
    setIsFormOpen,
    submitProduct,
    units,
    openDeleteModel,
    setOpenDeleteModel,
    setSelectDeleteProduct,
    selectDeleteProduct,
  };
}
