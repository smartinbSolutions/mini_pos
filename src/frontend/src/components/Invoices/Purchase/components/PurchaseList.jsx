import React, { useMemo, useState } from "react";
import usePurchaseList from "../hooks/usePurchaseList";
import {
  Edit2,
  Eye,
  HandCoins,
  PackagePlus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AddPayment from "../../../Cash/Payment/components/AddPayment";

const PurchaseList = () => {
  const {
    purchaseInvoices,
    loading,
    error,
    refetch,
    deletePurchase,
    selecteInvoice,
    setSelecteInvoice,
    openPaymentModel,
    setOpenPaymentModel,
  } = usePurchaseList();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return purchaseInvoices;

    return purchaseInvoices.filter((inv) => {
      return [inv.id, inv.supplier_id, inv.date, inv.total, inv.net_total]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [purchaseInvoices, search]);

  const handleDelete = async (id) => {
    try {
      setActionError("");
      await deletePurchase(id);
    } catch (err) {
      setActionError(err.message || "Delete failed");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Purchase Invoices
          </h1>
          <p className="text-sm text-gray-500">Manage all supplier purchase</p>
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
            onClick={() => navigate("/add-purchase")}
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
                <th className="px-4 py-3">Supplier</th>
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

                    <td className="px-4 py-3">{inv.supplier_name || "—"}</td>

                    <td className="px-4 py-3">{inv.date}</td>

                    <td className="px-4 py-3 text-right">{inv.subtotal}</td>

                    <td className="px-4 py-3 text-right">{inv.discount}</td>

                    <td className="px-4 py-3 text-right font-semibold">
                      {inv.net_total}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/view-purchase/${inv.id}`)}
                          className="rounded p-2 text-gray-500 hover:bg-gray-100"
                        >
                          <Eye size={16} />
                        </button>
                        {inv.status !== "paid" && (
                          <>
                            <button
                              onClick={() =>
                                navigate(`/edit-purchase/${inv.id}`)
                              }
                              className="rounded p-2 text-gray-500 hover:bg-gray-100"
                            >
                              <Edit2 size={16} />
                            </button>

                            <button
                              onClick={() => {
                                setSelecteInvoice(inv);
                                setOpenPaymentModel(true);
                              }}
                              className="rounded p-2 text-gray-500 hover:bg-gray-100"
                            >
                              <HandCoins size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(inv.id)}
                              className="rounded p-2 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddPayment
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={selecteInvoice}
        party={selecteInvoice?.supplier_id}
        partyName={selecteInvoice?.supplier_name}
        mode="purchase"
        refetchList={refetch}
      />
    </div>
  );
};

export default PurchaseList;
