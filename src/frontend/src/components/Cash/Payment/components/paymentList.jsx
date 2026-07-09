import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import usePayment from "../hooks/usePayment";
import DeleteModal from "../../../../Global/DeleteModel";

import {
  Search,
  Receipt,
  HandCoins,
  RefreshCw,
  PackagePlus,
  Eye,
  Trash2,
  Calendar,
} from "lucide-react";
import Pagination from "../../../../Global/Pagination";

const formatMoney = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

const PaymentList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    payments = [],
    loading,
    actionError,
    refetch,
    handleDeletePayment,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
  } = usePayment();
  console.log(payments);
  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayments = payments.filter((pay) => {
    const clientName = pay.customer_name?.toLowerCase() || "";
    const paymentId = String(pay.id);
    const query = searchQuery.toLowerCase();
    return clientName.includes(query) || paymentId.includes(query);
  });

  const totalPaymentsAmount = payments.reduce(
    (acc, curr) => acc + (curr.amount || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#4663ff]">
                {t("ui.payment")}
              </p>
              <h1 className="text-4xl font-black leading-tight text-slate-950">
                {t("screens.payments.title")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {t("screens.payments.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <Receipt size={20} className="mb-4 text-[#4663ff]" />
                <div className="text-2xl font-black">{payments.length}</div>
                <div className="text-xs font-semibold text-slate-500">
                  {t("ui.totalPaymentsCount")}
                </div>
              </div>
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <HandCoins size={20} className="mb-4 text-emerald-600" />
                <div className="text-xl font-black text-emerald-700">
                  {formatMoney(totalPaymentsAmount)}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {t("ui.totalAmount")}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e5ebff] bg-white/60 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[#dbe4ff] bg-white pl-11 pr-4 text-sm outline-none transition focus:border-[#4663ff] focus:ring-2 focus:ring-[#4663ff]/10"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={refetch}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
              >
                <RefreshCw size={16} />
                {t("common.refresh")}
              </button>
            </div>
          </div>
        </section>

        {actionError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">
                    {t("screens.payments.paymentNo")}
                  </th>
                  <th className="px-5 py-4">{t("screens.payments.party")}</th>
                  <th className="px-5 py-4">{t("ui.date")}</th>

                  <th className="px-5 py-4 text-right">
                    {t("ui.amount", "المبلغ")}
                  </th>
                  <th className="px-5 py-4 text-right">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e5ebff]">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-500">
                      {t("screens.payments.empty")}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => (
                    <tr key={pay.id} className="transition hover:bg-[#f8faff]">
                      <td className="px-5 py-4">
                        <span className="rounded-xl bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#4663ff]">
                          #{pay.id}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-900">
                        {pay.party_name || "-"}
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {pay?.date?.slice(0, 10) ||
                          pay?.createdAt?.slice(0, 10)}
                      </td>

                      <td className="px-5 py-4 text-right font-black text-emerald-700">
                        {formatMoney(pay.amount || 0)}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          {/* <button
                            onClick={() => navigate(`/view-payment/${pay.id}`)}
                            className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                            title={t("common.view")}
                          >
                            <Eye size={16} />
                          </button> */}

                          <button
                            onClick={() => setDeletePaymentId(pay)}
                            className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                            title={t("common.delete")}
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

      <DeleteModal
        open={Boolean(deletePaymentId)}
        onClose={() => setDeletePaymentId(null)}
        onConfirm={async () => {
          if (deletePaymentId) {
            await handleDeletePayment(deletePaymentId);
            setDeletePaymentId(null);
          }
        }}
        title={t("deleteModal.paymentTitle")}
        message={t("deleteModal.paymentMessage")}
      />
    </div>
  );
};

export default PaymentList;
