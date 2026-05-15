import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";

const useFundList = () => {
  const emptyFund = { name: "", currency_id: "", balance: "" };

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

  const normalizeFund = (fund) => {
    const exchangeRate = Number(fund.exchange_rate || 1);
    const balance = Number(fund.balance || 0);

    return {
      ...fund,
      name: String(fund.name || "").trim(),
      currency_id: Number(fund.currency_id),
      balance: Number(balance / exchangeRate || 0),
      exchange_rate: exchangeRate,
      currency_code: fund.currency_code,
      paymentInfundCurrency: balance,
    };
  };

  const validateFund = (fund) => {
    if (!String(fund.name || "").trim()) {
      return "Fund name is required.";
    }

    if (!fund.currency_id) {
      return "Fund currency is required.";
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
    const validationError = validateFund(fund);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.createFund(normalizeFund(fund));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateFund = async (fund) => {
    const validationError = validateFund(fund);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updateFund(normalizeFund(fund));
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
      return true;
    } catch (err) {
      console.error("Failed to create Fund:", err);
      const message = err?.message || "Failed to create Fund.";
      setActionError(message);
      toast.error(message);
      return false;
    }
  };

  const handleUpdateFund = async (fund) => {
    try {
      await updateFund(fund);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update Fund:", err);
      const message = err?.message || "Failed to update Fund.";
      setActionError(message);
      toast.error(message);
      return false;
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
      toast.error("Failed to delete Fund.");
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateFund(draft);
    if (saved) {
      setDraft(emptyFund);
    }
  };

  const startEdit = (fund) => {
    setEditingId(fund.id);
    setEditing({
      id: fund.id,
      name: fund.name || "",
      balance: fund.balance || "",
      currency_name: fund.currency_name || "",
      currency_id: fund.currency_id || "",
      currency_code: fund.currency_code || "",
      exchange_rate: fund.exchange_rate || 1,
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const saved = await handleUpdateFund(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyFund);
    }
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
    actionError,
  };
};

export default useFundList;
