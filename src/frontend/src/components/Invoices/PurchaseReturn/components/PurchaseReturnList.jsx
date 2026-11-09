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
import FormattedDate from "../../../../Global/FormattedDate";
import HoverTooltip from "../../../../Global/HoverTooltip";
import GoTo from "../../../../Global/GoTo";
import usePurchaseReturnList from "../hooks/usePurchaseReturnList";
import DropdownMenu from "../../../../Global/DropdownMenu";
import TagList from "../../../Tags/components/TagList";
import DataTable from "../../../../Global/DataTable";
import ColumnPicker from "../../../../Global/ColumnPicker";
import useColumnVisibility from "../../../../Global/useColumnVisibility";
import PaymentStatusBadge from "../../../../Global/PaymentStatusBadge";

function BreakdownTooltip({ trigger, rows }) {
  const hasAnyValue = rows.some((r) => Number(r.value) > 0);
  if (!hasAnyValue) return trigger;

  return (
    <HoverTooltip
      trigger={trigger}
      content={rows.map(
        (row, i) =>
          Number(row.value) > 0 && (
            <div
              key={i}
              className={`flex justify-between ${i > 0 ? "mt-1" : ""}`}
            >
              <span>{row.label}</span>
              <span className={`font-bold ${row.className || ""}`}>
                {row.display}
              </span>
            </div>
          ),
      )}
    />
  );
}

const PurchaseReturnList = () => {
  const { t, i18n } = useTranslation();

  const {
    purchaseReturns,
    loading,
    saving,
    error,

    refetch,
    deletePurchaseReturn,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,

    selecteInvoice,
    setSelecteInvoice,

    openPaymentModel,
    setOpenPaymentModel,

    filters,
    handleFilterChange,
    clearFilters,
    search,
    setSearch,
    suppliers,
    taxes,
    allTags,
    tagsByReturn,
  } = usePurchaseReturnList();

  const navigate = useNavigate();
  const [actionError, setActionError] = useState("");
  const [deleteInvoice, setDeleteInvoice] = useState(null);
  const { money } = usePrimaryCurrency();

  const isRtl = i18n.dir() === "rtl";

  const getAmounts = (inv) => {
    const itemTax = Number(inv.item_tax_total || 0);
    const invoiceTax = Number(inv.taxValue || 0);
    const itemDiscount = Number(inv.item_discount_total || 0);
    const invoiceDiscount = Number(inv.discount || 0);
    return {
      itemTax,
      totalTax: Number(inv.total_tax_value ?? itemTax + invoiceTax),
      itemDiscount,
      invoiceDiscount,
      totalDiscount: Number(
        inv.total_discount_value ?? itemDiscount + invoiceDiscount,
      ),
    };
  };

  const columns = [
    {
      key: "returnId",
      label: t("ui.returnId"),
      locked: true,
      render: (inv) => (
        <span className="rounded-lg bg-[#eef3ff] px-2 py-0.5 text-sm font-bold text-[#4663ff]">
          #{inv.id}
        </span>
      ),
    },
    {
      key: "originalInvoice",
      label: t("ui.originalInvoice"),
      cellClassName: "font-medium text-slate-600",
      render: (inv) => (
        <GoTo type="purchase" id={inv.purchase_invoice_id}>
          {inv.purchase_invoice_name || `#${inv.purchase_invoice_id}`}
        </GoTo>
      ),
    },
    {
      key: "supplier",
      label: t("ui.supplier"),
      align: "start",
      cellClassName: "max-w-[200px] truncate font-bold text-slate-900",
      render: (inv) => (
        <GoTo type="supplier" id={inv.contact_id}>
          {inv.supplier_name || "-"}
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
      defaultVisible: false,
      label: t("ui.discount"),
      align: "end",
      cellClassName: "tabular-nums",
      render: (inv) => {
        const a = getAmounts(inv);
        if (a.totalDiscount <= 0)
          return <span className="text-slate-300">—</span>;
        return (
          <BreakdownTooltip
            trigger={
              <span className="font-bold text-red-500">
                -{money(a.totalDiscount)}
              </span>
            }
            rows={[
              {
                label: t("screens.invoices.itemDiscount"),
                value: a.itemDiscount,
                display: `-${money(a.itemDiscount)}`,
                className: "text-red-500",
              },
              {
                label: t("screens.invoices.invoiceDiscount"),
                value: a.invoiceDiscount,
                display: `-${money(a.invoiceDiscount)}`,
                className: "text-red-500",
              },
            ]}
          />
        );
      },
    },
    {
      key: "tax",
      defaultVisible: false,
      label: t("ui.tax"),
      align: "end",
      cellClassName: "tabular-nums",
      render: (inv) => {
        const a = getAmounts(inv);
        if (a.totalTax <= 0) return <span className="text-slate-300">—</span>;
        return (
          <BreakdownTooltip
            trigger={
              <span className="font-bold text-emerald-600">
                +{money(a.totalTax)}
              </span>
            }
            rows={[
              {
                label: t("screens.invoices.itemTax"),
                value: a.itemTax,
                display: `+${money(a.itemTax)}`,
                className: "text-emerald-600",
              },
              ...(inv.taxes || []).map((tax) => ({
                label: `${tax.name} (${tax.rate}%)`,
                value: tax.value,
                display: `+${money(tax.value)}`,
                className: "text-emerald-600",
              })),
            ]}
          />
        );
      },
    },
    {
      key: "net",
      label: t("ui.net"),
      align: "end",
      cellClassName: "font-bold tabular-nums text-amber-700",
      render: (inv) => money(inv.net_total || 0),
    },
    {
      key: "status",
      label: t("ui.status"),
      render: (inv) => (
        <PaymentStatusBadge
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
      width: 200,
      render: (inv) => (
        <div className="flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => navigate(`/view-purchase-return/${inv.id}`)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold text-ink-soft transition hover:border-brand hover:text-brand-700"
          >
            <Eye size={17} />
            {t("simple.latest.view")}
          </button>
          <DropdownMenu
          trigger={
            <button type="button" aria-label={t("common.actions")} className="flex h-11 w-11 items-center justify-center rounded-xl text-ink-muted transition hover:bg-slate-100 hover:text-ink"><MoreVertical size={20} /></button>
          }
          align={isRtl ? "left" : "right"}
          options={[
            {
              key: "view",
              icon: <Eye size={14} />,
              label: t("common.view"),
              onClick: () => navigate(`/view-purchase-return/${inv.id}`),
            },
            {
              key: "payment",
              icon: <HandCoins size={14} />,
              label: t("ui.payment"),
              inline: true,
              onClick: () => {
                setSelecteInvoice(inv);
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
        </div>
      ),
    },
  ];

  const { visibleColumns, isVisible, toggle, reset } = useColumnVisibility(
    "purchase-return-list",
    columns,
  );

  const purchaseReturnFilterFields = [
    { name: "dateFrom", type: "date", label: t("filters.dateFrom") },
    { name: "dateTo", type: "date", label: t("filters.dateTo") },
    {
      name: "supplierId",
      type: "select",
      label: t("ui.supplier"),
      allLabel: t("filters.allSuppliers"),
      options: suppliers.map((s) => ({ value: s.id, label: s.name })),
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

  const filtered = purchaseReturns;

  const [isPrinting, setIsPrinting] = useState(false);
  const [savingPdfId, setSavingPdfId] = useState(null);

  const handlePrint = async (returnId) => {
    try {
      setIsPrinting(true);
      const res = await window.api.printDocument(
        `/print-purchase-return/${returnId}`,
        i18n.language,
      );
      if (!res.success && res.error === "NO_PRINTER") {
        setActionError(t("screens.invoices.noPrinter", "No printer found."));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async (returnId) => {
    try {
      setSavingPdfId(returnId);
      const res = await window.api.saveDocumentPdf(
        `/print-purchase-return/${returnId}`,
        `purchase-return-${returnId}.pdf`,
        i18n.language,
      );
      if (!res.success && res.error !== "CANCELED") {
        setActionError(t("screens.invoices.pdfFailed", "Failed to save PDF."));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPdfId(null);
    }
  };
  const totalNet = purchaseReturns?.reduce(
    (sum, inv) => sum + Number(inv.net_total || 0),
    0,
  );
  const totalTax = purchaseReturns?.reduce(
    (sum, inv) => sum + Number(inv.total_tax_value || inv.taxValue || 0),
    0,
  );
  const unpaidCount = purchaseReturns?.filter(
    (inv) => inv.status !== "paid",
  ).length;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <InvoiceListHeader
          badgeLabel={t("screens.purchaseReturn.purchaseReturn")}
          badgeIcon={Undo2}
          title={t("screens.purchaseReturn.purchaseReturn")}
          subtitle={t("screens.purchaseReturn.subtitle")}
          stats={[
            {
              icon: Undo2,
              value: purchaseReturns?.length,
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
          filterFields={purchaseReturnFilterFields}
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
        invoice={selecteInvoice}
        party={selecteInvoice?.contact_id}
        partyName={selecteInvoice?.supplier_name}
        mode="purchase_return"
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

export default PurchaseReturnList;
