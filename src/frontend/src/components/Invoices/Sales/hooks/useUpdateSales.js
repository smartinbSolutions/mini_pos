import { useCallback, useEffect, useState, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const emptyItem = {
  product_id: "",
  name: "",
  quantity: 1,
  price: 0,
  total: 0,
};

export default function useUpdateSales() {
  const { t } = useTranslation();
  const { id } = useParams();
  const api = window.api;
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [taxes, setTaxes] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);

      const [inv, prods, sups, tax] = await Promise.all([
        api.getSalesInvoiceById(id),
        api.getProducts(),
        api.getCustomers(),
        api.getTaxes(),
      ]);

      setInvoice(inv);
      setItems(inv.items || []);
      setProducts(prods || []);
      setCustomers(sups || []);
      setTaxes(tax || []);
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
          item.price = product.price || 0;
          item.name = product.name;
        }
      }

      item.total = Number(item.quantity || 0) * Number(item.price || 0);

      copy[index] = item;
      return copy;
    });
  };

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
              (i) => Number(i.product_id) === Number(product.id),
            );

            if (existingIndex !== -1) {
              const updated = [...prev];
              const item = updated[existingIndex];

              const newQty = Number(item.quantity) + 1;

              updated[existingIndex] = {
                ...item,
                quantity: newQty,
                total: newQty * Number(item.price),
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
    return items.reduce((s, i) => s + (i.total || 0), 0);
  }, [items]);

  const netTotal = useMemo(() => {
    const discount = Number(invoice?.discount || 0);
    const taxRate = Number(invoice?.tax_rate || 0);
    const taxValue = (subtotal * taxRate) / 100;

    return subtotal - discount + taxValue;
  }, [subtotal, invoice]);

  const submit = async () => {
    try {
      setSaving(true);

      await api.updateSalesInvoice({
        ...invoice,
        items,
        subtotal,
        net_total: netTotal,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
      navigate("/sales");
    }
  };

  return {
    invoice,
    setInvoice,
    items,
    products,
    customers,
    taxes,
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
