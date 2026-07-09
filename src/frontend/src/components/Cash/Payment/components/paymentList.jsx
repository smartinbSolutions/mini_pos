import React, { useState } from "react";
import { useTranslation } from "react-i18next";

import usePayment from "../hooks/usePayment";
import DeleteModal from "../../../../Global/DeleteModel";
import Pagination from "../../../../Global/Pagination";

import {
  Search,
  Receipt,
  HandCoins,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronRight,
  Filter,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { formatMoney } from "../../../../Global/FormatNumber";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";

const AllocationBadge = ({ payment }) => {
  const { t } = useTranslation();

  if (payment.party_type === "partner") {
    return (
      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
        {t("screens.payments.partnerMovement", "Partner movement")}
      </span>
    );
  }

  if (!payment.allocation_count || payment.allocation_count === 0) {
    return (
      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        {t("screens.payments.unallocated", "Unallocated")}
      </span>
    );
  }

  if (payment.allocated_amount < payment.amount) {
    return (
      <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        {t("screens.payments.partial", "Partial")}
      </span>
    );
  }

  return (
    <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
      {t("screens.payments.fullyAllocated", "Fully allocated")}
    </span>
  );
};

const PaymentFlow = ({ payment }) => {
  const isIncome = payment.type === "income";
  const partyLabel = payment.party_name || "-";
  const fundLabel = payment.fund_name || "-";

  return (
    <div className="flex items-center gap-2">
      {isIncome ? (
        <>
          <span className="font-bold text-slate-700">{partyLabel}</span>
          <ArrowRight size={14} className="text-emerald-500 shrink-0" />
          <span className="font-bold text-slate-900">{fundLabel}</span>
          <TrendingUp size={14} className="text-emerald-500 shrink-0" />
        </>
      ) : (
        <>
          <span className="font-bold text-slate-900">{fundLabel}</span>
          <ArrowRight size={14} className="text-red-500 shrink-0" />
          <span className="font-bold text-slate-700">{partyLabel}</span>
          <TrendingDown size={14} className="text-red-500 shrink-0" />
        </>
      )}
    </div>
  );
};

const PaymentList = () => {
  const { t } = useTranslation();

  const {
    payments = [],
    summary,
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
    filters,
    setFilters,
  } = usePayment();

  const { primaryCurrency } = usePrimaryCurrency();

  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [allocationsByPayment, setAllocationsByPayment] = useState({});
  const [loadingAllocations, setLoadingAllocations] = useState({});
  const [funds, setFunds] = useState([]);

  const api = window.api;

  React.useEffect(() => {
    if (api?.getFunds) {
      api
        .getFunds()
        .then((res) => setFunds(res?.data || res || []))
        .catch(() => setFunds([]));
    }
  }, [api]);
  const { money } = usePrimaryCurrency();

  const filteredPayments = payments.filter((pay) => {
    const partyName = pay.party_name?.toLowerCase() || "";
    const paymentId = String(pay.id);
    const query = searchQuery.toLowerCase();
    return partyName.includes(query) || paymentId.includes(query);
  });

  const toggleExpand = async (payment) => {
    const isExpanded = expandedRows[payment.id];

    setExpandedRows((prev) => ({ ...prev, [payment.id]: !isExpanded }));

    if (!isExpanded && !allocationsByPayment[payment.id]) {
      setLoadingAllocations((prev) => ({ ...prev, [payment.id]: true }));
      try {
        const res = await api.getPaymentAllocations(payment.id);
        setAllocationsByPayment((prev) => ({
          ...prev,
          [payment.id]: res || [],
        }));
      } catch (err) {
        console.error("Failed to load allocations:", err);
        setAllocationsByPayment((prev) => ({ ...prev, [payment.id]: [] }));
      } finally {
        setLoadingAllocations((prev) => ({ ...prev, [payment.id]: false }));
      }
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({ [field]: value || null });
  };

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
                <TrendingUp size={20} className="mb-4 text-emerald-600" />
                <div className="text-xl  text-emerald-700">
                  {formatMoney(summary.income_total)} {primaryCurrency?.symbol}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {t("screens.payments.incomeCount", "{{count}} income", {
                    count: summary.income_count,
                  })}
                </div>
              </div>
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <TrendingDown size={20} className="mb-4 text-red-500" />
                <div className="text-xl  text-red-600">
                  {formatMoney(summary.expense_total)} {primaryCurrency?.symbol}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {t("screens.payments.expenseCount", "{{count}} expense", {
                    count: summary.expense_count,
                  })}
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
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition ${
                  showFilters
                    ? "border-[#4663ff] bg-[#eef3ff] text-[#4663ff]"
                    : "border-[#dbe4ff] bg-white text-slate-600 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                }`}
              >
                <Filter size={16} />
                {t("common.filters", "Filters")}
              </button>
              <button
                onClick={refetch}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
              >
                <RefreshCw size={16} />
                {t("common.refresh")}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 gap-3 border-t border-[#e5ebff] bg-white/60 p-5 md:grid-cols-3 lg:grid-cols-6">
              <select
                value={filters.type || ""}
                onChange={(e) => handleFilterChange("type", e.target.value)}
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              >
                <option value="">
                  {t("screens.payments.allTypes", "All Types")}
                </option>
                <option value="income">{t("ui.income", "Income")}</option>
                <option value="expense">{t("ui.expense", "Expense")}</option>
              </select>

              <select
                value={filters.party_type || ""}
                onChange={(e) =>
                  handleFilterChange("party_type", e.target.value)
                }
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              >
                <option value="">
                  {t("screens.payments.allParties", "All Parties")}
                </option>
                <option value="customer">{t("ui.customer", "Customer")}</option>
                <option value="supplier">{t("ui.supplier", "Supplier")}</option>
                <option value="partner">{t("ui.partner", "Partner")}</option>
                <option value="other">{t("ui.other", "Other")}</option>
              </select>

              <select
                value={filters.invoice_type || ""}
                onChange={(e) =>
                  handleFilterChange("invoice_type", e.target.value)
                }
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              >
                <option value="">
                  {t("screens.payments.allInvoiceTypes", "All Invoice Types")}
                </option>
                <option value="sales">{t("ui.sales", "Sales")}</option>
                <option value="purchase">{t("ui.purchase", "Purchase")}</option>
                <option value="expense">{t("ui.expense", "Expense")}</option>
              </select>

              <select
                value={filters.fund_id || ""}
                onChange={(e) => handleFilterChange("fund_id", e.target.value)}
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              >
                <option value="">
                  {t("screens.payments.allFunds", "All Funds")}
                </option>
                {funds.map((fund) => (
                  <option key={fund.id} value={fund.id}>
                    {fund.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={filters.dateFrom || ""}
                onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              />

              <input
                type="date"
                value={filters.dateTo || ""}
                onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              />
            </div>
          )}
        </section>

        {actionError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-left text-sm">
              <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="w-10 px-5 py-4"></th>
                  <th className="px-5 py-4">
                    {t("screens.payments.paymentNo")}
                  </th>
                  <th className="px-5 py-4">
                    {t("screens.payments.flow", "Flow")}
                  </th>
                  <th className="px-5 py-4">{t("ui.date")}</th>
                  <th className="px-5 py-4 text-right">
                    {t("ui.amount", "Amount")}
                  </th>
                  <th className="px-5 py-4 text-right">
                    {t("screens.payments.rate", "Rate")}
                  </th>
                  <th className="px-5 py-4">
                    {t("screens.payments.allocation", "Allocation")}
                  </th>
                  <th className="px-5 py-4 text-right">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e5ebff]">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-slate-500">
                      {t("screens.payments.empty")}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => {
                    const canExpand = pay.party_type !== "partner";
                    const isExpanded = expandedRows[pay.id];
                    const allocations = allocationsByPayment[pay.id];
                    const isLoadingAlloc = loadingAllocations[pay.id];
                    const rateDiffers =
                      pay.exchange_rate !== pay.effective_rate;

                    return (
                      <React.Fragment key={pay.id}>
                        <tr className="transition hover:bg-[#f8faff]">
                          <td className="px-5 py-4">
                            {canExpand && (
                              <button
                                onClick={() => toggleExpand(pay)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              >
                                {isExpanded ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                              </button>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <span className="rounded-xl bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#4663ff]">
                              #{pay.id}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <PaymentFlow payment={pay} />
                          </td>

                          <td className="px-5 py-4 text-slate-500">
                            {pay?.date?.slice(0, 10) ||
                              pay?.createdAt?.slice(0, 10)}
                          </td>

                          <td className="px-5 py-4 text-right">
                            <div
                              className={` ${
                                pay.type === "income"
                                  ? "text-emerald-700"
                                  : "text-red-600"
                              }`}
                            >
                              {formatMoney(pay.amount, primaryCurrency)}
                            </div>
                            {pay.fund_currency_code &&
                              pay.amount_fund_currency !== pay.amount && (
                                <div className="text-xs font-semibold text-slate-400">
                                  {formatMoney(
                                    pay.amount_fund_currency,
                                    pay.fund_currency_code,
                                    pay.fund_currency_symbol,
                                  )}
                                </div>
                              )}
                          </td>

                          <td className="px-5 py-4 text-right text-xs font-semibold text-slate-500">
                            {rateDiffers ? (
                              <>
                                <div>{pay.exchange_rate}</div>
                                <div className="text-slate-400">
                                  ({pay.effective_rate})
                                </div>
                              </>
                            ) : (
                              <div>{pay.exchange_rate}</div>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <AllocationBadge payment={pay} />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-1">
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

                        {isExpanded && (
                          <tr className="bg-[#f8faff]/60">
                            <td colSpan="8" className="px-5 py-4">
                              {isLoadingAlloc ? (
                                <div className="text-sm text-slate-500">
                                  {t("common.loading")}
                                </div>
                              ) : allocations && allocations.length > 0 ? (
                                <div className="space-y-2">
                                  {allocations.map((alloc) => (
                                    <div
                                      key={alloc.id}
                                      className="flex items-center justify-between rounded-xl border border-[#e5ebff] bg-white px-4 py-2 text-sm"
                                    >
                                      <span className="font-semibold text-slate-600">
                                        {alloc.invoice_type} #{alloc.invoice_id}
                                      </span>
                                      <span className="font-black text-slate-900">
                                        {money(alloc.amount)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500">
                                  {t(
                                    "screens.payments.noAllocations",
                                    "No allocations recorded for this payment.",
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
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
