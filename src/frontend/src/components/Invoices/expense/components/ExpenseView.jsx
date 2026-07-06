import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Receipt,
  HandCoins,
  FileText,
  Wallet2,
  Clock,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

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
    <span className={`rounded-xl px-3 py-1 text-xs font-bold ${className}`}>
      {label}
    </span>
  );
};

const splitDateTime = (value) => {
  if (!value) return { dateLabel: "-", fullLabel: "" };
  const [datePart, timePart] = String(value).split(/[ T]/);
  return {
    dateLabel: datePart || "-",
    fullLabel: timePart ? `${datePart} ${timePart.slice(0, 8)}` : datePart,
  };
};

const ExpenseView = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const api = window.api;
  const { money } = usePrimaryCurrency();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadExpense = async () => {
    try {
      setLoading(true);
      const res = await api.getExpense(id);
      setExpense(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpense();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!expense) {
    return (
      <div className="p-10 text-center text-red-500">
        {error || "Expense not found"}
      </div>
    );
  }

  const { dateLabel } = splitDateTime(expense.date);
  const hasPayments = expense.payments && expense.payments.length > 0;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex items-center justify-between rounded-[32px] bg-white/80 p-6 shadow">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4663ff] text-white">
              <Receipt size={24} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-[#4663ff]">
                {t("ui.expenses")}
              </p>

              <h1 className="text-3xl font">
                {expense.invoice_name || `${t("ui.expense")} #${expense.id}`}
              </h1>

              <p className="text-sm text-slate-500">
                #{expense.id} · {dateLabel}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-2xl border px-4 py-2 font-bold"
          >
            <ArrowLeft size={16} />
            {t("common.back")}
          </button>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <main className="space-y-6">
            {expense.description && (
              <section className="rounded-[28px] bg-white p-5 shadow">
                <div className="mb-3 flex items-center gap-3">
                  <FileText className="text-[#4663ff]" size={18} />
                  <h3 className="font">
                    {t("ui.description") || "Description"}
                  </h3>
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {expense.description}
                </p>
              </section>
            )}

            <section className="overflow-hidden rounded-[28px] bg-white shadow">
              <div className="border-b p-5">
                <h2 className="text-lg font">{t("ui.items")}</h2>
              </div>

              <table className="w-full text-sm">
                <thead className="bg-[#f8faff]">
                  <tr>
                    <th className="p-4 text-left">{t("ui.category")}</th>
                    <th className="p-4">{t("ui.price")}</th>
                    <th className="p-4">{t("ui.total")}</th>
                  </tr>
                </thead>

                <tbody>
                  {expense.items?.map((item, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-4 font-bold">
                        {item.category_name || item.name || "-"}
                      </td>
                      <td className="p-4 text-center">{money(item.price)}</td>
                      <td className="p-4 text-center font">
                        {money(item.total || item.price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {hasPayments && (
              <section className="overflow-hidden rounded-[28px] bg-white shadow">
                <div className="flex items-center gap-3 border-b p-5">
                  <Wallet2 className="text-[#4663ff]" size={18} />
                  <h2 className="text-lg font">
                    {t("ui.paymentHistory") || "Payment History"}
                  </h2>
                  <span className="rounded-full bg-[#eef3ff] px-2 py-0.5 text-xs font-bold text-[#4663ff]">
                    {expense.payments.length}
                  </span>
                </div>

                <table className="w-full text-sm">
                  <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="p-4 text-left">{t("ui.date")}</th>
                      <th className="p-4 text-left">{t("ui.fund")}</th>
                      <th className="p-4 text-right">{t("ui.amount")}</th>
                      <th className="p-4 text-right">
                        {t("ui.fundCurrency") || "In Fund Currency"}
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#e5ebff]">
                    {expense.payments.map((p) => {
                      const { dateLabel: pDate, fullLabel: pFull } =
                        splitDateTime(p.createdAt);

                      return (
                        <tr key={p.id} className="hover:bg-[#f8faff]">
                          <td className="p-4 text-slate-500">
                            <span className="group relative inline-flex cursor-help items-center gap-1.5">
                              {pDate}
                              <Clock
                                size={12}
                                className="text-slate-300 group-hover:text-[#4663ff]"
                              />
                              <span className="pointer-events-none absolute bottom-full left-0 z-10 mb-1.5 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                {pFull}
                              </span>
                            </span>
                          </td>
                          <td className="p-4 font-bold text-slate-700">
                            {p.fund_name || "-"}
                          </td>
                          <td className="p-4 text-right font text-emerald-700">
                            {money(p.amount)}
                          </td>
                          <td className="p-4 text-right text-slate-500">
                            {p.amount_fund_currency
                              ? `${p.currency_code || ""} ${p.amount_fund_currency}`.trim()
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            )}
          </main>

          <aside className="space-y-4">
            <section className="rounded-[28px] bg-white p-5 shadow">
              <div className="mb-4 flex items-center gap-3">
                <HandCoins className="text-[#4663ff]" />
                <h3 className="font">{t("ui.summary")}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{t("ui.supplier")}</span>
                  <b>
                    {expense.supplier_name ||
                      t("ui.noSupplier") ||
                      "No supplier"}
                  </b>
                </div>

                <div className="flex justify-between">
                  <span>{t("ui.status")}</span>
                  <StatusBadge status={expense.status} t={t} />
                </div>

                <div className="flex justify-between">
                  <span>{t("ui.subtotal")}</span>
                  <b>{money(expense.subtotal)}</b>
                </div>

                <div className="flex justify-between text-xl font">
                  <span>{t("ui.total")}</span>
                  <span className="text-[#4663ff]">
                    {money(expense.net_total)}
                  </span>
                </div>
              </div>
            </section>

            {(expense.paid_amount > 0 || expense.status !== "unpaid") && (
              <section className="rounded-[28px] bg-white p-5 shadow">
                <h3 className="mb-4 font">{t("ui.payment")}</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {t("screens.invoices.paidAmount") || "Paid"}
                    </span>
                    <b className="text-emerald-700">
                      {money(expense.paid_amount || 0)}
                    </b>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">
                      {t("screens.invoices.remaining") || "Remaining"}
                    </span>
                    <b
                      className={
                        expense.remaining_amount > 0
                          ? "text-red-600"
                          : "text-slate-400"
                      }
                    >
                      {money(expense.remaining_amount || 0)}
                    </b>
                  </div>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ExpenseView;
