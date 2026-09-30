import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

// List state (page, limit, search, filters) stored in the URL query string,
// so Back / refresh / RouteMemory restore it. `defaults` (and the options
// object, if passed) must be stable module-level objects; values equal to
// their default are left out of the URL. `prefix` namespaces the keys when
// several lists share one page (e.g. "d_" → d_page, d_search).
export default function useListParams(defaults, { prefix = "" } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // setSearchParams changes identity on every URL change; keep the latest in
  // a ref so setParams stays stable and effects depending on it don't re-run.
  const setSearchParamsRef = useRef(setSearchParams);
  setSearchParamsRef.current = setSearchParams;

  const params = useMemo(() => {
    const out = {};
    for (const [key, def] of Object.entries(defaults)) {
      const raw = searchParams.get(prefix + key);
      if (raw === null) {
        out[key] = def;
      } else if (typeof def === "number") {
        const n = Number(raw);
        out[key] = Number.isFinite(n) ? n : def;
      } else if (Array.isArray(def)) {
        out[key] = raw
          ? raw.split(",").map((v) => (v !== "" && !isNaN(v) ? Number(v) : v))
          : [];
      } else {
        out[key] = raw;
      }
    }
    return out;
  }, [searchParams, defaults, prefix]);

  const setParams = useCallback(
    (patch) => {
      // Read the LIVE query string (HashRouter: after "?" in the hash), not a
      // render-time snapshot, so several hooks on one page never overwrite
      // each other's keys.
      const hash = window.location.hash;
      const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
      const next = new URLSearchParams(query);

      for (const [key, value] of Object.entries(patch)) {
        const def = defaults[key];
        const isEmpty =
          value === undefined ||
          value === null ||
          value === "" ||
          (Array.isArray(value) && value.length === 0) ||
          value === def;

        if (isEmpty) next.delete(prefix + key);
        else
          next.set(
            prefix + key,
            Array.isArray(value) ? value.join(",") : String(value),
          );
      }

      setSearchParamsRef.current(next, { replace: true });
    },
    [defaults, prefix],
  );

  return [params, setParams];
}
