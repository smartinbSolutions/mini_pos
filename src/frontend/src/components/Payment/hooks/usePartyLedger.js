import { useEffect, useState, useCallback } from "react";

const useGetPayments = (fundId) => {
  const api = window.api;

  const [payments, setPayments] = useState([]);
  const [fund, setFund] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = useCallback(
    async (id) => {
      if (!id) return;
      setLoading(true);
      try {
        const res = await api.getPaymentFund(id);
        const resFund = await api.getFund(id);
        setPayments(Array.isArray(res) ? res : []);
        setFund(resFund);
      } catch (err) {
        console.log("getPaymentFund error:", err);
        setPayments([]);
      }
      setLoading(false);
    },
    [api],
  );

  useEffect(() => {
    fetchPayments(fundId);
  }, [fundId, fetchPayments]);

  return {
    payments,
    loading,
    fund,
    refetch: () => fetchPayments(fundId),
  };
};

export default useGetPayments;
