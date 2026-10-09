import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Portal-based dropdown — renders into document.body so it's never clipped
// by a parent's overflow-hidden (item rows, panels, etc). Position is
// computed from the trigger's actual bounding box when opened, same
// approach as HoverTooltip.
//
// Options flagged `inline: true` render as icon buttons next to the
// trigger; everything else goes in the dropdown. If no options are left
// for the dropdown, the trigger is hidden.
export default function DropdownMenu({ trigger, options, align = "right" }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const triggerRef = useRef(null);

  const visibleOptions = options.filter((o) => o.visible !== false);
  const inlineOptions = visibleOptions.filter((o) => o.inline);
  const menuOptions = visibleOptions.filter((o) => !o.inline);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const top = rect.bottom + 6;
    const left = align === "right" ? rect.right : rect.left;

    setCoords({ top, left, align });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open]);

  if (visibleOptions.length === 0) return null;

  return (
    <div className="inline-flex items-center justify-center gap-1">
      {inlineOptions.map((option) => (
        <button
          key={option.key}
          type="button"
          title={option.label}
          aria-label={option.label}
          onClick={option.onClick}
          className={`rounded-lg p-1.5 transition ${
            option.danger
              ? "text-red-500 hover:bg-red-50"
              : "text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
          }`}
        >
          {option.icon}
        </button>
      ))}

      {menuOptions.length > 0 && (
        <span
          ref={triggerRef}
          className="inline-block"
          onClick={() => setOpen((v) => !v)}
        >
          {trigger}
        </span>
      )}

      {open &&
        coords &&
        menuOptions.length > 0 &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
            />
            <div
              className="fixed z-[9999] min-w-[10rem] overflow-hidden rounded-xl border border-[#e9edfb] bg-white py-1 shadow-[0_10px_28px_rgba(15,23,42,0.14)]"
              style={{
                top: coords.top,
                left: coords.left,
                transform:
                  coords.align === "right" ? "translateX(-100%)" : "none",
              }}
            >
              {menuOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    option.onClick();
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] font-bold text-slate-600 transition hover:bg-[#f6f8fd] hover:text-[#4663ff]"
                >
                  {option.icon}
                  {option.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
