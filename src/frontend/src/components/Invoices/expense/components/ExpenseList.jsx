import React, { useMemo, useState } from "react";
import {
  Receipt,
  HandCoins,
  BanknoteArrowDown,
  Eye,
  Wallet2,
  Trash2,
  Info,
  Clock,
  Pencil,
  Percent,
  MoreVertical,
  Download,
  Printer,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DeleteModal from "../../../../Global/DeleteModel";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import useExpenseList from "../hooks/useExpenseList";
import AddPayment from "../../../Cash/Payment/components/AddPayment";
import InvoiceListHeader from "../../../../Global/InvoiceListHeader";
import CategoryTags from "../../../../Global/CategoryTags";
import Pagination from "../../../../Global/Pagination";
import HoverTooltip from "../../../../Global/HoverTooltip";
import DropdownMenu from "../../../../Global/DropdownMenu";
import GoTo from "../../../../Global/GoTo";
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
      classes: "bg-red-50 text-red-500",
      dot: "bg-red-400",
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
            <span>{t("ui.paid")}</span>
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

const splitDateTime = (value) => {
  if (!value) return { dateLabel: "-", fullLabel: "" };

  const [datePart, timePart] = String(value).split(/[ T]/);

  const dateLabel = datePart || "-";
  const fullLabel = timePart ? `${datePart} ${timePart.slice(0, 8)}` : datePart;

  return { dateLabel, fullLabel };
};

const ExpenseList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const {
    expenses,
    suppliers,
    categories,
    taxes,
    loading,
    saving,
    error,
    refetch,
    handleDelete,

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
    setFilters,
    clearFilters,

    search,
    setSearch,

    allTags,
    tagsByExpense,

    actionError: deleteError,
  } = useExpenseList();

  const { money } = usePrimaryCurrency();

  const isRtl = i18n.dir() === "rtl";

  const getAmounts = (exp) => {
    const itemTax = Number(exp.item_tax_total || 0);
    const invoiceTax = Number(exp.taxValue || 0);
    const itemDiscount = Number(exp.item_discount_total || 0);
    const invoiceDiscount = Number(exp.discount || 0);
    return {
      itemTax,
      totalTax: Number(exp.total_tax_value ?? itemTax + invoiceTax),
      itemDiscount,
      invoiceDiscount,
      totalDiscount: Number(
        exp.total_discount_value ?? itemDiscount + invoiceDiscount,
      ),
    };
  };

  const columns = [
    {
      key: "id",
      label: t("ui.invoice"),
      locked: true,
      render: (exp) => (
        <span className="rounded-lg bg-[#eef3ff] px-2 py-0.5 text-[11px] font-black text-[#4663ff]">
          #{exp.id}
        </span>
      ),
    },
    {
      key: "name",
      label: t("ui.name"),
      align: "start",
      cellClassName: "max-w-[220px]",
      render: (exp) => {
        const name = (
          <span className="block truncate font-bold text-slate-900">
            {exp.invoice_name || "-"}
          </span>
        );
        if (!exp.description) return name;
        return (
          <span className="flex items-center gap-1.5">
            {name}
            <HoverTooltip
              trigger={
                <Info
                  size={13}
                  className="shrink-0 cursor-help text-slate-400 hover:text-[#4663ff]"
                />
              }
              content={<div className="max-w-[220px]">{exp.description}</div>}
            />
          </span>
        );
      },
    },
    {
      key: "supplier",
      label: t("ui.supplier"),
      align: "start",
      cellClassName: "max-w-[180px] truncate font-bold text-slate-900",
      render: (exp) => (
        <GoTo id={exp.contact_id} type="supplier">
          {exp.supplier_name || "-"}
        </GoTo>
      ),
    },
    {
      key: "category",
      label: t("ui.category"),
      render: (exp) => <CategoryTags names={exp.category_names} />,
    },
    {
      key: "date",
      label: t("ui.date"),
      cellClassName: "text-slate-500",
      render: (exp) => {
        const { dateLabel, fullLabel } = splitDateTime(exp.date);
        return (
          <HoverTooltip
            trigger={
              <span className="inline-flex cursor-help items-center gap-1.5">
                {dateLabel}
                <Clock size={12} className="text-slate-300" />
              </span>
            }
            content={<div>{fullLabel}</div>}
          />
        );
      },
    },
    {
      key: "subtotal",
      label: t("ui.subtotal"),
      align: "end",
      defaultVisible: false,
      cellClassName: "font-semibold tabular-nums text-slate-700",
      render: (exp) => money(exp.subtotal || 0),
    },
    {
      key: "discount",
      label: t("ui.discount"),
      align: "end",
      cellClassName: "tabular-nums",
      render: (exp) => {
        const a = getAmounts(exp);
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
      label: t("ui.tax"),
      align: "end",
      cellClassName: "tabular-nums",
      render: (exp) => {
        const a = getAmounts(exp);
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
              ...(exp.taxes || []).map((tax) => ({
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
      render: (exp) => money(exp.net_total || 0),
    },
    {
      key: "status",
      label: t("ui.status"),
      render: (exp) => (
        <StatusBadge
          status={exp.status}
          paidAmount={exp.paid_amount}
          remainingAmount={exp.remaining_amount}
          money={money}
          t={t}
        />
      ),
    },
    {
      key: "tags",
      label: t("screens.tags.title"),
      defaultVisible: false,
      render: (exp) => <TagList tags={tagsByExpense[exp.id] || []} limit={2} />,
    },
    {
      key: "actions",
      label: t("common.actions"),
      locked: true,
      sticky: true,
      width: 140,
      render: (exp) => {
        const canEditDelete = exp.status === "unpaid";
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
                onClick: () => navigate(`/view-expense/${exp.id}`),
              },
              {
                key: "edit",
                icon: <Pencil size={14} />,
                label: t("common.edit"),
                inline: true,
                onClick: () => navigate(`/edit-expense/${exp.id}`),
                visible: canEditDelete,
              },
              {
                key: "payment",
                icon: <Wallet2 size={14} />,
                label: t("ui.payment"),
                inline: true,
                onClick: () => {
                  setSelecteInvoice(exp);
                  setOpenPaymentModel(true);
                },
                visible: exp.status !== "paid",
              },
              {
                key: "savePdf",
                icon: <Download size={14} />,
                label: t("common.savePdf"),
                onClick: () => handleSavePdf(exp.id),
              },
              {
                key: "print",
                icon: <Printer size={14} />,
                label: t("common.print"),
                onClick: () => handlePrint(exp.id),
              },
              {
                key: "delete",
                icon: <Trash2 size={14} className="text-red-500" />,
                label: t("common.delete"),
                onClick: () => setDeleteExpense(exp),
                visible: canEditDelete,
              },
            ]}
          />
        );
      },
    },
  ];

  const { visibleColumns, isVisible, toggle, reset } = useColumnVisibility(
    "expense-list",
    columns,
  );

  const [actionError, setActionError] = useState("");
  const [deleteExpense, setDeleteExpense] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [savingPdfId, setSavingPdfId] = useState(null);

  const handlePrint = async (expenseId) => {
    try {
      setIsPrinting(true);
      const res = await window.api.printDocument(
        `/print-expense/${expenseId}`,
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

  const handleSavePdf = async (expenseId) => {
    try {
      setSavingPdfId(expenseId);
      const res = await window.api.saveDocumentPdf(
        `/print-expense/${expenseId}`,
        `expense-${expenseId}.pdf`,
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
  const filtered = expenses;

  const totalNet = expenses.reduce(
    (sum, inv) => sum + Number(inv?.net_total || 0),
    0,
  );
  const totalTax = expenses.reduce(
    (sum, inv) => sum + Number(inv?.total_tax_value ?? inv?.taxValue ?? 0),
    0,
  );

  const unpaidCount = expenses.filter((inv) => inv.status !== "paid").length;

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <InvoiceListHeader
          badgeLabel={t("ui.expenses")}
          title={t("screens.invoices.expensesTitle")}
          subtitle={t("screens.invoices.expenseSubtitle")}
          stats={[
            { icon: Receipt, value: expenses.length, label: t("ui.expense") },
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
          addLabel={t("screens.invoices.addExpense")}
          addIcon={BanknoteArrowDown}
          onAdd={() => navigate("/add-expense")}
          filters={filters}
          onFilterChange={(name, value) =>
            setFilters({ [name]: value || null })
          }
          onClearFilters={clearFilters}
          filterFields={[
            {
              type: "select",
              name: "status",
              label: t("filters.status"),
              allLabel: t("filters.allStatuses"),
              options: [
                { value: "paid", label: t("ui.paid") },
                { value: "partial", label: t("ui.partial") },
                { value: "unpaid", label: t("ui.unpaid") },
              ],
            },
            {
              type: "select",
              name: "supplier_id",
              label: t("ui.supplier"),
              allLabel: t("filters.allSuppliers"),
              options: [
                { value: "none", label: t("screens.invoices.noSupplier") },
                ...suppliers.map((s) => ({ value: s.id, label: s.name })),
              ],
            },
            {
              type: "select",
              name: "category_id",
              label: t("ui.category"),
              allLabel: t("filters.allCategories"),
              options: categories.map((c) => ({ value: c.id, label: c.name })),
            },
            {
              type: "multiselect",
              name: "taxIds",
              label: t("ui.tax"),
              options: taxes.map((tax) => ({
                value: tax.id,
                label: `${tax.name} (${tax.rate}%)`,
              })),
            },
            {
              type: "multiselect",
              name: "tagIds",
              label: t("screens.tags.title"),
              options: allTags.map((tag) => ({
                value: tag.id,
                label: tag.name,
              })),
            },
            { type: "date", name: "startDate", label: t("filters.dateFrom") },
            { type: "date", name: "endDate", label: t("filters.dateTo") },
            { type: "number", name: "minTotal", label: t("filters.minTotal") },
            { type: "number", name: "maxTotal", label: t("filters.maxTotal") },
          ]}
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

        {(error || actionError || deleteError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-red-700">
            {error || actionError || deleteError}
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-[#e9edfb] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <DataTable
            columns={visibleColumns}
            rows={filtered}
            loading={loading}
            emptyText={t("screens.invoices.empty")}
            minWidth={1000}
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
        mode="expense"
        refetchList={refetch}
      />

      <DeleteModal
        open={Boolean(deleteExpense)}
        onClose={() => setDeleteExpense(null)}
        onConfirm={async () => {
          await handleDelete(deleteExpense.id);
          setDeleteExpense(null);
        }}
        title={t("deleteModal.title")}
        message={t("deleteModal.message")}
      />
    </div>
  );
};

export default ExpenseList;
