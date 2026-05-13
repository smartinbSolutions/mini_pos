import { useEffect, useState, useCallback } from "react";

const useGetPayments = (fundId) => {
  const api = window.api;

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = useCallback(
    async (id) => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await api.getPaymentFund(id);
        setPayments(Array.isArray(res) ? res : []);
      } catch (err) {
        console.log("getPaymentFund error:", err);
        setPayments([]);
      }
      setLoading(false);
    },
    [api],
  );
  console.log(payments);

  useEffect(() => {
    fetchPayments(fundId);
  }, [fundId, fetchPayments]);

  return {
    payments,
    loading,
    refetch: () => fetchPayments(fundId),
  };
};

export default useGetPayments;
