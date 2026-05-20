import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const normalizeBarcodes = (barcodes = []) => {
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
  costPrice: Number(product.costPrice || 0),
  price: Number(product.price || 0),
  quantity: Number(product.quantity || 0),
  unit_id: product.unit_id ? Number(product.unit_id) : null,
  logo: product.logo || "",
});

export default function useProductCatalog() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [barcodes, setBarcodes] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [search, setSearch] = useState("");
  const [activeProduct, setActiveProduct] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [selectDeleteProduct, setSelectDeleteProduct] = useState(null);

  const api = window.api;

  const canUseUnits = !unavailableHandlers.includes("units");
  const canManageBarcodes = !unavailableHandlers.includes("product barcodes");

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiUnavailable"));
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const [productsResult, barcodesResult, unitsResult] =
        await Promise.allSettled([
          api.getProducts(),
          api.getProductBarcodes(),
          api.getUnits(),
        ]);

      if (productsResult.status === "rejected") {
        throw productsResult.reason;
      }

      const nextUnavailableHandlers = [];

      if (barcodesResult.status === "rejected") {
        console.error(
          "Failed to load product barcodes:",
          barcodesResult.reason,
        );
        nextUnavailableHandlers.push("product barcodes");
      }

      if (unitsResult.status === "rejected") {
        console.error("Failed to load units:", unitsResult.reason);
        nextUnavailableHandlers.push("units");
      }

      setProducts(productsResult.value || []);
      setBarcodes(
        barcodesResult.status === "fulfilled" ? barcodesResult.value || [] : [],
      );
      setUnits(
        unitsResult.status === "fulfilled" ? unitsResult.value || [] : [],
      );
      setUnavailableHandlers(nextUnavailableHandlers);

      setError(
        nextUnavailableHandlers.length
          ? t("errors.partialLoad", { field: t("ui.products") })
          : "",
      );
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setUnavailableHandlers([]);
      setError(err?.message || t("errors.loadError"));
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

      for (const barcode of normalizeBarcodes(form.barcodes)) {
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

      const nextBarcodes = normalizeBarcodes(form.barcodes);
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
      await api.deleteProduct(product.id);
      await refetch();
      setActionError("");
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
      setActionError(err?.message || t("errors.saveError"));
    }
  };

  const handleDeleteProduct = async (product) => {
    try {
      await deleteProduct(product);
      setOpenDeleteModel(false);
      setSelectDeleteProduct(null);
      setActionError("");
    } catch (err) {
      console.error("Failed to delete product:", err);
      setActionError(
        t("errors.deleteHasData", { field: t("ui.product") }),
      );
    }
  };

  const handleLogo = async (file) => {
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
    });

    return window.api.saveLogo({
      base64,
      name: `${Date.now()}-${file.name}`,
    });
  };

  return {
    products,
    barcodes,
    barcodesByProduct,
    units,
    loading,
    saving,
    error,
    unavailableHandlers,
    canManageBarcodes,
    canUseUnits,
    search,
    setSearch,
    filteredProducts,
    refetch,
    openCreate,
    openEdit,
    isFormOpen,
    setIsFormOpen,
    activeProduct,
    submitProduct,
    actionError,
    openDeleteModel,
    setOpenDeleteModel,
    selectDeleteProduct,
    setSelectDeleteProduct,
    handleDeleteProduct,
    handleLogo,
  };
}
