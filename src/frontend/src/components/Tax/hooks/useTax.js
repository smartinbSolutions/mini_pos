import React, { useCallback, useEffect, useState } from "react";

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
    setSaving(true);
    try {
      await api.createTax(tax);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateTax = async (unit) => {
    setSaving(true);
    try {
      await api.updateTax(unit);
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
    } catch (err) {
      console.error("Failed to create tax:", err);
      setActionError(err?.message || "Failed to create unit.");
    }
  };

  const handleUpdateTax = async (tax) => {
    try {
      await updateTax(tax);
      setActionError("");
    } catch (err) {
      console.error("Failed to update tax:", err);
      setActionError(err?.message || "Failed to update tax.");
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
      setActionError(err?.message || "Failed to delete tax.");
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    await handleCreateTax(draft);
    setDraft(emptyTax);
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
    await handleUpdateTax(editing);
    setEditingId(null);
    setEditing(emptyTax);
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
  };
}
