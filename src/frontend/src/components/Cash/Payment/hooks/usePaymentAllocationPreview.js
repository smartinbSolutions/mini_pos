import { useCallback, useEffect, useRef, useState } from "react";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Shared by useAddPayment (direct collection) and useAddFundPayment
// (free voucher) — same "what open documents does this amount close"
// preview, debounced the same way in both places.
export default function usePaymentAllocationPreview({
  api,
  active, // whether this payment context can close documents at all
  partyType,
  partyId,
  direction, // "in" | "out" | null — caller resolves this, see below
  amount,
}) {
  const [allocationLines, setAllocationLines] = useState([]);
  const [allocationLoading, setAllocationLoading] = useState(false);

  const fetchPreview = useCallback(
    async (amt) => {
      if (!active || !partyId || !direction || amt <= 0) {
        setAllocationLines([]);
        return;
      }
      setAllocationLoading(true);
      try {
        const res = await api.previewPaymentAllocation({
          partyType,
          partyId,
          direction,
          amount: amt,
        });
        // console.log("previewPaymentAllocation result", {
        //   partyType,
        //   partyId,
        //   direction,
        //   amount: amt,
        //   res,
        // });
        setAllocationLines(res?.success ? res.lines : []);
      } catch {
        setAllocationLines([]);
      } finally {
        setAllocationLoading(false);
      }
    },
    [api, active, partyType, partyId, direction],
  );

  const timer = useRef(null);
  useEffect(() => {
    if (!active) {
      setAllocationLines([]);
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchPreview(amount), 300);
    return () => clearTimeout(timer.current);
  }, [amount, active, fetchPreview]);

  const updateAllocationLine = (index, value) => {
    setAllocationLines((prev) => {
      const copy = [...prev];
      const line = copy[index];
      const capped = Math.max(0, Math.min(Number(value) || 0, line.remaining));
      copy[index] = { ...line, allocate: capped };
      return copy;
    });
  };

  const allocationTotal = allocationLines.reduce(
    (sum, l) => sum + (Number(l.allocate) || 0),
    0,
  );
  const allocationLeftover = round2(amount - allocationTotal);

  return {
    allocationLines,
    allocationLoading,
    allocationTotal,
    allocationLeftover,
    updateAllocationLine,
  };
}
