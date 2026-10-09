// SalesQuotationList.jsx
import React, { useMemo, useState } from "react";
import {
  FileText,
  PackagePlus,
  Eye,
  Trash2,
  Percent,
  Edit2,
  Send,
  MoreVertical,
  Download,
  Printer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import useSalesQuotationList from "../hooks/useSalesQuotationList";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import InvoiceListHeader from "../../../../Global/InvoiceListHeader";
import Pagination from "../../../../Global/Pagination";
import FormattedDate from "../../../../Global/FormattedDate";
import InvoiceIdBadge from "../../../../Global/InvoiceIdBadge";
import GoTo from "../../../../Global/GoTo";
import HoverTooltip from "../../../../Global/HoverTooltip";
import { ToastContainer } from "react-toastify";
import DropdownMenu from "../../../../Global/DropdownMenu";
import TagList from "../../../Tags/components/TagList";
import DataTable from "../../../../Global/DataTable";
import ColumnPicker from "../../../../Global/ColumnPicker";
import useColumnVisibility from "../../../../Global/useColumnVisibility";

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

const STATUS_CONFIG = {
  draft: { classes: "bg-slate-100 text-slate-500", dot: "bg-slate-400" },
  sent: { classes: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
  accepted: {
    classes: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
  },
  rejected: { classes: "bg-red-50 text-red-600", dot: "bg-red-500" },
  expired: { classes: "bg-slate-100 text-slate-400", dot: "bg-slate-300" },
};

const StatusBadge = ({ status, t }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cfg.classes}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {t(`screens.quotations.status.${status}`)}
    </span>
  );
};

const SalesQuotationList = () => {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const {
    salesQuotations,
    loading,
    saving,
    error,
    refetch,
    deleteQuotation,

    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,

    filters,
    handleFilterChange,
    clearFilters,
    search,
    setSearch,
    customers,
    taxes,
    allTags,
    tagsByQuotation,
  } = useSalesQuotationList();

  const navigate = useNavigate();

  const [actionError, setActionError] = useState("");
  const [deleteQuotationTarget, setDeleteQuotationTarget] = useState(null);
  const { money } = usePrimaryCurrency();

  const getAmounts = (q) => {
    const itemTax = Number(q.item_tax_total || 0);
    const quotationTax = Number(q.taxValue || 0);
    const itemDiscount = Number(q.item_discount_total || 0);
    const quotationDiscount = Number(q.discount || 0);
    return {
      itemTax,
      totalTax: Number(q.total_tax_value ?? itemTax + quotationTax),
      itemDiscount,
      quotationDiscount,
      totalDiscount: Number(
        q.total_discount_value ?? itemDiscount + quotationDiscount,
      ),
    };
  };

  const columns = [
    {
      key: "quotation",
      label: t("screens.quotations.quotation"),
      locked: true,
      render: (q) => <InvoiceIdBadge id={q.id} name={q.quotation_name} />,
    },
    {
      key: "customer",
      label: t("ui.customer"),
      align: "start",
      cellClassName: "max-w-[200px] truncate font-bold text-slate-900",
      render: (q) =>
        q.customer_id ? (
          <GoTo type="customer" id={q.customer_id}>
            {q.customer_name}
          </GoTo>
        ) : (
          <span className="font-medium text-slate-400">
            {t("screens.quotations.noCustomer")}
          </span>
        ),
    },
    {
      key: "date",
      label: t("ui.date"),
      cellClassName: "text-slate-500",
      render: (q) => <FormattedDate value={q.date} />,
    },
    {
      key: "subtotal",
      label: t("ui.subtotal"),
      align: "end",
      defaultVisible: false,
      cellClassName: "font-semibold tabular-nums text-slate-700",
      render: (q) => money(q.subtotal || 0),
    },
    {
      key: "discount",
      label: t("ui.discount"),
      align: "end",
      cellClassName: "tabular-nums",
      render: (q) => {
        const a = getAmounts(q);
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
                value: a.quotationDiscount,
                display: `-${money(a.quotationDiscount)}`,
                className: "text-red-500",
              },
            ]}
          />
        );
      },
    },
    {
      key: "tax",
      label: t("ui.tax"),
      align: "end",
      cellClassName: "tabular-nums",
      render: (q) => {
        const a = getAmounts(q);
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
              ...(q.taxes || []).map((tax) => ({
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
      cellClassName: "font-bold tabular-nums text-emerald-700",
      render: (q) => money(q.net_total || 0),
    },
    {
      key: "status",
      label: t("ui.status"),
      render: (q) => <StatusBadge status={q.status} t={t} />,
    },
    {
      key: "tags",
      label: t("screens.tags.title"),
      defaultVisible: false,
      render: (q) => <TagList tags={tagsByQuotation[q.id] || []} limit={2} />,
    },
    {
      key: "actions",
      label: t("common.actions"),
      locked: true,
      sticky: true,
      width: 110,
      render: (q) => {
        const editable = q.status !== "accepted";
        return (
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
                onClick: () => navigate(`/view-sales-quotation/${q.id}`),
              },
              {
                key: "edit",
                icon: <Edit2 size={14} />,
                label: t("common.edit"),
                inline: true,
                onClick: () => navigate(`/edit-sales-quotation/${q.id}`),
                visible: editable,
              },
              {
                key: "savePdf",
                icon: <Download size={14} />,
                label: t("common.savePdf", "Save as PDF"),
                onClick: () => handleSavePdf(q.id),
              },
              {
                key: "print",
                icon: <Printer size={14} />,
                label: t("common.print"),
                onClick: () => handlePrint(q.id),
              },
              {
                key: "delete",
                icon: <Trash2 size={14} className="text-red-500" />,
                label: t("common.delete"),
                onClick: () => setDeleteQuotationTarget(q),
                visible: editable,
              },
            ]}
          />
        );
      },
    },
  ];

  const { visibleColumns, isVisible, toggle, reset } = useColumnVisibility(
    "sales-quotation-list",
    columns,
  );

  const [isPrinting, setIsPrinting] = useState(false);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const api = window.api;

  const handlePrint = async (quotationId) => {
    try {
      setIsPrinting(true);
      const res = await api.printDocument(
        `/print-sales-quotation/${quotationId}`,
        i18n.language,
      );
      if (!res.success && res.error === "NO_PRINTER") {
        console.error("No printer found");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSavePdf = async (quotationId) => {
    try {
      setIsSavingPdf(true);
      const res = await api.saveDocumentPdf(
        `/print-sales-quotation/${quotationId}`,
        `quotation-${quotationId}.pdf`,
        i18n.language,
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

  const quotationFilterFields = [
    { name: "dateFrom", type: "date", label: t("filters.dateFrom") },
    { name: "dateTo", type: "date", label: t("filters.dateTo") },
    {
      name: "customerId",
      type: "select",
      label: t("ui.customer"),
      allLabel: t("filters.allCustomers"),
      options: customers?.map((c) => ({ value: c.id, label: c.name })),
    },
    {
      name: "status",
      type: "select",
      label: t("filters.status"),
      allLabel: t("filters.allStatuses"),
      options: [
        { value: "draft", label: t("screens.quotations.status.draft") },
        { value: "sent", label: t("screens.quotations.status.sent") },
        {
          value: "accepted",
          label: t("screens.quotations.status.accepted"),
        },
        {
          value: "rejected",
          label: t("screens.quotations.status.rejected"),
        },
        {
          value: "expired",
          label: t("screens.quotations.status.expired"),
        },
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

  const filtered = salesQuotations;

  const handleDelete = async (id) => {
    try {
      setActionError("");
      await deleteQuotation(id);
    } catch (err) {
      setActionError(
        err?.message === "CANNOT_DELETE_ACCEPTED_QUOTATION"
          ? t("screens.quotations.cannotDeleteAccepted")
          : t("screens.quotations.deleteFailed"),
      );
    }
  };

  const totalNet = salesQuotations.reduce(
    (sum, q) => sum + Number(q.net_total || 0),
    0,
  );
  const totalTax = salesQuotations.reduce(
    (sum, q) => sum + Number(q.total_tax_value || q.taxValue || 0),
    0,
  );

  const acceptedCount = salesQuotations.filter(
    (q) => q.status === "accepted",
  ).length;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <InvoiceListHeader
          badgeLabel={t("ui.sales")}
          badgeIcon={FileText}
          title={t("screens.quotations.listTitle")}
          subtitle={t("screens.quotations.listSubtitle")}
          stats={[
            {
              icon: FileText,
              value: salesQuotations.length,
              label: t("screens.quotations.quotations"),
            },
            {
              icon: Send,
              value: acceptedCount,
              label: t("screens.quotations.status.accepted"),
              variant: "amber",
            },
            {
              icon: Percent,
              value: money(totalTax),
              label: t("screens.invoices.taxCollected"),
              variant: "violet",
            },
            {
              eyebrow: "NET",
              value: money(totalNet),
              label: t("ui.total"),
              variant: "brand",
            },
          ]}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("screens.quotations.search")}
          onRefresh={refetch}
          addLabel={t("screens.quotations.addQuotation")}
          addIcon={PackagePlus}
          onAdd={() => navigate("/add-sales-quotation")}
          filters={filters}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          filterFields={quotationFilterFields}
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
            rows={filtered}
            loading={loading}
            emptyText={t("screens.quotations.empty")}
            minWidth={860}
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

      <DeleteModal
        open={Boolean(deleteQuotationTarget)}
        onClose={() => setDeleteQuotationTarget(null)}
        onConfirm={async () => {
          await handleDelete(deleteQuotationTarget.id);
          setDeleteQuotationTarget(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
      <ToastContainer />
    </div>
  );
};

export default SalesQuotationList;
