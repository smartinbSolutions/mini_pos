import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const useCustomerList = () => {
  const { t } = useTranslation();
  const emptyCustomer = {
    name: "",
    phone: "",
    address: "",
    opening_balance: 0,
  };
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyCustomer);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyCustomer);
  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selecteCustomer, setSelecteCustomer] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const api = window.api;

  const normalizeCustomer = (cust) => ({
    ...cust,
    name: String(cust.name || "").trim(),
    phone: String(cust.phone || "").trim(),
    address: String(cust.address || "").trim(),
    opening_balance: cust.opening_balance,
    balance_type: cust.balance_type || "deposit",
  });

  const validateCustomer = (cust) => {
    if (!String(cust.name || "").trim()) {
      return t("errors.nameRequired", { field: t("ui.customer") });
    }

    return "";
  };

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiUnavailable"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      let res = await api.getCustomers({ page, limit });

      setCustomers(res.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setUnavailableHandlers([]);
      setError(
        err?.message || t("errors.createFailed", { field: t("ui.customer") })
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createCustomer = async (cust) => {
    const validationError = validateCustomer(cust);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      const res = await api.createCustomer(normalizeCustomer(cust));
      await refetch();
      return res;
    } finally {
      setSaving(false);
    }
  };

  const updateCustomer = async (cust) => {
    const validationError = validateCustomer(cust);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updateCustomer(normalizeCustomer(cust));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (cust) => {
    setSaving(true);
    try {
      const res = await api.deleteCustomer(cust.id);

      if (res?.success === false) {
        throw new Error(
          res.message ||
            res.error ||
            t("errors.deleteHasData", { field: t("ui.customer") })
        );
      }

      await refetch();
      return res;
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomer = async (cust) => {
    try {
      const result = await createCustomer(cust);
      setActionError("");
      toast.success(t("success.created", { field: t("ui.customer") }));
      return result;
    } catch (err) {
      console.error("Failed to create Customer:", err);
      const message =
        err?.message || t("errors.createFailed", { field: t("ui.customer") });
      setActionError(message);
      toast.error(message);
      return false;
    }
  };

  const handleUpdateCustomer = async (cust) => {
    try {
      await updateCustomer(cust);
      setActionError("");
      toast.success(t("success.updated", { field: t("ui.customer") }));
      return true;
    } catch (err) {
      console.error("Failed to update Customer:", err);
      const message =
        err?.message || t("errors.updateFailed", { field: t("ui.customer") });
      setActionError(message);
      toast.error(message);
      return false;
    }
  };

  const handleDeleteCustomer = async (cust) => {
    try {
      await deleteCustomer(cust);
      setActionError("");
      setEditing(emptyCustomer);
      setEditingId("");
      toast.success(t("success.deleted", { field: t("ui.customer") }));
    } catch (err) {
      console.error("Failed to delete Customer:", err);
      const message =
        t("errors.deleteHasData", { field: t("ui.customer") }) || err?.message;
      setActionError(message);
      toast.error(message);
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateCustomer(draft);
    if (saved && saved !== false) {
      setDraft(emptyCustomer);
    }
    return saved;
  };

  const startEdit = (cust) => {
    setEditingId(cust.id);
    setEditing({
      id: cust.id,
      name: cust.name || "",
      phone: cust.phone || "",
      address: cust.address || "",
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const saved = await handleUpdateCustomer(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyCustomer);
    }
  };

  return {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    saving,
    customers,
    handleDeleteCustomer,
    handleCreateCustomer,
    handleUpdateCustomer,
    submitDraft,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
    actionError,
    navigate,
    openPaymentModel,
    setOpenPaymentModel,
    selecteCustomer,
    setSelecteCustomer,
    refetch,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
  };
};

export default useCustomerList;
