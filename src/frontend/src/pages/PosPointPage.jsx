import {
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import SearchableSelect from "../Global/SearchableSelect";
import CheckoutModal from "../components/PosPoint/components/CheckoutModal";
import usePosCheckout from "../components/PosPoint/hooks/usePosCheckout";

const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function PosPointPage() {
  const {
    products,
    customers,
    funds,
    cart,
    selectedCustomerId,
    loading,
    checkingOut,
    error,
    subtotal,
    refetch,
    setSelectedCustomerId,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    checkout,
  } = usePosCheckout();

  const [search, setSearch] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      [product.name, product.latinName, product.unit_name, product.unit_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [products, search]);

  const openCheckout = () => {
    if (!cart.length) {
      setActionError("Add products to the cart before checkout.");
      return;
    }

    if (!funds.length) {
      setActionError("No funds are available for payment.");
      return;
    }

    setActionError("");
    setIsCheckoutOpen(true);
  };

  const completeCheckout = async (details) => {
    await checkout(details);
    setActionError("");
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading POS data...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto flex h-[calc(100vh-2rem)] min-h-[720px] max-w-[1600px] gap-4">
        {/* Products */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-xl shadow-slate-200/70 backdrop-blur">
          <div className="border-b border-slate-200 bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-5 text-white">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-slate-200">
                  Point of Sale
                </div>

                <h1 className="text-3xl font-black tracking-tight">
                  POS Checkout
                </h1>

                <p className="mt-1 text-sm text-slate-300">
                  Add products quickly, manage quantities, then complete
                  payment.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-white/10 bg-white/95 pl-10 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 focus:ring-blue-400/30 sm:w-80"
                    placeholder="Search products, unit, code..."
                  />
                </div>

                <button
                  type="button"
                  onClick={refetch}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/20"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {(error || actionError) && (
            <div className="mx-6 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {actionError || error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <div>
              <p className="text-sm font-bold text-slate-900">Products</p>
              <p className="text-xs text-slate-500">
                {filteredProducts.length} item
                {filteredProducts.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700">
              Cart: {cart.length}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {filteredProducts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => {
                      addToCart(product);
                      setActionError("");
                    }}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-100"
                  >
                    <div className="p-4">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                          <ShoppingCart size={20} />
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-black text-emerald-700">
                          {money.format(product.price || 0)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-slate-950">
                          {product.name || "Unnamed product"}
                        </h3>

                        <p className="mt-1 truncate text-xs font-medium text-slate-500">
                          {product.latinName ||
                            product.unit_name ||
                            `ID ${product.id}`}
                        </p>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400">Unit</p>
                          <p className="mt-1 truncate font-bold text-slate-700">
                            {product.unit_name || "No unit"}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 px-3 py-2">
                          <p className="text-slate-400">Stock</p>
                          <p className="mt-1 truncate font-bold text-slate-700">
                            {money.format(product.quantity || 0)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-950 py-2.5 text-sm font-bold text-white transition group-hover:bg-blue-600">
                        Add to cart
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center">
                <div className="max-w-sm rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
                    <Search size={24} />
                  </div>

                  <h3 className="text-lg font-black text-slate-900">
                    No products found
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Try another product name, unit, or code.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Cart */}
        <aside className="hidden w-[420px] shrink-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70 lg:flex">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <ShoppingCart size={20} />
                </div>

                <div>
                  <h2 className="text-xl font-black text-slate-950">Cart</h2>
                  <p className="text-xs text-slate-500">
                    {cart.length} selected item{cart.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={clearCart}
                disabled={!cart.length}
                className="rounded-xl px-3 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Clear
              </button>
            </div>

            <div className="flex flex-col gap-1.5 text-sm font-bold text-slate-700">
              <span>Customer</span>
              <SearchableSelect
                label=""
                labelWidth="0"
                placeholder="Walk-in customer"
                options={[
                  { id: "", name: "Walk-in customer", phone: "", address: "" },
                  ...customers,
                ]}
                selectedValue={selectedCustomerId}
                onChange={(customer) =>
                  setSelectedCustomerId(customer.id ? String(customer.id) : "")
                }
                getOptionLabel={(customer) =>
                  [
                    customer.name || "Walk-in customer",
                    customer.phone,
                    customer.address,
                  ]
                    .filter(Boolean)
                    .join(" - ")
                }
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-100 text-slate-400">
                    <ShoppingCart size={28} />
                  </div>

                  <h3 className="font-black text-slate-900">Cart is empty</h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Click any product to start a sale.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate font-black text-slate-950">
                          {item.name}
                        </h3>

                        <p className="mt-1 text-xs font-medium text-slate-500">
                          {money.format(item.price || 0)} each
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-xl p-2 text-red-500 transition hover:bg-red-100"
                        aria-label="Remove item"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.qty - 1)}
                          className="p-2.5 text-slate-600 transition hover:bg-slate-100"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={15} />
                        </button>

                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={item.qty}
                          onChange={(event) =>
                            updateQuantity(item.id, event.target.value)
                          }
                          className="w-14 border-x border-slate-200 bg-white px-2 text-center text-sm font-bold outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          className="p-2.5 text-slate-600 transition hover:bg-slate-100"
                          aria-label="Increase quantity"
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-400">Subtotal</p>
                        <p className="font-black text-slate-950">
                          {money.format((item.price || 0) * item.qty)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 bg-white p-5">
            <div className="mb-4 rounded-3xl bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Total amount</span>
                <span>
                  {cart.length} item{cart.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-2 text-3xl font-black">
                {money.format(subtotal)}
              </div>
            </div>

            <button
              type="button"
              onClick={openCheckout}
              disabled={!cart.length || checkingOut}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 text-base font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingOut ? "Processing..." : "Checkout"}
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile cart action */}
      <div className="fixed inset-x-4 bottom-4 z-40 rounded-3xl border border-slate-200 bg-white p-3 shadow-2xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-500">Cart total</p>
            <p className="text-xl font-black text-slate-950">
              {money.format(subtotal)}
            </p>
          </div>

          <button
            type="button"
            onClick={openCheckout}
            disabled={!cart.length || checkingOut}
            className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            Checkout ({cart.length})
          </button>
        </div>
      </div>

      {isCheckoutOpen && (
        <CheckoutModal
          funds={funds}
          total={subtotal}
          checkingOut={checkingOut}
          onClose={() => setIsCheckoutOpen(false)}
          onCheckout={completeCheckout}
        />
      )}
    </div>
  );
}
