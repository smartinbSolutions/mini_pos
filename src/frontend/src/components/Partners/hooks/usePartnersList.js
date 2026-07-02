import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const usePartnersList = () => {
  const { t } = useTranslation();
  const emptyPartner = { name: "", phone: "", address: "" };
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyPartner);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyPartner);
  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selectePartner, setSelectePartner] = useState(null);

  const api = window.api;

  const normalizePartner = (cust) => ({
    ...cust,
    name: String(cust.name || "").trim(),
    phone: String(cust.phone || "").trim(),
    address: String(cust.address || "").trim(),
  });

  const validatePartner = (cust) => {
    if (!String(cust.name || "").trim()) {
      return t("errors.nameRequired", { field: t("ui.partner") });
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

      let partnersResult = await api.getPartners();

      setPartners(partnersResult || []);
    } catch (err) {
      console.error("Failed to load product catalog:", err);
      setUnavailableHandlers([]);
      setError(
        err?.message || t("errors.createFailed", { field: t("ui.partner") }),
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createPartner = async (cust) => {
    const validationError = validatePartner(cust);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.createPartner(normalizePartner(cust));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const updatePartner = async (cust) => {
    const validationError = validatePartner(cust);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      await api.updatePartner(normalizePartner(cust));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deletePartner = async (part) => {
    setSaving(true);
    try {
      await api.deletePartner(part.id);

      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePartner = async (part) => {
    try {
      await createPartner(part);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to create Partner:", err);
      setActionError(
        err?.message || t("errors.createFailed", { field: t("ui.partner") }),
      );
      return false;
    }
  };

  const handleUpdatePartner = async (cust) => {
    try {
      await updatePartner(cust);
      setActionError("");
      return true;
    } catch (err) {
      console.error("Failed to update Partner:", err);
      setActionError(
        err?.message || t("errors.updateFailed", { field: t("ui.partner") }),
      );
      return false;
    }
  };

  const handleDeletePartner = async (cust) => {
    try {
      await deletePartner(cust);
      setActionError("");
      setEditing(emptyPartner);
      setEditingId("");
    } catch (err) {
      console.error("Failed to delete Partner:", err);
      setActionError(t("errors.deleteHasData", { field: t("ui.partner") }));
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreatePartner(draft);
    if (saved) {
      setDraft(emptyPartner);
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
    const saved = await handleUpdatePartner(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyPartner);
    }
  };

  return {
    createPartner,
    updatePartner,
    deletePartner,
    saving,
    partners,
    handleDeletePartner,
    handleCreatePartner,
    handleUpdatePartner,
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
    navigate,
    selectePartner,
    setSelectePartner,
    refetch,
    openPaymentModel,
    setOpenPaymentModel,
  };
};

export default usePartnersList;
