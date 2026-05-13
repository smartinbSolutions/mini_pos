import React, { useMemo, useState } from "react";
import { Edit2, Plus, Save, Trash2, X, Search, Eye } from "lucide-react";
import useSuppliersList from "../hooks/useSuppliersList";

export const SuppliersList = () => {
  const {
    saving,
    suppliers,
    handleDeleteSupplier,
    submitDraft,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
    actionError,
    navigate,
  } = useSuppliersList();

  const [search, setSearch] = useState("");

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) =>
      `${s.name} ${s.phone} ${s.address} ${s.total} ${s.total_paid}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [suppliers, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto grid xl:grid-cols-[1fr_320px] gap-6">
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Suppliers</h2>
              <p className="text-sm text-gray-500">
                Manage your suppliers easily
              </p>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={16}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier..."
                className="pl-9 pr-3 py-2 text-sm border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map((supplier) => {
              const purchases = supplier.total || 0;
              const paid = supplier.total_paid || 0;
              const balance = purchases - paid;

              return editingId === supplier.id ? (
                <form
                  key={supplier.id}
                  onSubmit={submitEdit}
                  className="border rounded-xl p-4 bg-blue-50 space-y-2"
                >
                  <input
                    required
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Name"
                  />

                  <input
                    value={editing.phone}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Phone"
                  />

                  <input
                    value={editing.address}
                    onChange={(e) =>
                      setEditing({ ...editing, address: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="Address"
                  />

                  <div className="flex gap-2 pt-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-1">
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-2 border rounded-lg"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={supplier.id}
                  className={`group border rounded-xl p-4 bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-200 ${
                    balance > 0 ? "border-red-200" : "border-green-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                      {supplier.name?.charAt(0)?.toUpperCase() || "S"}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() =>
                          navigate(`/payment/supplier/${supplier.id}`)
                        }
                        className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                        title="View Movements"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => startEdit(supplier)}
                        className="p-2 rounded-lg hover:bg-gray-100"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(supplier)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-medium text-gray-900">
                      {supplier.name}
                    </div>

                    <div className="text-xs text-gray-500">
                      📞 {supplier.phone || "No phone"}
                    </div>

                    <div className="text-xs text-gray-400 truncate">
                      📍 {supplier.address || "No address"}
                    </div>

                    <div className="mt-3 border-t pt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Purchases</span>
                        <span className="font-medium text-gray-800">
                          {purchases}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-gray-500">Paid</span>
                        <span className="font-medium text-green-600">
                          {paid}
                        </span>
                      </div>

                      <div className="flex justify-between border-t pt-1">
                        <span className="text-gray-600 font-medium">
                          Balance
                        </span>
                        <span
                          className={`font-semibold ${
                            balance > 0 ? "text-red-500" : "text-green-600"
                          }`}
                        >
                          {balance}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredSuppliers.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-10">
              No suppliers found
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 h-fit top-6">
          <h3 className="text-sm font-semibold mb-4">Create Supplier</h3>

          {actionError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}

          <form onSubmit={submitDraft} className="space-y-3">
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-gray-50 text-sm"
              placeholder="Name"
            />

            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-gray-50 text-sm"
              placeholder="Phone"
            />

            <input
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-gray-50 text-sm"
              placeholder="Address"
            />

            <button
              disabled={saving}
              className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-black transition disabled:opacity-50"
            >
              <Plus size={15} />
              Add Supplier
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
