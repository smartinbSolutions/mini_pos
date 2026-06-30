import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const useExpenseCategory = () => {
  const { t } = useTranslation();
  const emptyExpenseCategory = { name: "" };

  const [saving, setSaving] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyExpenseCategory);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyExpenseCategory);

  const api = window.api;

  const normalizeExpenseCategory = (expenseCategory) => ({
    ...expenseCategory,
    name: String(expenseCategory.name || "").trim(),
  });

  const validateExpenseCategory = (expenseCategory) => {
    if (!String(expenseCategory.name || "").trim()) {
      return t("errors.nameRequired", { field: t("ui.expenseCategory") });
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

      let expenseCategoryResult = await api.getExpensesCategory();

      setExpenseCategory(expenseCategoryResult || []);
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setUnavailableHandlers([]);
      setError(
        err?.message ||
          t("errors.createFailed", { field: t("ui.expenseCategory") }),
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createExpenseCategory = async (expenseCategory) => {
    const validationError = validateExpenseCategory(expenseCategory);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.createExpenseCategory(
        normalizeExpenseCategory(expenseCategory),
      );
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateExpenseCategory = async (expenseCategory) => {
    const validationError = validateExpenseCategory(expenseCategory);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updateExpenseCategory(
        normalizeExpenseCategory(expenseCategory),
      );
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteExpenseCategory = async (expenseCategory) => {
    setSaving(true);

    try {
      await api.deleteExpenseCategory(expenseCategory);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateExpenseCategory = async (expenseCategory) => {
    try {
      await createExpenseCategory(expenseCategory);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to create expense Category:", err);
      setActionError(
        err?.message ||
          t("errors.createFailed", { field: t("ui.expenseCategory") }),
      );
      return false;
    }
  };

  const handleUpdateExpenseCategory = async (expenseCategory) => {
    try {
      await updateExpenseCategory(expenseCategory);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update expense Category:", err);
      setActionError(
        err?.message ||
          t("errors.updateFailed", { field: t("ui.expenseCategory") }),
      );
      return false;
    }
  };

  const handleDeleteExpenseCategory = async (expenseCategory) => {
    try {
      await deleteExpenseCategory(expenseCategory);
      setActionError("");
    } catch (err) {
      console.error("Failed to delete expense Category:", err);
      setActionError(
        t("errors.deleteHasData", { field: t("ui.expenseCategory") }),
      );
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateExpenseCategory(draft);
    if (saved) {
      setDraft(emptyExpenseCategory);
    }
  };

  const startEdit = (expenseCategory) => {
    setEditingId(expenseCategory.id);
    setEditing({
      id: expenseCategory.id,
      name: expenseCategory.name || "",
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const saved = await handleUpdateExpenseCategory(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyExpenseCategory);
    }
  };

  return {
    createExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    saving,
    expenseCategory,
    handleDeleteExpenseCategory,
    handleCreateExpenseCategory,
    handleUpdateExpenseCategory,
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
};

export default useExpenseCategory;
