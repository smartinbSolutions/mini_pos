import React, { useMemo, useState } from "react";
import { Edit2, PackagePlus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useSalesList from "../hooks/useSalesList";

const SalesList = () => {
  const { salesInvoices, loading, saving, error, refetch, deleteSales } =
    useSalesList();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return salesInvoices;

    return salesInvoices.filter((inv) => {
      return [inv.id, inv.supplier_id, inv.date, inv.total, inv.net_total]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [salesInvoices, search]);

  const handleDelete = async (id) => {
    try {
      setActionError("");
      await deleteSales(id);
    } catch (err) {
      setActionError(err.message || "Delete failed");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Invoices</h1>
          <p className="text-sm text-gray-500">Manage all customer sales</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded border px-3 py-2 pl-9 text-sm sm:w-64"
              placeholder="Search invoices..."
            />
          </div>

          <button
            onClick={refetch}
            className="flex items-center gap-2 rounded border px-3 py-2 text-sm hover:bg-gray-50"
          >
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            onClick={() => navigate("/add-sales")}
            className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            <PackagePlus size={16} />
            Add Invoice
          </button>
        </div>
      </div>

      {(error || actionError) && (
        <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError || error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-6 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">#{inv.id}</td>

                    <td className="px-4 py-3">{inv.customer_name || "—"}</td>

                    <td className="px-4 py-3">{inv.date}</td>

                    <td className="px-4 py-3 text-right">{inv.subtotal}</td>

                    <td className="px-4 py-3 text-right">{inv.discount}</td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {inv.net_total}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/edit-sales/${inv.id}`)}
                          className="rounded p-2 text-gray-500 hover:bg-gray-100"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="rounded p-2 text-red-500 hover:bg-red-50"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesList;
