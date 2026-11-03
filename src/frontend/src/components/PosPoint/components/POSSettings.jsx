import { useEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";

export const COLUMN_OPTIONS = ["auto", 3, 4, 5, 6];

// Sales-screen display settings (products per row, products per page).
// Values are saved by the caller; this is only the button + panel.
export default function POSSettings({
  t,
  columns,
  setColumns,
  pageSize,
  setPageSize,
  pageSizeOptions,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative" data-no-barcode>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={t("simple.pos.settings")}
        aria-label={t("simple.pos.settings")}
        className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-ink-soft transition hover:border-brand hover:text-brand-700 active:scale-95"
      >
        <Settings2 size={20} />
        <span className="hidden 2xl:inline">{t("simple.pos.settings")}</span>
      </button>

      {open && (
        <div className="absolute end-0 top-full z-30 mt-2 w-80 space-y-5 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-lg font-black text-ink">
            {t("simple.pos.settings")}
          </p>

          <OptionGroup
            label={t("simple.pos.perRow")}
            hint={columns === "auto" ? t("simple.pos.autoHint") : null}
            options={COLUMN_OPTIONS}
            value={columns}
            onChange={setColumns}
            renderLabel={(o) => (o === "auto" ? t("simple.pos.auto") : o)}
          />

          <OptionGroup
            label={t("simple.pos.perPage")}
            options={pageSizeOptions}
            value={pageSize}
            onChange={setPageSize}
            renderLabel={(o) => o}
          />
        </div>
      )}
    </div>
  );
}

function OptionGroup({ label, hint, options, value, onChange, renderLabel }) {
  return (
    <div>
      <p className="mb-2 text-base font-bold text-ink-soft">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={value === option}
            onClick={() => onChange(option)}
            className={`h-12 rounded-xl text-base font-bold transition active:scale-95 ${
              value === option
                ? "bg-ink text-white"
                : "bg-slate-100 text-ink-soft hover:bg-slate-200"
            }`}
          >
            {renderLabel(option)}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1.5 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}
