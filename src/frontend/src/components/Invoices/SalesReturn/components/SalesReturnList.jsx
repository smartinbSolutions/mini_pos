import React, { useMemo, useState } from "react";
import {
  Download,
  Eye,
  HandCoins,
  MoreVertical,
  Percent,
  Printer,
  Undo2,
} from "lucide-react";
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
import HoverTooltip from "../../../../Global/HoverTooltip";
import DropdownMenu from "../../../../Global/DropdownMenu";
import TagList from "../../../Tags/components/TagList";
import DataTable from "../../../../Global/DataTable";
import ColumnPicker from "../../../../Global/ColumnPicker";
import useColumnVisibility from "../../../../Global/useColumnVisibility";

const StatusBadge = ({ status, paidAmount, remainingAmount, money, t }) => {
  const config = {
    paid: {
      label: t("ui.paid"),
      classes: "bg-emerald-50 text-emerald-600",
      dot: "bg-emerald-500",
    },
    partial: {
      label: t("ui.partial"),
      classes: "bg-amber-50 text-amber-600",
      dot: "bg-amber-500",
    },
    unpaid: {
      label: t("ui.unpaid"),
      classes: "bg-slate-100 text-slate-500",
      dot: "bg-slate-400",
    },
  };
  const current = config[status] || config.unpaid;

  const badge = (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${current.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />
      {current.label}
    </span>
  );

  if (status !== "partial") return badge;

  return (
    <HoverTooltip
      trigger={badge}
      content={
        <>
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
        </>
      }
    />
  );
};

const SalesReturnList = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

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
    search,
    setSearch,
    customers,
    taxes,
    allTags,
    tagsByReturn,
  } = useSalesReturnList();

  const navigate = useNavigate();
  const [actionError, setActionError] = useState("");
  const [deleteInvoice, setDeleteInvoice] = useState(null);
  const { money } = usePrimaryCurrency();

  const taxOf = (inv) => Number(inv.total_tax_value ?? inv.taxValue ?? 0);

  const columns = [
    {
      key: "returnId",
      label: t("ui.returnId"),
      locked: true,
      render: (inv) => (
        <span className="rounded-lg bg-[#eef3ff] px-2 py-0.5 text-[11px] font-bold text-[#4663ff]">
          #{inv.id}
        </span>
      ),
    },
    {
      key: "channel",
      label: t("filters.channel"),
      render: (inv) => (
        <span
          className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${
            inv.channel === "pos"
              ? "bg-violet-50 text-violet-600"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {inv.channel === "pos"
            ? t("screens.invoices.pos")
            : t("screens.invoices.manual")}
        </span>
      ),
    },
    {
      key: "originalInvoice",
      label: t("ui.originalInvoice"),
      cellClassName: "font-medium text-slate-600",
      render: (inv) => (
        <>
          {inv.original_invoice_name ? `${inv.original_invoice_name} ` : ""}
          <span className="text-[11px] font-normal text-slate-400">
            (#{inv.sales_invoice_id})
          </span>
        </>
      ),
    },
    {
      key: "customer",
      label: t("ui.customer"),
      align: "start",
      cellClassName: "max-w-[200px] truncate font-bold text-slate-900",
      render: (inv) => (
        <GoTo type="customer" id={inv.contact_id}>
          {inv.customer_name || "-"}
        </GoTo>
      ),
    },
    {
      key: "date",
      label: t("ui.date"),
      cellClassName: "text-slate-500",
      render: (inv) => <FormattedDate value={inv.date} />,
    },
    {
      key: "subtotal",
      label: t("ui.subtotal"),
      align: "end",
      defaultVisible: false,
      cellClassName: "font-semibold tabular-nums text-slate-700",
      render: (inv) => money(inv.subtotal || 0),
    },
    {
      key: "discount",
      label: t("ui.discount"),
      align: "end",
      cellClassName: "tabular-nums",
      render: (inv) =>
        Number(inv.total_discount_value || 0) > 0 ? (
          <span className="font-bold text-red-500">
            -{money(inv.total_discount_value)}
          </span>
        ) : (
          <span className="text-slate-300">—</span>
        ),
    },
    {
      key: "tax",
      label: t("ui.tax"),
      align: "end",
      cellClassName: "tabular-nums",
      render: (inv) => {
        if (taxOf(inv) <= 0) return <span className="text-slate-300">—</span>;
        return (
          <HoverTooltip
            trigger={
              <span className="cursor-default font-bold text-emerald-600">
                +{money(taxOf(inv))}
              </span>
            }
            content={
              (inv.taxes || []).length > 0 ? (
                (inv.taxes || []).map((tax, i) => (
                  <div
                    key={tax.tax_id ?? i}
                    className={`flex justify-between ${i > 0 ? "mt-1" : ""}`}
                  >
                    <span>
                      {tax.name} ({tax.rate}%)
                    </span>
                    <span className="font-bold text-emerald-600">
                      +{money(tax.value)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between">
                  <span>{t("ui.tax")}</span>
                  <span className="font-bold text-emerald-600">
                    +{money(inv.taxValue)}
                  </span>
                </div>
              )
            }
          />
        );
      },
    },
    {
      key: "net",
      label: t("ui.net"),
      align: "end",
      cellClassName: "font-bold tabular-nums text-emerald-700",
      render: (inv) => money(inv.net_total || 0),
    },
    {
      key: "status",
      label: t("ui.status"),
      render: (inv) => (
        <StatusBadge
          status={inv.status}
          paidAmount={inv.refunded_amount}
          remainingAmount={inv.remaining_amount}
          money={money}
          t={t}
        />
      ),
    },
    {
      key: "tags",
      label: t("screens.tags.title"),
      defaultVisible: false,
      render: (inv) => <TagList tags={tagsByReturn[inv.id] || []} limit={2} />,
    },
    {
      key: "actions",
      label: t("common.actions"),
      locked: true,
      sticky: true,
      width: 110,
      render: (inv) => (
        <DropdownMenu
          trigger={
            <button className="rounded-lg p-1.5 text-slate-500 transition hover:bg-[#eef3ff] hover:text-[#4663ff]">
              <MoreVertical size={16} />
            </button>
          }
          align={isRtl ? "left" : "right"}
          options={[
            {
              key: "view",
              icon: <Eye size={14} />,
              label: t("common.view"),
              inline: true,
              onClick: () => navigate(`/view-sales-return/${inv.id}`),
            },
            {
              key: "payment",
              icon: <HandCoins size={14} />,
              label: t("ui.payment"),
              inline: true,
              onClick: () => {
                setSelectedInvoice(inv);
                setOpenPaymentModel(true);
              },
              visible: inv.status !== "paid",
            },
            {
              key: "savePdf",
              icon: <Download size={14} />,
              label: t("common.savePdf"),
              onClick: () => handleSavePdf(inv.id),
            },
            {
              key: "print",
              icon: <Printer size={14} />,
              label: t("common.print"),
              onClick: () => handlePrint(inv.id),
            },
          ]}
        />
      ),
    },
  ];

  const { visibleColumns, isVisible, toggle, reset } = useColumnVisibility(
    "sales-return-list",
    columns,
  );

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
      name: "channel",
      type: "select",
      label: t("filters.channel"),
      allLabel: t("filters.allChannels"),
      options: [
        { value: "manual", label: t("screens.invoices.manual") },
        { value: "pos", label: t("screens.invoices.pos") },
      ],
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
    {
      name: "taxIds",
      type: "multiselect",
      label: t("ui.tax"),
      options: taxes.map((tax) => ({
        value: tax.id,
        label: `${tax.name} (${tax.rate}%)`,
      })),
    },
    {
      name: "tagIds",
      type: "multiselect",
      label: t("screens.tags.title"),
      options: allTags.map((tag) => ({
        value: tag.id,
        label: tag.name,
      })),
    },
  ];

  const filtered = salesReturns;

  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);

  const handlePrint = async (id) => {
    try {
      setIsPrinting(true);
      const res = await window.api.printDocument(`/print-sales-return/${id}`);
      if (!res.success && res.error === "NO_PRINTER") {
        console.error("No printer found");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async (id) => {
    try {
      setIsSavingPdf(true);
      const res = await window.api.saveDocumentPdf(
        `/print-sales-return/${id}`,
        `sales-return-${id}.pdf`,
      );
      if (!res.success && res.error !== "CANCELED") {
        console.error(res.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingPdf(false);
    }
  };

  const totalNet = salesReturns?.reduce(
    (sum, inv) => sum + Number(inv.net_total || 0),
    0,
  );
  const totalTax = salesReturns?.reduce(
    (sum, inv) => sum + Number(inv.total_tax_value ?? inv.taxValue ?? 0),
    0,
  );
  const unpaidCount = salesReturns?.filter(
    (inv) => inv.status !== "paid",
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
          extraActions={
            <ColumnPicker
              columns={columns}
              isVisible={isVisible}
              onToggle={toggle}
              onReset={reset}
              align={isRtl ? "left" : "right"}
            />
          }
        />

        {(error || actionError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError || error}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#e9edfb] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <DataTable
            columns={visibleColumns}
            rows={filtered || []}
            loading={loading}
            emptyText={t("screens.invoices.empty")}
            minWidth={900}
          />
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

      <AddPayment
        isOpen={openPaymentModel}
        onClose={() => setOpenPaymentModel(false)}
        invoice={selectedInvoice}
        party={selectedInvoice?.contact_id}
        partyName={selectedInvoice?.customer_name}
        mode="sales_return"
        refetchList={refetch}
      />
      {/* <DeleteModal
        open={Boolean(deleteInvoice)}
        onClose={() => setDeleteInvoice(null)}
        onConfirm={async () => {
          await handleDelete(deleteInvoice.id);
          setDeleteInvoice(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      /> */}
    </div>
  );
};

export default SalesReturnList;
