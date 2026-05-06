import React, { useMemo, useState } from "react";
import { Edit2, Plus, Save, Trash2, X, Search } from "lucide-react";
import useTax from "../hooks/useTax";

const TaxList = () => {
  const {
    saving,
    taxes,
    handleDeleteTax,
    submitDraft,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
  } = useTax();

  const [search, setSearch] = useState("");

  const filteredTaxes = useMemo(() => {
    return taxes.filter((t) =>
      `${t.name} ${t.rate}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [taxes, search]);

  return (
    <div className="min-h-screen bg-[#f7f8fc] p-6">
      <div className="max-w-6xl mx-auto grid xl:grid-cols-[1fr_300px] gap-6">
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Taxes</h2>
              <p className="text-xs text-gray-500">Manage tax rates</p>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 text-gray-400"
                size={15}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search taxes..."
                className="pl-9 pr-3 py-2 text-sm border rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-gray-900 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 px-5 py-3 text-xs text-gray-400 border-b bg-gray-50">
            <span>Name</span>
            <span>Rate</span>
            <span className="text-right">Actions</span>
          </div>

          <div>
            {filteredTaxes.map((tax) =>
              editingId === tax.id ? (
                <form
                  key={tax.id}
                  onSubmit={submitEdit}
                  className="grid grid-cols-3 items-center px-5 py-3 border-b bg-blue-50"
                >
                  <input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className="px-3 py-1.5 rounded-lg border text-sm"
                  />

                  <input
                    value={editing.rate}
                    onChange={(e) =>
                      setEditing({ ...editing, rate: e.target.value })
                    }
                    className="px-3 py-1.5 rounded-lg border text-sm w-24"
                  />

                  <div className="flex justify-end gap-2">
                    <button className="p-2 bg-gray-900 text-white rounded-lg">
                      <Save size={14} />
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
                  key={tax.id}
                  className="grid grid-cols-3 items-center px-5 py-3 border-b hover:bg-gray-50 transition group"
                >
                  <div className="text-sm font-medium text-gray-900">
                    {tax.name}
                  </div>

                  <div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      {tax.rate}%
                    </span>
                  </div>

                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => startEdit(tax)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDeleteTax(tax)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ),
            )}

            {filteredTaxes.length === 0 && (
              <div className="p-10 text-center text-gray-400 text-sm">
                No taxes found
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm p-5 h-fit sticky top-6">
          <h3 className="text-sm font-semibold mb-4">Create Tax</h3>

          <form onSubmit={submitDraft} className="space-y-3">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-gray-50 text-sm"
              placeholder="Tax name"
            />

            <input
              value={draft.rate}
              onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border bg-gray-50 text-sm"
              placeholder="Rate %"
            />

            <button
              disabled={saving}
              className="w-full bg-gray-900 text-white py-2 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-black transition"
            >
              <Plus size={15} />
              Add Tax
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default TaxList;
