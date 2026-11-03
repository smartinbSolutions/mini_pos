import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, LayoutGrid } from "lucide-react";

const GAP = 8; // matches gap-2

// One category chip (also used, hidden, to measure how wide each one is).
function Chip({ tag, selected, onClick }) {
  const color = tag.color || "#4663ff";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border-2 px-5 text-base font-bold transition active:scale-95"
      style={
        selected
          ? { backgroundColor: color, borderColor: color, color: "#fff" }
          : { backgroundColor: "#fff", borderColor: `${color}55`, color: "#0f172a" }
      }
    >
      <span
        className="h-3 w-3 rounded-full"
        style={{ backgroundColor: selected ? "#fff" : color }}
      />
      {tag.name}
    </button>
  );
}

function AllChip({ t, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-5 text-base font-bold transition active:scale-95 ${
        selected ? "bg-ink text-white" : "bg-slate-100 text-ink-soft hover:bg-slate-200"
      }`}
    >
      <LayoutGrid size={18} />
      {t("simple.pos.all")}
    </button>
  );
}

// Category filter in a single row: as many categories as fit, the rest
// behind a "More" button. The selected category is always in the row.
export default function POSCategoryFilter({ t, tags, selectedId, onSelect, onClear }) {
  const rootRef = useRef(null);
  const rowRef = useRef(null);
  const measureRef = useRef(null);
  const [rowWidth, setRowWidth] = useState(0);
  const [sizes, setSizes] = useState(null); // { all, more, tags: [] }
  const [moreOpen, setMoreOpen] = useState(false);

  // width available to the row
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return undefined;
    setRowWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setRowWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // natural width of every chip, measured from the hidden copy
  const tagKey = tags.map((tag) => `${tag.id}:${tag.name}`).join("|");
  useLayoutEffect(() => {
    const nodes = measureRef.current?.children;
    if (!nodes || nodes.length !== tags.length + 2) return;
    const widths = Array.from(nodes, (n) => n.getBoundingClientRect().width);
    setSizes({ all: widths[0], more: widths[1], tags: widths.slice(2) });
  }, [tagKey, t]);

  const { visible, overflow } = useMemo(() => {
    if (!sizes || !rowWidth) return { visible: tags, overflow: [] };

    const total =
      sizes.all + sizes.tags.reduce((sum, w) => sum + w + GAP, 0);
    if (total <= rowWidth) return { visible: tags, overflow: [] };

    // room for the categories once "All" and "More" are in the row
    const budget = rowWidth - sizes.all - sizes.more - GAP * 2;
    const widthOf = (i) => sizes.tags[i] + GAP;

    const shown = [];
    let used = 0;
    for (let i = 0; i < tags.length; i++) {
      if (used + widthOf(i) > budget) break;
      shown.push(i);
      used += widthOf(i);
    }

    // the chosen category must never hide in "More"
    const selectedIndex = tags.findIndex((tag) => tag.id === selectedId);
    if (selectedIndex !== -1 && !shown.includes(selectedIndex)) {
      shown.push(selectedIndex);
      used += widthOf(selectedIndex);
      while (used > budget && shown.length > 1) {
        const dropped = shown.splice(shown.length - 2, 1)[0];
        used -= widthOf(dropped);
      }
      shown.sort((a, b) => a - b);
    }

    return {
      visible: shown.map((i) => tags[i]),
      overflow: tags.filter((_, i) => !shown.includes(i)),
    };
  }, [sizes, rowWidth, tags, selectedId]);

  // close the "More" panel on outside click / Escape / when nothing is hidden
  useEffect(() => {
    if (!moreOpen) return undefined;
    const close = (e) => {
      if (!rootRef.current?.contains(e.target)) setMoreOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setMoreOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);
  useEffect(() => {
    if (!overflow.length) setMoreOpen(false);
  }, [overflow.length]);

  const moreLabel = `${t("simple.nav.more")} (${tags.length})`;

  return (
    <div ref={rootRef} data-category-filter className="relative">
      {/* invisible copy used only to measure chip widths */}
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible absolute start-0 top-0 flex h-0 w-max gap-2 overflow-hidden"
      >
        <AllChip t={t} selected={false} />
        <span className="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 px-5 text-base font-bold">
          {moreLabel}
          <ChevronDown size={18} />
        </span>
        {tags.map((tag) => (
          <Chip key={tag.id} tag={tag} selected={false} />
        ))}
      </div>

      <div ref={rowRef} className="flex items-center gap-2 overflow-hidden">
        <AllChip t={t} selected={selectedId == null} onClick={onClear} />

        {visible.map((tag) => (
          <Chip
            key={tag.id}
            tag={tag}
            selected={tag.id === selectedId}
            onClick={() => onSelect(tag.id)}
          />
        ))}

        {overflow.length > 0 && (
          <button
            type="button"
            onClick={() => setMoreOpen((open) => !open)}
            aria-expanded={moreOpen}
            className="flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border-2 border-slate-300 bg-white px-5 text-base font-bold text-ink-soft transition hover:border-slate-400 active:scale-95"
          >
            {t("simple.nav.more")} ({overflow.length})
            <ChevronDown
              size={18}
              className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {moreOpen && overflow.length > 0 && (
        <div className="absolute end-0 top-full z-30 mt-2 flex w-[min(30rem,92vw)] flex-wrap gap-2 rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-xl">
          {overflow.map((tag) => (
            <Chip
              key={tag.id}
              tag={tag}
              selected={tag.id === selectedId}
              onClick={() => {
                onSelect(tag.id);
                setMoreOpen(false);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
