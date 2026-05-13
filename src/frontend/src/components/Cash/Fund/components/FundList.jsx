import React from "react";
import useFundList from "../hooks/useFundList";
import { Edit2, Plus, Save, Trash2, X, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

const FundList = () => {
  const navigate = useNavigate();

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
    actionError,
  } = useFundList();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f6fb] to-[#eef2f7] p-6">
      <div className="max-w-6xl mx-auto grid xl:grid-cols-[1fr_360px] gap-6">
        {/* LEFT */}
        <div className="space-y-6">
          {/* HEADER */}
          <div className="bg-white/70 backdrop-blur border border-gray-200 rounded-2xl p-6 flex items-center justify-between shadow-sm">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Funds Overview
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Manage your cash, bank & wallets
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {funds.length}
              </div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">
                Accounts
              </div>
            </div>
          </div>

          {/* LIST */}
          <div className="space-y-3">
            {funds.map((fund) =>
              editingId === fund.id ? (
                <form
                  key={fund.id}
                  onSubmit={submitEdit}
                  className="bg-white rounded-2xl border shadow-sm p-5 space-y-3"
                >
                  <input
                    required
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-sm"
                    placeholder="Fund name"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      required
                      value={editing.currency_id || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          currency_id: Number(e.target.value),
                        })
                      }
                      className="px-3 py-2.5 rounded-xl border text-sm bg-gray-50"
                    >
                      <option value="">Currency</option>
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      value={editing.balance || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          balance: Number(e.target.value),
                        })
                      }
                      className="px-3 py-2.5 rounded-xl border bg-gray-50 text-sm"
                      placeholder="Balance"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 hover:bg-black">
                      <Save size={15} />
                      Save
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-4 rounded-xl border hover:bg-gray-100"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={fund.id}
                  className="bg-white rounded-2xl border shadow-sm hover:shadow-md transition p-5 flex items-center justify-between group"
                >
                  {/* LEFT */}
                  <div className="space-y-1">
                    <div className="text-lg font-semibold text-gray-900">
                      {fund.name}
                    </div>

                    <div className="text-xs text-gray-500">
                      {fund.currency_code}
                    </div>
                  </div>

                  {/* RIGHT */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Balance</div>
                      <div className="text-xl font-semibold text-emerald-600">
                        {fund.balance || 0}
                      </div>
                    </div>

                    {/* ACTIONS */}
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                      {/* 👁 VIEW MOVEMENTS */}
                      <button
                        onClick={() => navigate(`/fund/${fund.id}`)}
                        className="p-2 rounded-xl hover:bg-blue-50 text-blue-600"
                        title="View Movements"
                      >
                        <Eye size={14} />
                      </button>

                      <button
                        onClick={() => startEdit(fund)}
                        className="p-2 rounded-xl hover:bg-gray-100"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => handleDeleteFund(fund)}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white/80 backdrop-blur border rounded-2xl p-6 shadow-sm h-fit sticky top-6">
          <h3 className="text-lg font-semibold mb-5">Create Fund</h3>

          {actionError && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border p-2 rounded-lg">
              {actionError}
            </div>
          )}

          <form onSubmit={submitDraft} className="space-y-4">
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-sm"
              placeholder="Fund name"
            />

            <select
              required
              value={draft.currency_id || ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  currency_id: Number(e.target.value),
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-sm"
            >
              <option value="">Select currency</option>
              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <input
              type="number"
              value={draft.balance || ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  balance: Number(e.target.value),
                })
              }
              className="w-full px-4 py-2.5 rounded-xl border bg-gray-50 text-sm"
              placeholder="Initial balance"
            />

            <button
              disabled={saving}
              className="w-full bg-black text-white py-2.5 rounded-xl text-sm flex items-center justify-center gap-2"
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
