import React, { useCallback, useEffect, useState } from "react";

const useCurrency = () => {
  const emptyCurrency = {
    name: "",
    latinName: "",
    code: "",
    exchangeRate: 1,
    symbol: "",
  };

  const [saving, setSaving] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyCurrency);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyCurrency);

  const api = window.api;

  const normalizeCurrency = (currency) => ({
    ...currency,
    name: String(currency.name || "").trim(),
    latinName: String(currency.latinName || "").trim(),
    code: String(currency.code || "").trim(),
    exchangeRate: Number(currency.exchangeRate),
  });

  const validateCurrency = (currency) => {
    if (!String(currency.name || "").trim()) {
      return "Currency name is required.";
    }

    if (!String(currency.code || "").trim()) {
      return "Currency code is required.";
    }

    if (
      currency.exchangeRate === "" ||
      currency.exchangeRate === null ||
      !Number.isFinite(Number(currency.exchangeRate))
    ) {
      return "Currency exchange rate is required.";
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

      let currencyResult = await api.getCurrencies();

      setCurrencies(currencyResult || []);
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

  const createCurrency = async (currency) => {
    const validationError = validateCurrency(currency);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.createCurrency(normalizeCurrency(currency));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateCurrency = async (currency) => {
    const validationError = validateCurrency(currency);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updateCurrency(normalizeCurrency(currency));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrency = async (currency) => {
    setSaving(true);
    try {
      await api.deleteCurrency(currency.id);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCurrency = async (currency) => {
    try {
      await createCurrency(currency);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to create Currency:", err);
      setActionError(err?.message || "Failed to create Currency.");
      return false;
    }
  };

  const handleUpdateCurrency = async (currency) => {
    try {
      await updateCurrency(currency);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update Currency:", err);
      setActionError(err?.message || "Failed to update Currency.");
      return false;
    }
  };

  const handleDeleteCurrency = async (currency) => {
    // const confirmed = window.confirm(`Delete Currency "${currency.name}"?`);
    // if (!confirmed) return;

    try {
      await deleteCurrency(currency);
      setActionError("");
    } catch (err) {
      console.error("Failed to delete Currency:", err);
      setActionError(err?.message || "Failed to delete Currency.");
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateCurrency(draft);
    if (saved) {
      setDraft(emptyCurrency);
    }
  };

  const startEdit = (currency) => {
    setEditingId(currency.id);
    setEditing({
      id: currency.id,
      name: currency.name || "",
      latinName: currency.latinName || "",
      code: currency.code || "",
      exchangeRate: currency.exchangeRate || 1,
      symbol: currency.symbol || "",
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const saved = await handleUpdateCurrency(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyCurrency);
    }
  };

  return {
    createCurrency,
    updateCurrency,
    deleteCurrency,
    saving,
    currencies,
    handleDeleteCurrency,
    handleCreateCurrency,
    handleUpdateCurrency,
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

export default useCurrency;
