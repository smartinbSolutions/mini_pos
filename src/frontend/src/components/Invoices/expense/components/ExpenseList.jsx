import React, { useMemo, useState } from "react";
import {
  Eye,
  Edit2,
  Trash2,
  Search,
  RefreshCw,
  Receipt,
  HandCoins,
  PackagePlus,
  BanknoteArrowDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import useExpenseList from "../hooks/useExpenseList";

const ExpenseList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    expenses,
    loading,
    saving,
    error,
    refetch,
    deletePurchase,
    selecteInvoice,
    setSelecteInvoice,
    openPaymentModel,
    setOpenPaymentModel,
  } = useExpenseList();

  const { money } = usePrimaryCurrency();

  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleteExpense, setDeleteExpense] = useState(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return expenses;

    return expenses.filter((inv) => {
      return [
        inv.id,
        inv.supplier_name,
        inv.date,
        inv.total,
        inv.net_total,
        inv.status,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [expenses, search]);

  const totalNet = expenses.reduce(
    (sum, inv) => sum + Number(inv?.net_total || 0),
    0,
  );

  const unpaidCount = expenses.filter((inv) => inv.status !== "paid").length;

  const handleDelete = async (id) => {
    try {
      setActionError("");
      // لازم تضيف deleteExpense داخل hook
      await window.api.deleteExpense(id);
      await refetch();
    } catch (err) {
      setActionError(t("screens.expenses.deleteFailed"));
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#4663ff]">
                {t("ui.expenses")}
              </p>
              <h1 className="text-4xl font-black text-slate-950">
                {t("screens.invoices.expensesTitle")}
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                {t("screens.invoices.expenseSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl border bg-[#f8faff] p-4">
                <Receipt className="mb-3 text-[#4663ff]" />
                <div className="text-2xl font-black">{expenses.length}</div>
                <div className="text-xs text-slate-500">{t("ui.expense")}</div>
              </div>

              <div className="rounded-3xl border bg-[#f8faff] p-4">
                <HandCoins className="mb-3 text-[#4663ff]" />
                <div className="text-2xl font-black">{unpaidCount}</div>
                <div className="text-xs text-slate-500">{t("ui.open")}</div>
              </div>

              <div className="rounded-3xl border bg-[#f8faff] p-4">
                <div className="mb-3 text-sm font-black text-[#4663ff]">
                  NET
                </div>
                <div className="text-2xl font-black">{money(totalNet)}</div>
                <div className="text-xs text-slate-500">{t("ui.total")}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t bg-white/60 p-5 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("screens.invoices.search")}
                className="h-12 w-full rounded-2xl border pl-11 pr-4 outline-none focus:border-[#4663ff]"
              />
            </div>

            <button
              onClick={refetch}
              className="h-12 rounded-2xl border px-4 font-bold hover:bg-[#eef3ff]"
            >
              <RefreshCw size={16} />
            </button>

            <button
              onClick={() => navigate("/add-expense")}
              className="h-12 rounded-2xl bg-[#4663ff] px-5 font-bold text-white"
            >
              <BanknoteArrowDown size={16} />
              {t("screens.invoices.addInvoice")}
            </button>
          </div>
        </section>

        {/* ERROR */}
        {(error || actionError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error || actionError}
          </div>
        )}

        {/* TABLE */}
        <section className="overflow-hidden rounded-[28px] border bg-white/85 shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-[#f8faff] text-xs uppercase text-slate-500">
                <tr>
                  <th className="p-4">#</th>
                  <th className="p-4">{t("ui.supplier")}</th>
                  <th className="p-4">{t("ui.date")}</th>
                  <th className="p-4 text-right">{t("ui.net")}</th>
                  <th className="p-4 text-right">{t("ui.actions")}</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center">
                      Loading...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-6 text-center">
                      No data
                    </td>
                  </tr>
                ) : (
                  filtered.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[#f8faff]">
                      <td className="p-4">#{exp.id}</td>

                      <td className="p-4 font-bold">
                        {exp.supplier_name || "-"}
                      </td>

                      <td className="p-4 text-slate-500">{exp.date}</td>

                      <td className="p-4 text-right font-black text-emerald-700">
                        {money(exp.net_total || 0)}
                      </td>

                      <td className="p-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => navigate(`/view-expense/${exp.id}`)}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            onClick={() => navigate(`/edit-expense/${exp.id}`)}
                          >
                            <Edit2 size={16} />
                          </button>

                          <button
                            onClick={() => setDeleteExpense(exp)}
                            className="text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* DELETE */}
      <DeleteModal
        open={Boolean(deleteExpense)}
        onClose={() => setDeleteExpense(null)}
        onConfirm={async () => {
          await handleDelete(deleteExpense.id);
          setDeleteExpense(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
    </div>
  );
};

export default ExpenseList;
