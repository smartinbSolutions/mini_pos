// packages/app/src/renderer/features/manufacturingOrders/hooks/useManufacturingOrders.js

import { useCallback, useEffect, useState } from "react";

export default function useManufacturingOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [filters, setFiltersState] = useState({
    output_product_id: null,
    dateFrom: null,
    dateTo: null,
  });

  const setFilters = (patch) => {
    setFiltersState((prev) => ({ ...prev, ...patch }));
    setPage(1);
  };

  const clearFilters = () => {
    setFiltersState({ output_product_id: null, dateFrom: null, dateTo: null });
    setPage(1);
  };

  const [openDeleteModel, setOpenDeleteModel] = useState(false);
  const [selectDeleteOrder, setSelectDeleteOrder] = useState(null);

  const fetchOrders = useCallback(() => {
    setLoading(true);
    setError(null);
    window.api
      .getManufacturingOrders({
        page,
        limit,
        search: search || undefined,
        output_product_id: filters.output_product_id || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
      })
      .then((res) => {
        if (res.success) {
          setOrders(res.data);
          setTotal(res.total);
          setTotalPages(res.totalPages);
        } else {
          setError(res.error);
        }
      })
      .finally(() => setLoading(false));
  }, [page, limit, search, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleDeleteOrder = async (order) => {
    setActionError(null);
    const res = await window.api.deleteManufacturingOrder(order.id);
    if (!res.success) {
      setActionError(res.error);
    } else {
      fetchOrders();
    }
    setOpenDeleteModel(false);
    setSelectDeleteOrder(null);
    return res;
  };

  return {
    orders,
    loading,
    error,
    refetch: fetchOrders,
    actionError,
    search,
    setSearch,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    filters,
    setFilters,
    clearFilters,
    handleDeleteOrder,
    openDeleteModel,
    setOpenDeleteModel,
    selectDeleteOrder,
    setSelectDeleteOrder,
  };
}
