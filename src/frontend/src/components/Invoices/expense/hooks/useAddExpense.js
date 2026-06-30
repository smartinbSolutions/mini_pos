import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const emptyItem = {
  category_id: "",
  name: "test",
  price: 0,
  total: 0,
};

const emptyInvoice = {
  supplier_id: "",
  date: new Date().toISOString().slice(0, 10),
  fund_id: "",
  exchange_rate: 1,
  paid_amount: 0,
};

const useAddExpense = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = window.api;

  const [invoice, setInvoice] = useState(emptyInvoice);
  const [items, setItems] = useState([emptyItem]);

  const [category, setCategory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [funds, setFunds] = useState([]);

  const [status, setStatus] = useState("unpaid");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiNotAvailable"));
      return;
    }

    try {
      setLoading(true);

      const [categoryRes, suppliersRes, fundsRes] = await Promise.all([
        api.getExpensesCategory(),
        api.getSuppliers(),
        api.getFunds(),
      ]);

      setCategory(categoryRes || []);
      setSuppliers(suppliersRes || []);
      setFunds(fundsRes || []);

      setError("");
    } catch (err) {
      setError(err?.message || t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

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
      const item = { ...copy[index] };

      item[key] = value;

      const price = Number(item.price || 0);

      item.total = price;

      copy[index] = item;

      return copy;
    });
  };

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  }, [items]);

  const netTotal = useMemo(() => {
    return Math.max(0, subtotal);
  }, [subtotal]);

  const paymentInfundCurrency = useMemo(() => {
    return netTotal * (invoice.exchange_rate || 1);
  }, [netTotal, invoice.exchange_rate]);

  useEffect(() => {
    if (status === "paid") {
      setInvoice((prev) => ({
        ...prev,
        paid_amount: netTotal,
      }));
    }
  }, [status, netTotal]);

  const submit = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiNotAvailable"));
      return;
    }

    if (!invoice.supplier_id) {
      setError(t("errors.supplierRequired"));
      return;
    }

    if (!items.length) {
      setError(t("errors.addOneItem"));
      return;
    }

    if (status === "paid" && !invoice.fund_id) {
      toast.error(t("errors.selectFund"));
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
      const res = await api.createExpense(payload);

      if (!res?.success) {
        throw new Error(t("errors.createInvoiceFailed"));
      }

      setInvoice(emptyInvoice);
      setItems([emptyItem]);
      setStatus("unpaid");

      navigate("/expense");

      return res;
    } catch (err) {
      setError(err?.message || t("errors.createInvoiceFailed"));
    } finally {
      setSaving(false);
    }
  }, [
    api,
    invoice,
    items,
    subtotal,
    netTotal,
    status,
    paymentInfundCurrency,
    navigate,
    t,
  ]);

  const reset = () => {
    setInvoice(emptyInvoice);
    setItems([emptyItem]);
    setStatus("unpaid");
    setError("");
  };

  return {
    invoice,
    setInvoice,
    items,
    setItems,

    suppliers,
    funds,
    category,

    status,
    setStatus,

    loading,
    saving,
    error,

    addItem,
    removeItem,
    updateItem,

    submit,
    reset,
    refetch,
  };
};

export default useAddExpense;
