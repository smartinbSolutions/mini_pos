import React, { useMemo, useState } from "react";
import { Search, Save, X, Edit2, Trash2, Plus } from "lucide-react";

import useExpenseCategory from "../hooks/useExpenseCategory";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../Global/DeleteModel";

const ExpenseCategoryList = () => {
  const { t } = useTranslation();

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
  } = useExpenseCategory();

  const [search, setSearch] = useState("");
  const [deleteCategory, setDeleteCategory] = useState(null);

  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";

  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur";

  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";

  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

  // ✅ filtering
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return expenseCategory || [];

    return (expenseCategory || []).filter((c) =>
      `${c.name}`.toLowerCase().includes(term),
    );
  }, [expenseCategory, search]);

  return (
    <div className={pageClass}>
      <div className="mx-auto grid max-w-6xl gap-6 xl:grid-cols-[1fr_300px]">
        {/* LIST */}
        <div className={`${panelClass} overflow-hidden`}>
          {/* HEADER */}
          <div className="flex items-center justify-between border-b p-5">
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
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {/* TABLE HEADER */}
          <div className="grid grid-cols-2 border-b bg-[#f8faff] px-5 py-3 text-xs font-bold uppercase text-slate-400">
            <span>{t("ui.name")}</span>
            <span className="text-right">{t("common.actions")}</span>
          </div>

          {/* LIST */}
          <div>
            {filtered.map((cat) =>
              editingId === cat.id ? (
                <form
                  key={cat.id}
                  onSubmit={submitEdit}
                  className="grid grid-cols-2 items-center gap-2 border-b bg-[#f8faff] px-5 py-3"
                >
                  <input
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className={inputClass}
                  />

                  <div className="flex justify-end gap-2">
                    <button className="rounded-xl bg-[#4663ff] p-2 text-white">
                      <Save size={14} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border p-2"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={cat.id}
                  className="group grid grid-cols-2 items-center border-b px-5 py-3 hover:bg-[#f8faff]"
                >
                  <div className="font-bold">{cat.name}</div>

                  <div className="flex justify-end gap-2 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => startEdit(cat)}
                      className="rounded-xl p-2 hover:bg-[#eef3ff]"
                    >
                      <Edit2 size={14} />
                    </button>

                    <button
                      onClick={() => setDeleteCategory(cat)}
                      className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ),
            )}

            {filtered.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                {t("screens.expensesCategory.emptyCategories")}
              </div>
            )}
          </div>
        </div>

        {/* CREATE */}
        <div className={`${panelClass} h-fit p-6`}>
          <h3 className="mb-1 text-lg font-black">
            {t("screens.expensesCategory.createCategory")}
          </h3>

          {/* <p className="mb-4 text-sm text-slate-500">
            {t("screens.expensesCategory.createCategoryDesc")}
          </p> */}

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

      {/* DELETE MODAL */}
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
