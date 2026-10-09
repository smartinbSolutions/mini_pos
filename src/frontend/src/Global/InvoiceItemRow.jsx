// Shared layout for invoice item lines: one header + one compact row per item.
// Header and rows use the same grid so columns always line up.
export const ITEM_GRID =
  "grid grid-cols-[minmax(0,1fr)_88px_104px_110px_104px_68px] items-center gap-2";
export const compactInputClass =
  "h-8 w-full rounded-lg border border-[#dbe4ff] bg-white px-2 text-xs font-semibold outline-none transition focus:border-[#4663ff] focus:ring-2 focus:ring-[#4663ff]/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400";

export function InvoiceItemsHeader({ labels, gridClass = ITEM_GRID }) {
  return (
    <div
      className={`${gridClass} border-b border-[#eef1ff] bg-[#f8faff] px-3.5 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400`}
    >
      {labels.map((label, i) => (
        <span key={i} className={i === 0 ? "" : "text-center"}>
          {label}
        </span>
      ))}
    </div>
  );
}

// children = the cells (same count/order as the header labels, minus actions)
// actions  = buttons for the last column
// extras   = optional second line (chips, notes). Pass null for single-line.
export function InvoiceItemRow({
  children,
  actions,
  extras = null,
  gridClass = ITEM_GRID,
}) {
  return (
    <div className="px-3.5 py-2 transition hover:bg-[#fafbff]">
      <div className={gridClass}>
        {children}
        <div className="flex items-center justify-end gap-0.5">{actions}</div>
      </div>
      {extras && <div className="mt-1.5 space-y-1.5">{extras}</div>}
    </div>
  );
}
