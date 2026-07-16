import React, { useEffect, useState } from "react";
import { Printer, ArrowLeft, Undo2, HandCoins } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

const STATUS_CONFIG = {
  paid: { bg: "bg-green-100", text: "text-green-700" },
  partial: { bg: "bg-amber-100", text: "text-amber-700" },
  unpaid: { bg: "bg-slate-100", text: "text-slate-600" },
};

export default function SalesReturnView() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const [returnInvoice, setReturnInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const { money } = usePrimaryCurrency();

  useEffect(() => {
    let cancelled = false;

    const loadReturnInvoice = async () => {
      try {
        setLoading(true);
        const data = await window.api.getSalesReturnById(id);

        if (!cancelled) {
          setReturnInvoice(data);
        }
      } catch (error) {
        console.error("Failed to load sales return:", error);
        if (!cancelled) {
          setReturnInvoice(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadReturnInvoice();

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

  const items = returnInvoice?.items || [];
  const allocations = returnInvoice?.allocations || [];
  const status = returnInvoice?.status || "unpaid";
  const statusStyle = STATUS_CONFIG[status] || STATUS_CONFIG.unpaid;

  const statusLabel =
    status === "paid"
      ? t("ui.fullyRefunded", "مسترد بالكامل")
      : status === "partial"
        ? t("ui.partialRefund", "مسترد جزئي")
        : t("ui.onAccount", "على الحساب الآجل");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ff] text-slate-500">
        {t("common.loading")}
      </div>
    );
  }

  if (!returnInvoice) {
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

          {/* <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 hover:bg-slate-50"
          >
            <Printer size={18} />
            {t("common.print", "طباعة")}
          </button> */}
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(70,99,255,0.14)] print:rounded-none print:border-none print:shadow-none">
          <div className="grid gap-6 bg-[#f8faff] p-7 md:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-amber-600 text-white">
                <Undo2 size={24} />
              </span>
              <div>
                <p className="text-xs uppercase  text-amber-700 font-bold">
                  {t("ui.salesReturn", "مرتجع فاتورة مبيعات")}
                </p>
                <h1 className="text-3xl text-slate-950 font-bold mt-0.5">
                  #{returnInvoice.id}
                </h1>
                <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                  <p>
                    {t("ui.returnDate", "تاريخ الإرجاع")}:{" "}
                    {formatDate(returnInvoice.date)}
                  </p>
                  <p className="text-xs">
                    {t("ui.originalInvoice", "الفاتورة الأصلية")}:{" "}
                    <span className="font-semibold text-slate-700">
                      #{returnInvoice.sales_invoice_id}
                    </span>
                    {returnInvoice.original_invoice_name &&
                      ` (${returnInvoice.original_invoice_name})`}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-left md:text-right">
              <p className="text-lg text-slate-950 font-bold">
                {returnInvoice.customer_name || "-"}
              </p>
              <p className="text-sm text-slate-500">{t("ui.customer")}</p>
              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusStyle.bg} ${statusStyle.text}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          <div className="p-7 space-y-6">
            {returnInvoice.description && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm">
                <span className="font-bold text-slate-500 block mb-1">
                  {t("ui.reasonOfReturn", "سبب الإرجاع / الملاحظات")}
                </span>
                <p className="text-slate-700 font-medium">
                  {returnInvoice.description}
                </p>
              </div>
            )}

            <div className="overflow-x-auto rounded-2xl border border-[#e5ebff]">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-[#f8faff] text-xs font-bold uppercase  text-slate-500">
                  <tr>
                    <th className="p-3 text-left">{t("ui.product")}</th>
                    <th className="p-3 text-center">
                      {t("ui.returnPrice", "سعر الإرجاع")}
                    </th>
                    <th className="p-3 text-center">
                      {t("ui.returnQty", "الكمية المرجعة")}
                    </th>
                    <th className="p-3 text-center">{t("ui.total")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e5ebff]">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        className="p-5 text-center text-slate-500"
                        colSpan={4}
                      >
                        {t("screens.invoices.noItems")}
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/40">
                        <td className="p-3 font-bold text-slate-900">
                          {item.product_name || item.name || "-"}
                        </td>
                        <td className="p-3 text-center tabular-nums">
                          {money(item.price)}
                        </td>
                        <td className="p-3 text-center font-semibold text-amber-700">
                          {Number(item.quantity || 0)}
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800 tabular-nums">
                          {money(item.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_auto]">
              <div className="flex-1">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700">
                  <HandCoins size={16} className="text-amber-600" />
                  {t("ui.refundHistory", "سجل المبالغ المستردة كاش")}
                </h3>

                {allocations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#dbe4ff] p-5 text-center text-sm text-slate-400 bg-slate-50/50">
                    {t(
                      "ui.noCashRefundedSales",
                      "لم يتم رد مبالغ نقدية، تم ترحيل المرتجع آجل لتخفيض حساب العميل الجاري"
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allocations.map((alloc) => (
                      <div
                        key={alloc.id}
                        className="flex items-center justify-between rounded-2xl border border-[#e5ebff] bg-[#f8faff] px-4 py-3 text-sm"
                      >
                        <div>
                          <div className="font-bold text-slate-800">
                            {alloc.fund_name || "-"}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {formatDate(alloc.date)} · {t("ui.receipt", "سند")}{" "}
                            #{alloc.payment_id}
                          </div>
                        </div>
                        <div className="tabular-nums font-bold text-red-600">
                          - {money(alloc.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="w-full space-y-3 rounded-3xl bg-[#f8faff] p-5 lg:w-80 border border-slate-100 text-sm font-medium">
                <div className="flex justify-between text-slate-600">
                  <span>{t("ui.subtotal")}</span>
                  <span className="font-bold text-slate-800">
                    {money(returnInvoice.subtotal)}
                  </span>
                </div>

                {returnInvoice.discount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>{t("ui.discount")}</span>
                    <span className="font-bold text-red-500">
                      -{money(returnInvoice.discount)}
                    </span>
                  </div>
                )}

                {returnInvoice.taxValue > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>
                      {t("ui.tax")} ({returnInvoice.tax}%)
                    </span>
                    <span className="font-bold text-slate-800">
                      +{money(returnInvoice.taxValue)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-[#dbe4ff] pt-3 text-lg font-bold text-slate-900">
                  <span>{t("ui.total")}</span>
                  <span className="text-amber-700">
                    {money(returnInvoice.net_total)}
                  </span>
                </div>

                {status !== "unpaid" && (
                  <>
                    <div className="flex justify-between border-t border-dashed border-[#dbe4ff] pt-3 text-xs text-slate-500">
                      <span>{t("ui.cashRefunded", "المسترد نقداً")}</span>
                      <span className="font-bold text-red-600">
                        {money(returnInvoice.refunded_amount)}
                      </span>
                    </div>
                    {status === "partial" && (
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>
                          {t("ui.remainingToAccount", "المتبقي لحساب العميل")}
                        </span>
                        <span className="font-bold text-amber-600">
                          {money(returnInvoice.remaining_credit)}
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
