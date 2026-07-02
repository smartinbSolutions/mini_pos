import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const emptyItem = {
  category_id: "",
  name: "",
  price: 0,
  quantity: 1,
  total: 0,
};

const emptyInvoice = {
  supplier_id: "",
  date: new Date().toISOString().slice(0, 10),
  fund_id: "",
  exchange_rate: 1,
  paid_amount: 0,
};

const useUpdateExpense = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const api = window.api;

  const [invoice, setInvoice] = useState(emptyInvoice);
  const [items, setItems] = useState([emptyItem]);

  const [category, setCategory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [funds, setFunds] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const refetch = useCallback(async () => {
    if (!api) return setError(t("errors.apiNotAvailable"));

    try {
      setLoading(true);

      const [catRes, supRes, fundRes] = await Promise.all([
        api.getExpensesCategory(),
        api.getSuppliers(),
        api.getFunds(),
      ]);

      setCategory(catRes || []);
      setSuppliers(supRes || []);
      setFunds(fundRes || []);
    } catch (err) {
      setError(err?.message || t("errors.loadError"));
    } finally {
      setLoading(false);
    }
  }, [api, t]);

  const loadExpense = useCallback(async () => {
    if (!api || !id) return;

    try {
      setLoading(true);

      const res = await api.getExpense(id);

      if (!res) return;

      setInvoice(res);

      setItems(res.items || []);
    } catch (err) {
      setError(err?.message || "Failed to load expense");
    } finally {
      setLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    refetch();
    loadExpense();
  }, [refetch, loadExpense]);

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

      item.price = Number(item.price || 0);

      item.total = item.price;

      copy[index] = item;
      return copy;
    });
  };

  const subtotal = items.reduce((s, i) => s + (i.price || 0), 0);

  const netTotal = useMemo(() => Math.max(0, subtotal), [subtotal]);

  const paymentInfundCurrency = useMemo(() => {
    return netTotal * (invoice.exchange_rate || 1);
  }, [netTotal, invoice.exchange_rate]);

  useEffect(() => {
    setInvoice((prev) => ({
      ...prev,
      paid_amount: netTotal,
    }));
  }, [netTotal]);

  const submit = useCallback(async () => {
    if (!api) return setError(t("errors.apiNotAvailable"));

    if (!invoice.supplier_id) return setError(t("errors.supplierRequired"));

    if (!items.length) return setError(t("errors.addOneItem"));

    try {
      setSaving(true);
      setError("");

      const payload = {
        ...invoice,
        subtotal,
        net_total: netTotal,
        items,
        paymentInfundCurrency,
      };

      const res = await api.updateExpense({
        ...invoice,
        subtotal,
        net_total: netTotal,
        items,
        paymentInfundCurrency,
      });

      if (!res?.success) {
        throw new Error(t("errors.updateFailed"));
      }

      toast.success("Expense updated successfully");

      navigate("/expense");
      return res;
    } catch (err) {
      setError(err?.message || t("errors.updateFailed"));
    } finally {
      setSaving(false);
    }
  }, [
    api,
    id,
    invoice,
    items,
    subtotal,
    netTotal,
    paymentInfundCurrency,
    navigate,
    t,
  ]);

  const reset = () => {
    setInvoice(emptyInvoice);
    setItems([emptyItem]);
    setError("");
  };

  return {
    invoice,
    setInvoice,

    items,
    setItems,

    category,
    suppliers,
    funds,

    loading,
    saving,
    error,

    addItem,
    removeItem,
    updateItem,

    subtotal,
    netTotal,

    submit,
    reset,
    refetch,
  };
};

export default useUpdateExpense;
