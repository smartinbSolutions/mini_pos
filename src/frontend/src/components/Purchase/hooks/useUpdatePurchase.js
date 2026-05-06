import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const emptyItem = {
  product_id: "",
  name: "",
  quantity: 1,
  price: 0,
  total: 0,
};

export default function useUpdatePurchase() {
  const { id } = useParams();
  const api = window.api;

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [inv, prods, sups] = await Promise.all([
        api.getPurchaseInvoiceById(id),
        api.getProducts(),
        api.getSuppliers(),
      ]);

      setInvoice(inv);
      setItems(inv.items || []);
      setProducts(prods || []);
      setSuppliers(sups || []);
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

  const subtotal = items.reduce((s, i) => s + (i.total || 0), 0);

  const netTotal =
    subtotal - Number(invoice?.discount || 0) + Number(invoice?.tax || 0);

  const submit = async () => {
    try {
      setSaving(true);

      await api.updatePurchaseInvoice({
        ...invoice,
        items,
        subtotal,
        net_total: netTotal,
      });

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

    loading,
    saving,
    error,

    addItem,
    removeItem,
    updateItem,
    submit,

    subtotal,
    netTotal,
  };
}
