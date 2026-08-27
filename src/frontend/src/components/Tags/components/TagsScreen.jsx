// packages/app/src/renderer/screens/TagsScreen.jsx

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Tag as TagIcon,
  Tags,
} from "lucide-react";
import { useTags } from "../hooks/useTags";
import TagFormModal from "./TagFormModal";
import TagConfirmDialog from "./TagConfirmDialog";

const SCOPE_ORDER = [
  null,
  "product",
  "customer",
  "supplier",
  "partner",
  "sales_invoice",
  "sales_return",
  "sales_quotation",
  "purchase_invoice",
  "purchase_return",
  "expense",
  "payment",
];

function groupByScope(tags) {
  const groups = new Map(SCOPE_ORDER.map((s) => [s, []]));
  for (const tag of tags) {
    const key = tag.scope ?? null;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tag);
  }
  return SCOPE_ORDER.map((scope) => ({
    scope,
    items: groups.get(scope) || [],
  })).filter((g) => g.items.length > 0);
}

export default function TagsScreen() {
  const { t } = useTranslation();
  const {
    tags,
    loading,
    editingTag,
    confirmState,
    openCreate,
    openEdit,
    closeForm,
    saveTag,
    confirmScopeChange,
    requestDelete,
    confirmDelete,
    cancelConfirm,
  } = useTags();

  const [search, setSearch] = useState("");
  const [activeScope, setActiveScope] = useState("all");

  const filteredTags = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tags.filter((tag) => {
      const matchesSearch = !term || tag.name.toLowerCase().includes(term);
      const matchesScope =
        activeScope === "all" ||
        (activeScope === "global" ? !tag.scope : tag.scope === activeScope);
      return matchesSearch && matchesScope;
    });
  }, [tags, search, activeScope]);

  const grouped = groupByScope(filteredTags);
  const scopesInUse = groupByScope(tags).map((g) => g.scope);

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <main className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
          <div className="grid gap-6 p-7 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-[#4663ff]">
                {t("ui.setup", "Setup")}
              </p>
              <h1 className="text-3xl font-black leading-tight text-slate-950">
                {t("screens.tags.title")}
              </h1>
              <p className="mt-2 max-w-md text-sm text-slate-500">
                {t(
                  "screens.tags.subtitle",
                  "Group products, invoices, and more so you can filter by them later.",
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-[#e5ebff] bg-[#f8faff] px-4 py-3 text-center">
                <div className="text-2xl font-black tabular-nums text-slate-950">
                  {tags.length}
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-500">
                  {t("screens.tags.totalTags", "Tags")}
                </div>
              </div>
              <button
                onClick={openCreate}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4663ff] px-5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8]"
              >
                <Plus size={17} />
                {t("screens.tags.addTag")}
              </button>
            </div>
          </div>

          {/* Search + scope filter */}
          <div className="flex flex-col gap-3 border-t border-[#e5ebff] bg-white/60 p-4">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("screens.tags.searchTags")}
                className="h-10 w-full rounded-xl border border-[#dbe4ff] bg-white/90 pl-10 pr-3 text-sm outline-none transition focus:border-[#4663ff] focus:ring-[3px] focus:ring-[#4663ff]/12"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setActiveScope("all")}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  activeScope === "all"
                    ? "bg-[#4663ff] text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {t("common.all", "All")}
              </button>
              <button
                onClick={() => setActiveScope("global")}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  activeScope === "global"
                    ? "bg-[#4663ff] text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {t("screens.tags.scopes.global")}
              </button>
              {scopesInUse
                .filter((s) => s !== null)
                .map((scope) => (
                  <button
                    key={scope}
                    onClick={() => setActiveScope(scope)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                      activeScope === scope
                        ? "bg-[#4663ff] text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {t(`screens.tags.scopes.${scope}`)}
                  </button>
                ))}
            </div>
          </div>
        </section>

        {/* List */}
        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)]">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-500">
              {t("common.loading")}
            </div>
          ) : grouped.length === 0 ? (
            <div className="p-12 text-center">
              <Tags size={42} className="mx-auto text-[#4663ff]" />
              <h2 className="mt-4 text-xl font-black text-slate-950">
                {search || activeScope !== "all"
                  ? t("screens.tags.noResults", "No tags match your filters.")
                  : t("screens.tags.empty")}
              </h2>
              {!search && activeScope === "all" && (
                <p className="mt-2 text-sm text-slate-500">
                  {t(
                    "screens.tags.emptyHint",
                    "Create your first tag to start grouping items.",
                  )}
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#eef1ff]">
              {grouped.map(({ scope, items }) => (
                <div key={scope ?? "global"} className="p-5">
                  <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                    {scope
                      ? t(`screens.tags.scopes.${scope}`)
                      : t("screens.tags.scopes.global")}
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {items.length}
                    </span>
                  </h2>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {items.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between gap-2 rounded-2xl border border-[#e9edfb] bg-white px-3.5 py-2.5 transition hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]"
                      >
                        <span
                          className="inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${tag.color || "#4663ff"}14`,
                            color: tag.color || "#4663ff",
                          }}
                        >
                          <TagIcon size={11} className="shrink-0" />
                          <span className="truncate">{tag.name}</span>
                        </span>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => openEdit(tag)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                            aria-label={t("common.edit")}
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            onClick={() => requestDelete(tag)}
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            aria-label={t("common.delete")}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {editingTag !== null && (
        <TagFormModal tag={editingTag} onClose={closeForm} onSave={saveTag} />
      )}

      {confirmState !== null && (
        <TagConfirmDialog
          confirmState={confirmState}
          onCancel={cancelConfirm}
          onConfirmDelete={confirmDelete}
          onConfirmScopeChange={confirmScopeChange}
        />
      )}
    </div>
  );
}
