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
  const [status, setStatus] = useState("unpaid");
  const [funds, setFunds] = useState([]);
  const refetch = useCallback(async () => {
    if (!api) {
      setError("API not available");
      return;
    }

    try {
      setLoading(true);
      const res = await api.getProducts();
      setProducts(res || []);
      const taxResult = await api.getTaxes();
      setTaxes(taxResult || []);
      const suppliersResult = await api.getSuppliers();
      setSuppliers(suppliersResult || []);
      const fundResult = await api.getFunds();
      setFunds(fundResult || []);
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

  useEffect(() => {
    let barcodeRef = "";

    const handleKeyDown = async (e) => {
      if (e.key === "Enter") {
        if (!barcodeRef) return;

        try {
          const product = await api.getProductByBarcode(barcodeRef);

          if (!product) {
            setError("Product not found");
            barcodeRef = "";
            return;
          }

          setItems((prev) => {
            const existingIndex = prev.findIndex(
              (i) => Number(i.product_id) === Number(product.id),
            );

            if (existingIndex !== -1) {
              const updated = [...prev];
              const item = updated[existingIndex];

              const newQuantity = Number(item.quantity) + 1;

              updated[existingIndex] = {
                ...item,
                quantity: newQuantity,
                total: newQuantity * Number(item.price),
              };

              return updated;
            }

            const existingEmpty = prev.findIndex((i) => i.product_id === "");

            if (existingEmpty !== -1) {
              const updated = [...prev];

              updated[existingEmpty] = {
                ...updated[existingEmpty],
                product_id: product.id,
                name: product.name,
                quantity: 1,
                price: product.costPrice || 0,
                total: product.costPrice || 0,
              };

              return updated;
            }

            return [
              ...prev,
              {
                product_id: product.id,
                name: product.name,
                quantity: 1,
                price: product.costPrice || 0,
                total: product.costPrice || 0,
              },
            ];
          });

          barcodeRef = "";
        } catch (err) {
          console.log(err);
        }
      } else {
        barcodeRef += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [api]);

  const netTotal = useMemo(() => {
    const discount = Number(invoice.discount || 0);
    const taxRate = Number(invoice.tax_rate || 0);
    const taxValue = subtotal * (taxRate / 100);

    return subtotal - discount + taxValue;
  }, [subtotal, invoice]);

  const dueAmount = Number(netTotal || 0) - Number(invoice.paid_amount || 0);

  const paymentInfundCurrency = useMemo(() => {
    const payment = subtotal * (invoice.exchange_rate || 1);
    return payment;
  }, [subtotal, invoice]);

  console.log(invoice);

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
        status,
        paymentInfundCurrency,
      };

      const res = await api.createPurchaseInvoice(payload);

      if (!res?.success) {
        console.error(res);

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
    taxes,
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
    funds,
    status,
    dueAmount,
    setStatus,
  };
}
