import React from "react";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  CalendarDays,
  ArrowLeft,
  FileSpreadsheet,
  FileText,
  X,
  AlertCircle,
  ArrowRight,
} from "lucide-react";

import useFundHistory from "../hooks/useFundHistory";
import { formatMoney } from "../../../../Global/FormatNumber";
import { useTranslation } from "react-i18next";
import GoTo from "../../../../Global/GoTo";
import Pagination from "../../../../Global/Pagination";
import ExportModal from "../../../../Global/ExportModal";

const FundMovementsPage = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const BackArrowIcon = isRtl ? ArrowRight : ArrowLeft;
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    history,
    fund,
    loading,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    totalIn,
    totalOut,
    dateRange,
    updateDateRange,
    clearDateRange,
    exporting,
    exportError,
    exportExcel,
    exportPdf,
  } = useFundHistory(id);
  console.log(history);
  const fundCurrency = fund || {};
  const finalBalance = history[0]?.running_balance || 0;
  const hasDateFilter = Boolean(dateRange.startDate || dateRange.endDate);
  const [showExportModal, setShowExportModal] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f6f8fc] to-[#eef2f7] p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* HEADER */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-gray-600 transition hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 active:scale-95"
              aria-label={t("common.back")}
            >
              <BackArrowIcon size={24} strokeWidth={2.3} />
            </button>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {fund?.name || t("screens.fundMovements.title")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("screens.fundMovements.subtitle")}
              </p>
            </div>
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

        {/* DATE FILTER + EXPORT BAR */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <CalendarDays size={15} className="text-[#4663ff]" />
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => updateDateRange({ startDate: e.target.value })}
                className="bg-transparent text-sm text-gray-700 outline-none"
              />
              <span className="text-gray-400">–</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => updateDateRange({ endDate: e.target.value })}
                className="bg-transparent text-sm text-gray-700 outline-none"
              />
              {hasDateFilter && (
                <button
                  onClick={clearDateRange}
                  className="ml-1 rounded-lg p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {exportError && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                <AlertCircle size={13} />
                {exportError}
              </span>
            )}

            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-bold text-gray-700 transition hover:bg-gray-100"
            >
              <FileSpreadsheet size={16} />
              {t("common.export", "Export")}
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b text-xs uppercase tracking-wide text-gray-500 font-semibold">
            <div className="col-span-4 text-start">{t("ui.description")}</div>
            <div className="col-span-2 text-start">{t("ui.type")}</div>
            <div className="col-span-2 text-start">{t("ui.amount")}</div>
            <div className="col-span-2 text-start">
              {t("ui.runningBalance")}
            </div>
            <div className="col-span-2 text-start">{t("ui.date")}</div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400">
              {t("screens.fundMovements.loading")}
            </div>
          ) : history.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              {t("screens.fundMovements.empty")}
            </div>
          ) : (
            <div className="divide-y">
              {history.map((item) => {
                const isIn = item.movement_type === "in";
                const rateDiffers =
                  item.exchange_rate != null &&
                  item.effective_rate != null &&
                  item.exchange_rate !== item.effective_rate;

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 gap-4 px-6 py-5 hover:bg-gray-50 transition items-center"
                  >
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

                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900">
                          {item.note || t("screens.fundMovements.fundMovement")}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-400">
                          {item.party_name && (
                            <GoTo type={item.party_type} id={item.party_id}>
                              {item.party_name}
                            </GoTo>
                          )}

                          {item.transaction_type && (
                            <GoTo
                              type={item.transaction_type}
                              id={item.transaction_id}
                            >
                              {item.transaction_type} #{item.transaction_id}
                            </GoTo>
                          )}

                          {rateDiffers && (
                            <span className="text-gray-300">
                              {t("ui.rate")}: {item.exchange_rate} (
                              {item.effective_rate})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          isIn
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {isIn ? t("ui.in") : t("ui.out")}
                      </span>
                    </div>

                    <div
                      className={`col-span-2 text-start text-lg font-bold ${
                        isIn ? "text-green-600" : "text-red-500"
                      }`}
                    >
                      {isIn ? "+" : "-"}
                      {formatMoney(item.amount, fundCurrency)}
                    </div>

                    <div className="col-span-2 text-start">
                      <div className="inline-flex items-start gap-2 bg-gray-100 px-3 py-2 rounded-xl">
                        <Wallet size={15} className="text-gray-500" />
                        <span className="font-semibold text-gray-800">
                          {formatMoney(item.running_balance, fundCurrency)}
                        </span>
                      </div>
                    </div>

                    <div className="col-span-2 text-start text-sm text-gray-500 flex items-start gap-2">
                      <CalendarDays size={15} />
                      {item?.date?.slice(0, 10)}
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
            onLimitChange={(newLimit) => {
              setLimit(newLimit);
              setPage(1);
            }}
          />
        </div>
      </div>
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        onExportExcel={(range) => exportExcel(range)}
        onExportPdf={(range) => exportPdf(range)}
        exporting={exporting}
        exportError={exportError}
        title={t("screens.fundMovements.exportTitle", "Export Fund Movements")}
      />
    </div>
  );
};

export default FundMovementsPage;
