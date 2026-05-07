import React, { useCallback, useEffect, useState } from "react";

const useSuppliersList = () => {
  const emptyCustomer = { name: "", phone: "", address: "" };

  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyCustomer);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyCustomer);

  const api = window.api;

  const normalizeCustomer = (cust) => ({
    ...cust,
    name: String(cust.name || "").trim(),
    phone: String(cust.phone || "").trim(),
    address: String(cust.address || "").trim(),
  });

  const validateCustomer = (cust) => {
    if (!String(cust.name || "").trim()) {
      return "Customer name is required.";
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

      let customersResult = await api.getCustomers();

      setCustomers(customersResult || []);
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

  const createCustomer = async (cust) => {
    const validationError = validateCustomer(cust);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.createCustomer(normalizeCustomer(cust));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updateCustomer = async (cust) => {
    const validationError = validateCustomer(cust);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updateCustomer(normalizeCustomer(cust));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (cust) => {
    setSaving(true);
    try {
      await api.deleteCustomer(cust.id);

      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCustomer = async (cust) => {
    try {
      await createCustomer(cust);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to create Customer:", err);
      setActionError(err?.message || "Failed to create Customer.");
      return false;
    }
  };

  const handleUpdateCustomer = async (cust) => {
    try {
      await updateCustomer(cust);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update Customer:", err);
      setActionError(err?.message || "Failed to update Customer.");
      return false;
    }
  };

  const handleDeleteCustomer = async (cust) => {
    // const confirmed = window.confirm(`Delete Customer "${sup.name}"?`);
    // if (!confirmed) return;

    try {
      await deleteCustomer(cust);
      setActionError("");
      setEditing(emptyCustomer);
      setEditingId("");
    } catch (err) {
      console.error("Failed to delete Customer:", err);
      setActionError(err?.message || "Failed to delete Customer.");
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateCustomer(draft);
    if (saved) {
      setDraft(emptyCustomer);
    }
  };

  const startEdit = (cust) => {
    setEditingId(cust.id);
    setEditing({
      id: cust.id,
      name: cust.name || "",
      phone: cust.phone || "",
      address: cust.address || "",
    });
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const saved = await handleUpdateCustomer(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyCustomer);
    }
  };

  return {
    createCustomer,
    updateCustomer,
    deleteCustomer,
    saving,
    customers,
    handleDeleteCustomer,
    handleCreateCustomer,
    handleUpdateCustomer,
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

export default useSuppliersList;
