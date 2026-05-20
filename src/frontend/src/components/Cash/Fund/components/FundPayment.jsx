import React from "react";
import { useParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CalendarDays,
} from "lucide-react";

import useGetPayments from "../../../Payment/hooks/usePartyLedger";
import { formatMoney } from "../../../../Global/FormatNumber";
import { useTranslation } from "react-i18next";

const FundMovementsPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();

  const { payments, loading, fund } = useGetPayments(id);

  const finalBalance = payments[0]?.running_balance || 0;
  const fundCurrency = fund || {};

  const totalIn = payments
    .filter((p) => p.type === "income")
    .reduce((acc, item) => acc + Number(item.amount_fund_currency || 0), 0);

  const totalOut = payments
    .filter((p) => p.type === "expense")
    .reduce((acc, item) => acc + Number(item.amount_fund_currency || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8fc] to-[#eef2f7] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t("screens.fundMovements.title")}</h1>

            <p className="text-sm text-gray-500 mt-1">
              {t("screens.fundMovements.subtitle")}
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-3 min-w-[140px]">
              <div className="text-xs text-green-700 uppercase font-medium">
                {t("screens.fundMovements.totalIn")}
              </div>

              <div className="text-2xl font-bold text-green-600 mt-1">
                {formatMoney(totalIn, fundCurrency)}
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-3 min-w-[140px]">
              <div className="text-xs text-red-700 uppercase font-medium">
                {t("screens.fundMovements.totalOut")}
              </div>

              <div className="text-2xl font-bold text-red-500 mt-1">
                {formatMoney(totalOut, fundCurrency)}
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl px-5 py-3 min-w-[170px]">
              <div className="text-xs uppercase tracking-wide opacity-70">
                {t("screens.fundMovements.currentBalance")}
              </div>

              <div className="text-2xl font-bold mt-1">
                {formatMoney(finalBalance, fundCurrency)}
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {/* TABLE HEADER */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b text-xs uppercase tracking-wide text-gray-500 font-semibold">
            <div className="col-span-4">{t("ui.description")}</div>
            <div className="col-span-2">{t("ui.type")}</div>
            <div className="col-span-2 text-right">{t("ui.amount")}</div>
            <div className="col-span-2 text-right">{t("ui.runningBalance")}</div>
            <div className="col-span-2 text-right">{t("ui.date")}</div>
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="p-10 text-center text-gray-400">
              {t("screens.fundMovements.loading")}
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              {t("screens.fundMovements.empty")}
            </div>
          ) : (
            <div className="divide-y">
              {payments.map((payment) => {
                const isIn = payment.type === "income";

                return (
                  <div
                    key={payment.id}
                    className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-gray-50 transition items-center"
                  >
                    {/* DESCRIPTION */}
                    <div className="col-span-4 flex items-start gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                          isIn
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-500"
                        }`}
                      >
                        {isIn ? (
                          <ArrowDownLeft size={20} />
                        ) : (
                          <ArrowUpRight size={20} />
                        )}
                      </div>

                      <div>
                        <div className="font-semibold text-gray-900">
                          {payment.description || t("screens.fundMovements.fundMovement")}
                        </div>

                        <div className="text-xs text-gray-400 mt-1">
                          {payment.fund_name}
                        </div>
                      </div>
                    </div>

                    {/* TYPE */}
                    <div className="col-span-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isIn
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {isIn ? t("ui.income") : t("ui.expense")}
                      </span>
                    </div>

                    {/* AMOUNT */}
                    <div
                      className={`col-span-2 text-right text-lg font-bold ${
                        isIn ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isIn ? "+" : "-"}
                      {formatMoney(payment.amount_fund_currency, fundCurrency)}
                    </div>

                    {/* RUNNING BALANCE */}
                    <div className="col-span-2 text-right">
                      <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                        <Wallet size={15} className="text-gray-500" />

                        <span className="font-semibold text-gray-800">
                          {formatMoney(payment.running_balance, fundCurrency)}
                        </span>
                      </div>
                    </div>

                    {/* DATE */}
                    <div className="col-span-2 text-right text-sm text-gray-500 flex items-center justify-end gap-2">
                      <CalendarDays size={15} />

                      {payment?.createdAt?.slice(0, 10)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FundMovementsPage;
