import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../Global/AuthContext";

const NO_SUPPLIER = "none";

const emptyItem = {
  category_id: "",
  name: "",
  price: 0,
  quantity: 1,
  total: 0,
};

const emptyInvoice = {
  supplier_id: NO_SUPPLIER,
  date: new Date().toISOString().slice(0, 10),
  status: "unpaid",
};

const useUpdateExpense = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
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
    if (!api) return setError(t("errors.apiNotAvailable"));

    try {
      setLoading(true);

      const [catRes, supRes] = await Promise.all([
        api.getExpensesCategory(),
        api.getSuppliers(),
      ]);

      setCategory(catRes || []);
      setSuppliers(supRes || []);
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

      setInvoice({
        ...res,
        supplier_id: res.supplier_id || NO_SUPPLIER,
      });
      setItems(res.items || []);
    } catch (err) {
      setError(err?.message || t("errors.loadExpenseFailed"));
    } finally {
      setLoading(false);
    }
  }, [api, id, t]);

  const supplierOptions = useMemo(
    () => [
      { id: NO_SUPPLIER, name: t("ui.noSupplier") },
      ...(Array.isArray(suppliers?.data) ? suppliers?.data : []),
    ],
    [suppliers, t],
  );

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

  const submit = useCallback(
    async (paymentData) => {
      if (!api) return setError(t("errors.apiNotAvailable"));

      if (!items.some((i) => i.category_id)) {
        return setError(t("errors.addOneItem"));
      }

      try {
        setSaving(true);
        setError("");

        const payload = {
          ...invoice,
          id,
          supplier_id:
            invoice.supplier_id === NO_SUPPLIER ? null : invoice.supplier_id,
          subtotal,
          net_total: netTotal,
          items,
          payment: paymentData || null,
          updated_by: user.id,
        };

        const res = await api.updateExpense(payload);
        console.log(res);

        if (!res?.success) {
          throw new Error(res?.error || t("errors.updateFailed"));
        }

        toast.success(t("success.updated", { field: t("ui.expense") }));
        navigate("/expense");
        return res;
      } catch (err) {
        setError(err?.message || t("errors.updateFailed"));
        return { success: false, error: err?.message };
      } finally {
        setSaving(false);
      }
    },
    [api, id, invoice, items, subtotal, netTotal, navigate, t],
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

    category,
    supplierOptions,

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

    status: invoice.status,
  };
};

export default useUpdateExpense;
