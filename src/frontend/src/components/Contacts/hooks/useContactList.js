import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import useListParams from "../../../Global/useListParams";

const LIST_DEFAULTS = { page: 1, limit: 20, balance: "all", search: "" };

// role: "customer" | "supplier" — the page decides the role.
// Rows are contacts; tags, opening balance and the ledger link still use the
// legacy customer/supplier id until cutover.
const useContactList = (role) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const api = window.api;

  const isCustomerPage = role === "customer";
  const legacyKey = isCustomerPage
    ? "legacy_customer_id"
    : "legacy_supplier_id";
  const fieldLabel = t(isCustomerPage ? "ui.customer" : "ui.supplier");

  const emptyContact = {
    name: "",
    phone: "",
    address: "",
    opening_balance: 0,
    balance_type: "increase",
    date: "",
  };

  const [saving, setSaving] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [stats, setStats] = useState({ count: 0, receivable: 0, payable: 0 });
  const [counts, setCounts] = useState({
    all: 0,
    receivable: 0,
    payable: 0,
    settled: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [draft, setDraft] = useState(emptyContact);
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(emptyContact);
  const [openPaymentModel, setOpenPaymentModel] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [tagsByContact, setTagsByContact] = useState({});

  const [params, setParams] = useListParams(LIST_DEFAULTS);
  const { page, limit, balance: balanceFilter } = params;
  const [search, setSearch] = useState(params.search);

  const setPage = (p) => setParams({ page: p });
  const setLimit = (l) => setParams({ limit: l, page: 1 });
  const setBalanceFilter = (f) => setParams({ balance: f, page: 1 });

  // Backend codes (CONTACT_ROLE_IN_USE …) → translated text.
  const errorText = (code) => t(`errors.${code}`, { defaultValue: code });

  const normalize = (c) => ({
    ...c,
    name: String(c.name || "").trim(),
    phone: String(c.phone || "").trim(),
    address: String(c.address || "").trim(),
  });

  const validate = (c) =>
    String(c.name || "").trim()
      ? ""
      : t("errors.nameRequired", { field: fieldLabel });

  // Form direction is relative to the page:
  // customer page "increase" = they owe you (debit);
  // supplier page "increase" = you owe them (credit).
  const openingSide = (balanceType) => {
    const isIncrease = balanceType !== "decrease";
    if (isCustomerPage) return isIncrease ? "debit" : "credit";
    return isIncrease ? "credit" : "debit";
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = search.trim();
      if (next !== params.search) setParams({ search: next, page: 1 });
    }, 250);
    return () => clearTimeout(timer);
  }, [search, params.search, setParams]);

  const refetch = useCallback(async () => {
    if (!api) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getContacts({
        role,
        page,
        limit,
        search: params.search,
        balance_filter: balanceFilter,
      });

      setContacts(res?.data || []);
      setTotal(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setStats(res?.stats || { count: 0, receivable: 0, payable: 0 });
      setCounts(
        res?.counts || { all: 0, receivable: 0, payable: 0, settled: 0 },
      );
    } catch (err) {
      console.error(`Failed to load ${role} list:`, err);
    } finally {
      setLoading(false);
    }
  }, [api, role, page, limit, balanceFilter, params.search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Tags still live on the legacy row → fetch by legacy id, keyed by contact id.
  useEffect(() => {
    const withLegacy = contacts.filter((c) => c[legacyKey]);
    if (withLegacy.length === 0) {
      setTagsByContact({});
      return;
    }
    api
      .getEntitiesTags(
        role,
        withLegacy.map((c) => c[legacyKey]),
      )
      .then((res) => {
        if (!res?.success) return;
        const byContact = {};
        for (const c of withLegacy) {
          byContact[c.id] = res.data[c[legacyKey]] || [];
        }
        setTagsByContact(byContact);
      });
  }, [contacts, api, role, legacyKey]);

  const createContact = async (c) => {
    const validationError = validate(c);
    if (validationError) throw new Error(validationError);

    setSaving(true);
    try {
      const res = await api.createContact({
        ...normalize(c),
        is_customer: isCustomerPage ? 1 : 0,
        is_supplier: isCustomerPage ? 0 : 1,
        opening_side: openingSide(c.balance_type),
      });
      if (!res?.success) throw new Error(errorText(res?.error));
      await refetch();
      return res;
    } finally {
      setSaving(false);
    }
  };

  // Edit never changes roles — they're sent back exactly as loaded.
  const updateContact = async (c) => {
    const validationError = validate(c);
    if (validationError) throw new Error(validationError);

    setSaving(true);
    try {
      const n = normalize(c);
      const res = await api.updateContact({
        id: c.contact_id,
        name: n.name,
        phone: n.phone,
        address: n.address,
        is_customer: c.is_customer ? 1 : 0,
        is_supplier: c.is_supplier ? 1 : 0,
      });
      if (!res?.success) throw new Error(errorText(res?.error));
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  // Delete from this page = remove this page's role; the whole contact only
  // when it has no other role. Backend refuses if transactions exist.
  const deleteContact = async (c) => {
    const hasOtherRole = isCustomerPage ? c.is_supplier : c.is_customer;

    setSaving(true);
    try {
      const res = hasOtherRole
        ? await api.updateContact({
            id: c.id,
            name: c.name,
            phone: c.phone,
            address: c.address,
            is_customer: isCustomerPage ? 0 : 1,
            is_supplier: isCustomerPage ? 1 : 0,
          })
        : await api.deleteContact(c.id);

      if (!res?.success) throw new Error(errorText(res?.error));
      await refetch();
      return res;
    } finally {
      setSaving(false);
    }
  };

  const saveOpeningBalance = async (c) => {
    const amount = Number(c.opening_balance || 0);
    const owner = { owner_type: role, owner_id: c.id };

    let res;
    if (amount > 0) {
      res = await api.upsertOpeningBalance({
        ...owner,
        amount,
        balance_type: c.balance_type,
        date: c.date || undefined,
      });
    } else if (c.hasOpeningBalance) {
      res = await api.deleteOpeningBalance(owner);
    } else {
      return;
    }

    if (!res?.success) throw new Error(errorText(res?.error));
    await refetch();
  };

  const handleCreate = async (c) => {
    try {
      const result = await createContact(c);
      if (result?.[legacyKey] && c.tagIds !== undefined) {
        await api.setEntityTags(role, result[legacyKey], c.tagIds);
      }
      setActionError("");
      toast.success(t("success.created", { field: fieldLabel }));
      return result;
    } catch (err) {
      const message =
        err?.message || t("errors.createFailed", { field: fieldLabel });
      setActionError(message);
      toast.error(message);
      return false;
    }
  };

  const handleUpdate = async (c) => {
    try {
      await updateContact(c);
      if (c.tagIds !== undefined) {
        await api.setEntityTags(role, c.id, c.tagIds);
      }
      await saveOpeningBalance(c);
      setActionError("");
      toast.success(t("success.updated", { field: fieldLabel }));
      return true;
    } catch (err) {
      const message =
        err?.message || t("errors.updateFailed", { field: fieldLabel });
      setActionError(message);
      toast.error(message);
      return false;
    }
  };

  const handleDelete = async (c) => {
    try {
      await deleteContact(c);
      setActionError("");
      setEditing(emptyContact);
      setEditingId(null);
      toast.success(t("success.deleted", { field: fieldLabel }));
    } catch (err) {
      const message =
        err?.message || t("errors.deleteHasData", { field: fieldLabel });
      setActionError(message);
      toast.error(message);
    }
  };

  const submitDraft = async (event) => {
    event.preventDefault();
    const saved = await handleCreate(draft);
    if (saved) setDraft(emptyContact);
    return saved;
  };

  // form.id = legacy id (tags + opening balance); form.contact_id = contact.
  const startEdit = async (c) => {
    const legacyId = c[legacyKey];
    setEditingId(c.id);
    setEditing({
      id: legacyId,
      contact_id: c.id,
      is_customer: c.is_customer ? 1 : 0,
      is_supplier: c.is_supplier ? 1 : 0,
      name: c.name || "",
      phone: c.phone || "",
      address: c.address || "",
      tagIds: (tagsByContact[c.id] || []).map((tag) => tag.id),
      opening_balance: "",
      balance_type: "increase",
      date: "",
      hasOpeningBalance: false,
    });

    const ob = await api.getOpeningBalance({
      owner_type: role,
      owner_id: legacyId,
    });

    if (ob) {
      setEditing((prev) =>
        prev.contact_id === c.id
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
    const saved = await handleUpdate(editing);
    if (saved) {
      setEditingId(null);
      setEditing(emptyContact);
    }
    return saved;
  };

  return {
    role,
    legacyKey,
    saving,
    loading,
    contacts,
    stats,
    counts,
    actionError,
    draft,
    setDraft,
    editing,
    setEditing,
    editingId,
    setEditingId,
    submitDraft,
    submitEdit,
    startEdit,
    handleDelete,
    navigate,
    openPaymentModel,
    setOpenPaymentModel,
    selectedContact,
    setSelectedContact,
    refetch,
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
    tagsByContact,
  };
};

export default useContactList;
