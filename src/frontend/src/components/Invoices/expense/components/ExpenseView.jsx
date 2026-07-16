import React, { useEffect, useState } from "react";
import { ArrowLeft, Receipt, HandCoins, FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { formatMoney } from "../../../../Global/FormatNumber";
import { useTranslation } from "react-i18next";

const STATUS_CONFIG = {
  paid: { bg: "bg-green-100", text: "text-green-700" },
  partial: { bg: "bg-amber-100", text: "text-amber-700" },
  unpaid: { bg: "bg-red-100", text: "text-red-600" },
};

export default function ExpenseView() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const api = window.api;
  const { money } = usePrimaryCurrency();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadExpense = async () => {
      try {
        setLoading(true);
        const res = await api.getExpense(id);
        if (!cancelled) setExpense(res);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadExpense();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  };

  const items = expense?.items || [];
  const allocations = expense?.allocations || [];
  const status = expense?.status || "unpaid";
  const statusStyle = STATUS_CONFIG[status] || STATUS_CONFIG.unpaid;

  const statusLabel =
    status === "paid"
      ? t("ui.paid")
      : status === "partial"
        ? t("ui.partial", "Partial")
        : t("ui.unpaid");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ff] text-slate-500">
        {t("screens.invoices.loadingInvoice")}
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="p-6 text-red-500">
        {error || t("screens.invoices.notFound")}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900 print:bg-white">
      <div className="mx-auto max-w-5xl">
        <div className="print:hidden mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 hover:bg-[#eef3ff]"
          >
            <ArrowLeft size={18} />
            {t("common.back")}
          </button>
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(70,99,255,0.14)] print:rounded-none print:border-none print:shadow-none">
          <div className="grid gap-6 bg-[#f8faff] p-7 md:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4663ff] text-white">
                <Receipt size={24} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4663ff]">
                  {t("ui.expenses")}
                </p>
                <h1 className="text-3xl font-black text-slate-950">
                  {expense.invoice_name || `${t("ui.expense")} #${expense.id}`}
                </h1>
                <p className="text-sm text-slate-500">
                  {t("screens.invoices.invoiceDate", {
                    date: formatDate(expense.date),
                  })}
                </p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-lg font-black text-slate-950">
                {expense.supplier_name || t("ui.noSupplier")}
              </p>
              <p className="text-sm text-slate-500">{t("ui.supplier")}</p>
              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="p-7">
            {expense.description && (
              <div className="mb-6 rounded-2xl border border-[#e5ebff] bg-[#f8faff] p-5">
                <div className="mb-2 flex items-center gap-2 text-sm font-black text-slate-700">
                  <FileText size={16} className="text-[#4663ff]" />
                  {t("ui.description", "Description")}
                </div>
                <p className="text-sm leading-6 text-slate-600">
                  {expense.description}
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-[#e5ebff]">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-[#f8faff] text-xs font-bold uppercase  text-slate-500">
                  <tr>
                    <th className="p-3 text-start">{t("ui.category")}</th>
                    <th className="p-3 text-start">{t("ui.price")}</th>
                    <th className="p-3 text-start">{t("ui.total")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e5ebff]">
                  {items.length === 0 ? (
                    <tr>
                      <td className="p-5 text-start text-slate-500" colSpan={3}>
                        {t("screens.invoices.noItems")}
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={item.id ?? index}>
                        <td className="p-3 font-bold text-slate-900">
                          {item.category_name || item.name || "-"}
                        </td>
                        <td className="p-3 text-start">{money(item.price)}</td>
                        <td className="p-3 text-start font-black">
                          {money(item.total || item.price)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-6 lg:flex-row lg:justify-between">
              {/* PAYMENT HISTORY */}
              <div className="flex-1">
                <h3 className="mb-3 flex items-start gap-2 text-sm font-black text-slate-700">
                  <HandCoins size={16} className="text-[#4663ff]" />
                  {t("screens.invoices.paymentHistory", "Payment History")}
                </h3>

                {allocations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#dbe4ff] p-5 text-start text-sm text-slate-400">
                    {t("screens.invoices.noPaymentsRecordedYet")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className="flex items-start justify-between rounded-2xl border border-[#e5ebff] bg-[#f8faff] px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="font-bold text-slate-800">
                            {alloc.fund_name || "-"}
                          </div>
                          <div className="text-xs text-slate-400">
                            {formatDate(alloc.date)} · {t("ui.payment")} #
                            {alloc.payment_id}
                          </div>
                        </div>
                        <div className="tabular-nums text-emerald-700">
                          {money(alloc.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TOTALS */}
              <div className="w-full max-w-full space-y-3 rounded-3xl bg-[#f8faff] p-5 lg:w-80">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("ui.subtotal")}</span>
                  <span className="font-bold">{money(expense.subtotal)}</span>
                </div>

                <div className="flex justify-between border-t border-[#dbe4ff] pt-3 text-xl font-black">
                  <span>{t("ui.total")}</span>
                  <span className="text-[#4663ff]">
                    {money(expense.net_total)}
                  </span>
                </div>

                {status !== "unpaid" && (
                  <>
                    <div className="flex justify-between border-t border-dashed border-[#dbe4ff] pt-3 text-sm">
                      <span className="text-slate-500">{t("ui.paid")}</span>
                      <span className="font-bold text-emerald-700">
                        {money(expense.paid_amount)}
                      </span>
                    </div>
                    {status === "partial" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">
                          {t("ui.remaining", "Remaining")}
                        </span>
                        <span className="font-bold text-amber-600">
                          {money(expense.remaining_amount)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
