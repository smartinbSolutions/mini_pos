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
    actionError,
  } = useTax();

  const [search, setSearch] = useState("");
  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur";
  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

  const filteredTaxes = useMemo(() => {
    return taxes.filter((t) =>
      `${t.name} ${t.rate}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [taxes, search]);

  return (
    <div className={pageClass}>
      <div className="max-w-6xl mx-auto grid xl:grid-cols-[1fr_300px] gap-6">
        <div className={`${panelClass} overflow-hidden`}>
          <div className="p-5 border-b flex items-center justify-between">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                Setup
              </p>
              <h2 className="text-2xl font-black text-slate-950">Taxes</h2>
              <p className="text-sm text-slate-500">Manage tax rates</p>
            </div>

            <div className="relative">
              <Search
                className="absolute left-3 top-2.5 text-slate-400"
                size={15}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search taxes..."
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 border-b bg-[#f8faff] px-5 py-3 text-xs font-bold uppercase tracking-wide text-slate-400">
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
                  className="grid grid-cols-3 items-center border-b bg-[#f8faff] px-5 py-3"
                >
                  <input
                    required
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className={inputClass}
                  />

                  <input
                    required
                    type="number"
                    value={editing.rate}
                    onChange={(e) =>
                      setEditing({ ...editing, rate: e.target.value })
                    }
                    className={`${inputClass} w-24`}
                  />

                  <div className="flex justify-end gap-2">
                    <button className="rounded-xl bg-[#4663ff] p-2 text-white shadow-lg shadow-[#4663ff]/20">
                      <Save size={14} />
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
                  key={tax.id}
                  className="group grid grid-cols-3 items-center border-b px-5 py-3 transition hover:bg-[#f8faff]"
                >
                  <div className="text-sm font-bold text-slate-900">
                    {tax.name}
                  </div>

                  <div>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                      {tax.rate}%
                    </span>
                  </div>

                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => startEdit(tax)}
                      className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
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

        <div className="sticky top-6 h-fit rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur">
          <h3 className="mb-1 text-lg font-black text-slate-950">Create Tax</h3>
          <p className="mb-5 text-sm text-slate-500">Add a tax rate</p>

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
              placeholder="Tax name"
            />

            <input
              required
              type="number"
              min="0"
              value={draft.rate}
              onChange={(e) => setDraft({ ...draft, rate: e.target.value })}
              className={`w-full ${inputClass}`}
              placeholder="Rate %"
            />

            <button
              disabled={saving}
              className={`w-full ${primaryButtonClass}`}
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
