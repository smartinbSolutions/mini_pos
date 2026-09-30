import { useCallback, useEffect, useState } from "react";

export default function useOpeningBalance({
  ownerType,
  ownerId,
  enabled = true,
}) {
  const [openingBalance, setOpeningBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!window.api || !ownerType || !ownerId) return;

    setLoading(true);
    try {
      const res = await window.api.getOpeningBalance({
        owner_type: ownerType,
        owner_id: ownerId,
      });
      setOpeningBalance(res || null);
    } catch (err) {
      console.error("Failed to load opening balance:", err);
      setOpeningBalance(null);
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  const save = async ({ amount, balance_type, date }) => {
    setSaving(true);
    setError(null);
    try {
      const res = await window.api.upsertOpeningBalance({
        owner_type: ownerType,
        owner_id: ownerId,
        amount,
        balance_type,
        date,
      });

      if (!res?.success) {
        setError(res?.error || "SAVE_FAILED");
        return res;
      }

      await load();
      return res;
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await window.api.deleteOpeningBalance({
        owner_type: ownerType,
        owner_id: ownerId,
      });

      if (!res?.success) {
        setError(res?.error || "DELETE_FAILED");
        return res;
      }

      setOpeningBalance(null);
      return res;
    } finally {
      setSaving(false);
    }
  };

  return {
    openingBalance,
    loading,
    saving,
    error,
    load,
    save,
    remove,
  };
}
