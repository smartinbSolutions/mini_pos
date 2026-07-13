import React, { useMemo, useState } from "react";
import {
  Search,
  Save,
  X,
  Edit2,
  Trash2,
  Plus,
  Calendar,
  Wallet,
  Layers,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import useExpenseCategory from "../hooks/useExpenseCategory";
import DeleteModal from "../../../Global/DeleteModel";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";

const ExpenseCategoryList = () => {
  const { t } = useTranslation();
  const { money } = usePrimaryCurrency();

  const {
    expenseCategory,
    saving,
    actionError,
    draft,
    setDraft,
    editing,
    setEditing,
    editingId,
    setEditingId,
    submitDraft,
    submitEdit,
    startEdit,
    handleDeleteExpenseCategory,
    dateRange,
    setDateRange,
    clearDateRange,
  } = useExpenseCategory();

  const [search, setSearch] = useState("");
  const [deleteCategory, setDeleteCategory] = useState(null);

  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur";
  const inputClass =
    "w-full rounded-xl border border-[#dbe4ff] bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";
  const gridLayoutClass =
    "grid grid-cols-[1fr_1fr_140px_100px_110px] items-center gap-4 px-5 py-3";

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return expenseCategory || [];

    return (expenseCategory || []).filter((c) =>
      `${c.name}`.toLowerCase().includes(term)
    );
  }, [expenseCategory, search]);

  const totalSpentAll = useMemo(
    () =>
      (expenseCategory || []).reduce(
        (sum, c) => sum + Number(c.total_spent || 0),
        0
      ),
    [expenseCategory]
  );

  const hasDateFilter = Boolean(dateRange.startDate || dateRange.endDate);

  return (
    <div className={pageClass}>
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1fr_300px]">
        {/* LIST PANEL */}
        <div className={`${panelClass} overflow-hidden`}>
          {/* HEADER */}
          <div className="border-b p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                  {t("ui.setup")}
                </p>
                <h2 className="text-2xl font-black">
                  {t("screens.expensesCategory.categoryTitle")}
                </h2>
              </div>

              <div className="relative">
                <Search
                  className="absolute left-3 top-2.5 text-slate-400"
                  size={15}
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("common.search")}
                  className={`${inputClass} w-56 pl-9`}
                />
              </div>
            </div>

            {/* DATE RANGE + TOTAL SUMMARY */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-xl border border-[#e5ebff] bg-[#f8faff] px-3 py-2">
                <Calendar size={14} className="text-[#4663ff]" />
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                  className="bg-transparent text-sm text-slate-700 outline-none"
                />
                <span className="text-slate-400">–</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) =>
                    setDateRange((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                  className="bg-transparent text-sm text-slate-700 outline-none"
                />
                {hasDateFilter && (
                  <button
                    type="button"
                    onClick={clearDateRange}
                    className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-600"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-[#4663ff]/10 px-3 py-2 text-sm font-bold text-[#4663ff]">
                <Wallet size={14} />
                {t("screens.expensesCategory.totalSpent")}:{" "}
                {money(totalSpentAll)}
              </div>
            </div>
          </div>

          {/* TABLE HEADER */}
          <div
            className={`${gridLayoutClass} border-b bg-[#f8faff] text-xs font-bold uppercase text-slate-400`}
          >
            <span>{t("ui.name")}</span>
            <span>{t("ui.latinName")}</span>
            <span className="text-right">
              {t("screens.expensesCategory.totalSpent")}
            </span>
            <span className="text-right">
              {t("screens.expensesCategory.itemsCount")}
            </span>
            <span className="text-right">{t("common.actions")}</span>
          </div>

          {/* LIST ITEMS */}
          <div className="divide-y divide-slate-100">
            {filtered.map((cat) =>
              editingId === cat.id ? (
                <form
                  key={cat.id}
                  onSubmit={submitEdit}
                  className={`${gridLayoutClass} bg-[#f8faff]`}
                >
                  <input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className={inputClass}
                  />
                  <input
                    value={editing.latinName}
                    onChange={(e) =>
                      setEditing({ ...editing, latinName: e.target.value })
                    }
                    className={inputClass}
                  />
                  <div className="text-right text-sm text-slate-400">—</div>
                  <div className="text-right text-sm text-slate-400">—</div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="submit"
                      className="rounded-xl bg-[#4663ff] p-2 text-white hover:bg-[#3854e8]"
                    >
                      <Save size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border p-2 hover:bg-slate-100"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={cat.id}
                  className={`${gridLayoutClass} hover:bg-[#f8faff] transition-colors`}
                >
                  <div className="font-semibold text-slate-700 truncate">
                    {cat.name}
                  </div>
                  <div className="text-slate-500 truncate">
                    {cat.latinName || "-"}
                  </div>

                  <div className="text-right font-black text-slate-900">
                    {money(cat.total_spent || 0)}
                  </div>

                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                      <Layers size={11} />
                      {cat.items_count || 0}
                    </span>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => startEdit(cat)}
                      className="rounded-xl p-2 hover:bg-[#eef3ff] text-slate-600"
                    >
                      <Edit2 size={14} />
                    </button>

                    {Number(cat.total_items_count || 0) === 0 ? (
                      <button
                        onClick={() => setDeleteCategory(cat)}
                        className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    ) : (
                      <span
                        title={t("screens.expensesCategory.inUseHint")}
                        className="flex items-center rounded-xl px-2 py-2 text-[11px] font-semibold text-slate-300"
                      >
                        —
                      </span>
                    )}
                  </div>
                </div>
              )
            )}

            {filtered.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                {t("screens.expensesCategory.emptyCategories")}
              </div>
            )}
          </div>
        </div>

        {/* CREATE SIDE PANEL */}
        <div className={`${panelClass} h-fit p-6`}>
          <h3 className="mb-3 text-lg font-black">
            {t("screens.expensesCategory.createCategory")}
          </h3>

          {actionError && (
            <div className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
              {actionError}
            </div>
          )}

          <form onSubmit={submitDraft} className="space-y-3">
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={inputClass}
              placeholder={t("screens.expensesCategory.categoryName")}
            />
            <input
              value={draft.latinName}
              onChange={(e) =>
                setDraft({ ...draft, latinName: e.target.value })
              }
              className={inputClass}
              placeholder={t("ui.latinName")}
            />
            <button
              disabled={saving}
              className={`w-full ${primaryButtonClass}`}
            >
              <Plus size={15} />
              {t("screens.expensesCategory.addButton")}
            </button>
          </form>
        </div>
      </div>

      <DeleteModal
        open={Boolean(deleteCategory)}
        onClose={() => setDeleteCategory(null)}
        onConfirm={async () => {
          await handleDeleteExpenseCategory(deleteCategory.id);
          setDeleteCategory(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
    </div>
  );
};

export default ExpenseCategoryList;
