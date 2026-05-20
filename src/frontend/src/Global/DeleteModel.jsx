import { useEffect } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

const DeleteModal = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading = false,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-800">{modalTitle}</h2>

          <button
            onClick={onClose}
            className="rounded-lg p-1 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-6">
          <p className="text-sm text-gray-600">{modalMessage}</p>
        </div>

        <div className="flex justify-end gap-3 border-t px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-100"
          >
            {t("common.cancel")}
          </button>

          <button
            onClick={onConfirm}
            disabled={loading}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? t("common.deleting") : t("common.delete")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
