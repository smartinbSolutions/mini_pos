import React from "react";
import useCurrency from "../hooks/useCurrency";
import { Edit2, Plus, Save, Trash2, X } from "lucide-react";

const CurrencyList = () => {
  const {
    saving,
    currencies,
    handleDeleteCurrency,
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
  } = useCurrency();

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 shadow-sm border flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Currency Management
              </h2>
              <p className="text-sm text-gray-500">
                Manage currencies and exchange rates
              </p>
            </div>

            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {currencies.length}
              </div>
              <div className="text-xs text-gray-500">Total Currencies</div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-4 space-y-3">
            {currencies.map((currency) =>
              editingId === currency.id ? (
                <form
                  key={currency.id}
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
                    placeholder="Currency name"
                  />

                  <div className="grid grid-cols-3 gap-2 mb-3">
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
                    <input
                      required
                      type="number"
                      step="0.0001"
                      value={editing.exchangeRate}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          exchangeRate: e.target.value,
                        })
                      }
                      className="rounded-lg border px-3 py-2 text-sm"
                      placeholder="Rate"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white py-2 text-sm hover:bg-blue-700">
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
                  key={currency.id}
                  className="group flex items-center justify-between rounded-xl border p-4 hover:shadow-lg hover:border-gray-300 transition-all"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {currency.name}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      {currency.code && (
                        <span className="px-2 py-1 bg-gray-100 rounded-md">
                          {currency.code}
                        </span>
                      )}

                      {currency.latinName && (
                        <span className="px-2 py-1 bg-gray-100 rounded-md">
                          {currency.latinName}
                        </span>
                      )}

                      {currency.exchangeRate && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md font-medium">
                          Rate: {currency.exchangeRate}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => startEdit(currency)}
                      className="p-2 rounded-lg hover:bg-gray-100"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteCurrency(currency)}
                      className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ),
            )}

            {currencies.length === 0 && (
              <div className="text-center py-16">
                <div className="text-gray-400 mb-2 text-sm">
                  No currencies yet
                </div>
                <div className="text-xs text-gray-400">
                  Start by adding your first currency
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-5 h-fit sticky top-6">
          <h3 className="text-md font-semibold mb-4">Add Currency</h3>

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
              placeholder="Currency name"
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

            <input
              required
              type="number"
              step="0.0001"
              value={draft.exchangeRate}
              onChange={(e) =>
                setDraft({ ...draft, exchangeRate: e.target.value })
              }
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="Exchange Rate"
            />

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white py-2 text-sm hover:bg-gray-800 transition"
            >
              <Plus size={16} />
              Add Currency
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CurrencyList;
