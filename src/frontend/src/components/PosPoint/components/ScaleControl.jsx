import { useEffect, useRef, useState } from "react";
import { Scale, ChevronDown } from "lucide-react";
import { formatNumber } from "../../../Global/FormatNumber";

// Compact scale button for the search row. The weight (or a status dot)
// is always visible; connecting and choosing a port live in a small panel
// so they don't take space from the product search.
export default function ScaleControl({
  t,
  weight,
  activeWeight,
  status,
  isConnected,
  ports,
  selectedPort,
  setSelectedPort,
  connect,
  disconnect,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0" data-no-barcode>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title={t("simple.pos.scale")}
        className={`flex h-16 items-center gap-2 rounded-2xl border-2 px-4 transition active:scale-95 ${
          isConnected
            ? "border-ok-100 bg-ok-50 text-ok-700"
            : "border-slate-200 bg-white text-ink-soft hover:border-slate-300"
        }`}
      >
        <span className="relative">
          <Scale size={24} />
          <span
            className={`absolute -end-1 -top-1 h-3 w-3 rounded-full ring-2 ring-white ${
              isConnected ? "bg-ok" : "bg-slate-300"
            }`}
          />
        </span>
        {activeWeight ? (
          <span dir="ltr" className="text-lg font-black tabular-nums">
            {formatNumber(weight)} KG
          </span>
        ) : (
          <span className="hidden text-base font-bold md:inline">
            {t("simple.pos.scale")}
          </span>
        )}
        <ChevronDown
          size={18}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute end-0 top-full z-30 mt-2 w-72 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-xl">
          <p className="text-base font-bold text-ink">{t("simple.pos.scale")}</p>
          <p className="mt-0.5 text-sm text-ink-muted">{status}</p>

          {!isConnected && ports.length > 1 && (
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              className="mt-3 h-12 w-full rounded-xl border-2 border-slate-200 bg-white px-3 text-base text-ink outline-none focus:border-brand"
            >
              <option value="">{t("screens.pos.autoCom")}</option>
              {ports.map((port) => (
                <option key={port.path} value={port.path}>
                  {[port.path, port.friendlyName || port.manufacturer]
                    .filter(Boolean)
                    .join(" - ")}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => {
              if (isConnected) disconnect();
              else connect(selectedPort);
              setOpen(false);
            }}
            className={`ui-btn mt-3 w-full ${
              isConnected ? "ui-btn-danger-soft" : "ui-btn-brand"
            }`}
          >
            {isConnected
              ? t("screens.pos.disconnect")
              : t("screens.pos.connect")}
          </button>
        </div>
      )}
    </div>
  );
}
