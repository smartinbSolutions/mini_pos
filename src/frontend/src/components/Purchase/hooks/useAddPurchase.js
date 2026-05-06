import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

const emptyItem = {
  product_id: "",
  name: "",
  quantity: 1,
  price: 0,
  total: 0,
};

const emptyInvoice = {
  supplier_id: "",
  date: new Date().toISOString().slice(0, 10),
  discount: 0,
  tax: 0,
};

export default function useAddPurchase() {
  const navigat = useNavigate();
  const api = window.api;

  const [invoice, setInvoice] = useState(emptyInvoice);
  const [items, setItems] = useState([emptyItem]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const refetch = useCallback(async () => {
    if (!api) {
      setError("API not available");
      return;
    }

    try {
      setLoading(true);
      const res = await api.getProducts();
      setProducts(res || []);
      let taxResult = await api.getTaxes();
      setTaxes(taxResult || []);
      let suppliersResult = await api.getSuppliers();
      setSuppliers(suppliersResult || []);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to load purchases");
    } finally {
      setLoading(false);
    }
  }, [api]);
  useEffect(() => {
    refetch();
  }, [refetch]);
  const addItem = () => {
    setItems((prev) => [...prev, emptyItem]);
  };

  const removeItem = (index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index, key, value) => {
    setItems((prev) => {
      const copy = [...prev];

      let item = { ...copy[index] };

      item[key] = value;

      if (key === "product_id") {
        const product = products.find((p) => p.id == value);

        if (product) {
          item.price = product.costPrice || 0;
          item.name = product.name;
        }
      }

      const q = Number(item.quantity || 0);
      const p = Number(item.price || 0);

      item.total = q * p;

      copy[index] = item;

      return copy;
    });
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);

  const netTotal = useMemo(() => {
    const discount = Number(invoice.discount || 0);
    const tax = Number(invoice.tax || 0);

    return subtotal - discount + tax;
  }, [subtotal, invoice.discount, invoice.tax]);

  const submit = useCallback(async () => {
    if (!api) {
      setError("Electron API not available");
      return;
    }

    if (!invoice.supplier_id) {
      setError("Supplier is required");
      return;
    }

    if (items.length === 0) {
      setError("Add at least one item");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...invoice,
        subtotal,
        net_total: netTotal,
        items,
      };

      const res = await api.createPurchaseInvoice(payload);

      if (!res?.success) {
        throw new Error("Failed to create invoice");
      }

      setInvoice(emptyInvoice);
      setItems([emptyItem]);

      navigat("/purchase");
      return res;
    } catch (err) {
      setError(err.message || "Error creating invoice");
    } finally {
      setSaving(false);
    }
  }, [api, invoice, items, subtotal, netTotal]);

  const reset = () => {
    setInvoice(emptyInvoice);
    setItems([emptyItem]);
    setError("");
  };

  return {
    invoice,
    setInvoice,
    items,
    products,
    suppliers,
    addItem,
    removeItem,
    updateItem,
    submit,
    reset,
    subtotal,
    netTotal,
    loading,
    saving,
    error,
  };
}
