import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const useSuppliersList = () => {
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

  const api = window.api;

  const normalizeSupplier = (sup) => ({
    ...sup,
    name: String(sup.name || "").trim(),
    phone: String(sup.phone || "").trim(),
    address: String(sup.address || "").trim(),
  });

  const validateSupplier = (sup) => {
    if (!String(sup.name || "").trim()) {
      return "Supplier name is required.";
    }

    return "";
  };

  const refetch = useCallback(async () => {
    if (!api) {
      setError("Electron preload API is not available.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      let suppliersResult = await api.getSuppliers();

      setSuppliers(suppliersResult || []);
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setUnavailableHandlers([]);
      setError(err?.message || "Failed to load product catalog.");
    } finally {
      setLoading(false);
    }
  }, [api]);

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
      setActionError(err?.message || "Failed to create Supplier.");
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
      setActionError(err?.message || "Failed to update Supplier.");
      return false;
    }
  };

  const handleDeleteSupplier = async (sup) => {
    // const confirmed = window.confirm(`Delete Supplier "${sup.name}"?`);
    // if (!confirmed) return;

    try {
      await deleteSupplier(sup);
      setActionError("");
      setEditing(emptySupplier);
      setEditingId("");
    } catch (err) {
      console.error("Failed to delete Supplier:", err);
      setActionError(err?.message || "Failed to delete Supplier.");
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateSupplier(draft);
    if (saved) {
      setDraft(emptySupplier);
    }
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
  };
};

export default useSuppliersList;
