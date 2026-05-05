import React from "react";
import useFundList from "../hooks/useFundList";
import { Edit2, Plus, Save, Trash2, X } from "lucide-react";

const FundList = () => {
  const {
    saving,
    funds,
    handleDeleteFund,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
    submitDraft,
    currencies,
  } = useFundList();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border shadow-sm flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Funds</h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage your cash & bank accounts
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {funds.length}
              </div>
              <div className="text-xs text-gray-400">Total Funds</div>
            </div>
          </div>

          <div className="space-y-3">
            {funds.map((fund) =>
              editingId === fund.id ? (
                <form
                  key={fund.id}
                  onSubmit={submitEdit}
                  className="bg-white border rounded-2xl p-5 shadow-sm space-y-3"
                >
                  <input
                    required
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Fund name"
                  />
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Currency
                    </label>
                    <select
                      value={editing.currency_id || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          currency_id: Number(e.target.value),
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">Select currency</option>
                      {currencies.map((currency) => (
                        <option key={currency.id} value={currency.id}>
                          {currency.name} ({currency.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">
                      Initial Balance
                    </label>
                    <input
                      type="number"
                      value={editing.balance || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          balance: Number(e.target.value),
                        })
                      }
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      placeholder="0.00"
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
                      className="px-3 border rounded-lg hover:bg-gray-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={fund.id}
                  className="group bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-lg font-medium text-gray-900">
                        {fund.name}
                      </div>

                      <div className="flex gap-2 mt-2 text-xs">
                        {fund.currency_code && (
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md">
                            {fund.currency_code}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button
                        onClick={() => startEdit(fund)}
                        className="p-2 rounded-lg hover:bg-gray-100"
                      >
                        <Edit2 size={15} />
                      </button>

                      <button
                        onClick={() => handleDeleteFund(fund)}
                        className="p-2 rounded-lg text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-400">Current Balance</div>

                    <div className="text-xl font-semibold text-green-600">
                      {fund.balance || 0}
                    </div>
                  </div>
                </div>
              ),
            )}

            {funds.length === 0 && (
              <div className="bg-white rounded-2xl border p-10 text-center text-gray-400">
                No funds yet
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border p-6 h-fit sticky top-6">
          <h3 className="text-lg font-semibold mb-5">Create New Fund</h3>

          <form onSubmit={submitDraft} className="space-y-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Fund Name
              </label>
              <input
                required
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-gray-900 outline-none"
                placeholder="Cash / Bank / Safe"
              />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Currency
              </label>
              <select
                value={draft.currency_id || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    currency_id: Number(e.target.value),
                  })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select currency</option>
                {currencies.map((currency) => (
                  <option key={currency.id} value={currency.id}>
                    {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Initial Balance
              </label>
              <input
                type="number"
                value={draft.balance || ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    balance: Number(e.target.value),
                  })
                }
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white py-2.5 text-sm hover:bg-gray-800 disabled:opacity-60"
            >
              <Plus size={16} />
              Create Fund
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FundList;
