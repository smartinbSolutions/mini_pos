import React, { useCallback, useEffect, useState } from "react";

const useFundList = () => {
  const emptyFund = { name: "", latinName: "", code: "", exchangeRate: 1 };

  const [saving, setSaving] = useState(false);
  const [funds, setFunds] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyFund);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyFund);

  const api = window.api;

  const refetch = useCallback(async () => {
    if (!api) {
      setError("Electron preload API is not available.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      let fundResult = await api.getFunds();
      let currencyResult = await api.getCurrencies();

      setFunds(fundResult || []);
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

  const createFund = async (fund) => {
    setSaving(true);
    try {
      await api.createFund(fund);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateFund = async (fund) => {
    setSaving(true);
    try {
      await api.updateFund(fund);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteFund = async (fund) => {
    setSaving(true);
    try {
      await api.deleteFund(fund.id);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateFund = async (fund) => {
    try {
      await createFund(fund);
      setActionError("");
    } catch (err) {
      console.error("Failed to create Fund:", err);
      setActionError(err?.message || "Failed to create Fund.");
    }
  };

  const handleUpdateFund = async (fund) => {
    try {
      await updateFund(fund);
      setActionError("");
    } catch (err) {
      console.error("Failed to update Fund:", err);
      setActionError(err?.message || "Failed to update Fund.");
    }
  };

  const handleDeleteFund = async (fund) => {
    // const confirmed = window.confirm(`Delete Fund "${fund.name}"?`);
    // if (!confirmed) return;

    try {
      await deleteFund(fund);
      setActionError("");
    } catch (err) {
      console.error("Failed to delete Fund:", err);
      setActionError(err?.message || "Failed to delete Fund.");
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    await handleCreateFund(draft);
    setDraft(emptyFund);
  };

  const startEdit = (fund) => {
    setEditingId(fund.id);
    setEditing({
      id: fund.id,
      name: fund.name || "",
      balance: fund.balance || "",
      currency_name: fund.currency_name || 1,
      currency_id: fund.currency_id || 1,
      currency_code: fund.currency_code || 1,
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    await handleUpdateFund(editing);
    setEditingId(null);
    setEditing(emptyFund);
  };
  return {
    createFund,
    updateFund,
    deleteFund,
    saving,
    funds,
    handleDeleteFund,
    handleCreateFund,
    handleUpdateFund,
    submitDraft,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
    currencies,
  };
};

export default useFundList;
