import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Wallet, RefreshCcw } from "lucide-react";

import usePartyLedger from "../hooks/useGetPartyPayments";
import { formatNumber } from "../../../Global/FormatNumber";

const format = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PartyLedgerPage = () => {
  const { id, type } = useParams();

  const { data = [], loading } = usePartyLedger(id, type);

  const pageTotals = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;

    for (const p of data) {
      if (p.type === "income") {
        inTotal += Number(p.amount_fund_currency || 0);
      } else {
        outTotal += Number(p.amount_fund_currency || 0);
      }
    }

    return { inTotal, outTotal };
  }, [data]);

  const lastBalance = data.length ? Number(data[0].running_balance || 0) : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-3xl border shadow-sm mb-5 flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {type === "customer" ? "Customer" : "Supplier"} Ledger
          </h1>

          <p className="text-sm text-gray-500 mt-1">Party ID: #{id}</p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-green-600 font-medium">TOTAL IN</div>

            <div className="text-lg font-bold text-green-700">
              {formatNumber(pageTotals.inTotal)}
            </div>
          </div>

          <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-red-500 font-medium">TOTAL OUT</div>

            <div className="text-lg font-bold text-red-600">
              {formatNumber(pageTotals.outTotal)}
            </div>
          </div>

          <div className="bg-gray-100 border rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-gray-500 font-medium">BALANCE</div>

            <div className="text-lg font-bold text-gray-800">
              {formatNumber(lastBalance)}
            </div>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-gray-400">No movements</div>
        ) : (
          data.map((p) => {
            const isIn = p.type === "income";

            return (
              <div
                key={p.id}
                className="p-5 flex justify-between items-center border-b last:border-b-0 hover:bg-gray-50 transition"
              >
                {/* LEFT */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      isIn
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {isIn ? (
                      <ArrowDownLeft size={20} />
                    ) : (
                      <ArrowUpRight size={20} />
                    )}
                  </div>

                  <div>
                    <div className="font-semibold text-gray-800">
                      {p.note || "Transaction"}
                    </div>

                    <div className="text-sm text-gray-400 mt-1">
                      {p.fund_name || "-"}
                    </div>

                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                      <RefreshCcw size={12} />
                      Rate: {formatNumber(p.exchange_rate)}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="text-right">
                  <div
                    className={`font-bold text-lg ${
                      isIn ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {isIn ? "+" : "-"}

                    {formatNumber(p.amount_fund_currency)}
                  </div>

                  <div className="text-sm text-gray-500 mt-1">
                    {formatNumber(p.amount)} {p.currency_code} Base Currency
                  </div>

                  <div className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-2">
                    <Wallet size={12} />
                    Balance: {formatNumber(p.running_balance)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PartyLedgerPage;
