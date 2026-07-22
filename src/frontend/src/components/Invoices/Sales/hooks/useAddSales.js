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
  customer_id: "",
  invoice_name: "",
  description: "",
  date: new Date().toISOString().slice(0, 10),
  discount: 0,
};

export default function useAddSales({ customerModalOpen }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = window.api;
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(emptyInvoice);
  const [items, setItems] = useState([emptyItem]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const refetch = useCallback(async () => {
    if (!api) return;

    try {
      setLoading(true);

      const [res, taxRes, custRes] = await Promise.all([
        api.getProducts({
          page: 1,
          limit: 200,
        }),
        api.getTaxes(),
        api.getCustomers(),
      ]);

      setProducts(res || []);
      setTaxes(taxRes || []);
      setCustomers(custRes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch, customerModalOpen]);

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
          item.price = product.price;
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

  // Barcode scanning — unrelated to payment refactor, unchanged
  useEffect(() => {
    let barcode = "";

    const handleKeyDown = async (e) => {
      if (e.key === "Enter") {
        if (!barcode) return;

        try {
          const product = await api.getProductByBarcode(barcode);

          if (!product) {
            setError(t("errors.productNotFound"));
            barcode = "";
            return;
          }

          setItems((prev) => {
            const existingIndex = prev.findIndex(
              (i) => Number(i.product_id) === Number(product.id)
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

            return [
              ...prev,
              {
                product_id: product.id,
                name: product.name,
                quantity: 1,
                price: product.price || 0,
                total: product.price || 0,
                buyingPrice: product.costPrice,
              },
            ];
          });

          barcode = "";
        } catch (err) {
          console.log(err);
        }
      } else {
        barcode += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [api]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, i) => sum + (i.total || 0), 0);
  }, [items]);

  const taxableAmount = useMemo(() => {
    return Math.max(0, subtotal - Number(invoice.discount || 0));
  }, [subtotal, invoice.discount]);

  const taxValue = useMemo(() => {
    return (taxableAmount * Number(invoice.tax_rate || 0)) / 100;
  }, [taxableAmount, invoice.tax_rate]);

  const netTotal = useMemo(() => {
    return Math.max(0, taxableAmount + taxValue);
  }, [taxableAmount, taxValue]);

  // submit optionally takes paymentData collected by InvoicePaymentModal in
  // collector mode. No fund/status/paid_amount state lives in this hook
  // anymore — the modal collects it, the backend's centralized payment
  // service applies it.
  const submit = useCallback(
    async (paymentData = null) => {
      if (!api) {
        setError(t("errors.apiNotAvailable"));
        return;
      }

      if (!invoice.customer_id) {
        setError(t("errors.customer_required"));
        return;
      }

      if (!items.length) {
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
          payment: paymentData,
          created_by: user.id,
        };

        const res = await api.createSalesInvoice(payload);

        if (!res?.success) {
          throw new Error(res?.error || t("errors.createInvoiceFailed"));
        }

        setInvoice(emptyInvoice);
        setItems([emptyItem]);

        navigate("/sales");
        return res;
      } catch (err) {
        setError(err?.message || t("errors.saveError"));
        return { success: false, error: err?.message };
      } finally {
        setSaving(false);
      }
    },
    [api, invoice, items, subtotal, netTotal, taxValue, navigate, t]
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
    customers,
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
    navigate,
    api,
    setProducts,
  };
}
