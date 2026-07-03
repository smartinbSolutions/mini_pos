import React, { useMemo, useState } from "react";
import usePurchaseList from "../hooks/usePurchaseList";
import {
  Edit2,
  Eye,
  HandCoins,
  PackagePlus,
  Percent,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import InvoicePaymentModal from "../../../Cash/Payment/components/AddPayment";

const StatusBadge = ({ status, t }) => {
  const isPaid = status === "paid";
  return (
    <span
      className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px]  uppercase tracking-wide ${
        isPaid ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
      }`}
    >
      {isPaid ? t("ui.paid") : t("ui.unpaid")}
    </span>
  );
};

const PurchaseList = () => {
  const { t } = useTranslation();
  const {
    purchaseInvoices,
    loading,
    error,
    refetch,
    deletePurchase,
    selecteInvoice,
    setSelecteInvoice,
    openPaymentModel,
    setOpenPaymentModel,
  } = usePurchaseList();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleteInvoice, setDeleteInvoice] = useState(null);
  const { money } = usePrimaryCurrency();

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return purchaseInvoices;

    return purchaseInvoices.filter((inv) => {
      return [
        inv.id,
        inv.supplier_name,
        inv.supplier_id,
        inv.date,
        inv.total,
        inv.net_total,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [purchaseInvoices, search]);

  const handleDelete = async (id) => {
    try {
      setActionError("");
      await deletePurchase(id);
    } catch (err) {
      console.log(err.message);
      setActionError(t("screens.invoices.deleteFailed"));
    }
  };

  const totalNet = purchaseInvoices.reduce(
    (sum, inv) => sum + Number(inv.net_total || 0),
    0
  );
  const totalTax = purchaseInvoices.reduce(
    (sum, inv) => sum + Number(inv.taxValue || 0),
    0
  );
  const unpaidCount = purchaseInvoices.filter(
    (inv) => inv.status !== "paid"
  ).length;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_460px] lg:items-center">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#eef3ff] px-3 py-1">
                <Receipt size={12} className="text-[#4663ff]" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                  {t("ui.purchase")}
                </span>
              </div>
              <h1 className="text-4xl  leading-tight text-slate-950">
                {t("screens.invoices.purchaseInvoice")}
              </h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-500">
                {t("screens.invoices.purchaseSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              <div className="rounded-2xl border border-[#e5ebff] bg-[#f8faff] px-3 py-3.5">
                <Receipt size={16} className="mb-2 text-[#4663ff]" />
                <div className="text-xl  tabular-nums text-slate-950">
                  {purchaseInvoices.length}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {t("ui.invoices")}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 px-3 py-3.5">
                <HandCoins size={16} className="mb-2 text-amber-600" />
                <div className="text-xl  tabular-nums text-slate-950">
                  {unpaidCount}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {t("ui.open")}
                </div>
              </div>

              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 px-3 py-3.5">
                <Percent size={16} className="mb-2 text-violet-600" />
                <div className="text-xl  tabular-nums text-slate-950">
                  {money(totalTax)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {t("ui.taxCollected")}
                </div>
              </div>

              <div className="rounded-2xl border border-[#4663ff]/20 bg-[#4663ff]/[0.06] px-3 py-3.5">
                <div className="mb-2 text-xs  text-[#4663ff]">NET</div>
                <div className="text-xl  tabular-nums text-[#4663ff]">
                  {money(totalNet)}
                </div>
                <div className="text-[11px] font-semibold text-slate-500">
                  {t("ui.total")}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e5ebff] bg-white/60 p-5 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-12 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 pl-11 pr-4 text-sm outline-none transition focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10"
                placeholder={t("screens.invoices.search")}
              />
            </div>

            <button
              onClick={refetch}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:border-[#cbd7ff] hover:bg-[#eef3ff] hover:text-[#4663ff]"
            >
              <RefreshCw size={16} />
              {t("common.refresh")}
            </button>

            <button
              onClick={() => navigate("/add-purchase")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4663ff] px-5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/25 transition hover:bg-[#3854e8]"
            >
              <PackagePlus size={16} />
              {t("screens.invoices.addInvoice")}
            </button>
          </div>
        </section>

        {(error || actionError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError || error}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">{t("ui.invoice")}</th>
                  <th className="px-5 py-4">{t("ui.supplier")}</th>
                  <th className="px-5 py-4">{t("ui.date")}</th>
                  <th className="px-5 py-4 text-right">{t("ui.subtotal")}</th>
                  <th className="px-5 py-4 text-right">{t("ui.tax")}</th>
                  <th className="px-5 py-4 text-right">{t("ui.net")}</th>
                  <th className="px-5 py-4 text-center">{t("ui.status")}</th>
                  <th className="px-5 py-4 text-right">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e5ebff]">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-center text-slate-500">
                      {t("screens.invoices.empty")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
                    <tr key={inv.id} className="transition hover:bg-[#f8faff]">
                      <td className="px-5 py-4">
                        <span className="rounded-xl bg-[#eef3ff] px-3 py-1.5 text-xs  text-[#4663ff]">
                          #{inv.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {inv.supplier_name || "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-500">{inv.date}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="font-semibold tabular-nums text-slate-700">
                          {money(inv.subtotal || 0)}
                        </div>
                        {Number(inv.discount || 0) > 0 && (
                          <div className="mt-0.5 inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            -{money(inv.discount)} {t("ui.discount")}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-right tabular-nums">
                        {Number(inv.taxValue || 0) > 0 ? (
                          <div>
                            <div className="font-bold text-slate-700">
                              + {money(inv.taxValue)}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-400">
                              {inv.tax}%
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">{money(0)}</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right  tabular-nums text-emerald-700">
                        {money(inv.net_total || 0)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <StatusBadge status={inv.status} t={t} />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => navigate(`/view-purchase/${inv.id}`)}
                            className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                          >
                            <Eye size={16} />
                          </button>
                          {inv.status !== "paid" && (
                            <>
                              <button
                                onClick={() =>
                                  navigate(`/edit-purchase/${inv.id}`)
                                }
                                className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                onClick={() => {
                                  setSelecteInvoice(inv);
                                  setOpenPaymentModel(true);
                                }}
                                className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                              >
                                <HandCoins size={16} />
                              </button>
                              <button
                                onClick={() => setDeleteInvoice(inv)}
                                className="rounded-xl p-2 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <InvoicePaymentModal
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={selecteInvoice}
        party={selecteInvoice?.supplier_id}
        partyName={selecteInvoice?.supplier_name}
        mode="purchase"
        refetchList={refetch}
      />
      <DeleteModal
        open={Boolean(deleteInvoice)}
        onClose={() => setDeleteInvoice(null)}
        onConfirm={async () => {
          await handleDelete(deleteInvoice.id);
          setDeleteInvoice(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
    </div>
  );
};

export default PurchaseList;
