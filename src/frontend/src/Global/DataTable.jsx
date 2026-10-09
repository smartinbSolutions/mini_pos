import { PackageOpen } from "lucide-react";

const ALIGN = { start: "text-start", center: "text-center", end: "text-end" };

function SkeletonRows({ columns, count = 6 }) {
  return Array.from({ length: count }).map((_, r) => (
    <tr key={r}>
      {columns.map((col) => (
        <td key={col.key} className="px-3 py-3">
          <div
            className="mx-auto h-3 animate-pulse rounded-full bg-[#eef1ff]"
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
        className="w-full border-separate border-spacing-0 text-[16px]"
        style={{ minWidth }}
      >
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`sticky top-0 whitespace-nowrap border-b border-[#e5ebff] bg-[#f8faff] px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-slate-400 ${
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
              <td colSpan={columns.length} className="py-14">
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eef3ff] text-[#4663ff]">
                    <PackageOpen size={20} />
                  </span>
                  <p className="text-xs font-bold">{emptyText}</p>
                </div>
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={rowKey(row)} className="group">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`whitespace-nowrap border-b border-[#eef1ff] px-3 py-2.5 transition-colors group-last:border-b-0 group-hover:bg-[#f8faff] ${
                      ALIGN[col.align || "center"]
                    } ${
                      col.align === "end"
                        ? "text-lg font-bold tabular-nums"
                        : ""
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
