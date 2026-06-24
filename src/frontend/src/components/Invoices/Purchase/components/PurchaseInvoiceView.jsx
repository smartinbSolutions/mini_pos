import React, { useEffect, useState } from "react";
import { Printer, ArrowLeft, Receipt } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

export default function PurchaseInvoiceView() {
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
        const data = await window.api.getPurchaseInvoiceById(id);

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

  const printInvoice = () => {
    window.print();
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString();
  };

  const items = invoice?.items || [];
  const status = invoice?.status || "unpaid";
  const isPaid = status === "paid";

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
                  {t("screens.invoices.purchaseInvoice")}
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
                {invoice.supplier_name || "-"}
              </p>
              <p className="text-sm text-slate-500">{t("ui.supplier")}</p>
              <span
                className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-black ${
                  isPaid
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {isPaid ? t("ui.paidStatus") : status.toUpperCase()}
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

            <div className="mt-6 flex justify-end">
              <div className="w-80 max-w-full space-y-3 rounded-3xl bg-[#f8faff] p-5">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("ui.subtotal")}</span>
                  <span className="font-bold">{money(invoice.subtotal)}</span>
                </div>
                {invoice.discount > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("ui.discount")}</span>
                    <span>-{money(invoice.discount)}</span>
                  </div>
                ) : (
                  ""
                )}
                {invoice.taxValue > 0 ? (
                  <div className="flex justify-between">
                    <span className="text-slate-500">{t("ui.tax")}</span>
                    <span>{money(invoice.taxValue)}</span>
                  </div>
                ) : (
                  ""
                )}
                <div className="flex justify-between border-t border-[#dbe4ff] pt-3 text-xl font-black">
                  <span>{t("ui.total")}</span>
                  <span className="text-[#4663ff]">
                    {money(invoice.net_total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
