import React, { useEffect, useState } from "react";
import { Printer, ArrowLeft, Receipt, TrendingUp } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import GoTo from "../../../../Global/GoTo";
import { useAuth } from "../../../../Global/AuthContext";

export default function SalesInvoiceView() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const { money } = usePrimaryCurrency();

  useEffect(() => {
    let cancelled = false;

    const loadInvoice = async () => {
      try {
        setLoading(true);
        const data = await window.api.getSalesInvoiceById(id);

        if (!cancelled) {
          setInvoice(data);
        }
      } catch (error) {
        console.error("Failed to load invoice:", error);

        if (!cancelled) {
          setInvoice(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadInvoice();

    return () => {
      cancelled = true;
    };
  }, [id]);
  const [isPrinting, setIsPrinting] = useState(false);
  const api = window.api;

  const handlePrint = async (invoice) => {
    try {
      setIsPrinting(true);
      await api.printSalesInvoice(invoice);
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };
  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  };

  const items = invoice?.items || [];
  const allocations = invoice?.allocations || [];
  const status = invoice?.status || "unpaid";
  const profitSummary = invoice?.profitSummary || null;

  const statusStyle = {
    unpaid: {
      bg: "bg-red-100",
      text: "text-red-600",
    },
    partial: {
      bg: "bg-amber-100",
      text: "text-amber-700",
    },
    paid: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
    },
  }[status] || {
    bg: "bg-slate-100",
    text: "text-slate-600",
  };

  const statusLabel = t(`screens.invoices.${status}`, status);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ff] text-slate-500">
        {t("screens.invoices.loadingInvoice")}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-red-500">{t("screens.invoices.notFound")}</div>
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
                <p className="text-xs font-bold uppercase  text-[#4663ff]">
                  {t("screens.invoices.salesInvoice")}
                </p>
                <h1 className="text-3xl font-black text-slate-950">
                  {t("ui.invoice")} #{invoice.id}
                </h1>
                <p className="text-sm text-slate-500">
                  {t("screens.invoices.invoiceDate", {
                    date: formatDate(invoice.date),
                  })}
                </p>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-lg font-black text-slate-950">
                {invoice.customer_name || "-"}
              </p>
              <p className="text-sm text-slate-500">{t("ui.customer")}</p>
              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="p-7">
            <div className="overflow-x-auto rounded-2xl border border-[#e5ebff]">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-[#f8faff] text-xs font-bold uppercase  text-slate-500">
                  <tr>
                    <th className="p-3 text-center">{t("ui.product")}</th>
                    <th className="p-3 text-center">{t("ui.price")}</th>
                    <th className="p-3 text-center">{t("ui.qty")}</th>
                    <th className="p-3 text-center">{t("ui.total")}</th>
                    {isAdmin && (
                      <th className="p-3 text-center">
                        {t("ui.profit", "Profit")}
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e5ebff]">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        className="p-5 text-center text-slate-500"
                        colSpan={isAdmin ? 5 : 4}
                      >
                        {t("screens.invoices.noItems")}
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 text-center">
                          {item.product_name || item.name || "-"}
                          {item.returned_quantity > 0 && (
                            <div className="mt-0.5 text-xs font-semibold text-rose-500">
                              {t("screens.invoices.returnedQty", {
                                qty: item.returned_quantity,
                                defaultValue: "{{qty}} returned",
                              })}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">{money(item.price)}</td>
                        <td className="p-3 text-center">
                          {Number(item.quantity || 0)}
                        </td>
                        <td className="p-3 text-center font-black">
                          {money(item.total)}
                        </td>
                        {isAdmin && (
                          <td className="p-3 text-center">
                            <span
                              className={`font-bold ${item.item_profit >= 0 ? "text-emerald-700" : "text-rose-600"}`}
                            >
                              {money(item.item_profit)}
                            </span>
                            <div className="text-xs font-medium text-slate-400">
                              {item.item_margin_percent}%
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-6 lg:flex-row lg:justify-between">
              {/* PAYMENT HISTORY */}
              <div className="flex-1">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-slate-700">
                  {t("screens.invoices.paymentHistory", "Payment History")}
                </h3>

                {allocations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#dbe4ff] p-5 text-center text-sm text-slate-400">
                    {t("screens.invoices.noPaymentsRecordedYet")}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allocations.map((alloc) => (
                      <div
                        key={alloc.payment_id}
                        className="flex items-center justify-between rounded-2xl border border-[#e5ebff] bg-[#f8faff] px-4 py-3 text-sm"
                      >
                        <div>
                          <GoTo type="fund" id={alloc.fund_id}>
                            {alloc.fund_name || "-"}
                          </GoTo>
                          <div className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                            {formatDate(alloc.date)} ·{" "}
                            <GoTo type="payment" id={alloc.payment_id}>
                              {t("ui.payment")} #{alloc.payment_id}
                            </GoTo>
                          </div>
                        </div>

                        <div className="font-black text-emerald-700">
                          {money(alloc.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full max-w-full space-y-3 rounded-3xl bg-[#f8faff] p-5 lg:w-80">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("ui.subtotal")}</span>
                  <span className="font-bold">{money(invoice.subtotal)}</span>
                </div>

                {invoice.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("ui.discount")}</span>
                    <span>-{money(invoice.discount)}</span>
                  </div>
                )}

                {invoice.taxValue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("ui.tax")}</span>
                    <span>{money(invoice.taxValue)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-[#dbe4ff] pt-3 text-xl font-black">
                  <span>{t("ui.total")}</span>
                  <span className="text-[#4663ff]">
                    {money(invoice.net_total)}
                  </span>
                </div>

                {status !== "unpaid" && (
                  <>
                    <div className="flex justify-between border-t border-dashed border-[#dbe4ff] pt-3 text-sm">
                      <span className="text-slate-500">
                        {t("screens.invoices.paid")}
                      </span>
                      <span className="font-bold text-emerald-700">
                        {money(invoice.paid_amount)}
                      </span>
                    </div>

                    {status === "partial" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">
                          {t("ui.remaining")}
                        </span>
                        <span className="font-bold text-amber-600">
                          {money(invoice.remaining_amount)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            {isAdmin && profitSummary && (
              <div className="mt-6 overflow-hidden rounded-[24px] border border-emerald-100 bg-emerald-50/40">
                <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/60 px-5 py-3">
                  <h3 className="flex items-center gap-2 text-sm font-black text-emerald-800">
                    <TrendingUp size={16} />
                    {t("screens.invoices.profitBreakdown", "Profit Breakdown")}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      profitSummary.grossProfit >= 0
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    {profitSummary.marginPercent}% {t("ui.margin", "Margin")}
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      {t("ui.total", "Revenue")}
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {money(profitSummary.revenue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-400">
                      {t("ui.cogs", "Cost of goods")}
                    </p>
                    <p className="text-lg font-black text-rose-600">
                      -{money(profitSummary.cogs)}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-3 sm:bg-transparent sm:p-0">
                    <p className="text-xs font-bold uppercase text-slate-400">
                      {t("ui.grossProfit", "Gross profit")}
                    </p>
                    <p
                      className={`text-lg font-black ${
                        profitSummary.grossProfit >= 0
                          ? "text-emerald-700"
                          : "text-rose-600"
                      }`}
                    >
                      {money(profitSummary.grossProfit)}
                    </p>
                  </div>
                </div>

                {/* Per-item breakdown — expandable list, not a cramped table column */}
                <details className="border-t border-emerald-100 px-5 py-3">
                  <summary className="cursor-pointer text-xs font-bold text-emerald-700">
                    {t("screens.invoices.perItemProfit", "Per-item profit")}
                  </summary>
                  <div className="mt-3 space-y-2">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm"
                      >
                        <span className="text-slate-600">
                          {item.product_name || item.name || "-"}
                        </span>
                        <div className="text-right">
                          <span
                            className={`font-bold ${
                              item.item_profit >= 0
                                ? "text-emerald-700"
                                : "text-rose-600"
                            }`}
                          >
                            {money(item.item_profit)}
                          </span>
                          <span className="ms-2 text-xs text-slate-400">
                            ({item.item_margin_percent}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
