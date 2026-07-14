import { useState } from "react";
import { AlertCircle, KeyRound, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function AdminRecoveryModal({ open, onClose }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    username: "",
    recoveryKey: "",
    newPin: "",
    confirmPin: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!/^\d{6}$/.test(form.newPin) || form.newPin !== form.confirmPin) {
      setError(t("screens.recovery.pinError"));
      return;
    }
    setSaving(true);
    const result = await window.api.recoverAdminPin(form);
    setSaving(false);
    if (result?.success) setDone(true);
    else setError(t("screens.recovery.genericError"));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute end-4 top-4 text-slate-400"
        >
          <X size={18} />
        </button>
        <KeyRound className="mb-3 text-[#4663ff]" />
        <h2 className="text-xl font-black">{t("screens.recovery.title")}</h2>
        {done ? (
          <div className="mt-4">
            <p className="text-sm text-emerald-700">
              {t("screens.recovery.success")}
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-[#4663ff] py-3 font-bold text-white"
            >
              {t("screens.recovery.returnToLogin")}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-3">
            <p className="text-sm text-slate-500">
              {t("screens.recovery.regularUserNotice")}
            </p>
            {error && (
              <p className="flex gap-2 text-sm items-center text-red-600">
                <AlertCircle size={16} />
                {error}
              </p>
            )}
            <input
              required
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder={t("screens.recovery.adminUsername")}
              className="h-11 w-full rounded-xl border px-3"
            />
            <input
              required
              type="password"
              value={form.recoveryKey}
              onChange={(e) =>
                setForm({ ...form, recoveryKey: e.target.value.trim() })
              }
              placeholder={t("screens.recovery.recoveryKey")}
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
              {saving ? t("common.saving") : t("screens.recovery.resetPin")}
            </button>
            <p className="text-xs text-slate-400">
              {t("screens.recovery.noOfflineRecovery")}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
