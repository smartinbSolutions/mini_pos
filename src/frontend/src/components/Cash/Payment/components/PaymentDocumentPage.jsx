import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from "react-toastify";
import { Printer, Trash2, Download, ArrowRight } from "lucide-react";

import { formatMoney } from "../../../../Global/FormatNumber";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import DeleteModal from "../../../../Global/DeleteModel";
import GoTo from "../../../../Global/GoTo";
import BackButton from "../../../../Global/BackButton";

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// One side of the money flow — who/what the money left or reached.
function Endpoint({ label, children, meta }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <div className="mt-1 truncate text-base font-bold text-[#1c2340]">
        {children}
      </div>
      {meta && <p className="mt-0.5 text-xs text-slate-400">{meta}</p>}
    </div>
  );
}

const actionButton =
  "inline-flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4663ff]/20 disabled:cursor-not-allowed disabled:opacity-60";

const PaymentDocumentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { primaryCurrency } = usePrimaryCurrency();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const api = window.api;

  useEffect(() => {
    let active = true;
    setLoading(true);
    api.getPayment(id).then((data) => {
      if (active) {
        setPayment(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  const handlePrint = async () => {
    try {
      setIsPrinting(true);
      const res = await api.printDocument(`/print-payment/${id}`);
      if (!res.success && res.error === "NO_PRINTER") {
        toast.error(t("screens.invoices.noPrinter", "No printer found."));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async () => {
    try {
      setIsSavingPdf(true);
      const res = await api.saveDocumentPdf(
        `/print-payment/${id}`,
        `payment-${id}.pdf`,
      );
      if (!res.success && res.error !== "CANCELED") {
        toast.error(t("screens.invoices.pdfFailed", "Failed to save PDF."));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPdf(false);
    }
  };

  const handleDelete = async () => {
    const res = await api.deletePayment(id);
    if (res.success) {
      toast.success(t("screens.payments.deleted"));
      navigate("/payments");
    } else {
      toast.error(res.message || t("screens.payments.deleteFailed"));
    }
    setDeleteOpen(false);
  };

  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";

  if (loading || !payment) {
    return (
      <div className={pageClass}>
        <div className="mx-auto max-w-3xl py-16 text-center text-slate-500">
          {loading ? t("common.loading") : t("screens.payments.notFound")}
        </div>
      </div>
    );
  }

  const isIncome = payment.type === "income";
  const fundCurrency = {
    code: payment.fund_currency_code,
    symbol: payment.fund_currency_symbol,
  };

  // Foreign = the fund holds a currency other than the primary one.
  const baseCode = primaryCurrency?.code;
  const isForeign =
    baseCode && payment.fund_currency_code
      ? baseCode !== payment.fund_currency_code
      : Number(payment.exchange_rate) !== 1;

  const referenceRate = Number(payment.exchange_rate) || 1;
  const effectiveRate = Number(payment.effective_rate) || referenceRate;
  const rateDiffers = isForeign && effectiveRate !== referenceRate;
  const deviationPct = ((effectiveRate - referenceRate) / referenceRate) * 100;

  const allocations = payment.allocations || [];
  const allocatedTotal = allocations.reduce(
    (sum, a) => sum + Number(a.amount || 0),
    0,
  );
  const unallocated = round2(Number(payment.amount || 0) - allocatedTotal);

  const directionText = isIncome ? "text-emerald-700" : "text-red-600";
  const directionTint = isIncome ? "bg-emerald-50" : "bg-red-50";

  const partyEndpoint = (
    <Endpoint
      label={isIncome ? t("DOCS.RECEIVED_FROM") : t("DOCS.PAID_TO")}
      meta={t(`ui.${payment.party_type}`)}
    >
      {payment.contact_id ? (
        <GoTo type={payment.party_type} id={payment.contact_id} variant="light">
          {payment.party_name || t("ui.other")}
        </GoTo>
      ) : (
        payment.party_name || t("ui.other")
      )}
    </Endpoint>
  );

  const fundEndpoint = (
    <Endpoint label={t("ui.fund")} meta={payment.fund_currency_code}>
      <GoTo type="fund" id={payment.fund_id} variant="light">
        {payment.fund_name}
      </GoTo>
    </Endpoint>
  );

  return (
    <div className={pageClass}>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSavePdf}
              disabled={isSavingPdf}
              className={actionButton}
            >
              <Download size={16} />
              {isSavingPdf ? t("common.saving") : t("common.savePdf")}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              className={actionButton}
            >
              <Printer size={16} />
              {isPrinting ? t("common.saving") : t("common.print")}
            </button>

            {/* Destructive action sits apart from the document actions */}
            <span className="mx-1 h-6 w-px bg-[#dbe4ff]" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl px-3 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
            >
              <Trash2 size={16} />
              {t("common.delete")}
            </button>
          </div>
        </div>

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_24px_80px_rgba(70,99,255,0.12)]">
          {/* Voucher head + the amount, which is what this page is about */}
          <div className="px-7 pb-6 pt-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h1 className="text-lg font-black text-[#1c2340]">
                {isIncome
                  ? t("DOCS.RECEIPT_VOUCHER")
                  : t("DOCS.PAYMENT_VOUCHER")}{" "}
                <span className="text-slate-400">#{payment.id}</span>
              </h1>
              <p className="text-sm text-slate-500">
                {new Date(payment.date).toLocaleString(i18n.language)}
              </p>
            </div>

            <p
              dir="ltr"
              className={`mt-6 text-start text-5xl font-black tabular-nums tracking-tight ${directionText}`}
            >
              {isIncome ? "+" : "−"}
              {formatMoney(payment.amount, primaryCurrency)}
            </p>

            {isForeign && (
              <p
                dir="ltr"
                className="mt-2 text-start text-lg font-bold tabular-nums text-slate-500"
              >
                {formatMoney(payment.amount_fund_currency, fundCurrency)}
              </p>
            )}
          </div>

          {/* The flow — where the money came from and where it went */}
          <div
            className={`grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-7 py-5 ${directionTint}`}
          >
            {isIncome ? partyEndpoint : fundEndpoint}
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ${directionText}`}
              aria-hidden="true"
            >
              <ArrowRight size={17} className="rtl:rotate-180" />
            </span>
            {isIncome ? fundEndpoint : partyEndpoint}
          </div>

          {/* Details — each row only when it carries information */}
          {(isForeign || payment.note) && (
            <dl className="divide-y divide-[#eef1ff] px-7">
              {isForeign && (
                <div className="flex flex-wrap items-baseline justify-between gap-2 py-4 text-sm">
                  <dt className="text-slate-500">
                    {t("screens.ledger.effectiveRate")}
                  </dt>
                  <dd className="text-end">
                    <span
                      dir="ltr"
                      className="font-bold tabular-nums text-[#1c2340]"
                    >
                      {formatMoney(1, primaryCurrency)} = {effectiveRate}{" "}
                      {payment.fund_currency_code}
                    </span>
                    {rateDiffers && (
                      <span className="mt-1 flex items-center justify-end gap-2 text-xs text-slate-400">
                        {t("screens.ledger.fundRate")}{" "}
                        <span dir="ltr" className="tabular-nums">
                          {referenceRate}
                        </span>
                        <span
                          dir="ltr"
                          className={`rounded-md px-1.5 py-0.5 font-bold tabular-nums ${
                            Math.abs(deviationPct) > 10
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {deviationPct > 0 ? "+" : ""}
                          {deviationPct.toFixed(1)}%
                        </span>
                      </span>
                    )}
                  </dd>
                </div>
              )}

              {payment.note && (
                <div className="py-4 text-sm">
                  <dt className="text-slate-500">{t("ui.notes")}</dt>
                  <dd className="mt-1 max-w-prose leading-relaxed text-slate-700">
                    {payment.note}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/* What this payment settled */}
          {(allocations.length > 0 || unallocated > 0) && (
            <div className="border-t border-[#e5ebff] bg-[#f8faff] px-7 py-5">
              <h2 className="mb-3 text-sm font-bold text-[#1c2340]">
                {t("screens.payments.allocations")}
              </h2>

              <ul className="divide-y divide-[#e5ebff] overflow-hidden rounded-2xl border border-[#e5ebff] bg-white">
                {allocations.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <GoTo
                        type={a.invoice_type}
                        id={a.invoice_id}
                        variant="light"
                      >
                        {t(`screens.invoices.invoiceType.${a.invoice_type}`, {
                          defaultValue: a.invoice_type,
                        })}{" "}
                        #{a.invoice_id}
                      </GoTo>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          a.settlement_status === "full"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {a.settlement_status === "full"
                          ? t("screens.payments.fullyPaid")
                          : t("screens.payments.partiallyPaid")}
                      </span>
                    </div>
                    <span
                      dir="ltr"
                      className="shrink-0 font-black tabular-nums text-[#1c2340]"
                    >
                      {formatMoney(a.amount, primaryCurrency)}
                    </span>
                  </li>
                ))}

                {unallocated > 0 && (
                  <li className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-3.5 text-sm">
                    <span className="text-slate-500">
                      {t("screens.payments.unallocated")}
                    </span>
                    <span
                      dir="ltr"
                      className="font-bold tabular-nums text-slate-600"
                    >
                      {formatMoney(unallocated, primaryCurrency)}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </section>
      </div>

      <DeleteModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={t("deleteModal.paymentTitle")}
        message={t("deleteModal.paymentMessage")}
      />

      <ToastContainer />
    </div>
  );
};

export default PaymentDocumentPage;
