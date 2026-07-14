import { useEffect, useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ResetPinModal({
  user,
  administratorId,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    administratorPin: "",
    newPin: "",
    confirmPin: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm({ administratorPin: "", newPin: "", confirmPin: "" });
    setError("");
  }, [user]);
  if (!user) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(form.newPin) || form.newPin !== form.confirmPin)
      return setError(t("screens.recovery.pinError"));
    setSaving(true);
    const result = await window.api.resetUserPin({
      userId: user.id,
      administratorId,
      administratorPin: form.administratorPin,
      newPin: form.newPin,
    });
    setSaving(false);
    if (result?.success) onSuccess();
    else
      setError(
        result?.error || t("errors.updateFailed", { field: t("ui.user") }),
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md space-y-3 rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-4 top-4 text-slate-400"
        >
          <X size={18} />
        </button>
        <h2 className="text-xl font-black">
          {t("screens.users.resetPinTitle", { name: user.username })}
        </h2>
        <p className="text-sm text-slate-500">
          {t("screens.users.resetPinNotice")}
        </p>
        {error && (
          <p className="flex gap-2 text-sm text-red-600">
            <AlertCircle size={16} />
            {error}
          </p>
        )}
        <input
          required
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={form.administratorPin}
          onChange={(e) =>
            setForm({ ...form, administratorPin: e.target.value })
          }
          placeholder={t("screens.users.yourPin")}
          className="h-11 w-full rounded-xl border px-3"
        />
        <input
          required
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={form.newPin}
          onChange={(e) => setForm({ ...form, newPin: e.target.value })}
          placeholder={t("screens.recovery.newPin")}
          className="h-11 w-full rounded-xl border px-3"
        />
        <input
          required
          type="password"
          inputMode="numeric"
          maxLength={6}
          value={form.confirmPin}
          onChange={(e) => setForm({ ...form, confirmPin: e.target.value })}
          placeholder={t("screens.recovery.confirmPin")}
          className="h-11 w-full rounded-xl border px-3"
        />
        <button
          disabled={saving}
          className="w-full rounded-xl bg-[#4663ff] py-3 font-bold text-white disabled:opacity-50"
        >
          {saving ? t("common.saving") : t("screens.users.resetPin")}
        </button>
      </form>
    </div>
  );
}
