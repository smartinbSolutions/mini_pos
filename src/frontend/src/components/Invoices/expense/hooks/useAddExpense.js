import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../Global/AuthContext";

const NO_SUPPLIER = "none";

const emptyItem = {
  category_id: "",
  name: "",
  price: 0,
  total: 0,
};

const emptyInvoice = {
  supplier_id: NO_SUPPLIER,
  date: new Date().toISOString().slice(0, 10),
};

const useAddExpense = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = window.api;
  const { user } = useAuth();

  const [invoice, setInvoice] = useState(emptyInvoice);
  const [items, setItems] = useState([emptyItem]);

  const [category, setCategory] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

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

      const [categoryRes, suppliersRes] = await Promise.all([
        api.getExpensesCategory(),
        api.getSuppliers(),
      ]);

      setCategory(categoryRes || []);
      setSuppliers(suppliersRes || []);

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

  const supplierOptions = useMemo(
    () => [
      { id: NO_SUPPLIER, name: t("ui.noSupplier") },
      ...(Array.isArray(suppliers?.data) ? suppliers?.data : []),
    ],
    [suppliers, t],
  );

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

      if (!items.length) {
        setError(t("errors.addOneItem"));
        return;
      }

      try {
        setSaving(true);
        setError("");

        const payload = {
          ...invoice,
          supplier_id:
            invoice.supplier_id === NO_SUPPLIER ? null : invoice.supplier_id,
          subtotal,
          net_total: netTotal,
          items,
          payment: paymentData,
          created_by: user.id,
        };

        const res = await api.createExpense(payload);

        if (!res?.success) {
          throw new Error(res?.error || t("errors.createInvoiceFailed"));
        }

        setInvoice(emptyInvoice);
        setItems([emptyItem]);

        navigate("/expense");

        return res;
      } catch (err) {
        setError(err?.message || t("errors.createInvoiceFailed"));
        return { success: false, error: err?.message };
      } finally {
        setSaving(false);
      }
    },
    [api, invoice, items, subtotal, netTotal, navigate, t],
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
    setItems,

    supplierOptions,
    category,

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

export default useAddExpense;
