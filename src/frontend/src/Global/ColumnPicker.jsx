import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Columns3 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ColumnPicker({
  columns,
  isVisible,
  onToggle,
  onReset,
  align = "right",
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);

  const toggleable = columns.filter((c) => !c.locked);
  const hiddenCount = toggleable.filter((c) => !isVisible(c)).length;

  useLayoutEffect(() => {
    if (!open) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({
      top: rect.bottom + 6,
      left: align === "right" ? rect.right : rect.left,
    });
  }, [open, align]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
      >
        <Columns3 size={14} />
        {t("common.columns", "Columns")}
        {hiddenCount > 0 && (
          <span className="rounded-full bg-[#eef3ff] px-1.5 text-[10px] text-[#4663ff]">
            -{hiddenCount}
          </span>
        )}
      </button>

      {open &&
        coords &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[9999] w-56 overflow-hidden rounded-xl border border-[#e9edfb] bg-white py-1 shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
              style={{
                top: coords.top,
                left: coords.left,
                transform: align === "right" ? "translateX(-100%)" : "none",
              }}
            >
              <div className="max-h-72 overflow-y-auto">
                {toggleable.map((col) => {
                  const on = isVisible(col);
                  return (
                    <button
                      key={col.key}
                      type="button"
                      onClick={() => onToggle(col.key)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-start text-[11px] font-bold text-slate-600 transition hover:bg-[#f6f8fd]"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          on
                            ? "border-[#4663ff] bg-[#4663ff] text-white"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {on && <Check size={11} strokeWidth={3} />}
                      </span>
                      {col.label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={onReset}
                className="w-full border-t border-[#eef1ff] px-3 py-2 text-start text-[11px] font-bold text-[#4663ff] transition hover:bg-[#f6f8fd]"
              >
                {t("common.resetDefault", "Reset to default")}
              </button>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
