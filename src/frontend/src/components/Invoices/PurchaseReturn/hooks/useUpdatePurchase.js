import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const emptyItem = {
  product_id: "",
  name: "",
  quantity: 1,
  price: 0,
  total: 0,
};

export default function useUpdatePurchase() {
  const { t } = useTranslation();
  const { id } = useParams();
  const api = window.api;
  const navigat = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [taxes, setTaxes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [inv, prods, sups, taxRes] = await Promise.all([
        api.getPurchaseInvoiceById(id),
        api.getProducts(),
        api.getSuppliers(),
        api.getTaxes(),
      ]);

      setInvoice(inv);

      setItems(inv.items || []);
      setProducts(prods || []);
      setSuppliers(sups || []);
      setTaxes(taxRes || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const addItem = () => {
    setItems((p) => [...p, emptyItem]);
  };

  const removeItem = (index) => {
    setItems((p) => p.filter((_, i) => i !== index));
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

      item.total = Number(item.quantity || 0) * Number(item.price || 0);

      copy[index] = item;
      return copy;
    });
  };

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

  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);

  const netTotal = useMemo(() => {
    const discount = Number(invoice?.discount || 0);
    const taxRate = Number(invoice?.tax_rate || 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxValue = taxableAmount * (taxRate / 100);

    return Math.max(0, taxableAmount + taxValue);
  }, [subtotal, invoice]);

  const taxableAmount = useMemo(() => {
    return Math.max(0, subtotal - Number(invoice?.discount || 0));
  }, [subtotal, invoice?.discount]);

  const taxValue = useMemo(() => {
    return taxableAmount * (Number(invoice?.tax_rate || 0) / 100);
  }, [taxableAmount, invoice?.tax_rate]);

  const submit = async () => {
    try {
      setSaving(true);

      await api.updatePurchaseInvoice({
        ...invoice,
        items,
        subtotal,
        net_total: netTotal,
        taxValue,
      });
      navigat("/purchase");
      return true;
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    invoice,
    setInvoice,
    items,
    products,
    suppliers,
    taxes,
    loading,
    saving,
    error,

    addItem,
    removeItem,
    updateItem,
    submit,

    subtotal,
    taxableAmount,
    taxValue,
    netTotal,
  };
}
