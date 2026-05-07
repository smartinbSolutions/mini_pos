import React, { useCallback, useEffect, useState } from "react";

export default function useUnit() {
  const emptyUnit = { name: "", latinName: "", code: "" };

  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyUnit);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyUnit);

  const api = window.api;

  const refetch = useCallback(async () => {
    if (!api) {
      setError("Electron preload API is not available.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      let unitResult = await api.getUnits();

      setUnits(unitResult || []);
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

  const createUnit = async (unit) => {
    setSaving(true);
    try {
      const data = await api.createUnit(unit);

      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateUnit = async (unit) => {
    setSaving(true);
    try {
      await api.updateUnit(unit);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteUnit = async (unit) => {
    setSaving(true);
    try {
      await api.deleteUnit(unit.id);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateUnit = async (unit) => {
    try {
      await createUnit(unit);
      setActionError("");
    } catch (err) {
      console.error("Failed to create unit:", err);
      setActionError(err?.message || "Failed to create unit.");
    }
  };

  const handleUpdateUnit = async (unit) => {
    try {
      await updateUnit(unit);
      setActionError("");
    } catch (err) {
      console.error("Failed to update unit:", err);
      setActionError(err?.message || "Failed to update unit.");
    }
  };

  const handleDeleteUnit = async (unit) => {
    // const confirmed = window.confirm(`Delete unit "${unit.name}"?`);
    // if (!confirmed) return;

    try {
      await deleteUnit(unit);
      setActionError("");
    } catch (err) {
      console.error("Failed to delete unit:", err);
      setActionError(err?.message || "Failed to delete unit.");
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    await handleCreateUnit(draft);
    setDraft(emptyUnit);
  };

  const startEdit = (unit) => {
    setEditingId(unit.id);
    setEditing({
      id: unit.id,
      name: unit.name || "",
      latinName: unit.latinName || "",
      code: unit.code || "",
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    await handleUpdateUnit(editing);
    setEditingId(null);
    setEditing(emptyUnit);
  };

  return {
    createUnit,
    updateUnit,
    deleteUnit,
    saving,
    units,
    handleDeleteUnit,
    handleCreateUnit,
    handleUpdateUnit,
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
