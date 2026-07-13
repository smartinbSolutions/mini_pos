import React, { useMemo, useState } from "react";
import useFundList from "../hooks/useFundList";
import {
  Edit2,
  Trash2,
  Eye,
  CloudSync,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatMoney } from "../../../../Global/FormatNumber";
import { ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import FundTransferModal from "./FundTransferModal";
import AddFundPayment from "../../Payment/components/AddFundPayment";
import FundListHeader from "./FundListHeader";

const FundList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    saving,
    funds,
    refetch,
    handleDeleteFund,
    submitDraft,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
    currencies,
    actionError,
    setActionError,
    setOpenTransferModal,
    openTransferModal,
  } = useFundList();

  const [search, setSearch] = useState("");
  const [deleteFund, setDeleteFund] = useState(null);

  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  const [paymentMode, setPaymentMode] = useState("out");

  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur overflow-hidden";
  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-4 py-2.5 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10 disabled:bg-slate-100 disabled:text-slate-500";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

  const handleOpenPayment = (fund, mode) => {
    setSelectedFund(fund);
    setPaymentMode(mode);
    setOpenPaymentModal(true);
  };

  const filteredFunds = useMemo(() => {
    return (funds || []).filter((f) =>
      `${f.name} ${f.currency_code}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [funds, search]);

  return (
    <div className={pageClass}>
      <div className="max-w-6xl mx-auto">
        <div className={panelClass}>
          <FundListHeader
            eyebrow={t("ui.setup")}
            title={t("screens.funds.title")}
            subtitle={t("screens.funds.subtitle")}
            accountCount={funds.length}
            accountsLabel={t("screens.funds.accounts")}
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={t("screens.funds.searchFunds")}
            createTitle={t("screens.funds.createTitle")}
            createSubtitle={t("screens.funds.createSubtitle")}
            draft={draft}
            setDraft={setDraft}
            currencies={currencies}
            onSubmit={submitDraft}
            saving={saving}
            actionError={actionError}
            setActionError={setActionError}
            submitLabel={t("screens.funds.createButton")}
            t={t}
          />

          {filteredFunds.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-10">
              {t("screens.funds.noFunds")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-start text-sm">
                <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 text-start">{t("ui.name")}</th>
                    <th className="px-5 py-4 text-start">{t("ui.currency")}</th>
                    <th className="px-5 py-4 text-start">{t("ui.balance")}</th>
                    <th className="px-5 py-4 text-start">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#eef1ff]">
                  {filteredFunds.map((fund) => {
                    if (editingId === fund.id) {
                      return (
                        <tr key={fund.id} className="bg-[#f8faff]">
                          <td className="px-5 py-3 text-start" colSpan={4}>
                            <form
                              onSubmit={submitEdit}
                              className="flex flex-wrap items-center gap-2"
                            >
                              <input
                                required
                                value={editing.name}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    name: e.target.value,
                                  })
                                }
                                className={`${inputClass} flex-1 min-w-[160px]`}
                                placeholder={t("screens.funds.namePlaceholder")}
                              />

                              <select
                                required
                                value={editing.currency_id || ""}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    currency_id: Number(e.target.value),
                                  })
                                }
                                disabled
                                className={`${inputClass} min-w-[140px]`}
                              >
                                <option value="">{t("ui.currency")}</option>
                                {currencies.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} ({c.code})
                                  </option>
                                ))}
                              </select>

                              <input
                                required
                                type="number"
                                value={editing.balance || ""}
                                onChange={(e) =>
                                  setEditing({
                                    ...editing,
                                    balance: Number(e.target.value),
                                  })
                                }
                                disabled
                                className={`${inputClass} min-w-[140px]`}
                                placeholder={t("ui.balance")}
                              />

                              <button className="flex items-center gap-1.5 rounded-xl bg-[#4663ff] px-3 py-2 text-xs font-bold text-white hover:bg-[#3854e8]">
                                {t("common.save")}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="rounded-xl border border-[#dbe4ff] bg-white p-2 text-slate-500 hover:bg-[#eef3ff]"
                              >
                                <span>&times;</span>
                              </button>
                            </form>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={fund.id}
                        className="transition hover:bg-[#f8faff]"
                      >
                        <td className="px-5 py-3 text-start">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4663ff] text-xs font-bold text-white shadow-md shadow-[#4663ff]/20">
                              {fund.name?.charAt(0)?.toUpperCase() || "F"}
                            </div>
                            <span className="font-bold text-slate-900">
                              {fund.name}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-start text-slate-500">
                          {fund.currency_code}
                        </td>
                        <td className="px-5 py-3 text-start">
                          <span className="font-black tabular-nums text-emerald-600">
                            {formatMoney(fund.balance || 0, fund)}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-start">
                          <div className="flex justify-start gap-1">
                            <button
                              onClick={() => navigate(`/fund/${fund.id}`)}
                              className="rounded-xl p-2 text-[#4663ff] transition hover:bg-[#eef3ff]"
                              title={t("screens.funds.viewMovements")}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenPayment(fund, "out")}
                              className="rounded-xl p-2 text-red-600 transition hover:bg-red-50"
                              title={t("screens.payments.payment_expense")}
                            >
                              <ArrowUpRight size={16} />
                            </button>
                            <button
                              onClick={() => handleOpenPayment(fund, "in")}
                              className="rounded-xl p-2 text-emerald-600 transition hover:bg-emerald-50"
                              title={t("screens.payments.receipt_deposit")}
                            >
                              <ArrowDownLeft size={16} />
                            </button>
                            <button
                              onClick={() => setOpenTransferModal(fund)}
                              className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              title={t("screens.funds.fund_transfer")}
                            >
                              <CloudSync size={16} />
                            </button>
                            <button
                              onClick={() => startEdit(fund)}
                              className="rounded-xl p-2 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              title={t("common.edit")}
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setDeleteFund(fund)}
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
            </div>
          )}
        </div>
      </div>

      <DeleteModal
        open={Boolean(deleteFund)}
        onClose={() => setDeleteFund(null)}
        onConfirm={async () => {
          await handleDeleteFund(deleteFund);
          setDeleteFund(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />

      <FundTransferModal
        isOpen={Boolean(openTransferModal)}
        onClose={() => setOpenTransferModal(false)}
        refetchList={refetch}
        lockedFromFundId={openTransferModal?.id}
      />

      {openPaymentModal && (
        <AddFundPayment
          isOpen={openPaymentModal}
          onClose={() => {
            setOpenPaymentModal(false);
            setSelectedFund(null);
          }}
          mode={paymentMode}
          initialFundId={selectedFund?.id}
          refetchList={() => {
            refetch?.();
          }}
        />
      )}

      <ToastContainer />
    </div>
  );
};

export default FundList;
