import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import usePayment from "../hooks/usePayment";
import useDeletedPayments from "../hooks/useDeletedPayments";
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
  Eye,
  Archive,
} from "lucide-react";
import { formatMoney } from "../../../../Global/FormatNumber";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useNavigate } from "react-router-dom";

const AllocationBadge = ({ payment }) => {
  const { t } = useTranslation();

  if (payment.party_type === "partner") {
    return (
      <span className="rounded-lg text-start bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">
        {t("screens.payments.partnerMovement")}
      </span>
    );
  }

  if (!payment.allocation_count || payment.allocation_count === 0) {
    return (
      <span className="rounded-lg text-start bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        {t("screens.payments.unallocated")}
      </span>
    );
  }

  if (payment.allocated_amount < payment.amount) {
    return (
      <span className="rounded-lg text-start bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
        {t("screens.payments.partial")}
      </span>
    );
  }

  return (
    <span className="rounded-lg text-start bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
      {t("screens.payments.fullyAllocated")}
    </span>
  );
};

const PaymentFlow = ({ payment, dir = "ltr" }) => {
  const isIncome = payment.type === "income";
  const isRTL = dir === "rtl";

  const partyLabel = payment.party_name || "-";
  const fundLabel = payment.fund_name || "-";

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  const from = isIncome ? partyLabel : fundLabel;
  const to = isIncome ? fundLabel : partyLabel;

  return (
    <div
      className={`flex items-center gap-2 ${isRTL ? "flex-row" : ""}`}
      dir={dir}
    >
      <span
        className={`font-bold ${
          isIncome ? "text-slate-700" : "text-slate-900"
        }`}
      >
        {from}
      </span>

      <Arrow
        size={14}
        className={`${isIncome ? "text-emerald-500" : "text-red-500"} shrink-0`}
      />

      <span
        className={`font-bold ${
          isIncome ? "text-slate-900" : "text-slate-700"
        }`}
      >
        {to}
      </span>

      {isIncome ? (
        <TrendingUp size={14} className="text-emerald-500 shrink-0" />
      ) : (
        <TrendingDown size={14} className="text-red-500 shrink-0" />
      )}
    </div>
  );
};

const PaymentList = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();

  const [view, setView] = useState("active"); // "active" | "deleted"

  const {
    payments = [],
    summary,
    loading: activeLoading,
    actionError: activeActionError,
    refetch: refetchActive,
    handleDeletePayment,
    page: activePage,
    setPage: setActivePage,
    limit: activeLimit,
    setLimit: setActiveLimit,
    total: activeTotal,
    totalPages: activeTotalPages,
    filters: activeFilters,
    setFilters: setActiveFilters,
  } = usePayment();

  const {
    deletedPayments = [],
    loading: deletedLoading,
    actionError: deletedActionError,
    refetch: refetchDeleted,
    page: deletedPage,
    setPage: setDeletedPage,
    limit: deletedLimit,
    setLimit: setDeletedLimit,
    total: deletedTotal,
    totalPages: deletedTotalPages,
    filters: deletedFilters,
    setFilters: setDeletedFilters,
  } = useDeletedPayments();

  const isDeletedView = view === "deleted";

  // Whichever dataset is active drives the table
  const rows = isDeletedView ? deletedPayments : payments;
  const loading = isDeletedView ? deletedLoading : activeLoading;
  const actionError = isDeletedView ? deletedActionError : activeActionError;
  const refetch = isDeletedView ? refetchDeleted : refetchActive;
  const page = isDeletedView ? deletedPage : activePage;
  const setPage = isDeletedView ? setDeletedPage : setActivePage;
  const limit = isDeletedView ? deletedLimit : activeLimit;
  const setLimit = isDeletedView ? setDeletedLimit : setActiveLimit;
  const total = isDeletedView ? deletedTotal : activeTotal;
  const totalPages = isDeletedView ? deletedTotalPages : activeTotalPages;
  const filters = isDeletedView ? deletedFilters : activeFilters;
  const setFilters = isDeletedView ? setDeletedFilters : setActiveFilters;

  const { primaryCurrency } = usePrimaryCurrency();

  const [deletePaymentId, setDeletePaymentId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});
  const [allocationsByPayment, setAllocationsByPayment] = useState({});
  const [loadingAllocations, setLoadingAllocations] = useState({});
  const [funds, setFunds] = useState([]);

  const api = window.api;

  useEffect(() => {
    if (api?.getFunds) {
      api
        .getFunds()
        .then((res) => setFunds(res?.data || res || []))
        .catch(() => setFunds([]));
    }
  }, [api]);
  const { money } = usePrimaryCurrency();

  const filteredPayments = rows.filter((pay) => {
    const partyName = pay.party_name?.toLowerCase() || "";
    const paymentId = String(isDeletedView ? pay.payment_id : pay.id);
    const query = searchQuery.toLowerCase();
    return partyName.includes(query) || paymentId.includes(query);
  });

  const toggleExpand = async (payment) => {
    const rowId = isDeletedView ? payment.deleted_payment_id : payment.id;
    const isExpanded = expandedRows[rowId];

    setExpandedRows((prev) => ({ ...prev, [rowId]: !isExpanded }));

    if (isDeletedView) {
      // Allocations already came back with the snapshot, nothing to fetch
      return;
    }

    if (!isExpanded && !allocationsByPayment[rowId]) {
      setLoadingAllocations((prev) => ({ ...prev, [rowId]: true }));
      try {
        const res = await api.getPaymentAllocations(payment.id);
        setAllocationsByPayment((prev) => ({
          ...prev,
          [rowId]: res || [],
        }));
      } catch (err) {
        console.error("Failed to load allocations:", err);
        setAllocationsByPayment((prev) => ({ ...prev, [rowId]: [] }));
      } finally {
        setLoadingAllocations((prev) => ({ ...prev, [rowId]: false }));
      }
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters({ [field]: value || null });
  };

  const handleViewChange = (nextView) => {
    setView(nextView);
    setSearchQuery("");
    setExpandedRows({});
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== null && value !== ""
  );

  const clearFilters = () => {
    setFilters({
      type: null,
      party_type: null,
      invoice_type: null,
      fund_id: null,
      dateFrom: null,
      dateTo: null,
    });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-2 text-xs font-bold uppercase  text-[#4663ff]">
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
                  {t("screens.payments.count_income", {
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
                  {t("screens.payments.count_expense", {
                    count: summary.expense_count,
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e5ebff] bg-white/60 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
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

              <div className="inline-flex h-12 items-center rounded-2xl border border-[#dbe4ff] bg-white p-1">
                <button
                  onClick={() => handleViewChange("active")}
                  className={`inline-flex h-full items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                    !isDeletedView
                      ? "bg-[#4663ff] text-white"
                      : "text-slate-500 hover:text-[#4663ff]"
                  }`}
                >
                  <Receipt size={15} />
                  {t("screens.payments.activeTab")}
                </button>
                <button
                  onClick={() => handleViewChange("deleted")}
                  className={`inline-flex h-full items-center gap-2 rounded-xl px-4 text-sm font-bold transition ${
                    isDeletedView
                      ? "bg-[#4663ff] text-white"
                      : "text-slate-500 hover:text-[#4663ff]"
                  }`}
                >
                  <Archive size={15} />
                  {t("screens.payments.deletedTab")}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-11 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                  {t("common.clear")}
                </button>
              )}
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition ${
                  showFilters
                    ? "border-[#4663ff] bg-[#eef3ff] text-[#4663ff]"
                    : "border-[#dbe4ff] bg-white text-slate-600 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                }`}
              >
                <Filter size={16} />
                {t("common.filters")}
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
                <option value="">{t("screens.payments.all_types")}</option>
                <option value="income">{t("screens.payments.income")}</option>
                <option value="expense">{t("screens.payments.expense")}</option>
              </select>

              <select
                value={filters.party_type || ""}
                onChange={(e) =>
                  handleFilterChange("party_type", e.target.value)
                }
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              >
                <option value="">{t("screens.payments.all_parties")}</option>
                <option value="customer">{t("ui.customer")}</option>
                <option value="supplier">{t("ui.supplier")}</option>
                <option value="partner">{t("ui.partner")}</option>
                <option value="other">{t("ui.other")}</option>
              </select>

              <select
                value={filters.invoice_type || ""}
                onChange={(e) =>
                  handleFilterChange("invoice_type", e.target.value)
                }
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              >
                <option value="">
                  {t("screens.payments.allInvoiceTypes")}
                </option>
                <option value="sales">{t("ui.sales")}</option>
                <option value="purchase">{t("ui.purchase")}</option>
                <option value="expense">{t("ui.expense")}</option>
              </select>

              <select
                value={filters.fund_id || ""}
                onChange={(e) => handleFilterChange("fund_id", e.target.value)}
                className="h-11 rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]"
              >
                <option value="">{t("screens.payments.allFunds")}</option>
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

        {isDeletedView && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
            {t("screens.payments.deletedNotice")}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] text-start text-sm">
              <thead className="bg-[#f8faff] text-xs font-bold uppercase  text-slate-500">
                <tr>
                  <th className="w-10 px-5 py-4"></th>
                  <th className="px-5 py-4 text-start">
                    {t("screens.payments.paymentNo")}
                  </th>
                  <th className="px-5 py-4 text-start">
                    {t("screens.payments.flow")}
                  </th>
                  <th className="px-5 py-4 text-start">{t("ui.date")}</th>
                  <th className="px-5 py-4 text-start">{t("ui.amount")}</th>
                  <th className="px-5 py-4 text-start">
                    {t("screens.payments.rate")}
                  </th>
                  {isDeletedView ? (
                    <th className="px-5 py-4 text-start">
                      {t("screens.payments.deletedInfo")}
                    </th>
                  ) : (
                    <th className="px-5 py-4 text-start">
                      {t("screens.payments.allocation")}
                    </th>
                  )}
                  <th className="px-5 py-4 text-start">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e5ebff]">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-start text-slate-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="p-8 text-start text-slate-500">
                      {isDeletedView
                        ? t("screens.payments.emptyDeleted")
                        : t("screens.payments.empty")}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((pay) => {
                    const rowId = isDeletedView
                      ? pay.deleted_payment_id
                      : pay.id;
                    const displayId = isDeletedView ? pay.payment_id : pay.id;
                    const canExpand = pay.party_type !== "partner";
                    const isExpanded = expandedRows[rowId];
                    const allocations = isDeletedView
                      ? pay.allocations
                      : allocationsByPayment[rowId];
                    const isLoadingAlloc = loadingAllocations[rowId];
                    const rateDiffers =
                      pay.exchange_rate !== pay.effective_rate;

                    return (
                      <React.Fragment key={rowId}>
                        <tr
                          className={`transition hover:bg-[#f8faff] ${
                            isDeletedView ? "opacity-75" : ""
                          }`}
                        >
                          <td className="px-5 py-4 text-start">
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

                          <td className="px-5 py-4 text-start">
                            {isDeletedView ? (
                              <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-500">
                                #{displayId}
                              </span>
                            ) : (
                              <span
                                onClick={() => navigate(`/payments/${pay.id}`)}
                                className="cursor-pointer rounded-xl bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#4663ff] transition hover:bg-[#dbe4ff]"
                              >
                                #{displayId}
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <PaymentFlow
                              payment={pay}
                              dir={isRtl ? "rtl" : "ltr"}
                            />
                          </td>

                          <td className="px-5 py-4 text-start text-slate-500">
                            {pay?.date?.slice(0, 10) ||
                              pay?.createdAt?.slice(0, 10)}
                          </td>

                          <td className="px-5 py-4 text-start">
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
                                    pay.fund_currency_symbol
                                  )}
                                </div>
                              )}
                          </td>

                          <td className="px-5 py-4 text-start text-xs font-semibold text-slate-500">
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

                          {isDeletedView ? (
                            <td className="px-5 py-4 text-start text-xs font-semibold text-slate-500">
                              <div className="text-slate-700">
                                {pay.deleted_by_name || "-"}
                              </div>
                              <div className="text-slate-400">
                                {pay.deletedAt?.slice(0, 16)}
                              </div>
                            </td>
                          ) : (
                            <td className="px-5 py-4">
                              <AllocationBadge payment={pay} />
                            </td>
                          )}

                          <td className="px-5 py-4">
                            <div className="flex justify-start gap-1">
                              {isDeletedView ? (
                                <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-400">
                                  {t("screens.payments.deleted")}
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      navigate(`/payments/${pay.id}`)
                                    }
                                    className="rounded-xl p-2 text-[#4663ff] hover:bg-[#eef3ff]"
                                    title={t("common.view")}
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button
                                    onClick={() => setDeletePaymentId(pay)}
                                    className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                                    title={t("common.delete")}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#f8faff]/60">
                            <td colSpan="8" className="px-5 py-4 text-start">
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
                                  {t("screens.payments.noAllocations")}
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
