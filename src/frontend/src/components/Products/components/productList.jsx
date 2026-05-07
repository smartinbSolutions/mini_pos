import { Edit2, PackagePlus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import ProductFormModal from "./ProductFormModal";
import useProductCatalog from "../hooks/useProductCatalog";
import DeleteModal from "../../../Global/DeleteModel";

const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function ProductList() {
  const catalog = useProductCatalog();
  const {
    products,
    barcodes,
    barcodesByProduct,
    loading,
    saving,
    error,
    unavailableHandlers,
    refetch,
    createProduct,
    updateProduct,
    deleteProduct,
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
  } = catalog;

  if (loading) {
    return <div className="p-6 text-gray-600">Loading product catalog...</div>;
  }

  return (
    <div className="grid gap-6 p-6 ">
      <main className="min-w-0">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-sm text-gray-500">
              Real product, unit, stock, price, and barcode data from the DB.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded border border-gray-300 py-2 pl-9 pr-3 text-sm sm:w-64"
                placeholder="Search products"
              />
            </div>
            <button
              type="button"
              onClick={refetch}
              className="inline-flex items-center justify-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <PackagePlus size={17} />
              Add product
            </button>
          </div>
        </div>

        {(error || actionError) && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {actionError || error}
          </div>
        )}

        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-gray-100 text-sm text-gray-700">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Barcodes</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Cost</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredProducts.map((product) => {
                  const productBarcodes = barcodesByProduct[product.id] || [];

                  return (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {product.name || "Unnamed product"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.latinName || `ID ${product.id}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {product.unit_name ? (
                          <>
                            {product.unit_name}
                            {product.unit_code ? (
                              <span className="text-gray-400">
                                {" "}
                                ({product.unit_code})
                              </span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-gray-400">No unit</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex max-w-xs flex-wrap gap-1">
                          {productBarcodes.length ? (
                            productBarcodes.map((barcode) => (
                              <span
                                key={barcode.id}
                                className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700"
                              >
                                {barcode.barcode}
                              </span>
                            ))
                          ) : (
                            <span className="text-sm text-gray-400">
                              No barcode
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {money.format(product.quantity || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-red-600">
                        {money.format(product.costPrice || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-700">
                        {money.format(product.price || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="rounded p-2 text-gray-500 hover:bg-gray-100"
                            aria-label="Edit product"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => (
                              setOpenDeleteModel(true),
                              setSelectDeleteProduct(product)
                            )}
                            className="rounded p-2 text-red-500 hover:bg-red-50"
                            aria-label="Delete product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="p-8 text-center text-sm text-gray-500">
              No products found
            </div>
          )}
        </div>
      </main>

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
        />
      )}

      <DeleteModal
        open={openDeleteModel}
        onClose={() => setOpenDeleteModel(false)}
        onConfirm={() => handleDeleteProduct(selectDeleteProduct)}
        title="Delete Product"
        message="Do You Wnat delete THis Product"
      />
    </div>
  );
}
