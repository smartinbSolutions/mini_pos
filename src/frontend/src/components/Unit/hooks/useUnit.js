import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function useUnit() {
  const { t } = useTranslation();
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

  const normalizeUnit = (unit) => ({
    ...unit,
    name: String(unit.name || "").trim(),
    latinName: String(unit.latinName || "").trim(),
    code: String(unit.code || "").trim(),
  });

  const validateUnit = (unit) => {
    if (!String(unit.name || "").trim()) {
      return t("errors.nameRequired", { field: t("ui.unit") });
    }

    if (!String(unit.code || "").trim()) {
      return t("errors.codeRequired", { field: t("ui.unit") });
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

      let unitResult = await api.getUnits();

      setUnits(unitResult || []);
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setUnavailableHandlers([]);
      setError(err?.message || t("errors.createFailed", { field: t("ui.units") }));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createUnit = async (unit) => {
    const validationError = validateUnit(unit);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.createUnit(normalizeUnit(unit));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateUnit = async (unit) => {
    const validationError = validateUnit(unit);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updateUnit(normalizeUnit(unit));
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
      return true;
    } catch (err) {
      console.error("Failed to create unit:", err);
      setActionError(err?.message || t("errors.createFailed", { field: t("ui.unit") }));
      return false;
    }
  };

  const handleUpdateUnit = async (unit) => {
    try {
      await updateUnit(unit);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update unit:", err);
      setActionError(err?.message || t("errors.updateFailed", { field: t("ui.unit") }));
      return false;
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
      setActionError(t("errors.deleteHasData", { field: t("ui.unit") }));
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateUnit(draft);
    if (saved) {
      setDraft(emptyUnit);
    }
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
    const saved = await handleUpdateUnit(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyUnit);
    }
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
    actionError,
  };
}
