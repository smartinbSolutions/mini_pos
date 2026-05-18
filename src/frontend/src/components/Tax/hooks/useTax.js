import { useCallback, useEffect, useState } from "react";

export default function useTax() {
  const emptyTax = { name: "", rate: 0 };

  const [saving, setSaving] = useState(false);
  const [taxes, setTaxes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyTax);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyTax);

  const api = window.api;

  const normalizeTax = (tax) => ({
    ...tax,
    name: String(tax.name || "").trim(),
    rate: Number(tax.rate),
  });

  const validateTax = (tax) => {
    if (!String(tax.name || "").trim()) {
      return "Tax name is required.";
    }

    if (
      tax.rate === "" ||
      tax.rate === null ||
      !Number.isFinite(Number(tax.rate))
    ) {
      return "Tax value is required.";
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

      let taxResult = await api.getTaxes();

      setTaxes(taxResult || []);
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

  const createTax = async (tax) => {
    const validationError = validateTax(tax);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.createTax(normalizeTax(tax));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateTax = async (tax) => {
    const validationError = validateTax(tax);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updateTax(normalizeTax(tax));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteTax = async (tax) => {
    setSaving(true);
    try {
      await api.deleteTax(tax.id);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTax = async (tax) => {
    try {
      await createTax(tax);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to create tax:", err);
      setActionError(err?.message || "Failed to create tax.");
      return false;
    }
  };

  const handleUpdateTax = async (tax) => {
    try {
      await updateTax(tax);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update tax:", err);
      setActionError(err?.message || "Failed to update tax.");
      return false;
    }
  };

  const handleDeleteTax = async (tax) => {
    // const confirmed = window.confirm(`Delete tax "${tax.name}"?`);
    // if (!confirmed) return;

    try {
      await deleteTax(tax);
      setActionError("");
    } catch (err) {
      console.error("Failed to delete tax:", err);
      setActionError("Failed to delete tax have data.");
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateTax(draft);
    if (saved) {
      setDraft(emptyTax);
    }
  };

  const startEdit = (tax) => {
    setEditingId(tax.id);
    setEditing({
      id: tax.id,
      name: tax.name || "",
      rate: tax.rate || "",
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const saved = await handleUpdateTax(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyTax);
    }
  };

  return {
    createTax,
    updateTax,
    deleteTax,
    saving,
    taxes,
    handleDeleteTax,
    handleCreateTax,
    handleUpdateTax,
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
  };
}
