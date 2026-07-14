import React, { useState } from "react";
import {
  ArrowRight,
  ArrowRightLeft,
  Trash2,
  Edit2,
  Plus,
  ArrowLeft,
  Eye,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import useFundTransfersList from "../hooks/useFundTransfersList";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import DeleteModal from "../../../../Global/DeleteModel";
import Pagination from "../../../../Global/Pagination";
import FundTransferModal from "./FundTransferModal";
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
  } = useFundTransfersList();

  const [deleteTransfer, setDeleteTransfer] = useState(null);

  // One modal handles both create and edit — `selectedTransfer` is null
  // for create, or the row being edited.
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);

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

  return (
    <div className={pageClass}>
      <div className="max-w-7xl mx-auto">
        <div className={panelClass}>
          <div className="flex items-center justify-between gap-4 p-6 pb-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                {t("ui.setup")}
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                {t("screens.transfer.title")}
              </h2>
              <p className="text-sm text-slate-500">
                {t("screens.transfer.subtitle")}
              </p>
            </div>

            <button onClick={openCreateModal} className={primaryButtonClass}>
              <ArrowRightLeft size={16} />
              {t("screens.transfer.newTransfer")}
            </button>
          </div>

          {actionError && (
            <div className="mx-6 mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </div>
          )}

          {loading ? (
            <div className="text-center text-gray-400 text-sm py-10">
              {t("common.loading")}
            </div>
          ) : transfers.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-10">
              {t("screens.transfer.noTransfers")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-start">{t("ui.date")}</th>
                    <th className="px-5 py-4 text-start">
                      {t("screens.funds.transfer_Flow") || "Transfer"}
                    </th>
                    <th className="px-5 py-4 text-start">
                      {t("screens.funds.transfer_rate") || "Rate"}
                    </th>
                    <th className="px-5 py-4 text-start">
                      {t("screens.transfer.internal_remarks")}
                    </th>
                    <th className="px-5 py-4 text-start">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef1ff]">
                  {transfers.map((tr) => {
                    const isCrossCurrency =
                      tr.from_fund_currency !== tr.to_fund_currency;

                    return (
                      <tr key={tr.id} className="transition hover:bg-[#f8faff]">
                        <td className="px-5 py-3 text-start text-slate-500 whitespace-nowrap">
                          {tr.date ? new Date(tr.date).toLocaleString() : "-"}
                        </td>

                        <td className="px-5 py-3 text-start">
                          <div
                            className={`flex items-center gap-2 ${
                              isRtl ? "flex-row" : ""
                            }`}
                          >
                            <div className="text-start">
                              <div className="font-bold text-slate-900 text-sm">
                                {tr.from_fund_name}
                              </div>
                              <div className="text-xs text-red-500 font-medium">
                                -{formatMoney(tr.deduct_amount)}{" "}
                                {tr.from_fund_currency}
                              </div>
                            </div>

                            {isRtl ? (
                              <ArrowLeft
                                className="text-indigo-400 shrink-0"
                                size={16}
                              />
                            ) : (
                              <ArrowRight
                                className="text-indigo-400 shrink-0"
                                size={16}
                              />
                            )}

                            <div className="text-start">
                              <div className="font-bold text-slate-900 text-sm">
                                {tr.to_fund_name}
                              </div>
                              <div className="text-xs text-emerald-600 font-medium">
                                +{formatMoney(tr.receive_amount)}{" "}
                                {tr.to_fund_currency}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3 text-start">
                          {isCrossCurrency ? (
                            <div className="text-xs text-gray-500">
                              <div>
                                {t("ui.fundRate") || "Rate"}:{" "}
                                <strong>
                                  {Number(tr.exchange_rate).toFixed(4)}
                                </strong>
                              </div>
                              {Number(tr.effective_rate) !==
                                Number(tr.exchange_rate) && (
                                <div className="text-blue-600">
                                  {t("ui.effectiveRate") || "Effective"}:{" "}
                                  <strong>
                                    {Number(tr.effective_rate).toFixed(4)}
                                  </strong>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>

                        <td className="px-5 py-3 text-start max-w-[220px] truncate text-slate-500">
                          {tr.note || "-"}
                        </td>

                        <td className="px-5 py-3 text-start">
                          <div className="flex justify-start gap-1">
                            <button
                              onClick={() =>
                                navigate(`/funds/transfers/${tr.id}`)
                              }
                              className="rounded-xl p-2 text-[#4663ff] transition hover:bg-[#eef3ff]"
                              title={t("common.view")}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => openEditModal(tr)}
                              className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              title={t("common.edit")}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteTransfer(tr)}
                              className="rounded-xl p-2 text-red-500 transition hover:bg-red-50"
                              title={t("common.delete")}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

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
          )}
        </div>
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
