import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../Global/AuthContext";

const todayStr = () => new Date().toISOString().slice(0, 10);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export default function useSettlement({ isOpen, contactId, onClose, onSaved }) {
  const { t } = useTranslation();
  const api = window.api;
  const { user } = useAuth();

  const [contact, setContact] = useState(null);
  const [receivable, setReceivable] = useState([]); // he owes you
  const [payable, setPayable] = useState([]); // you owe him
  const [maxAmount, setMaxAmount] = useState(0);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchTimer = useRef(null);

  const fetchPreview = useCallback(
    async (amount) => {
      if (!contactId) return;
      setLoading(true);
      try {
        const res = await api.previewSettlement({ contactId, amount });
        if (res?.success) {
          setReceivable(res.receivable.lines);
          setPayable(res.payable.lines);
          setMaxAmount(res.max);
        } else {
          setReceivable([]);
          setPayable([]);
          setMaxAmount(0);
        }
      } catch {
        setReceivable([]);
        setPayable([]);
        setMaxAmount(0);
      } finally {
        setLoading(false);
      }
    },
    [api, contactId],
  );

  useEffect(() => {
    if (!isOpen || !contactId) return;
    setNote("");
    setDate(todayStr());
    setError("");
    api.getContact(contactId).then((res) => {
      setContact(res?.success ? res.data : null);
    });
    fetchPreview(undefined); // no amount → proposes the maximum
  }, [isOpen, contactId, api, fetchPreview]);

  // Re-propose (FIFO) when the user retypes the overall amount —
  // any manual per-line edits are re-derived from the new total.
  const requestAmount = (amount) => {
    clearTimeout(fetchTimer.current);
    fetchTimer.current = setTimeout(() => fetchPreview(amount), 300);
  };

  const updateReceivableLine = (index, value) => {
    setReceivable((prev) => {
      const copy = [...prev];
      const line = copy[index];
      const capped = Math.max(0, Math.min(Number(value) || 0, line.remaining));
      copy[index] = { ...line, allocate: capped };
      return copy;
    });
  };

  const updatePayableLine = (index, value) => {
    setPayable((prev) => {
      const copy = [...prev];
      const line = copy[index];
      const capped = Math.max(0, Math.min(Number(value) || 0, line.remaining));
      copy[index] = { ...line, allocate: capped };
      return copy;
    });
  };

  const receivableTotal = round2(
    receivable.reduce((s, l) => s + (Number(l.allocate) || 0), 0),
  );
  const payableTotal = round2(
    payable.reduce((s, l) => s + (Number(l.allocate) || 0), 0),
  );
  const mismatch = round2(receivableTotal - payableTotal);
  const canSubmit =
    receivableTotal > 0 && Math.abs(mismatch) < 0.005 && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      const res = await api.createSettlement({
        contactId,
        amount: receivableTotal,
        receivable: receivable
          .filter((l) => Number(l.allocate) > 0)
          .map((l) => ({
            invoice_type: l.invoice_type,
            invoice_id: l.invoice_id,
            amount: Number(l.allocate),
          })),
        payable: payable
          .filter((l) => Number(l.allocate) > 0)
          .map((l) => ({
            invoice_type: l.invoice_type,
            invoice_id: l.invoice_id,
            amount: Number(l.allocate),
          })),
        note: note || null,
        date,
        created_by: user.id,
      });

      if (!res?.success) {
        setError(t(`errors.${res?.error}`, { defaultValue: res?.error }));
        return;
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return {
    contact,
    receivable,
    payable,
    maxAmount,
    receivableTotal,
    payableTotal,
    mismatch,
    canSubmit,
    note,
    setNote,
    date,
    setDate,
    loading,
    saving,
    error,
    requestAmount,
    updateReceivableLine,
    updatePayableLine,
    submit,
    t,
  };
}
