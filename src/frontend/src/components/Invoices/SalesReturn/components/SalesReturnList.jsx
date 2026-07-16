import React, { useMemo, useState } from "react";
import { Eye, HandCoins, Percent, Undo2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import AddPayment from "../../../Cash/Payment/components/AddPayment";
import InvoiceListHeader from "../../../../Global/InvoiceListHeader";
import Pagination from "../../../../Global/Pagination";
import useSalesReturnList from "../hooks/useSalesReturnList";
import GoTo from "../../../../Global/GoTo";
import FormattedDate from "../../../../Global/FormattedDate";

const StatusBadge = ({ status, paidAmount, remainingAmount, money, t }) => {
  const config = {
    paid: { label: t("ui.paid"), classes: "bg-emerald-50 text-emerald-600" },
    partial: {
      label: t("ui.partial"),
      classes: "bg-amber-50 text-amber-600",
    },
    unpaid: { label: t("ui.unpaid"), classes: "bg-slate-100 text-slate-500" },
  };
  const current = config[status] || config.unpaid;

  return (
    <div className="group relative inline-block">
      <span
        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] uppercase tracking-wide ${current.classes}`}
      >
        {current.label}
      </span>

      {status === "partial" && (
        <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 w-48 -translate-x-1/2 rounded-xl border border-[#e5ebff] bg-white p-3 text-xs font-semibold text-slate-600 opacity-0 shadow-lg transition group-hover:opacity-100">
          <div className="flex justify-between">
            <span>{t("ui.refunded")}</span>
            <span className="font-bold text-emerald-600">
              {money(paidAmount)}
            </span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>{t("ui.remaining")}</span>
            <span className="font-bold text-amber-600">
              {money(remainingAmount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

const SalesReturnList = () => {
  const { t } = useTranslation();

  const {
    salesReturns,
    loading,
    saving,
    error,
    refetch,
    deleteSalesReturn,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,

    selectedInvoice,
    setSelectedInvoice,
    openPaymentModel,
    setOpenPaymentModel,

    filters,
    handleFilterChange,
    clearFilters,
    customers,
  } = useSalesReturnList();

  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const [deleteInvoice, setDeleteInvoice] = useState(null);
  const { money } = usePrimaryCurrency();

  const salesReturnFilterFields = [
    { name: "dateFrom", type: "date", label: t("filters.dateFrom") },
    { name: "dateTo", type: "date", label: t("filters.dateTo") },
    {
      name: "customerId",
      type: "select",
      label: t("ui.customer"),
      allLabel: t("filters.allCustomers"),
      options: customers.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: "status",
      type: "select",
      label: t("filters.status"),
      allLabel: t("filters.allStatuses"),
      options: [
        { value: "paid", label: t("ui.paid") },
        { value: "partial", label: t("ui.partial") },
        { value: "unpaid", label: t("ui.unpaid") },
      ],
    },
    { name: "minTotal", type: "number", label: t("filters.minTotal") },
    { name: "maxTotal", type: "number", label: t("filters.maxTotal") },
  ];

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return salesReturns;

    return salesReturns.filter((inv) => {
      return [
        inv.id,
        inv.customer_name,
        inv.customer_id,
        inv.date,
        inv.total,
        inv.net_total,
        inv.original_invoice_name,
        inv.sales_invoice_id,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));
    });
  }, [salesReturns, search]);

  const handleDelete = async (id) => {
    try {
      setActionError("");
      await deleteSalesReturn(id);
    } catch (err) {
      console.log(err.message);
      setActionError(t("screens.invoices.deleteFailed"));
    }
  };

  const totalNet = salesReturns?.reduce(
    (sum, inv) => sum + Number(inv.net_total || 0),
    0
  );
  const totalTax = salesReturns?.reduce(
    (sum, inv) => sum + Number(inv.taxValue || 0),
    0
  );
  const unpaidCount = salesReturns?.filter(
    (inv) => inv.status !== "paid"
  ).length;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <InvoiceListHeader
          badgeLabel={t("ui.salesReturn")}
          badgeIcon={Undo2}
          title={t("ui.salesReturn")}
          subtitle={t("screens.invoices.salesReturnSubtitle")}
          stats={[
            {
              icon: Undo2,
              value: salesReturns?.length,
              label: t("ui.returns"),
            },
            {
              icon: HandCoins,
              value: unpaidCount,
              label: t("ui.open"),
              variant: "amber",
            },
            {
              icon: Percent,
              value: money(totalTax),
              label: t("screens.invoices.taxCollected"),
              variant: "violet",
            },
            {
              icon: Undo2,
              eyebrow: "NET",
              value: money(totalNet),
              label: t("ui.total"),
              variant: "brand",
            },
          ]}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("screens.invoices.search")}
          onRefresh={refetch}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          filterFields={salesReturnFilterFields}
          clearLabel={t("common.clear")}
        />

        {(error || actionError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError || error}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-sm">
              <thead className="bg-[#f8faff] text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-start">{t("ui.returnId")}</th>
                  <th className="px-5 py-4 text-start">
                    {t("ui.originalInvoice")}
                  </th>
                  <th className="px-5 py-4 text-start">{t("ui.customer")}</th>
                  <th className="px-5 py-4 text-start">{t("ui.date")}</th>
                  <th className="px-5 py-4 text-start">{t("ui.subtotal")}</th>
                  <th className="px-5 py-4 text-start">{t("ui.tax")}</th>
                  <th className="px-5 py-4 text-start">{t("ui.net")}</th>
                  <th className="px-5 py-4 text-start">{t("ui.status")}</th>
                  <th className="px-5 py-4 text-start">
                    {t("common.actions")}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e5ebff]">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-start text-slate-500">
                      {t("common.loading")}
                    </td>
                  </tr>
                ) : filtered?.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="p-8 text-start text-slate-500">
                      {t("screens.invoices.empty")}
                    </td>
                  </tr>
                ) : (
                  filtered?.map((inv) => (
                    <tr key={inv.id} className="transition hover:bg-[#f8faff]">
                      <td className="px-5 py-4 text-start">
                        <span className="rounded-xl bg-[#eef3ff] px-3 py-1.5 text-xs font-semibold text-[#4663ff]">
                          #{inv.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-start text-slate-600 font-medium">
                        {inv.original_invoice_name
                          ? `${inv.original_invoice_name} `
                          : ""}
                        <span className="text-xs text-slate-400 font-normal">
                          (#{inv.sales_invoice_id})
                        </span>
                      </td>
                      <td className="px-5 py-4 text-start font-bold text-slate-900">
                        <GoTo type="customer" id={inv.customer_id}>
                          {inv.customer_name || "-"}
                        </GoTo>
                      </td>
                      <td className="px-5 py-4 text-start text-slate-500">
                        <FormattedDate value={inv.date} />
                      </td>
                      <td className="px-5 py-4 text-start">
                        <div className="font-semibold tabular-nums text-slate-700">
                          {money(inv.subtotal || 0)}
                        </div>
                        {Number(inv.discount || 0) > 0 && (
                          <div className="mt-0.5 inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-500">
                            -{money(inv.discount)} {t("ui.discount")}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4 text-start tabular-nums">
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
                      <td className="px-5 py-4 text-start tabular-nums text-emerald-700 font-semibold">
                        {money(inv.net_total || 0)}
                      </td>

                      <td className="px-5 py-4 text-center">
                        <StatusBadge
                          status={inv.status}
                          paidAmount={inv.refunded_amount}
                          remainingAmount={inv.remaining_amount}
                          money={money}
                          t={t}
                        />
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-start gap-1">
                          <button
                            onClick={() =>
                              navigate(`/view-sales-return/${inv.id}`)
                            }
                            className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                          >
                            <Eye size={16} />
                          </button>

                          {inv.status !== "paid" && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(inv);
                                setOpenPaymentModel(true);
                              }}
                              className="rounded-xl p-2 text-slate-500 hover:bg-[#eef3ff] hover:text-[#4663ff]"
                            >
                              <HandCoins size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
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

      <AddPayment
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={selectedInvoice}
        party={selectedInvoice?.customer_id}
        partyName={selectedInvoice?.customer_name}
        mode="sales_return"
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

export default SalesReturnList;
