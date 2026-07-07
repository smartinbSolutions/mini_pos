import React, { useState } from "react";
import useFundList from "../hooks/useFundList";
import {
  Edit2,
  Plus,
  Save,
  Trash2,
  X,
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

const FundList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    saving,
    funds,
    handleDeleteFund,
    startEdit,
    submitEdit,
    setEditing,
    editing,
    setEditingId,
    editingId,
    setDraft,
    draft,
    submitDraft,
    currencies,
    actionError,
    setOpenTransferModal,
    openTransferModal,
    refetch,
  } = useFundList();

  const [deleteFund, setDeleteFund] = useState(null);

  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);
  const [paymentMode, setPaymentMode] = useState("out");

  const pageClass =
    "min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900";
  const panelClass =
    "rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur";
  const inputClass =
    "rounded-xl border border-[#dbe4ff] bg-white/90 px-4 py-2.5 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10 disabled:bg-slate-100 disabled:text-slate-500";
  const primaryButtonClass =
    "flex items-center justify-center gap-2 rounded-xl bg-[#4663ff] py-2.5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:opacity-50";

  const handleOpenPayment = (fund, mode) => {
    setSelectedFund(fund);
    setPaymentMode(mode);
    setOpenPaymentModal(true);
  };

  return (
    <div className={pageClass}>
      <div className="max-w-6xl mx-auto grid xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div className={`${panelClass} flex items-center justify-between`}>
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                {t("ui.setup")}
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                {t("screens.funds.title")}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {t("screens.funds.subtitle")}
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-black text-[#4663ff]">
                {funds.length}
              </div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t("screens.funds.accounts")}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {funds.map((fund) =>
              editingId === fund.id ? (
                <form
                  key={fund.id}
                  onSubmit={submitEdit}
                  className="space-y-3 rounded-2xl border border-[#cbd7ff] bg-[#f8faff] p-5 shadow-sm"
                >
                  <input
                    required
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                    className={`w-full ${inputClass}`}
                    placeholder={t("screens.funds.namePlaceholder")}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      required
                      value={editing.currency_id || ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          currency_id: Number(e.target.value),
                        })
                      }
                      disabled={true}
                      className={inputClass}
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
                      disabled={true}
                      className={inputClass}
                      placeholder={t("ui.balance")}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button className={`flex-1 ${primaryButtonClass}`}>
                      <Save size={15} />
                      {t("common.save")}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="rounded-xl border border-[#dbe4ff] bg-white px-4 text-slate-500 hover:bg-[#eef3ff]"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </form>
              ) : (
                <div
                  key={fund.id}
                  className="group flex items-center justify-between rounded-2xl border border-[#e5ebff] bg-white p-5 shadow-sm transition hover:-translate-y-[2px] hover:border-[#cbd7ff] hover:shadow-lg hover:shadow-[#4663ff]/10"
                >
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-slate-900">
                      {fund.name}
                    </div>

                    <div className="text-xs font-semibold text-[#4663ff]">
                      {fund.currency_code}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm text-slate-400">
                        {t("ui.balance")}
                      </div>
                      <div className="text-xl font-black text-emerald-600">
                        {formatMoney(fund.balance || 0, fund)}
                      </div>
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition">
                      <button
                        onClick={() => navigate(`/fund/${fund.id}`)}
                        className="rounded-xl p-2 text-[#4663ff] hover:bg-[#eef3ff]"
                        title={t("screens.funds.viewMovements")}
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenPayment(fund, "out")}
                        className="rounded-xl p-2 text-red-600 hover:bg-red-50"
                        title={t("screens.payments.payment_expense")}
                      >
                        <ArrowUpRight size={14} />
                      </button>

                      <button
                        onClick={() => handleOpenPayment(fund, "in")}
                        className="rounded-xl p-2 text-emerald-600 hover:bg-emerald-50"
                        title={t("screens.payments.receipt_deposit")}
                      >
                        <ArrowDownLeft size={14} />
                      </button>

                      <button
                        onClick={() => setOpenTransferModal(fund)}
                        className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                        title={t("screens.funds.fund_transfer")}
                      >
                        <CloudSync size={14} />
                      </button>

                      <button
                        onClick={() => startEdit(fund)}
                        className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                      >
                        <Edit2 size={14} />
                      </button>

                      <button
                        onClick={() => setDeleteFund(fund)}
                        className="p-2 rounded-xl hover:bg-red-50 text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="sticky top-6 h-fit rounded-[28px] border border-white/80 bg-white/80 p-6 shadow-[0_24px_80px_rgba(70,99,255,0.12)] backdrop-blur">
          <h3 className="mb-1 text-lg font-black text-slate-950">
            {t("screens.funds.createTitle")}
          </h3>
          <p className="mb-5 text-sm text-slate-500">
            {t("screens.funds.createSubtitle")}
          </p>
          {actionError && (
            <div className="mb-3 text-sm text-red-600 bg-red-50 border p-2 rounded-lg">
              {actionError}
            </div>
          )}

          <form onSubmit={submitDraft} className="space-y-4">
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className={`w-full ${inputClass}`}
              placeholder={t("screens.funds.namePlaceholder")}
            />

            <select
              required
              value={draft.currency_id || ""}
              onChange={(e) => {
                const selected = currencies.find(
                  (c) => c.id === Number(e.target.value),
                );

                setDraft({
                  ...draft,
                  currency_id: selected?.id || "",
                  currency_code: selected?.code || "",
                  exchange_rate: selected?.exchangeRate || 1,
                });
              }}
              className={`w-full ${inputClass}`}
            >
              <option value="">{t("ui.selectCurrency")}</option>

              {currencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>

            <input
              type="number"
              value={draft.balance || ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  balance: Number(e.target.value),
                })
              }
              className={`w-full ${inputClass}`}
              placeholder={t("screens.funds.initialBalance")}
            />

            <button
              disabled={saving}
              className={`w-full ${primaryButtonClass}`}
            >
              <Plus size={16} />
              {t("screens.funds.createButton")}
            </button>
          </form>
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
        isOpen={openTransferModal}
        onClose={() => setOpenTransferModal(false)}
        refetchList={refetch}
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
