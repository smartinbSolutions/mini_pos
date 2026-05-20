import React, { useMemo, useState } from "react";
import {
  Edit2,
  Eye,
  HandCoins,
  PackagePlus,
  Receipt,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useSalesList from "../hooks/useSalesList";
import AddPayment from "../../../Cash/Payment/components/AddPayment";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

const SalesList = () => {
  const { t } = useTranslation();
  const {
    salesInvoices,
    loading,
    error,
    refetch,
    deleteSales,
    selecteInvoice,
    setSelecteInvoice,
    openPaymentModel,
    setOpenPaymentModel,
  } = useSalesList();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const { money } = usePrimaryCurrency();

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return salesInvoices;

    return salesInvoices.filter((inv) => {
      return [
        inv.id,
        inv.customer_name,
        inv.customer_id,
        inv.date,
        inv.total,
        inv.net_total,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [salesInvoices, search]);

  const handleDelete = async (id) => {
    try {
      setActionError("");
      await deleteSales(id);
    } catch (err) {
      console.log(err.message);
      setActionError(t("screens.invoices.deleteFailed"));
    }
  };

  const totalNet = salesInvoices.reduce(
    (sum, inv) => sum + Number(inv.net_total || 0),
    0,
  );
  const unpaidCount = salesInvoices.filter(
    (inv) => inv.status !== "paid",
  ).length;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
          <div className="grid gap-6 p-7 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#4663ff]">
                {t("ui.sales")}
              </p>
              <h1 className="text-4xl font-black leading-tight text-slate-950">
                {t("screens.invoices.salesTitle")}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {t("screens.invoices.salesSubtitle")}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <Receipt size={20} className="mb-4 text-[#4663ff]" />
                <div className="text-2xl font-black">
                  {salesInvoices.length}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {t("ui.invoices")}
                </div>
              </div>
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <HandCoins size={20} className="mb-4 text-[#4663ff]" />
                <div className="text-2xl font-black">{unpaidCount}</div>
                <div className="text-xs font-semibold text-slate-500">{t("ui.open")}</div>
              </div>
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <div className="mb-4 text-sm font-black text-[#4663ff]">
                  NET
                </div>
                <div className="text-2xl font-black">{money(totalNet)}</div>
                <div className="text-xs font-semibold text-slate-500">
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
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
            >
              <RefreshCw size={16} />
              {t("common.refresh")}
            </button>

            <button
              onClick={() => navigate("/add-sales")}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4663ff] px-5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8]"
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
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">{t("ui.invoice")}</th>
                  <th className="px-5 py-4">{t("ui.customer")}</th>
                  <th className="px-5 py-4">{t("ui.date")}</th>
                  <th className="px-5 py-4 text-right">{t("ui.subtotal")}</th>
                  <th className="px-5 py-4 text-right">{t("ui.discount")}</th>
                  <th className="px-5 py-4 text-right">{t("ui.net")}</th>
                  <th className="px-5 py-4 text-right">{t("ui.actions")}</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e5ebff]">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-slate-500">
                      {t("screens.invoices.empty")}
                    </td>
                  </tr>
                ) : (
                  filtered.map((inv) => (
                    <tr key={inv.id} className="transition hover:bg-[#f8faff]">
                      <td className="px-5 py-4">
                        <span className="rounded-xl bg-[#eef3ff] px-3 py-1.5 text-xs font-black text-[#4663ff]">
                          #{inv.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        {inv.customer_name || "-"}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {inv?.date?.slice(0, 10)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {money(inv.subtotal || 0)}
                      </td>
                      <td className="px-5 py-4 text-right text-slate-500">
                        {money(inv.discount || 0)}
                      </td>
                      <td className="px-5 py-4 text-right font-black text-emerald-700">
                        {money(inv.net_total || 0)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => navigate(`/view-sales/${inv.id}`)}
                            className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                          >
                            <Eye size={16} />
                          </button>
                          {inv.status !== "paid" && (
                            <>
                              <button
                                onClick={() =>
                                  navigate(`/edit-sales/${inv.id}`)
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
                                onClick={() => handleDelete(inv.id)}
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

      <AddPayment
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={selecteInvoice}
        party={selecteInvoice?.customer_id}
        partyName={selecteInvoice?.customer_name}
        mode="sales"
        refetchList={refetch}
      />
    </div>
  );
};

export default SalesList;
