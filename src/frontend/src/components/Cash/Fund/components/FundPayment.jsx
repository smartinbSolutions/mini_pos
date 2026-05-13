import React from "react";
import { useParams } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CalendarDays,
} from "lucide-react";

import useGetPayments from "../../../Payment/hooks/usePartyLedger";

const formatNumber = (value) => {
  return Number(value || 0).toLocaleString();
};

const FundMovementsPage = () => {
  const { id } = useParams();

  const { payments, loading } = useGetPayments(id);
  console.log(payments);

  const finalBalance = payments[0]?.running_balance || 0;

  const totalIn = payments
    .filter((p) => p.type === "income")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  const totalOut = payments
    .filter((p) => p.type === "expense")
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8fc] to-[#eef2f7] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fund Movements</h1>

            <p className="text-sm text-gray-500 mt-1">
              Track all fund transactions and running balances
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-3 min-w-[140px]">
              <div className="text-xs text-green-700 uppercase font-medium">
                Total In
              </div>

              <div className="text-2xl font-bold text-green-600 mt-1">
                {formatNumber(totalIn)}
              </div>
            </div>

            <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-3 min-w-[140px]">
              <div className="text-xs text-red-700 uppercase font-medium">
                Total Out
              </div>

              <div className="text-2xl font-bold text-red-500 mt-1">
                {formatNumber(totalOut)}
              </div>
            </div>

            <div className="bg-gray-900 text-white rounded-2xl px-5 py-3 min-w-[170px]">
              <div className="text-xs uppercase tracking-wide opacity-70">
                Current Balance
              </div>

              <div className="text-2xl font-bold mt-1">
                {formatNumber(finalBalance)}
              </div>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          {/* TABLE HEADER */}
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b text-xs uppercase tracking-wide text-gray-500 font-semibold">
            <div className="col-span-4">Description</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Amount</div>
            <div className="col-span-2 text-right">Running Balance</div>
            <div className="col-span-2 text-right">Date</div>
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="p-10 text-center text-gray-400">
              Loading movements...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              No movements found
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
                          {payment.description || "Fund Movement"}
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
                        {isIn ? "INCOME" : "EXPENSE"}
                      </span>
                    </div>

                    {/* AMOUNT */}
                    <div
                      className={`col-span-2 text-right text-lg font-bold ${
                        isIn ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isIn ? "+" : "-"}
                      {formatNumber(payment.amount)}
                    </div>

                    {/* RUNNING BALANCE */}
                    <div className="col-span-2 text-right">
                      <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                        <Wallet size={15} className="text-gray-500" />

                        <span className="font-semibold text-gray-800">
                          {formatNumber(payment.running_balance)}
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
