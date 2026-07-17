import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../Global/AuthContext";

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
  const { t } = useTranslation();
  const navigat = useNavigate();
  const api = window.api;
  const { user } = useAuth();

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
      setError(t("errors.apiNotAvailable"));
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
      setError("");
    } catch (err) {
      setError(err?.message || t("errors.loadError"));
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
        const product = products?.data?.find((p) => p.id == value);

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

  // Barcode scanning stays exactly as-is — unrelated to payment refactor
  useEffect(() => {
    let barcodeRef = "";

    const handleKeyDown = async (e) => {
      if (e.key === "Enter") {
        if (!barcodeRef) return;

        try {
          const product = await api.getProductByBarcode(barcodeRef);

          if (!product) {
            setError(t("errors.productNotFound"));
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

  const taxableAmount = useMemo(() => {
    return Math.max(0, subtotal - Number(invoice.discount || 0));
  }, [subtotal, invoice.discount]);

  const taxValue = useMemo(() => {
    return taxableAmount * (Number(invoice.tax_rate || 0) / 100);
  }, [taxableAmount, invoice.tax_rate]);

  const netTotal = useMemo(() => {
    return Math.max(0, taxableAmount + taxValue);
  }, [taxableAmount, taxValue]);

  // submit now optionally takes paymentData collected by InvoicePaymentModal
  // in collector mode. If present, invoice is created as paid and the
  // backend's centralized payment service handles the fund transaction.
  // If absent, invoice is created unpaid — no payment side effects at all.
  const submit = useCallback(
    async (paymentData = null) => {
      if (!api) {
        setError(t("errors.apiNotAvailable"));
        return;
      }

      if (!invoice.supplier_id) {
        setError(t("errors.supplierRequired"));
        return;
      }

      if (items.length === 0) {
        setError(t("errors.addOneItem"));
        return;
      }

      try {
        setSaving(true);
        setError("");

        const payload = {
          ...invoice,
          subtotal,
          net_total: netTotal,
          taxValue,
          items,
          status: paymentData ? "paid" : "unpaid",
          payment: paymentData,
          created_by: user.id,
        };

        const res = await api.createPurchaseInvoice(payload);

        if (!res?.success) {
          console.error(res);
          throw new Error(t("errors.createInvoiceFailed"));
        }

        setInvoice(emptyInvoice);
        setItems([emptyItem]);

        navigat("/purchase");
        return res;
      } catch (err) {
        setError(err.message || t("errors.createInvoiceFailed"));
      } finally {
        setSaving(false);
      }
    },
    [api, invoice, items, subtotal, netTotal, taxValue],
  );

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
    taxableAmount,
    taxValue,
    netTotal,
    loading,
    saving,
    error,
    api,
    setProducts,
    products,
  };
}
