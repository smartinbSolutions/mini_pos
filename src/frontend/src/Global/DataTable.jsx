import { PackageOpen } from "lucide-react";

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" };

function SkeletonRows({ columns, count = 6 }) {
  return Array.from({ length: count }).map((_, r) => (
    <tr key={r} className="h-14">
      {columns.map((col) => (
        <td key={col.key} className="px-4 py-3.5">
          <div
            className="mx-auto h-4 animate-pulse rounded-full bg-slate-100"
            style={{ width: `${55 + ((r + col.key.length) % 4) * 10}%` }}
          />
        </td>
      ))}
    </tr>
  ));
}

export default function DataTable({
  columns,
  rows,
  rowKey = (row) => row.id,
  loading,
  emptyText,
  minWidth = 760,
  maxHeight, // e.g. "70vh" → sticky header while scrolling
}) {
  return (
    <div
      className="overflow-auto"
      style={maxHeight ? { maxHeight } : undefined}
    >
      <table
        className="w-full border-separate border-spacing-0 text-base"
        style={{ minWidth }}
      >
        <thead>
          <tr className="h-12">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`sticky top-0 whitespace-nowrap border-b-2 border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-ink-soft ${
                  ALIGN[col.align || "center"]
                } ${col.sticky ? "end-0 z-[3]" : "z-[2]"}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <SkeletonRows columns={columns} />
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-16">
                <div className="flex flex-col items-center gap-3 text-ink-muted">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand">
                    <PackageOpen size={28} />
                  </span>
                  <p className="text-base font-bold">{emptyText}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="group min-h-[52px] transition-colors">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`whitespace-nowrap border-b border-slate-100 px-4 py-3.5 text-base transition-colors group-last:border-b-0 group-hover:bg-slate-50/80 ${
                      ALIGN[col.align || "center"]
                    } ${
                      col.align === "end"
                        ? "text-lg font-bold tabular-nums"
                        : "text-ink font-medium"
                    } ${col.cellClassName || ""} ${
                      col.sticky
                        ? "sticky end-0 z-[1] bg-white shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.08)]"
                        : ""
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
