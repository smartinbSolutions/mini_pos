import { AlertTriangle } from "lucide-react";

// Confirmation for destructive actions: big buttons, the safe choice
// first, the destructive one red and labelled with what it will do.
export default function SimpleConfirm({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-warn-50 text-warn-600">
            <AlertTriangle size={28} />
          </span>
          <div>
            <h3 className="text-xl font-black text-ink">{title}</h3>
            {message && (
              <p className="mt-1.5 text-base text-ink-muted">{message}</p>
            )}
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="ui-btn ui-btn-soft"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="ui-btn ui-btn-danger"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
