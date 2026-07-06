import React, { useMemo, useState } from "react";
import {
  Receipt,
  HandCoins,
  BanknoteArrowDown,
  Eye,
  Wallet2,
  Trash2,
  LucidePencilSparkles,
  Info,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import useExpenseList from "../hooks/useExpenseList";
import AddPayment from "../../../Cash/Payment/components/AddPayment";
import InvoiceListHeader from "../../../../Global/InvoiceListHeader";
import Pagination from "../../../../Global/Pagination";

const StatusBadge = ({ status, t }) => {
  const config = {
    paid: {
      label: t("ui.paid"),
      className: "bg-emerald-50 text-emerald-600",
    },
    partial: {
      label: t("ui.partial") || "Partial",
      className: "bg-amber-50 text-amber-600",
    },
    unpaid: {
      label: t("ui.unpaid"),
      className: "bg-red-50 text-red-500",
    },
  };

  const { label, className } = config[status] || config.unpaid;

  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${className}`}
    >
      {label}
    </span>
  );
};

// Splits a "YYYY-MM-DD HH:MM:SS" (or ISO) string into date-only display
// text plus a full readable timestamp for the hover tooltip.
const splitDateTime = (value) => {
  if (!value) return { dateLabel: "-", fullLabel: "" };

  const [datePart, timePart] = String(value).split(/[ T]/);

  const dateLabel = datePart || "-";
  const fullLabel = timePart ? `${datePart} ${timePart.slice(0, 8)}` : datePart;

  return { dateLabel, fullLabel };
};

const ExpenseList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    expenses,
    loading,
    saving,
    error,
    refetch,
    handleDelete,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,

    selecteInvoice,
    setSelecteInvoice,
    openPaymentModel,
    setOpenPaymentModel,
  } = useExpenseList();
  console.log(expenses);
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
        inv.invoice_name,
        inv.description,
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
    0
  );

  const unpaidCount = expenses.filter((inv) => inv.status !== "paid").length;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <InvoiceListHeader
          badgeLabel={t("ui.expenses")}
          title={t("screens.invoices.expensesTitle")}
          subtitle={t("screens.invoices.expenseSubtitle")}
          stats={[
            { icon: Receipt, value: expenses.length, label: t("ui.expense") },
            {
              icon: HandCoins,
              value: unpaidCount,
              label: t("ui.open"),
              variant: "amber",
            },
            {
              eyebrow: "NET",
              value: money(totalNet),
              label: t("ui.total"),
              variant: "brand",
            },
          ]}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("screens.invoices.search")}
          onRefresh={refetch}
          addLabel={t("screens.invoices.addExpense")}
          addIcon={BanknoteArrowDown}
          onAdd={() => navigate("/add-expense")}
        />

        {(error || actionError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error || actionError}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">{t("ui.invoice")}</th>
                  <th className="px-5 py-4">{t("ui.name")}</th>
                  <th className="px-5 py-4">{t("ui.supplier")}</th>
                  <th className="px-5 py-4">{t("ui.date")}</th>
                  <th className="px-5 py-4 text-right">{t("ui.net")}</th>
                  <th className="px-5 py-4 text-center">{t("ui.status")}</th>
                  <th className="px-5 py-4 text-right">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e5ebff]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      {t("screens.invoices.empty")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((exp) => {
                    const { dateLabel, fullLabel } = splitDateTime(exp.date);

                    return (
                      <tr
                        key={exp.id}
                        className="transition hover:bg-[#f8faff]"
                      >
                        <td className="px-5 py-4">
                          <span className="rounded-xl bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#4663ff]">
                            #{exp.id}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="group relative flex items-center gap-1.5">
                            <span className="font-bold text-slate-900">
                              {exp.invoice_name || "-"}
                            </span>
                            {exp.description && (
                              <>
                                <Info
                                  size={14}
                                  className="cursor-help text-slate-400 hover:text-[#4663ff]"
                                />
                                <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 max-w-[220px] whitespace-normal rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                  {exp.description}
                                </span>
                              </>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-bold text-slate-900">
                          {exp.supplier_name || "-"}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          <span className="group relative inline-flex cursor-help items-center gap-1.5">
                            {dateLabel}
                            <Clock
                              size={12}
                              className="text-slate-300 group-hover:text-[#4663ff]"
                            />
                            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                              {fullLabel}
                            </span>
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right tabular-nums text-emerald-700">
                          {money(exp.net_total || 0)}
                        </td>

                        <td className="px-5 py-4 text-center">
                          <StatusBadge status={exp.status} t={t} />
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() =>
                                navigate(`/view-expense/${exp.id}`)
                              }
                              className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              title={t("common.view")}
                            >
                              <Eye size={16} />
                            </button>

                            {exp.status !== "paid" && (
                              <>
                                <button
                                  onClick={() =>
                                    navigate(`/edit-expense/${exp.id}`)
                                  }
                                  className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                                  title={t("common.edit")}
                                >
                                  <LucidePencilSparkles size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelecteInvoice(exp);
                                    setOpenPaymentModel(true);
                                  }}
                                  className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                                  title={t("ui.payment")}
                                >
                                  <Wallet2 size={16} />
                                </button>
                                <button
                                  onClick={() => setDeleteExpense(exp)}
                                  className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
                                  title={t("common.delete")}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </section>
      </div>

      <AddPayment
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={selecteInvoice}
        party={selecteInvoice?.supplier_id}
        partyName={selecteInvoice?.supplier_name}
        mode="expense"
        refetchList={refetch}
      />

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
