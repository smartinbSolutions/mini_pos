import { useEffect } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { useTranslation } from "react-i18next";

const DeleteModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
  subTitle = "common.delete",
  btnTxt = "common.delete",
}) => {
  const { t } = useTranslation();
  const modalTitle = title || t("deleteModal.title");
  const modalMessage = message || t("deleteModal.message");

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-danger-50 text-danger-600">
              <AlertTriangle size={28} />
            </span>

            <div>
              <h2 className="text-xl font-black text-ink">
                {modalTitle}
              </h2>
              {subTitle && (
                <p className="mt-0.5 text-sm font-semibold text-danger-600">
                  {t(subTitle)}
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label={t("common.cancel")}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-ink-muted transition hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="my-5">
          <p className="text-base leading-6 text-ink-muted">{modalMessage}</p>
        </div>

        {/* Safe choice first (Cancel), red destructive button with label */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            disabled={loading}
            className="ui-btn ui-btn-soft min-h-[48px]"
          >
            {t("common.cancel")}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="ui-btn ui-btn-danger min-h-[48px]"
          >
            <Trash2 size={18} />
            {loading ? t("common.loading") : t(btnTxt)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
