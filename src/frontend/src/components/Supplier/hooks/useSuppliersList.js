import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const useSuppliersList = () => {
  const { t } = useTranslation();
  const emptySupplier = { name: "", phone: "", address: "" };
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptySupplier);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptySupplier);
  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selecteSupplier, setSelecteSupplier] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const api = window.api;

  const normalizeSupplier = (sup) => ({
    ...sup,
    name: String(sup.name || "").trim(),
    phone: String(sup.phone || "").trim(),
    address: String(sup.address || "").trim(),
  });

  const validateSupplier = (sup) => {
    if (!String(sup.name || "").trim()) {
      return t("errors.nameRequired", { field: t("ui.supplier") });
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

      const res = await api.getSuppliers({ page, limit });

      setSuppliers(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
    } catch (err) {
      console.error("Failed to load supplier list:", err);
      setUnavailableHandlers([]);
      setError(
        err?.message || t("errors.createFailed", { field: t("ui.supplier") })
      );
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createSupplier = async (sup) => {
    const validationError = validateSupplier(sup);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.createSupplier(normalizeSupplier(sup));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateSupplier = async (sup) => {
    const validationError = validateSupplier(sup);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updateSupplier(normalizeSupplier(sup));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (sup) => {
    setSaving(true);
    try {
      await api.deleteSupplier(sup.id);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSupplier = async (sup) => {
    try {
      await createSupplier(sup);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to create Supplier:", err);
      setActionError(t("errors.createFailed", { field: t("ui.supplier") }));
      return false;
    }
  };

  const handleUpdateSupplier = async (sup) => {
    try {
      await updateSupplier(sup);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update Supplier:", err);
      setActionError(t("errors.updateFailed", { field: t("ui.supplier") }));
      return false;
    }
  };

  const handleDeleteSupplier = async (sup) => {
    try {
      await deleteSupplier(sup);
      setActionError("");
      setEditing(emptySupplier);
      setEditingId("");
    } catch (err) {
      console.error("Failed to delete Supplier:", err);
      setActionError(t("errors.deleteHasData", { field: t("ui.supplier") }));
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateSupplier(draft);
    if (saved) {
      setDraft(emptySupplier);
    }
    return saved;
  };

  const startEdit = (sup) => {
    setEditingId(sup.id);
    setEditing({
      id: sup.id,
      name: sup.name || "",
      phone: sup.phone || "",
      address: sup.address || "",
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const saved = await handleUpdateSupplier(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptySupplier);
    }
  };

  return {
    createSupplier,
    updateSupplier,
    deleteSupplier,
    saving,
    suppliers,
    handleDeleteSupplier,
    handleCreateSupplier,
    handleUpdateSupplier,
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
    selecteSupplier,
    setSelecteSupplier,
    refetch,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
  };
};

export default useSuppliersList;
