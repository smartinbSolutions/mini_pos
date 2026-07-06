import React, { useMemo, useState } from "react";
import {
  Edit2,
  Plus,
  Save,
  Trash2,
  X,
  Search,
  Eye,
  HandCoins,
} from "lucide-react";
import useSuppliersList from "../hooks/useSuppliersList";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../Global/DeleteModel";
import AddPayment from "../../Cash/Payment/components/AddPayment";

export const SuppliersList = () => {
  const { t } = useTranslation();
  const {
    saving,
    suppliers,
    handleDeleteSupplier,
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
    openPaymentModel,
    setOpenPaymentModel,
    selecteSupplier,
    setSelecteSupplier,
    refetch,
  } = useSuppliersList();
  const { money } = usePrimaryCurrency();

  const [search, setSearch] = useState("");
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";
  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) =>
      `${s.name} ${s.phone} ${s.address} ${s.total} ${s.total_paid}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    );
  }, [suppliers, search]);

  return (
    <div className={pageClass}>
      <div className="max-w-7xl mx-auto grid xl:grid-cols-[1fr_320px] gap-6">
        <div className={panelClass}>
          <div className="flex items-center justify-between gap-4 p-6 pb-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                {t("ui.contacts")}
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                {t("ui.suppliers")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("screens.contacts.suppliersSubtitle")}
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
                placeholder={t("screens.contacts.searchSupplier")}
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>

          {filteredSuppliers.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-10">
              {t("screens.contacts.noSuppliers")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">{t("ui.name")}</th>
                    <th className="px-5 py-4">{t("ui.phone")}</th>
                    <th className="px-5 py-4">{t("ui.address")}</th>
                    <th className="px-5 py-4 text-right">
                      {t("screens.contacts.purchases")}
                    </th>
                    <th className="px-5 py-4 text-right">{t("ui.paid")}</th>
                    <th className="px-5 py-4 text-right">{t("ui.balance")}</th>
                    <th className="px-5 py-4 text-right">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef1ff]">
                  {filteredSuppliers.map((supplier) => {
                    const purchases = supplier.total || 0;
                    const paid = supplier.total_paid || 0;
                    const balance = purchases - paid;

                    if (editingId === supplier.id) {
                      return (
                        <tr key={supplier.id} className="bg-[#f8faff]">
                          <td className="px-5 py-3" colSpan={7}>
                            <form
                              onSubmit={submitEdit}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input
                                required
                                value={editing.name}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    name: e.target.value,
                                  })
                                }
                                className={`${inputClass} flex-1 min-w-[160px]`}
                                placeholder={t("ui.name")}
                              />
                              <input
                                value={editing.phone}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    phone: e.target.value,
                                  })
                                }
                                className={`${inputClass} flex-1 min-w-[140px]`}
                                placeholder={t("ui.phone")}
                              />
                              <input
                                value={editing.address}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    address: e.target.value,
                                  })
                                }
                                className={`${inputClass} flex-1 min-w-[160px]`}
                                placeholder={t("ui.address")}
                              />
                              <button className="flex items-center gap-1.5 rounded-xl bg-[#4663ff] px-3 py-2 text-xs font-bold text-white hover:bg-[#3854e8]">
                                <Save size={14} />
                                {t("common.save")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-xl border border-[#dbe4ff] bg-white p-2 text-slate-500 hover:bg-[#eef3ff]"
                              >
                                <X size={14} />
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={supplier.id}
                        className="transition hover:bg-[#f8faff]"
                      >
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4663ff] text-xs font-bold text-white shadow-md shadow-[#4663ff]/20">
                              {supplier.name?.charAt(0)?.toUpperCase() || "S"}
                            </div>
                            <span className="font-bold text-slate-900">
                              {supplier.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {supplier.phone || t("ui.noPhone")}
                        </td>
                        <td className="px-5 py-3 max-w-[200px] truncate text-slate-500">
                          {supplier.address || t("ui.noAddress")}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-700">
                          {money(purchases)}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums font-semibold text-green-600">
                          {money(paid)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`font-bold tabular-nums ${
                              balance > 0 ? "text-red-500" : "text-green-600"
                            }`}
                          >
                            {money(balance)}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                navigate(`/payment/supplier/${supplier.id}`)
                              }
                              className="rounded-xl p-2 text-[#4663ff] hover:bg-[#eef3ff]"
                              title={t("screens.funds.viewMovements")}
                            >
                              <Eye size={15} />
                            </button>
                            <button
                              onClick={() => {
                                setSelecteSupplier(supplier);
                                setOpenPaymentModel(true);
                              }}
                              className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                            >
                              <HandCoins size={16} />
                            </button>

                            <button
                              onClick={() => startEdit(supplier)}
                              className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => setDeleteSupplier(supplier)}
                              className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="top-6 h-fit rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur">
          <h3 className="mb-1 text-lg font-black text-slate-950">
            {t("screens.contacts.createSupplier")}
          </h3>
          <p className="mb-5 text-sm text-slate-500">
            {t("screens.contacts.addSupplierContact")}
          </p>

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
              placeholder={t("ui.name")}
            />

            <input
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
              className={`w-full ${inputClass}`}
              placeholder={t("ui.phone")}
            />

            <input
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
              className={`w-full ${inputClass}`}
              placeholder={t("ui.address")}
            />

            <button
              disabled={saving}
              className={`w-full ${primaryButtonClass}`}
            >
              <Plus size={15} />
              {t("screens.contacts.addSupplier")}
            </button>
          </form>
        </div>
      </div>

      <AddPayment
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={null}
        party={selecteSupplier?.id}
        partyName={selecteSupplier?.name}
        mode="supplier"
        refetchList={refetch}
      />

      <DeleteModal
        open={Boolean(deleteSupplier)}
        onClose={() => setDeleteSupplier(null)}
        onConfirm={async () => {
          await handleDeleteSupplier(deleteSupplier);
          setDeleteSupplier(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
    </div>
  );
};
