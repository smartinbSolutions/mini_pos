import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  Landmark,
  ArrowLeft,
  RefreshCw, // أيقونة إضافية للمرتجعات
} from "lucide-react";

import usePartyLedger from "../hooks/useGetPartyPayments";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

const PartyLedgerPage = () => {
  const { t } = useTranslation();
  const { id, type } = useParams();
  const navigate = useNavigate();

  const normalizedType = type === "partners" ? "partner" : type;
  const isPartnerParty = normalizedType === "partner";

  const {
    data = [],
    summary,
    loading,
    party,
  } = usePartyLedger(id, normalizedType);
  const { money } = usePrimaryCurrency();

  const typeLabel = isPartnerParty
    ? t("ui.partner")
    : normalizedType === "customer"
      ? t("ui.customer")
      : t("ui.supplier");

  const partyName = party?.name || `${typeLabel} #${id}`;

  // تجميع الحسابات من السورس الرئيسي بالباكيند شاملة المرتجعات
  const totalInvoice = Number(summary?.total_invoice || 0);
  const totalPayment = Number(summary?.total_payment || 0);
  const totalReturn = Number(summary?.total_return || 0); // الحقل الجديد المضاف للمرتجعات
  const totalDeposit = Number(summary?.total_deposit || 0);
  const totalWithdrawal = Number(summary?.total_withdrawal || 0);

  const primaryLabel = isPartnerParty
    ? t("screens.ledger.totalDeposit")
    : t("screens.ledger.totalInvoice");
  const primaryValue = isPartnerParty ? totalDeposit : totalInvoice;

  const secondaryLabel = isPartnerParty
    ? t("screens.ledger.totalWithdrawal")
    : t("screens.ledger.totalPayment");
  const secondaryValue = isPartnerParty ? totalWithdrawal : totalPayment;

  const partyBalance = isPartnerParty
    ? totalDeposit - totalWithdrawal
    : totalInvoice - totalPayment - totalReturn;

  const isOutflow = (p) => {
    if (p.party_type === "partner") {
      return p.movement_type === "withdrawal";
    }
    return p.record_type === "payment" || p.record_type === "return";
  };

  const goToInvoice = (record) => {
    if (!record.invoice_id || !record.invoice_type) return;
    navigate(`/view-${record.invoice_type}/${record.invoice_id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* HEADER */}
      <div className="bg-white p-5 rounded-3xl border shadow-sm mb-5 flex flex-col lg:flex-row justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 text-gray-600 transition hover:bg-gray-200"
            aria-label={t("common.back")}
          >
            <ArrowLeft size={18} />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-800">{partyName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("screens.ledger.partyId", { type: typeLabel, id })}
            </p>
          </div>
        </div>

        {/*Up Cart*/}
        <div className="flex gap-4 flex-wrap">
          <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-blue-600 font-medium">
              {primaryLabel}
            </div>
            <div className="text-lg font-bold text-blue-700">
              {money(primaryValue)}
            </div>
          </div>

          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3 min-w-[140px]">
            <div className="text-xs text-green-600 font-medium">
              {secondaryLabel}
            </div>
            <div className="text-lg font-bold text-green-700">
              {money(secondaryValue)}
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
            const hasInvoiceLink = Boolean(p.invoice_id && p.invoice_type);

            const kindLabel =
              p.party_type === "partner"
                ? p.movement_type === "withdrawal"
                  ? t("screens.ledger.withdrawal")
                  : t("screens.ledger.deposit")
                : p.record_type === "payment"
                  ? t("screens.ledger.payment")
                  : p.record_type === "return"
                    ? t("ui.return", "مرتجع")
                    : t("screens.ledger.invoice");

            const rate = Number(p.exchange_rate || 1);
            const isForeignCurrency = rate !== 1;
            const effectiveRate = Number(p.effective_rate || rate);
            const fundAmount = Number(
              p.amount_fund_currency ?? Number(p.amount || 0) * rate,
            );

            return (
              <div
                key={`${p.record_type}-${p.id}`}
                onClick={hasInvoiceLink ? () => goToInvoice(p) : undefined}
                className={`p-5 flex justify-between items-center border-b last:border-b-0 hover:bg-gray-50 transition ${
                  hasInvoiceLink ? "cursor-pointer" : ""
                }`}
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
                      <RefreshCw size={18} className="animate-spin-slow" />
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

                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                      <span
                        className={`uppercase tracking-wide font-bold ${p.record_type === "return" ? "text-amber-600" : ""}`}
                      >
                        {kindLabel}
                      </span>
                      {p.fund_name && (
                        <span className="flex items-center gap-1">
                          <Landmark size={11} />
                          {p.fund_name}
                        </span>
                      )}
                      {p.invoice_type && <span>· {p.invoice_type}</span>}
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
                          <span className="ml-1 text-blue-600 font-medium">
                            ({t("ui.effectiveRate")}: {effectiveRate.toFixed(4)}
                            )
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`font-bold text-lg ${
                      p.record_type === "return"
                        ? "text-amber-600"
                        : outflow
                          ? "text-red-500"
                          : "text-green-600"
                    }`}
                  >
                    {p.record_type === "return" ? "" : outflow ? "-" : "+"}
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
