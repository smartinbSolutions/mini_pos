import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from "react-toastify";
import {
  ArrowLeft,
  ArrowRight,
  Printer,
  Trash2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

import { formatMoney } from "../../../../Global/FormatNumber";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import DeleteModal from "../../../../Global/DeleteModel";

const PaymentDocumentPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const BackIcon = isRtl ? ArrowRight : ArrowLeft;
  const { primaryCurrency } = usePrimaryCurrency();

  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);

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
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";

  if (loading) {
    return (
      <div className={pageClass}>
        <div className="mx-auto max-w-3xl py-16 text-center text-slate-500">
          {t("common.loading")}
        </div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className={pageClass}>
        <div className="mx-auto max-w-3xl py-16 text-center text-slate-500">
          {t("screens.payments.notFound")}
        </div>
      </div>
    );
  }

  const isIncome = payment.type === "income";
  const rateDiffers = payment.exchange_rate !== payment.effective_rate;
  const currencyForFund = {
    code: payment.fund_currency_code,
    symbol: payment.fund_currency_symbol,
  };

  return (
    <div className={pageClass}>
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
          >
            <BackIcon size={16} />
            {t("common.back")}
          </button>

          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
            >
              <Printer size={16} />
              {t("common.print")}
            </button>
            <button
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl border border-red-100 bg-white px-4 py-2.5 text-sm font-bold text-red-500 transition hover:bg-red-50"
            >
              <Trash2 size={16} />
              {t("common.delete")}
            </button>
          </div>
        </div>

        <section className={panelClass}>
          <div className="flex items-start justify-between p-7">
            <div>
              <p className="mb-2 text-xs font-bold uppercase  text-[#4663ff]">
                {t("ui.payment")}
              </p>
              <h1 className="text-3xl font-black text-slate-950">
                #{payment.id}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {new Date(payment.date).toLocaleString()}
              </p>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-black ${
                isIncome
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-600"
              }`}
            >
              {isIncome ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isIncome
                ? t("screens.payments.income")
                : t("screens.payments.expense")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-6 border-t border-[#e5ebff] bg-[#f8faff] p-7 text-sm">
            <div>
              <p className="text-xs font-bold uppercase  text-slate-400">
                {t("screens.payments.party")}
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {payment.party_name || t("ui.other")}
                <span className="ms-2 font-normal text-slate-400">
                  ({t(`ui.${payment.party_type}`)})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase  text-slate-400">
                {t("ui.fund")}
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {payment.fund_name}{" "}
                <span className="font-normal text-slate-400">
                  ({payment.fund_currency_code})
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase  text-slate-400">
                {t("ui.amount")}
              </p>
              <p
                className={`mt-1 font-black tabular-nums ${
                  isIncome ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {formatMoney(payment.amount, primaryCurrency)}
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase  text-slate-400">
                {t("screens.payments.collectedAmount")}
              </p>
              <p className="mt-1 font-black tabular-nums text-slate-700">
                {formatMoney(
                  payment.amount_fund_currency,
                  currencyForFund.code,
                  currencyForFund.symbol
                )}
              </p>
            </div>

            {rateDiffers && (
              <>
                <div>
                  <p className="text-xs font-bold uppercase  text-slate-400">
                    {t("screens.payments.exchangeRate")}
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {payment.exchange_rate}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase  text-slate-400">
                    {t("screens.payments.effectiveRate")}
                  </p>
                  <p className="mt-1 font-bold text-slate-700">
                    {payment.effective_rate}
                  </p>
                </div>
              </>
            )}
          </div>

          {payment.note && (
            <div className="border-t border-[#e5ebff] p-7 text-sm">
              <p className="text-xs font-bold uppercase  text-slate-400">
                {t("ui.note")}
              </p>
              <p className="mt-1 text-slate-700">{payment.note}</p>
            </div>
          )}

          {payment.allocations?.length > 0 && (
            <div className="border-t border-[#e5ebff] p-7">
              <p className="mb-3 text-xs font-bold uppercase  text-slate-400">
                {t("screens.payments.allocations")}
              </p>
              <div className="divide-y divide-[#e5ebff] overflow-hidden rounded-2xl border border-[#e5ebff]">
                {payment.allocations.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between bg-white px-5 py-4 text-sm"
                  >
                    <span className="font-bold text-slate-600">
                      {a.invoice_type} #{a.invoice_id}
                    </span>
                    <span className="font-black text-slate-900">
                      {formatMoney(
                        a.amount,
                        currencyForFund.code,
                        currencyForFund.symbol
                      )}
                    </span>
                  </div>
                ))}
              </div>
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
