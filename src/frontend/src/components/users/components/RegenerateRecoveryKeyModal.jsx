import { useEffect, useState } from "react";
import { AlertCircle, KeyRound, ShieldCheck, X } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function RegenerateRecoveryKeyModal({
  open,
  administratorId,
  onClose,
  onSuccess,
}) {
  const { t } = useTranslation();
  const [administratorPin, setAdministratorPin] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setAdministratorPin("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(administratorPin)) {
      setError(t("errors.pinInvalid"));
      return;
    }

    setSaving(true);
    try {
      const result = await window.api.regenerateRecoveryKey({
        administratorId,
        administratorPin,
      });

      if (result?.success) {
        onSuccess(result.recoveryKey);
        return;
      }

      setError(result?.error || t("screens.recovery.genericError"));
    } catch (err) {
      setError(err?.message || t("screens.recovery.genericError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
      />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="regenerate-key-title"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#e5ebff] bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#e5ebff] bg-[#f8faff] px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#eef3ff] text-[#4663ff]">
              <KeyRound size={22} />
            </div>
            <div>
              <h2 id="regenerate-key-title" className="text-lg font-black text-slate-950">
                {t("screens.recovery.regenerateTitle")}
              </h2>
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {t("screens.recovery.regenerateNotice")}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label={t("common.close")} className="rounded-xl p-2 text-slate-500 hover:bg-white disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle size={17} className="mt-0.5 shrink-0" />
            <span>{t("screens.recovery.keyManagementHint")}</span>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <label>
            <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <ShieldCheck size={13} />
              {t("screens.users.yourPin")}
            </span>
            <input
              autoFocus
              required
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={administratorPin}
              onChange={(event) => {
                setAdministratorPin(event.target.value.replace(/\D/g, ""));
                setError("");
              }}
              placeholder={t("screens.users.pinPlaceholder")}
              className="h-11 w-full rounded-xl border border-[#dbe4ff] bg-white px-3.5 text-sm outline-none focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10"
            />
          </label>
        </div>

        <div className="flex gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
          <button type="button" onClick={onClose} disabled={saving} className="h-11 flex-1 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:opacity-50">
            {t("common.cancel")}
          </button>
          <button type="submit" disabled={saving || administratorPin.length !== 6} className="h-11 flex-1 rounded-xl bg-[#4663ff] text-sm font-black text-white shadow-lg shadow-[#4663ff]/20 disabled:opacity-50">
            {saving ? t("common.saving") : t("screens.recovery.regenerate")}
          </button>
        </div>
      </form>
    </div>
  );
}
