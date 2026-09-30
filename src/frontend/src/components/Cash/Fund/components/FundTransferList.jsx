import React, { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Eye,
  CalendarDays,
  Search,
  Filter,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import useFundTransfersList from "../hooks/useFundTransfersList";
import DeleteModal from "../../../../Global/DeleteModel";
import Pagination from "../../../../Global/Pagination";
import FundTransferModal from "./FundTransferModal";
import GoTo from "../../../../Global/GoTo";
import { formatMoney } from "../../../../Global/FormatNumber";
import { useNavigate } from "react-router-dom";

const FundTransferList = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();

  const {
    transfers,
    loading,
    actionError,
    handleDeleteTransfer,
    refetch,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,

    search,
    setSearch,
    filters,
    setFilters,
    clearFilters,
    funds,
  } = useFundTransfersList();

  const [deleteTransfer, setDeleteTransfer] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== null && value !== "",
  );

  const openCreateModal = () => {
    setSelectedTransfer(null);
    setOpenTransferModal(true);
  };

  const openEditModal = (transfer) => {
    setSelectedTransfer(transfer);
    setOpenTransferModal(true);
  };

  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";
  const filterInputClass =
    "h-11 w-full rounded-xl border border-[#dbe4ff] bg-white px-3 text-sm outline-none focus:border-[#4663ff]";

  const FlowArrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className={pageClass}>
      <div className="mx-auto max-w-6xl space-y-5">
        {/* HERO */}
        <section className={panelClass}>
          <div className="flex items-center justify-between gap-4 p-7">
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-[#4663ff]">
                {t("ui.setup")}
              </p>
              <h1 className="text-3xl font-black leading-tight text-slate-950">
                {t("screens.transfer.title")}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                {t("screens.transfer.subtitle")}
              </p>
            </div>

            <button onClick={openCreateModal} className={primaryButtonClass}>
              <ArrowRightLeft size={16} />
              {t("screens.transfer.newTransfer")}
            </button>
          </div>

          {/* TOOLBAR — search + filters */}
          <div className="flex flex-col gap-3 border-t border-[#e5ebff] bg-white/60 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative max-w-md flex-1">
              <Search className="absolute start-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t("common.search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[#dbe4ff] bg-white ps-11 pe-4 text-sm outline-none transition focus:border-[#4663ff] focus:ring-2 focus:ring-[#4663ff]/10"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="h-12 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-bold text-red-600 transition hover:bg-red-100"
                >
                  {t("common.clear")}
                </button>
              )}
              <button
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition ${
                  showFilters || hasActiveFilters
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

          {/* FILTER BAR — stays open while any filter is active */}
          {(showFilters || hasActiveFilters) && (
            <div className="grid grid-cols-1 gap-3 border-t border-[#e5ebff] bg-white/60 p-5 sm:grid-cols-3">
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {t("ui.fund")}
                </span>
                <select
                  value={filters.fundId || ""}
                  onChange={(e) =>
                    setFilters({ fundId: e.target.value || null })
                  }
                  className={filterInputClass}
                >
                  <option value="">{t("screens.payments.allFunds")}</option>
                  {funds.map((fund) => (
                    <option key={fund.id} value={fund.id}>
                      {fund.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {t("filters.dateFrom")}
                </span>
                <input
                  type="date"
                  value={filters.dateFrom || ""}
                  max={filters.dateTo || undefined}
                  onChange={(e) =>
                    setFilters({ dateFrom: e.target.value || null })
                  }
                  className={filterInputClass}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {t("filters.dateTo")}
                </span>
                <input
                  type="date"
                  value={filters.dateTo || ""}
                  min={filters.dateFrom || undefined}
                  onChange={(e) =>
                    setFilters({ dateTo: e.target.value || null })
                  }
                  className={filterInputClass}
                />
              </label>
            </div>
          )}

          {actionError && (
            <div className="mx-7 mb-5 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {actionError}
            </div>
          )}
        </section>

        {/* LIST */}
        <section className={panelClass}>
          {loading && transfers.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-slate-400">
              {t("common.loading")}
            </div>
          ) : transfers.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-14 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eef3ff] text-[#4663ff]">
                <ArrowRightLeft size={22} />
              </div>
              <p className="font-bold text-slate-600">
                {t("screens.transfer.noTransfers")}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eef1ff]">
              {transfers.map((tr) => {
                const isCrossCurrency =
                  tr.from_fund_currency !== tr.to_fund_currency;
                const rateDiffers =
                  Number(tr.effective_rate) !== Number(tr.exchange_rate);

                return (
                  <div
                    key={tr.id}
                    className="flex flex-col gap-4 px-6 py-5 transition hover:bg-[#f8faff] lg:flex-row lg:items-center lg:justify-between"
                  >
                    {/* FLOW — the focal point: two amounts either side of an arrow */}
                    <div className="flex flex-1 items-center gap-4">
                      <div className="flex-1 rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3">
                        <GoTo type="fund" id={tr.from_fund_id}>
                          <p className="truncate font-bold text-slate-900">
                            {tr.from_fund_name}
                          </p>
                        </GoTo>
                        <p className="mt-0.5 text-lg font-black tabular-nums text-red-600">
                          -{formatMoney(tr.deduct_amount)}{" "}
                          <span className="text-xs font-bold text-red-400">
                            {tr.from_fund_currency}
                          </span>
                        </p>
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef3ff] text-[#4663ff]">
                        <FlowArrow size={18} />
                      </div>

                      <div className="flex-1 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
                        <GoTo type="fund" id={tr.to_fund_id}>
                          <p className="truncate font-bold text-slate-900">
                            {tr.to_fund_name}
                          </p>
                        </GoTo>
                        <p className="mt-0.5 text-lg font-black tabular-nums text-emerald-700">
                          +{formatMoney(tr.receive_amount)}{" "}
                          <span className="text-xs font-bold text-emerald-500">
                            {tr.to_fund_currency}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* META — rate, date, note */}
                    <div className="flex flex-col gap-1.5 lg:w-64 lg:shrink-0">
                      {isCrossCurrency && (
                        <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-xs">
                          <span className="font-semibold text-slate-400">
                            {t("ui.fundRate", "Rate")}
                          </span>
                          <span className="font-bold tabular-nums text-slate-700">
                            {Number(tr.exchange_rate).toFixed(4)}
                            {rateDiffers && (
                              <span className="ms-1.5 text-[#4663ff]">
                                ({Number(tr.effective_rate).toFixed(4)})
                              </span>
                            )}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                        <CalendarDays size={12} />
                        {tr.date ? new Date(tr.date).toLocaleString() : "-"}
                      </div>

                      {tr.note && (
                        <p className="truncate text-xs italic text-slate-400">
                          {tr.note}
                        </p>
                      )}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => navigate(`/funds/transfers/${tr.id}`)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-[#4663ff] transition hover:bg-[#eef3ff]"
                        title={t("common.view")}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(tr)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        title={t("common.edit")}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTransfer(tr)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl text-red-500 transition hover:bg-red-50"
                        title={t("common.delete")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            total={total}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={setLimit}
          />
        </section>
      </div>

      <FundTransferModal
        isOpen={openTransferModal}
        onClose={() => {
          setOpenTransferModal(false);
          setSelectedTransfer(null);
        }}
        transfer={selectedTransfer}
        refetchList={refetch}
      />

      <DeleteModal
        open={Boolean(deleteTransfer)}
        onClose={() => setDeleteTransfer(null)}
        onConfirm={async () => {
          await handleDeleteTransfer(deleteTransfer);
          setDeleteTransfer(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
    </div>
  );
};

export default FundTransferList;
