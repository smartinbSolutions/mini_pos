import React, { useMemo, useState } from "react";
import useUnit from "../hooks/useUnit";
import { Edit2, Plus, Save, Trash2, X, Search } from "lucide-react";

const UnitList = () => {
  const {
    saving,
    units,
    handleDeleteUnit,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
    submitDraft,
    actionError,
  } = useUnit();

  const [search, setSearch] = useState("");

  const filteredUnits = useMemo(() => {
    return units.filter((u) =>
      `${u.name} ${u.latinName} ${u.code}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [units, search]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="bg-white/80 backdrop-blur rounded-2xl border shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Units</h2>
              <p className="text-sm text-gray-500">Manage measurement units</p>
            </div>

            <div className="relative">
              <Search
                className="absolute left-2 top-2.5 text-gray-400"
                size={16}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-7 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-gray-800 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredUnits.map((unit) =>
              editingId === unit.id ? (
                <form
                  key={unit.id}
                  onSubmit={submitEdit}
                  className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm animate-fadeIn"
                >
                  <input
                    required
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className="mb-3 w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Unit name"
                  />

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <input
                      value={editing.latinName}
                      onChange={(e) =>
                        setEditing({ ...editing, latinName: e.target.value })
                      }
                      className="rounded-lg border px-3 py-2 text-sm"
                      placeholder="Latin"
                    />
                    <input
                      required
                      value={editing.code}
                      onChange={(e) =>
                        setEditing({ ...editing, code: e.target.value })
                      }
                      className="rounded-lg border px-3 py-2 text-sm"
                      placeholder="Code"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white py-2 text-sm hover:bg-blue-700 transition">
                      <Save size={15} />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-2 border rounded-lg hover:bg-gray-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={unit.id}
                  className="group flex items-center justify-between rounded-xl border bg-white p-4 hover:shadow-md hover:-translate-y-[2px] transition-all duration-200"
                >
                  <div>
                    <div className="font-medium text-gray-900">{unit.name}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {[unit.latinName, unit.code]
                        .filter(Boolean)
                        .join(" • ") || "No details"}
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => startEdit(unit)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteUnit(unit)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ),
            )}

            {filteredUnits.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-12">
                No units found
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur rounded-2xl border shadow-sm p-6 h-fit sticky top-6">
          <h3 className="text-md font-semibold mb-4">Add Unit</h3>

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
              className="w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none"
              placeholder="Unit name"
            />

            <div className="grid grid-cols-2 gap-2">
              <input
                value={draft.latinName}
                onChange={(e) =>
                  setDraft({ ...draft, latinName: e.target.value })
                }
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="Latin"
              />
              <input
                required
                value={draft.code}
                onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                className="rounded-lg border px-3 py-2 text-sm"
                placeholder="Code"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white py-2 text-sm hover:bg-black transition disabled:opacity-50"
            >
              <Plus size={16} />
              Add Unit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default UnitList;
