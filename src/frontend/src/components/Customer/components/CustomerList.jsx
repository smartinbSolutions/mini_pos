import React, { useMemo, useState } from "react";
import { Eye, Edit2, Plus, Save, Trash2, X, Search } from "lucide-react";
import useCustomerList from "../hooks/useCustomerList";

export const CustomerList = () => {
  const {
    saving,
    customers,
    handleDeleteCustomer,
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
  } = useCustomerList();

  const [search, setSearch] = useState("");
  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur";
  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

  const filteredCustomer = useMemo(() => {
    return customers.filter((s) =>
      `${s.name} ${s.phone} ${s.address} ${s.total} ${s.total_paid}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [customers, search]);

  return (
    <div className={pageClass}>
      <div className="max-w-7xl mx-auto grid xl:grid-cols-[1fr_320px] gap-6">
        <div className={panelClass}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                Contacts
              </p>
              <h2 className="text-2xl font-black text-slate-950">Customers</h2>
              <p className="text-sm text-slate-500">
                Manage your customers easily
              </p>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 text-slate-400"
                size={16}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomer.map((customer) => {
              const sales = customer.total || 0;
              const paid = customer.total_paid || 0;
              const balance = sales - paid;

              return editingId === customer.id ? (
                <form
                  key={customer.id}
                  onSubmit={submitEdit}
                  className="space-y-2 rounded-2xl border border-[#cbd7ff] bg-[#f8faff] p-4"
                >
                  <input
                    required
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className={`w-full ${inputClass}`}
                    placeholder="Name"
                  />

                  <input
                    value={editing.phone}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                    className={`w-full ${inputClass}`}
                    placeholder="Phone"
                  />

                  <input
                    value={editing.address}
                    onChange={(e) =>
                      setEditing({ ...editing, address: e.target.value })
                    }
                    className={`w-full ${inputClass}`}
                    placeholder="Address"
                  />

                  <div className="flex gap-2 pt-2">
                    <button className={`flex-1 ${primaryButtonClass}`}>
                      <Save size={14} />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-[#dbe4ff] bg-white p-2 text-slate-500 hover:bg-[#eef3ff]"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={customer.id}
                  className={`group rounded-2xl border bg-white p-4 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#4663ff]/10 ${
                    balance > 0 ? "border-red-200" : "border-[#e5ebff]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#4663ff] text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20">
                      {customer.name?.charAt(0)?.toUpperCase() || "S"}
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() =>
                          navigate(`/payment/customer/${customer.id}`)
                        }
                        className="rounded-xl p-2 text-[#4663ff] hover:bg-[#eef3ff]"
                        title="View Movements"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => startEdit(customer)}
                        className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomer(customer)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-bold text-slate-900">
                      {customer.name}
                    </div>

                    <div className="text-xs text-gray-500">
                      📞 {customer.phone || "No phone"}
                    </div>

                    <div className="text-xs text-gray-400 truncate">
                      📍 {customer.address || "No address"}
                    </div>

                    <div className="mt-3 border-t pt-3 space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Sales</span>
                        <span className="font-medium text-gray-800">
                          {sales}
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

          {filteredCustomer.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-10">
              No Customer found
            </div>
          )}
        </div>

        <div className="top-6 h-fit rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur">
          <h3 className="mb-1 text-lg font-black text-slate-950">
            Create Customer
          </h3>
          <p className="mb-5 text-sm text-slate-500">Add a customer contact</p>

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
              className={`w-full ${inputClass}`}
              placeholder="Name"
            />

            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className={`w-full ${inputClass}`}
              placeholder="Phone"
            />

            <input
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className={`w-full ${inputClass}`}
              placeholder="Address"
            />

            <button
              disabled={saving}
              className={`w-full ${primaryButtonClass}`}
            >
              <Plus size={15} />
              Add Customer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
