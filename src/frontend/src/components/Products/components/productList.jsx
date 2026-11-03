// packages/app/src/renderer/features/products/components/ProductList.jsx

import {
  Barcode,
  Briefcase,
  Edit2,
  Eye,
  FileSpreadsheet,
  Layers,
  Package,
  PackagePlus,
  Trash2,
  Wallet2,
} from "lucide-react";
import { useEffect, useState } from "react";
import useProductCatalog from "../hooks/useProductCatalog";
import DeleteModal from "../../../Global/DeleteModel";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { formatNumber } from "../../../Global/FormatNumber";
import { getAssetUrl } from "../../../Global/assetUrl";
import { useTranslation } from "react-i18next";
import ProductImportModal from "./ProductImportModal";
import Pagination from "../../../Global/Pagination";
import { useNavigate } from "react-router-dom";
import ProductUpdateModal from "./ProductUpdateModal";
import InvoiceListHeader from "../../../Global/InvoiceListHeader";
import TagList from "../../Tags/components/TagList";
import ColumnPicker from "../../../Global/ColumnPicker";
import useColumnVisibility from "../../../Global/useColumnVisibility";
import StockBadge from "../../../Global/ui/StockBadge";
import { getStockStatus, useLowStockLevel } from "../../../Global/stockStatus";

export default function ProductList() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const catalog = useProductCatalog();
  const { money } = usePrimaryCurrency();
  const lowStockLevel = useLowStockLevel();

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [updateExportModalOpen, setUpdateExportModalOpen] = useState(false);
  const [allTags, setAllTags] = useState([]);
  const [tagsByProduct, setTagsByProduct] = useState({});

  const {
    products,
    barcodesByProduct,
    units,
    loading,
    error,
    refetch,
    search,
    setSearch,
    actionError,
    handleDeleteProduct,
    openDeleteModel,
    setOpenDeleteModel,
    setSelectDeleteProduct,
    selectDeleteProduct,
    page,
    setPage,
    limit,
    setLimit,
    total,
    totalPages,
    totalCost,
    filters,
    setFilters,
    clearFilters,
  } = catalog;

  // Tag options for the filter dropdown — loaded once, independent of the
  // current page of products (a filter needs the full tag list, not just
  // tags currently visible on this page).
  useEffect(() => {
    window.api.listTags("product").then((res) => {
      if (res.success) setAllTags(res.data);
    });
  }, []);

  // Batch-fetch tags for exactly the products on the current page — one
  // call per page load instead of one call per row.
  useEffect(() => {
    if (products.length === 0) {
      setTagsByProduct({});
      return;
    }
    const ids = products.map((p) => p.id);
    window.api.getEntitiesTags("product", ids).then((res) => {
      if (res.success) setTagsByProduct(res.data);
    });
  }, [products]);

  const totalQuantity = products.reduce(
    (total, product) => total + Number(product.quantity || 0),
    0,
  );

  // A product's full barcode count spans two sources: the product-level
  // barcodes list (barcodesByProduct, from get-product-barcodes) and any
  // barcode attached directly to a selling unit (product.productUnits).
  // Neither alone is the real count a cashier could scan against.
  const getBarcodeCount = (product) => {
    const productLevel = (barcodesByProduct[product.id] || []).length;
    const unitLevel = (product.productUnits || []).filter((u) =>
      String(u.barcode || "").trim(),
    ).length;
    return productLevel + unitLevel;
  };

  // Everyday columns are shown by default; the technical ones are one
  // click away in the column picker.
  const columns = [
    {
      key: "product",
      label: t("ui.product"),
      locked: true,
      render: (product) => (
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
            {product.logo ? (
              <img
                src={getAssetUrl(product.logo)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <Package size={22} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div
              className="truncate text-base font-bold text-ink"
              title={product.name || t("ui.unnamedProduct")}
            >
              {product.name || t("ui.unnamedProduct")}
            </div>
            {product.code && (
              <div className="truncate text-sm font-semibold text-ink-muted">
                {product.code}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "stock",
      label: t("simple.products.stock"),
      render: (product) =>
        product.type === "service" ? (
          <span className="text-ink-muted">—</span>
        ) : (
          <div className="flex flex-col items-start gap-1">
            <span className="text-lg font-black tabular-nums text-ink">
              {formatNumber(product.quantity || 0, 2)}
            </span>
            <StockBadge
              status={getStockStatus(product, lowStockLevel)}
              size="sm"
            />
          </div>
        ),
    },
    {
      key: "price",
      label: t("simple.products.price"),
      render: (product) => (
        <span dir="ltr" className="text-lg font-black tabular-nums text-ink">
          {money(product.salePrice || 0)}
        </span>
      ),
    },
    {
      key: "cost",
      label: t("simple.products.cost"),
      render: (product) => (
        <span dir="ltr" className="font-bold tabular-nums text-ink-muted">
          {money(product.costPrice || 0)}
        </span>
      ),
    },
    {
      key: "type",
      label: t("screens.products.productType", "Type"),
      defaultVisible: false,
      render: (product) =>
        product.type === "service" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-sm font-bold text-violet-700">
            <Briefcase size={14} />
            {t("screens.products.typeService", "Service")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-sm font-bold text-ink-soft">
            <Package size={14} />
            {t("screens.products.typeNormal", "Normal")}
          </span>
        ),
    },
    {
      key: "unit",
      label: t("ui.unit"),
      defaultVisible: false,
      render: (product) =>
        product.unit_name ? (
          <span className="font-semibold text-ink-soft">
            {product.unit_name}
            {product.unit_code ? ` (${product.unit_code})` : ""}
          </span>
        ) : (
          <span className="text-ink-muted">{t("ui.noUnit")}</span>
        ),
    },
    {
      key: "tax",
      label: t("ui.tax"),
      defaultVisible: false,
      render: (product) =>
        product.tax_name ? (
          <span className="font-semibold text-ink-soft">
            ({product.tax_rate}%)
          </span>
        ) : (
          <span className="text-ink-muted">
            {t("screens.products.noTaxOption")}
          </span>
        ),
    },
    {
      key: "sellingUnits",
      label: t("screens.products.sellingUnits"),
      defaultVisible: false,
      render: (product) =>
        Number(product.unitCount || 0) > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-sm font-bold text-brand-700">
            <Layers size={14} />
            {t("screens.products.extraUnitsCount", {
              count: product.unitCount,
            })}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        ),
    },
    {
      key: "barcodes",
      label: t("ui.barcodes"),
      defaultVisible: false,
      render: (product) => {
        const barcodeCount = getBarcodeCount(product);
        return barcodeCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warn-50 px-2.5 py-1 text-sm font-bold text-warn-700">
            <Barcode size={14} />
            {barcodeCount}
          </span>
        ) : (
          <span className="text-ink-muted">—</span>
        );
      },
    },
    {
      key: "tags",
      label: t("screens.tags.title"),
      defaultVisible: false,
      render: (product) => (
        <TagList tags={tagsByProduct[product.id] || []} limit={2} />
      ),
    },
    {
      key: "actions",
      label: t("common.actions"),
      locked: true,
      render: (product) => (
        <div className="flex items-center justify-start gap-2">
          <button
            type="button"
            onClick={() => navigate(`/products/${product.id}`)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold text-ink-soft transition hover:border-brand hover:text-brand-700"
            aria-label={t("screens.products.movementsAria")}
          >
            <Eye size={17} />
            {t("simple.products.view")}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/products/${product.id}/edit`)}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl border-2 border-slate-200 px-3 text-sm font-bold text-ink-soft transition hover:border-brand hover:text-brand-700"
            aria-label={t("screens.products.editAria")}
          >
            <Edit2 size={17} />
            {t("simple.products.edit")}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpenDeleteModel(true);
              setSelectDeleteProduct(product);
            }}
            className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-danger-50 px-3 text-sm font-bold text-danger-700 transition hover:bg-danger-100"
            aria-label={t("screens.products.deleteAria")}
          >
            <Trash2 size={17} />
            {t("simple.products.delete")}
          </button>
        </div>
      ),
    },
  ];

  const { visibleColumns, isVisible, toggle, reset } = useColumnVisibility(
    "product-list",
    columns,
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <main className="mx-auto max-w-7xl space-y-6">
        <InvoiceListHeader
          badgeLabel={t("ui.inventory")}
          title={t("screens.products.title")}
          subtitle={t("screens.products.subtitle")}
          stats={[
            { icon: Package, value: products.length, label: t("ui.products") },
            {
              icon: Barcode,
              value: formatNumber(totalQuantity, 2),
              label: t("ui.quantity"),
              variant: "violet",
            },
            {
              icon: Wallet2,
              value: money(totalCost),
              label: t("ui.retailValue"),
              variant: "brand",
            },
          ]}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={t("screens.products.search")}
          onRefresh={refetch}
          addLabel={t("screens.products.add")}
          addIcon={PackagePlus}
          onAdd={() => navigate("/products/new")}
          filters={filters}
          onFilterChange={(name, value) =>
            setFilters({ [name]: value || null })
          }
          onClearFilters={clearFilters}
          filterFields={[
            {
              type: "select",
              name: "type",
              label: t("screens.products.productType", "Type"),
              allLabel: t("common.all"),
              options: [
                { value: "normal", label: t("screens.products.typeNormal") },
                { value: "service", label: t("screens.products.typeService") },
              ],
            },
            {
              type: "select",
              name: "unit_id",
              label: t("ui.unit"),
              allLabel: t("common.all"),
              options: units.map((u) => ({ value: u.id, label: u.name })),
            },
            {
              type: "select",
              name: "hasTax",
              label: t("ui.tax"),
              allLabel: t("common.all"),
              options: [
                {
                  value: "yes",
                  label: t("screens.products.hasTaxOption", "Has tax"),
                },
                {
                  value: "no",
                  label: t("screens.products.noTaxOption", "No tax"),
                },
              ],
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

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => setImportModalOpen(true)}
            className="ui-btn ui-btn-soft min-h-[44px] px-4 text-sm"
          >
            <FileSpreadsheet size={18} />
            {t("screens.products.import")}
          </button>
          <button
            type="button"
            onClick={() => setUpdateExportModalOpen(true)}
            className="ui-btn ui-btn-soft min-h-[44px] px-4 text-sm"
          >
            <FileSpreadsheet size={18} />
            {t("screens.products.updateProducts", "Update Products")}
          </button>
        </div>

        {(error || actionError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError || error}
          </div>
        )}

        <section className="overflow-hidden rounded-[28px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.12)]">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-slate-500">
              {t("screens.products.loading")}
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <Package size={42} className="mx-auto text-[#4663ff]" />
              <h2 className="mt-4 text-xl font-black text-slate-950">
                {t("screens.products.empty")}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {t("screens.products.emptyHint")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-start text-base">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-sm font-bold text-ink-soft">
                    {visibleColumns.map((col) => (
                      <th
                        key={col.key}
                        className="whitespace-nowrap px-4 py-3 text-start"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="transition hover:bg-slate-50"
                    >
                      {visibleColumns.map((col) => (
                        <td
                          key={col.key}
                          className={`px-4 py-3 text-start ${col.key === "product" ? "max-w-[300px]" : ""}`}
                        >
                          {col.render(product)}
                        </td>
                      ))}
                    </tr>
                  ))}
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
                }}
              />
            </div>
          )}
        </section>
      </main>

      <ProductImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImported={refetch}
      />

      <ProductUpdateModal
        isOpen={updateExportModalOpen}
        onClose={() => setUpdateExportModalOpen(false)}
        onUpdated={refetch}
      />

      <DeleteModal
        open={openDeleteModel}
        onClose={() => setOpenDeleteModel(false)}
        onConfirm={() => handleDeleteProduct(selectDeleteProduct)}
        title={t("screens.products.deleteTitle")}
        message={t("screens.products.deleteMessage")}
      />
    </div>
  );
}
