import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const emptyItem = {
  product_id: "",
  name: "",
  quantity: 1,
  price: 0,
  total: 0,
};

const emptyInvoice = {
  customer_id: "",
  date: new Date().toISOString().slice(0, 10),
  discount: 0,
};

export default function useAddSales() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = window.api;

  const [invoice, setInvoice] = useState(emptyInvoice);
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("unpaid");
  const [funds, setFunds] = useState([]);

  const refetch = useCallback(async () => {
    try {
      const res = await api.getProducts();
      const taxRes = await api.getTaxes();
      const custRes = await api.getCustomers();
      const fundResult = await api.getFunds();

      setProducts(res || []);
      setTaxes(taxRes || []);
      setCustomers(custRes || []);
      setFunds(fundResult || []);
    } catch (err) {
      setError(t("errors.loadError"));
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, []);

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
    return items.reduce((sum, i) => sum + i.total, 0);
  }, [items]);

  const netTotal = useMemo(() => {
    const discount = Number(invoice.discount || 0);
    const taxRate = Number(invoice.tax_rate || 0);
    const taxableAmount = Math.max(0, subtotal - discount);
    const taxValue = (taxableAmount * taxRate) / 100;

    return Math.max(0, taxableAmount + taxValue);
  }, [subtotal, invoice]);

  const taxableAmount = useMemo(() => {
    return Math.max(0, subtotal - Number(invoice.discount || 0));
  }, [subtotal, invoice.discount]);

  const taxValue = useMemo(() => {
    return (taxableAmount * Number(invoice.tax_rate || 0)) / 100;
  }, [taxableAmount, invoice.tax_rate]);
  useEffect(() => {
    if (status === "paid") {
      setInvoice((p) => ({
        ...p,
        paid_amount: netTotal,
      }));
    }
  }, [netTotal]);
  const paymentInfundCurrency = useMemo(() => {
    const payment = netTotal * (invoice.exchange_rate || 1);
    return payment;
  }, [netTotal, invoice]);

  const submit = async () => {
    if (status === "paid" && !invoice.fund_id) {
      toast.error(t("errors.selectFund"));
      return false;
    }
    if (!items.length) {
      setError(t("errors.addOneItem"));
      return false;
    }
    try {
      setSaving(true);

      const payload = {
        ...invoice,
        subtotal,
        net_total: netTotal,
        items,
        status,
        paymentInfundCurrency: status === "paid" ? paymentInfundCurrency : 0,
        taxValue,
      };

      const res = await api.createSalesInvoice(payload);

      if (!res.success) throw new Error();

      navigate("/sales");
    } catch (e) {
      console.log(e);

      setError(t("errors.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return {
    invoice,
    setInvoice,
    items,
    products,
    customers,
    addItem,
    removeItem,
    updateItem,
    submit,
    subtotal,
    taxableAmount,
    taxValue,
    netTotal,
    saving,
    error,
    navigate,
    taxes,
    funds,
    status,
    setStatus,
  };
}
