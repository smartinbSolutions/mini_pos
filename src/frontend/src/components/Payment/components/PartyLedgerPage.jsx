import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Landmark,
  ShoppingCart,
  CreditCard,
  Handshake,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
} from "lucide-react";

import usePartyLedger from "../hooks/useGetPartyPayments";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import GoTo from "../../../Global/GoTo";
import Pagination from "../../../Global/Pagination";

const PartyLedgerPage = () => {
  const { t, i18n } = useTranslation();
  const { id, type } = useParams();
  const navigate = useNavigate();
  const isRtl = i18n.dir() === "rtl";
  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;

  const normalizedType = type === "partners" ? "partner" : type;
  const isPartnerParty = normalizedType === "partner";

  const {
    data = [],
    summary,
    loading,
    party,
    page,
    setPage,
    total,
    totalPages,
    limit,
  } = usePartyLedger(id, normalizedType);

  const { money } = usePrimaryCurrency();

  const typeLabel = isPartnerParty
    ? t("ui.partner")
    : normalizedType === "customer"
      ? t("ui.customer")
      : t("ui.supplier");

  const partyName = party?.name || `${typeLabel} #${id}`;

  const totalIncrease = Number(summary?.total_increase || 0);
  const totalDecrease = Number(summary?.total_decrease || 0);
  const totalInvoice = Number(summary?.total_invoice || 0);
  const totalReturn = Number(summary?.total_return || 0);
  const totalPayment = Number(summary?.total_payment || 0);
  const openingBalance = Number(summary?.opening_balance || 0);

  // Balance is simply the net of every increase/decrease ever recorded —
  // no more per-party-type special casing, since movement_type is now
  // uniform across customer/supplier/partner.
  const partyBalance = totalIncrease - totalDecrease;

  const primaryLabel = isPartnerParty
    ? t("screens.ledger.totalDeposit")
    : t("screens.ledger.totalInvoice");
  const primaryValue = isPartnerParty ? totalIncrease : totalInvoice;

  const secondaryLabel = isPartnerParty
    ? t("screens.ledger.totalWithdrawal")
    : t("screens.ledger.totalPayment");
  const secondaryValue = isPartnerParty ? totalDecrease : totalPayment;

  // Outflow (money-out/red styling) is now just "did this decrease the
  // balance" — same rule for every party type.
  const isOutflow = (p) => p.movement_type === "decrease";

  const kindLabel = (p) => {
    if (p.record_type === "opening_balance")
      return t("screens.ledger.openingBalance");
    if (p.record_type === "return") return t("screens.ledger.return");
    if (p.record_type === "payment") return t("screens.ledger.payment");
    return t("screens.ledger.invoice");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-3xl border shadow-sm mb-5 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 text-gray-600 transition hover:bg-gray-200"
            aria-label={t("common.back")}
          >
            <BackArrowIcon size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-800">{partyName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("screens.ledger.partyId", { type: typeLabel, id })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <Landmark size={13} />
              {t("screens.ledger.openingBalance")}
            </div>
            <div className="text-lg font-bold text-gray-700 mt-1">
              {money(openingBalance)}
            </div>
          </div>

          {isPartnerParty ? (
            <>
              <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                  <ArrowDownCircle size={13} />
                  {t("screens.ledger.totalDeposit")}
                </div>
                <div className="text-lg font-bold text-green-700 mt-1">
                  {money(totalIncrease)}
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                  <ArrowUpCircle size={13} />
                  {t("screens.ledger.totalWithdrawal")}
                </div>
                <div className="text-lg font-bold text-red-600 mt-1">
                  {money(totalDecrease)}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                  <ShoppingCart size={13} />
                  {t("screens.ledger.totalInvoice")}
                </div>
                <div className="text-lg font-bold text-blue-700 mt-1">
                  {money(totalInvoice)}
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                  <RefreshCw size={13} />
                  {t("screens.ledger.totalReturn")}
                </div>
                <div className="text-lg font-bold text-amber-700 mt-1">
                  {money(totalReturn)}
                </div>
              </div>

              <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                  <CreditCard size={13} />
                  {t("screens.ledger.totalPayment")}
                </div>
                <div className="text-lg font-bold text-red-600 mt-1">
                  {money(totalPayment)}
                </div>
              </div>
            </>
          )}

          <div className="bg-gray-900 text-white rounded-2xl px-4 py-3">
            <div className="flex items-center gap-1.5 text-xs opacity-70 font-medium">
              <Wallet size={13} />
              {t("ui.balance")}
            </div>
            <div className="text-lg font-bold mt-1">{money(partyBalance)}</div>
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
            const outflow = isOutflow(p);
            const rate = Number(p.exchange_rate || 1);
            const isForeignCurrency = rate !== 1;
            const effectiveRate = Number(p.effective_rate || rate);
            const fundAmount = Number(
              p.amount_fund_currency ?? Number(p.amount || 0) * rate
            );

            return (
              <div
                key={`${p.record_type}-${p.id}`}
                className="p-5 flex justify-between items-center border-b last:border-b-0 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      p.record_type === "return"
                        ? "bg-amber-100 text-amber-600"
                        : outflow
                          ? "bg-red-100 text-red-600"
                          : "bg-green-100 text-green-700"
                    }`}
                  >
                    {p.record_type === "return" ? (
                      <RefreshCw size={18} />
                    ) : outflow ? (
                      <ArrowUpRight size={20} />
                    ) : (
                      <ArrowDownLeft size={20} />
                    )}
                  </div>

                  <div>
                    <div className="font-semibold text-gray-800">
                      {p.note || t("screens.ledger.transaction")}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                      <span
                        className={`uppercase tracking-wide font-bold ${
                          p.record_type === "return" ? "text-amber-600" : ""
                        }`}
                      >
                        {kindLabel(p)}
                      </span>

                      {p.record_type !== "payment" &&
                        p.invoice_id &&
                        p.invoice_type && (
                          <GoTo type={p.invoice_type} id={p.invoice_id}>
                            {p.invoice_name || `#${p.invoice_id}`}
                          </GoTo>
                        )}

                      {p.record_type === "payment" && p.payment_id && (
                        <GoTo type="fund" id={p.payment_fund_id}>
                          {p.fund_name}
                        </GoTo>
                      )}
                    </div>

                    {isForeignCurrency && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-2 py-1">
                        <span className="font-medium text-gray-700">
                          {money(p.amount)}
                        </span>
                        <span className="text-gray-400">
                          × {rate.toFixed(4)}
                        </span>
                        <span className="text-gray-400">=</span>
                        <span className="font-medium text-gray-700">
                          {fundAmount.toFixed(2)} {p.currency_code}
                        </span>
                        {effectiveRate !== rate && (
                          <span className="me-1 text-blue-600 font-medium">
                            ({t("screens.ledger.effectiveRate")}:{" "}
                            {effectiveRate.toFixed(4)})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-start">
                  <div
                    className={`font-bold text-lg ${
                      p.record_type === "return"
                        ? "text-amber-600"
                        : outflow
                          ? "text-red-500"
                          : "text-green-600"
                    }`}
                  >
                    {outflow ? "-" : "+"}
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

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};

export default PartyLedgerPage;
