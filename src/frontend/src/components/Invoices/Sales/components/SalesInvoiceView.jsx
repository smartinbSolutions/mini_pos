import React, { useEffect, useState } from "react";
import { Printer, ArrowLeft, Receipt } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import GoTo from "../../../../Global/GoTo";

export default function SalesInvoiceView() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

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

      // أو إذا كنت تستخدم window.api
      // await window.api.printInvoice(invoice.id);
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

          {/* <button
            type="button"
            onClick={printInvoice}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-[#4663ff] px-4 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20"
          >
            <Printer size={18} />
            Print
          </button> */}
        </div>

        <div className="overflow-hidden rounded-[32px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(70,99,255,0.14)] print:rounded-none print:border-none print:shadow-none">
          <div className="grid gap-6 bg-[#f8faff] p-7 md:grid-cols-[1fr_auto]">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4663ff] text-white">
                <Receipt size={24} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4663ff]">
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
                <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="p-3 text-left">{t("ui.product")}</th>
                    <th className="p-3 text-center">{t("ui.price")}</th>
                    <th className="p-3 text-center">{t("ui.qty")}</th>
                    <th className="p-3 text-center">{t("ui.total")}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#e5ebff]">
                  {items.length === 0 ? (
                    <tr>
                      <td
                        className="p-5 text-center text-slate-500"
                        colSpan={5}
                      >
                        {t("screens.invoices.noItems")}
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3 font-bold text-slate-900">
                          {item.product_name || item.name || "-"}
                        </td>
                        <td className="p-3 text-center">{money(item.price)}</td>
                        <td className="p-3 text-center">
                          {Number(item.quantity || 0)}
                        </td>
                        <td className="p-3 text-center font-black">
                          {money(item.total)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {/* <button
              onClick={() => handlePrint(id)}
              disabled={isPrinting}
              className={`rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff] ${isPrinting ? "opacity-50 cursor-not-allowed" : ""}`}
              title={t("common.print") || "Print"}
            >
              <Printer size={16} />
            </button> */}
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
                          <div className="text-xs text-slate-400">
                            {formatDate(alloc.createdAt)} · {t("ui.payment")} #
                            {alloc.payment_id}
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
          </div>
        </div>
      </div>
    </div>
  );
}
