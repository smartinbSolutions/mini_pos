import {
  Barcode,
  Boxes,
  Edit2,
  Package,
  PackagePlus,
  RefreshCw,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import ProductFormModal from "./ProductFormModal";
import useProductCatalog from "../hooks/useProductCatalog";
import DeleteModal from "../../../Global/DeleteModel";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { formatNumber } from "../../../Global/FormatNumber";

export default function ProductList() {
  const catalog = useProductCatalog();
  const { money } = usePrimaryCurrency();
  const {
    products,
    barcodesByProduct,
    loading,
    saving,
    error,
    refetch,
    search,
    setSearch,
    openCreate,
    actionError,
    filteredProducts,
    openEdit,
    handleDeleteProduct,
    isFormOpen,
    activeProduct,
    canManageBarcodes,
    canUseUnits,
    setIsFormOpen,
    submitProduct,
    units,
    openDeleteModel,
    setOpenDeleteModel,
    setSelectDeleteProduct,
    selectDeleteProduct,
    handleLogo,
  } = catalog;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef3ff] text-slate-500">
        Loading product catalog...
      </div>
    );
  }

  const totalQuantity = products.reduce(
    (total, product) => total + Number(product.quantity || 0),
    0,
  );
  const totalValue = products.reduce(
    (total, product) =>
      total + Number(product.quantity || 0) * Number(product.price || 0),
    0,
  );
  const barcodeCount = Object.values(barcodesByProduct).reduce(
    (total, productBarcodes) => total + productBarcodes.length,
    0,
  );

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <main className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-white/80 bg-white/80 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
          <div className="grid gap-6 p-7 xl:grid-cols-[1fr_420px]">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#4663ff]">
                Inventory
              </p>
              <h1 className="max-w-2xl text-4xl font-black leading-tight text-slate-950">
                Product command center
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
                Browse stock, pricing, units, and barcodes in one calmer
                workspace.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <Package size={20} className="mb-4 text-[#4663ff]" />
                <div className="text-2xl font-black text-slate-950">
                  {products.length}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Products
                </div>
              </div>
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <Boxes size={20} className="mb-4 text-[#4663ff]" />
                <div className="text-2xl font-black text-slate-950">
                  {formatNumber(totalQuantity, 2)}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Quantity
                </div>
              </div>
              <div className="rounded-3xl border border-[#e5ebff] bg-[#f8faff] p-4">
                <TrendingUp size={20} className="mb-4 text-[#4663ff]" />
                <div className="text-2xl font-black text-slate-950">
                  {money(totalValue)}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  Retail Value
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-[#e5ebff] bg-white/60 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="h-12 w-full rounded-2xl border border-[#dbe4ff] bg-white/90 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10"
                placeholder="Search by name, unit, or barcode"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={refetch}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#dbe4ff] bg-white px-4 text-sm font-bold text-slate-600 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#4663ff] px-5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8]"
              >
                <PackagePlus size={17} />
                Add product
              </button>
            </div>
          </div>
        </section>

        {(error || actionError) && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {actionError || error}
          </div>
        )}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const productBarcodes = barcodesByProduct[product.id] || [];

            return (
              <article
                key={product.id}
                className="group overflow-hidden rounded-2xl border border-white/80 bg-white/90 shadow-[0_12px_40px_rgba(70,99,255,0.10)] transition hover:-translate-y-0.5 hover:border-[#cbd7ff] hover:shadow-[0_18px_54px_rgba(70,99,255,0.16)]"
              >
                <div className="relative h-28 bg-[#f8faff]">
                  {product.logo ? (
                    <img
                      src={product.logo}
                      alt={product.name || "Product"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-[#4663ff]">
                      <Package size={28} />
                      <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                        No Image
                      </span>
                    </div>
                  )}

                  <div className="absolute left-3 top-3 rounded-xl bg-white/90 px-2.5 py-1.5 text-[11px] font-black text-[#4663ff] shadow-sm backdrop-blur">
                    ID {product.id}
                  </div>

                  <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-slate-600 shadow-sm backdrop-blur transition hover:bg-[#4663ff] hover:text-white"
                      aria-label="Edit product"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenDeleteModel(true);
                        setSelectDeleteProduct(product);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-red-500 shadow-sm backdrop-blur transition hover:bg-red-50"
                      aria-label="Delete product"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h2 className="truncate text-base font-black text-slate-950">
                      {product.name || "Unnamed product"}
                    </h2>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {product.latinName || "No Latin name"}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="rounded-xl bg-[#f8faff] px-2 py-2">
                      <div className="text-[10px] font-semibold text-slate-400">Qty</div>
                      <div className="mt-0.5 truncate text-xs font-black text-slate-950">
                        {formatNumber(product.quantity || 0, 2)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-red-50 px-2 py-2">
                      <div className="text-[10px] font-semibold text-red-300">
                        Cost
                      </div>
                      <div className="mt-0.5 truncate text-xs font-black text-red-600">
                        {money(product.costPrice || 0)}
                      </div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-2 py-2">
                      <div className="text-[10px] font-semibold text-emerald-300">
                        Price
                      </div>
                      <div className="mt-0.5 truncate text-xs font-black text-emerald-700">
                        {money(product.price || 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[#e5ebff] bg-white px-2.5 py-2">
                    <div className="min-w-0 flex items-center gap-1.5 text-xs text-slate-600">
                      <Boxes size={14} className="shrink-0 text-[#4663ff]" />
                      {product.unit_name ? (
                        <span className="truncate font-bold">
                          {product.unit_name}
                          {product.unit_code ? ` (${product.unit_code})` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400">No unit</span>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-slate-400">
                      <Barcode size={13} />
                      {productBarcodes.length}
                    </div>
                  </div>

                  <div className="flex min-h-7 flex-wrap gap-1">
                    {productBarcodes.length ? (
                      productBarcodes.slice(0, 2).map((barcode) => (
                        <span
                          key={barcode.id}
                          className="max-w-full truncate rounded-full bg-[#eef3ff] px-2 py-1 text-[11px] font-bold text-[#4663ff]"
                        >
                          {barcode.barcode}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">No barcode</span>
                    )}
                    {productBarcodes.length > 2 && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-500">
                        +{productBarcodes.length - 2}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {filteredProducts.length === 0 && (
          <div className="rounded-[28px] border border-white/80 bg-white/80 p-12 text-center shadow-[0_24px_80px_rgba(70,99,255,0.12)]">
            <Package size={42} className="mx-auto text-[#4663ff]" />
            <h2 className="mt-4 text-xl font-black text-slate-950">
              No products found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Try another search or add a new product.
            </p>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 right-6 hidden items-center gap-2 rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-sm font-bold text-slate-600 shadow-lg backdrop-blur lg:flex">
        <Barcode size={16} className="text-[#4663ff]" />
        {barcodeCount} barcodes tracked
      </div>

      {isFormOpen && (
        <ProductFormModal
          product={activeProduct}
          units={units}
          barcodes={
            activeProduct ? barcodesByProduct[activeProduct.id] || [] : []
          }
          canManageBarcodes={canManageBarcodes}
          canUseUnits={canUseUnits}
          saving={saving}
          onClose={() => setIsFormOpen(false)}
          onSubmit={submitProduct}
          handleLogo={handleLogo}
        />
      )}

      <DeleteModal
        open={openDeleteModel}
        onClose={() => setOpenDeleteModel(false)}
        onConfirm={() => handleDeleteProduct(selectDeleteProduct)}
        title="Delete Product"
        message="Do you want to delete this product?"
      />
    </div>
  );
}
