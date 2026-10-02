import { useCallback, useEffect, useRef, useState } from "react";

// Supplier options for the customer's "Also a supplier" field.
// Hides suppliers already linked to a DIFFERENT customer (one-to-one).
export default function useLinkedSupplierOptions({ enabled, customerId }) {
  const api = window.api;
  const [options, setOptions] = useState([]);
  const timer = useRef(null);

  const fetchOptions = useCallback(
    async (search = "") => {
      if (!api || !enabled) return;
      try {
        const res = await api.getSuppliers({ search, limit: 50 });
        const rows = res?.data || [];
        setOptions(
          rows.filter(
            (s) =>
              !s.linked_customer_id ||
              Number(s.linked_customer_id) === Number(customerId),
          ),
        );
      } catch (err) {
        console.error("Failed to load suppliers:", err);
        setOptions([]);
      }
    },
    [api, enabled, customerId],
  );

  const search = useCallback(
    (query) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fetchOptions(query), 250);
    },
    [fetchOptions],
  );

  useEffect(() => {
    fetchOptions();
    return () => clearTimeout(timer.current);
  }, [fetchOptions]);

  return { options, search };
}
