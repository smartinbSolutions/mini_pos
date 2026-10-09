import { useState } from "react";

// Stores only the user's overrides, so columns added later still get their
// own default instead of being hidden by an old saved list.
export default function useColumnVisibility(storageKey, columns) {
  const key = `columns:${storageKey}`;

  const [overrides, setOverrides] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch {
      return {};
    }
  });

  const save = (next) => {
    setOverrides(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      /* storage unavailable, keep in memory */
    }
  };

  const isVisible = (col) =>
    col.locked || (overrides[col.key] ?? col.defaultVisible !== false);

  return {
    visibleColumns: columns.filter(isVisible),
    isVisible,
    toggle: (colKey) => {
      const col = columns.find((c) => c.key === colKey);
      if (!col || col.locked) return;
      save({ ...overrides, [colKey]: !isVisible(col) });
    },
    reset: () => save({}),
  };
}
