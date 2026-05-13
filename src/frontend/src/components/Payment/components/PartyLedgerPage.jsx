import React, { useMemo } from "react";
import { useParams } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";
import usePartyLedger from "../hooks/useGetPartyPayments";

const format = (n) => Number(n || 0).toLocaleString();

const PartyLedgerPage = () => {
  const { id, type } = useParams();

  const { data = [], loading } = usePartyLedger(id, type);
  const pageTotals = useMemo(() => {
    let inTotal = 0;
    let outTotal = 0;

    for (const p of data) {
      if (p.type === "income") inTotal += Number(p.amount || 0);
      else outTotal += Number(p.amount || 0);
    }

    return { inTotal, outTotal };
  }, [data]);
  console.log(data);

  const lastBalance = data.length ? data[0].running_balance : 0;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white p-5 rounded-2xl border mb-5 flex justify-between">
        <div>
          <h1 className="text-xl font-bold">
            {type === "customer" ? "Customer" : "Supplier"} Ledger
          </h1>
          <p className="text-sm text-gray-500">ID: {id}</p>
        </div>

        <div className="flex gap-6">
          <div className="text-green-600 font-bold">
            IN: {format(pageTotals.inTotal)}
          </div>

          <div className="text-red-500 font-bold">
            OUT: {format(pageTotals.outTotal)}
          </div>

          <div className="font-bold">BAL: {format(lastBalance)}</div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl divide-y">
        {loading ? (
          <div className="p-5 text-gray-400">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-5 text-gray-400">No movements</div>
        ) : (
          data.map((p) => {
            const isIn = p.type === "income";

            return (
              <div key={p.id} className="p-4 flex justify-between items-center">
                <div className="flex gap-3 items-center">
                  <div
                    className={`p-2 rounded-xl ${isIn ? "bg-green-100" : "bg-red-100"}`}
                  >
                    {isIn ? (
                      <ArrowDownLeft size={18} />
                    ) : (
                      <ArrowUpRight size={18} />
                    )}
                  </div>

                  <div>
                    <div className="font-medium">{p.note || "Transaction"}</div>
                    <div className="text-xs text-gray-400">
                      {p.fund_name || "-"}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={isIn ? "text-green-600" : "text-red-500"}>
                    {isIn ? "+" : "-"}
                    {format(p.amount)}
                  </div>

                  <div className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                    <Wallet size={12} />
                    {format(p.running_balance)}
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
