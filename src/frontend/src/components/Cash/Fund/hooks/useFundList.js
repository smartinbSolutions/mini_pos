import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const useFundList = () => {
  const { t } = useTranslation();
  const emptyFund = {
    name: "",
    currency_id: "",
    initial_balance: 0,
    balance_type: "increase",
    date: "",
  };

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
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const api = window.api;

  const normalizeFund = (fund) => {
    const exchangeRate = Number(fund.exchange_rate || 1);
    const balance = Number(fund.computed_balance || 0);

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
      return t("errors.nameRequired", { field: t("ui.fund") });
    }

    if (!fund.currency_id) {
      return t("errors.currencyRequired", { field: t("ui.fund") });
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

      let fundResult = await api.getFunds();
      let currencyResult = await api.getCurrencies();

      setFunds(fundResult || []);
      setCurrencies(currencyResult || []);
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setUnavailableHandlers([]);
      setError(
        err?.message || t("errors.createFailed", { field: t("ui.fund") })
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Single handler each — validation + API call + saving state + user
  // feedback (actionError/toast) all live in one place per action, rather
  // than a "raw" function plus a separate "for the form" wrapper.
  const handleCreateFund = async (fund) => {
    const validationError = validateFund(fund);
    if (validationError) {
      setActionError(validationError);
      toast.error(validationError);
      return false;
    }

    setSaving(true);
    try {
      await api.createFund({
        name: String(fund.name || "").trim(),
        currency_id: Number(fund.currency_id),
        currency_code: fund.currency_code,
        initial_balance: Number(fund.initial_balance || 0),
        balance_type:
          fund.balance_type === "decrease" ? "decrease" : "increase",
        date: fund.date || undefined,
      });
      await refetch();
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to create Fund:", err);
      const message =
        err?.message || t("errors.createFailed", { field: t("ui.fund") });
      setActionError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateFund = async (fund) => {
    const validationError = validateFund(fund);
    if (validationError) {
      setActionError(validationError);
      toast.error(validationError);
      return false;
    }

    setSaving(true);
    try {
      await api.updateFund(normalizeFund(fund));
      await refetch();
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update Fund:", err);
      const message =
        err?.message || t("errors.updateFailed", { field: t("ui.fund") });
      setActionError(message);
      toast.error(message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFund = async (fund) => {
    setSaving(true);
    try {
      const res = await api.deleteFund(fund.id);

      if (!res?.success) {
        throw new Error(
          res?.message || t("errors.deleteFailed", { field: t("ui.fund") })
        );
      }

      await refetch();
      setActionError("");
    } catch (err) {
      console.error("Failed to delete Fund:", err);
      const message =
        err?.message || t("errors.deleteFailed", { field: t("ui.fund") });
      setActionError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateFund(draft);
    if (saved) {
      setDraft(emptyFund);
    }
    return saved;
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
    return saved;
  };

  return {
    saving,
    funds,
    refetch,
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
    setActionError,
    setOpenTransferModal,
    openTransferModal,
  };
};

export default useFundList;
