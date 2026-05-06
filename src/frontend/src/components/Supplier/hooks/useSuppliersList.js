import React, { useCallback, useEffect, useState } from "react";

const useSuppliersList = () => {
  const emptySupplier = { name: "", phone: "", address: "" };

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
    setSaving(true);
    try {
      await api.createSupplier(sup);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateSupplier = async (sup) => {
    setSaving(true);
    try {
      await api.updateSupplier(sup);
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
    } catch (err) {
      console.error("Failed to create Supplier:", err);
      setActionError(err?.message || "Failed to create Supplier.");
    }
  };

  const handleUpdateSupplier = async (sup) => {
    try {
      await updateSupplier(sup);
      setActionError("");
    } catch (err) {
      console.error("Failed to update Supplier:", err);
      setActionError(err?.message || "Failed to update Supplier.");
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
    await handleCreateSupplier(draft);
    setDraft(emptySupplier);
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
    await handleUpdateSupplier(editing);
    setEditingId(null);
    setEditing(emptySupplier);
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
  };
};

export default useSuppliersList;
