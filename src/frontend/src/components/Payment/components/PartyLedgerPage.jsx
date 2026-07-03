import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Wallet } from "lucide-react";

import usePartyLedger from "../hooks/useGetPartyPayments";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

const PartyLedgerPage = () => {
  const { t } = useTranslation();
  const { id, type } = useParams();
  const navigate = useNavigate();

  const { data = [], loading, party } = usePartyLedger(id, type);
  const { money } = usePrimaryCurrency();
  const partyTotal = Number(party?.total || 0);
  const partyPaid = Number(party?.total_paid || 0);
  const partyBalance = partyTotal - partyPaid;
  const typeLabel = type === "customer" ? t("ui.customer") : t("ui.supplier");
  const partyName = party?.name || `${typeLabel} #${id}`;

  const pageTotals = useMemo(() => {
    let invoicedTotal = 0;
    let paidTotal = 0;

    for (const p of data) {
      if (p.record_type === "payment") {
        paidTotal += Number(p.amount || 0);
      } else if (p.record_type === "invoice") {
        invoicedTotal += Number(p.amount || 0);
      }
    }

    return { invoicedTotal, paidTotal };
  }, [data]);

  const goToInvoice = (record) => {
    if (!record.invoice_id || !record.invoice_type) return;
    navigate(`/view-${record.invoice_type}/${record.invoice_id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-3xl border shadow-sm mb-5 flex flex-col lg:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{partyName}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t("screens.ledger.partyId", { type: typeLabel, id })}
          </p>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-blue-600 font-medium">
              {t("screens.ledger.partyTotal")}
            </div>
            <div className="text-lg font-bold text-blue-700">
              {money(partyTotal)}
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-green-600 font-medium">
              {t("screens.ledger.totalPaid")}
            </div>
            <div className="text-lg font-bold text-green-700">
              {money(partyPaid)}
            </div>
          </div>

          <div className="bg-gray-100 border rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-gray-500 font-medium">
              {t("ui.balance")}
            </div>
            <div className="text-lg font-bold text-gray-800">
              {money(partyBalance)}
            </div>
          </div>

          <div className="bg-white border rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-gray-500 font-medium">
              {t("screens.ledger.pageInvoiced")}
            </div>
            <div className="text-lg font-bold text-gray-800">
              {money(pageTotals.invoicedTotal)}
            </div>
          </div>

          <div className="bg-white border rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-gray-500 font-medium">
              {t("screens.ledger.pagePaid")}
            </div>
            <div className="text-lg font-bold text-gray-800">
              {money(pageTotals.paidTotal)}
            </div>
          </div>
        </div>
      </div>

      {/* LIST */}
      <div className="bg-white border rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6 text-gray-400">{t("common.loading")}</div>
        ) : data.length === 0 ? (
          <div className="p-6 text-gray-400">
            {t("screens.ledger.noMovements")}
          </div>
        ) : (
          data.map((p) => {
            const isPayment = p.record_type === "payment";
            const hasInvoiceLink = Boolean(p.invoice_id && p.invoice_type);

            return (
              <div
                key={`${p.record_type}-${p.id}`}
                onClick={hasInvoiceLink ? () => goToInvoice(p) : undefined}
                className={`p-5 flex justify-between items-center border-b last:border-b-0 hover:bg-gray-50 transition ${
                  hasInvoiceLink ? "cursor-pointer" : ""
                }`}
              >
                {/* LEFT */}
                <div className="flex items-center gap-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      isPayment
                        ? "bg-red-100 text-red-600"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {isPayment ? (
                      <ArrowUpRight size={20} />
                    ) : (
                      <ArrowDownLeft size={20} />
                    )}
                  </div>

                  <div>
                    <div className="font-semibold text-gray-800">
                      {p.note || t("screens.ledger.transaction")}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span className="uppercase tracking-wide font-bold">
                        {isPayment
                          ? t("screens.ledger.payment")
                          : t("screens.ledger.invoice")}
                      </span>
                      {p.invoice_type && <span>· {p.invoice_type}</span>}
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="text-right">
                  <div
                    className={`font-bold text-lg ${
                      isPayment ? "text-red-500" : "text-green-600"
                    }`}
                  >
                    {isPayment ? "-" : "+"}
                    {money(p.amount)}
                  </div>

                  <div className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-2">
                    <Wallet size={12} />
                    {t("screens.ledger.balance", {
                      balance: money(p.running_balance),
                    })}
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
