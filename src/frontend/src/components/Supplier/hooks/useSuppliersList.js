import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import useListParams from "../../../Global/useListParams";

const LIST_DEFAULTS = { page: 1, limit: 10, balance: "all", search: "" };

const useSuppliersList = () => {
  const { t } = useTranslation();
  const emptySupplier = {
    name: "",
    phone: "",
    address: "",
    opening_balance: 0,
    balance_type: "increase",
    date: "",
  };
  const navigate = useNavigate();

  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [stats, setStats] = useState({
    count: 0,
    totalPayable: 0,
    totalPaid: 0,
    netOutstanding: 0,
  });
  const [counts, setCounts] = useState({ all: 0, owing: 0, settled: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unavailableHandlers, setUnavailableHandlers] = useState([]);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptySupplier);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptySupplier);
  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selecteSupplier, setSelecteSupplier] = useState(null);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [tagsBySupplier, setTagsBySupplier] = useState({});

  const [params, setParams] = useListParams(LIST_DEFAULTS);
  const { page, limit, balance: balanceFilter } = params;
  const [search, setSearch] = useState(params.search);

  const setPage = (p) => setParams({ page: p });
  const setLimit = (l) => setParams({ limit: l, page: 1 });
  const setBalanceFilter = (f) => setParams({ balance: f, page: 1 });

  const api = window.api;

  const normalizeSupplier = (sup) => ({
    ...sup,
    name: String(sup.name || "").trim(),
    phone: String(sup.phone || "").trim(),
    address: String(sup.address || "").trim(),
  });

  const validateSupplier = (sup) => {
    if (!String(sup.name || "").trim()) {
      return t("errors.nameRequired", { field: t("ui.supplier") });
    }

    return "";
  };

  // Search is server-side so it covers every page, not just the loaded one.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      if (next !== params.search) setParams({ search: next, page: 1 });
    }, 250);
    return () => clearTimeout(timer);
  }, [search, params.search, setParams]);

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiUnavailable"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      const res = await api.getSuppliers({
        page,
        limit,
        balance_filter: balanceFilter,
        search: params.search,
      });

      setSuppliers(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setStats(
        res?.stats || {
          count: 0,
          totalPayable: 0,
          totalPaid: 0,
          netOutstanding: 0,
        },
      );
      setCounts(res?.counts || { all: 0, owing: 0, settled: 0 });
    } catch (err) {
      console.error("Failed to load supplier list:", err);
      setUnavailableHandlers([]);
      setError(
        err?.message || t("errors.createFailed", { field: t("ui.supplier") }),
      );
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, balanceFilter, params.search, t]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (suppliers.length === 0) {
      setTagsBySupplier({});
      return;
    }
    const ids = suppliers.map((s) => s.id);
    api.getEntitiesTags("supplier", ids).then((res) => {
      if (res.success) setTagsBySupplier(res.data);
    });
  }, [suppliers, api]);

  const createSupplier = async (sup) => {
    const validationError = validateSupplier(sup);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      const res = await api.createSupplier(normalizeSupplier(sup));
      if (!res?.success) {
        throw new Error(res?.message || res?.error);
      }
      await refetch();
      return res;
    } finally {
      setSaving(false);
    }
  };

  const updateSupplier = async (sup) => {
    const validationError = validateSupplier(sup);
    if (validationError) {
      throw new Error(validationError);
    }

    setSaving(true);
    try {
      const res = await api.updateSupplier(normalizeSupplier(sup));
      if (!res?.success) {
        throw new Error(res?.message || res?.error);
      }
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (sup) => {
    setSaving(true);
    try {
      const res = await api.deleteSupplier(sup.id);
      if (!res?.success) {
        throw new Error(res?.message || res?.error);
      }
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const handleCreateSupplier = async (sup) => {
    try {
      const result = await createSupplier(sup);
      if (result?.id && sup.tagIds !== undefined) {
        await api.setEntityTags("supplier", result.id, sup.tagIds);
      }
      setActionError("");
      toast.success(t("success.created", { field: t("ui.supplier") }));
      return result;
    } catch (err) {
      console.error("Failed to create Supplier:", err);
      const message =
        err?.message || t("errors.createFailed", { field: t("ui.supplier") });
      setActionError(message);
      toast.error(message);
      return false;
    }
  };

  const saveOpeningBalance = async (sup) => {
    const amount = Number(sup.opening_balance || 0);
    const owner = { owner_type: "supplier", owner_id: sup.id };

    let res;
    if (amount > 0) {
      res = await api.upsertOpeningBalance({
        ...owner,
        amount,
        balance_type: sup.balance_type,
        date: sup.date || undefined,
      });
    } else if (sup.hasOpeningBalance) {
      res = await api.deleteOpeningBalance(owner);
    } else {
      return;
    }

    if (!res?.success) {
      throw new Error(t(`errors.${res?.error}`, { defaultValue: res?.error }));
    }
    await refetch();
  };

  const handleUpdateSupplier = async (sup) => {
    try {
      await updateSupplier(sup);
      if (sup.tagIds !== undefined) {
        await api.setEntityTags("supplier", sup.id, sup.tagIds);
      }
      await saveOpeningBalance(sup);
      setActionError("");
      toast.success(t("success.updated", { field: t("ui.supplier") }));
      return true;
    } catch (err) {
      console.error("Failed to update Supplier:", err);
      const message =
        err?.message || t("errors.updateFailed", { field: t("ui.supplier") });
      setActionError(message);
      toast.error(message);
      return false;
    }
  };

  const handleDeleteSupplier = async (sup) => {
    try {
      await deleteSupplier(sup);
      setActionError("");
      setEditing(emptySupplier);
      setEditingId("");
      toast.success(t("success.deleted", { field: t("ui.supplier") }));
    } catch (err) {
      console.error("Failed to delete Supplier:", err);
      const message = t("errors.deleteHasData", { field: t("ui.supplier") });
      setActionError(message);
      toast.error(message);
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreateSupplier(draft);
    if (saved && saved !== false) {
      setDraft(emptySupplier);
    }
    return saved;
  };

  const startEdit = async (sup) => {
    setEditingId(sup.id);
    setEditing({
      id: sup.id,
      name: sup.name || "",
      phone: sup.phone || "",
      address: sup.address || "",
      tagIds: (tagsBySupplier[sup.id] || []).map((t) => t.id),
      opening_balance: "",
      balance_type: "increase",
      date: "",
      hasOpeningBalance: false,
    });
    let ob = null;
    try {
      ob = await api.getOpeningBalance({
        owner_type: "supplier",
        owner_id: sup.id,
      });
    } catch (err) {
      console.error("Failed to load opening balance:", err);
    }

    if (ob) {
      setEditing((prev) =>
        prev.id === sup.id
          ? {
              ...prev,
              opening_balance: ob.amount,
              balance_type: ob.balance_type,
              date: ob.date?.slice(0, 10) || "",
              hasOpeningBalance: true,
            }
          : prev,
      );
    }
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    const saved = await handleUpdateSupplier(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptySupplier);
    }
    return saved;
  };

  return {
    createSupplier,
    updateSupplier,
    deleteSupplier,
    saving,
    suppliers,
    stats,
    counts,
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
    actionError,
    navigate,
    openPaymentModel,
    setOpenPaymentModel,
    selecteSupplier,
    setSelecteSupplier,
    refetch,
    tagsBySupplier,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    balanceFilter,
    setBalanceFilter,
    search,
    setSearch,
  };
};

export default useSuppliersList;
