import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const useUsers = () => {
  const { t } = useTranslation();
  const api = window.api;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // null = create mode

  const refetch = useCallback(async () => {
    if (!api) {
      setError(t("errors.apiUnavailable"));
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await api.getUsers();
      if (res?.success) {
        setUsers(res.users || []);
      } else {
        setError(
          res?.error || t("errors.loadFailed", { field: t("ui.users") })
        );
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(
        err?.message || t("errors.loadFailed", { field: t("ui.users") })
      );
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const activeAdminCount = users.filter(
    (u) => u.role === "admin" && u.is_active
  ).length;

  const openCreateModal = () => {
    setEditingUser(null);
    setActionError("");
    setModalOpen(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setActionError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingUser(null);
    setActionError("");
  };

  const submitUser = async (formData) => {
    setSaving(true);
    try {
      let res;
      if (editingUser) {
        const payload = { id: editingUser.id, ...formData };
        if (!payload.pin) delete payload.pin; // keep existing PIN if left blank
        res = await api.updateUser(payload);
      } else {
        res = await api.createUser(formData);
      }

      if (res?.success) {
        setActionError("");
        await refetch();
        closeModal();
        return true;
      }

      setActionError(
        res?.error || t("errors.saveFailed", { field: t("ui.user") })
      );
      return false;
    } catch (err) {
      console.error("Failed to save user:", err);
      setActionError(
        err?.message || t("errors.saveFailed", { field: t("ui.user") })
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deactivateUser = async (user) => {
    if (user.role === "admin" && user.is_active && activeAdminCount <= 1) {
      setActionError(t("errors.lastAdmin"));
      return;
    }
    setSaving(true);
    try {
      const res = await api.updateUser({ id: user.id, is_active: 0 });
      if (res?.success) {
        setActionError("");
        await refetch();
      } else {
        setActionError(res?.error || t("errors.deactivateFailed"));
      }
    } catch (err) {
      console.error("Failed to deactivate user:", err);
      setActionError(err?.message || t("errors.deactivateFailed"));
    } finally {
      setSaving(false);
    }
  };

  const reactivateUser = async (user) => {
    setSaving(true);
    try {
      const res = await api.updateUser({ id: user.id, is_active: 1 });
      if (res?.success) {
        setActionError("");
        await refetch();
      } else {
        setActionError(
          res?.error || t("errors.updateFailed", { field: t("ui.user") })
        );
      }
    } catch (err) {
      console.error("Failed to reactivate user:", err);
      setActionError(
        err?.message || t("errors.updateFailed", { field: t("ui.user") })
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteUser = async (user) => {
    setSaving(true);
    try {
      const res = await api.deleteUser(user.id);
      if (res?.success) {
        setActionError("");
        await refetch();
      } else {
        setActionError(
          res?.error || t("errors.deleteFailed", { field: t("ui.user") })
        );
      }
    } catch (err) {
      console.error("Failed to delete user:", err);
      setActionError(
        err?.message || t("errors.deleteFailed", { field: t("ui.user") })
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    users,
    loading,
    saving,
    error,
    actionError,
    modalOpen,
    editingUser,
    openCreateModal,
    openEditModal,
    closeModal,
    submitUser,
    deactivateUser,
    reactivateUser,
    deleteUser,
    activeAdminCount,
  };
};

export default useUsers;
