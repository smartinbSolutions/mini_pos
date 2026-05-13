import {
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import SearchableSelect from "../../../Global/SearchableSelect";
import CheckoutModal from "../components/CheckoutModal";
import usePosCheckout from "../hooks/usePosCheckout";
const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function POSSystem() {
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
    setIsCheckoutOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm font-medium text-zinc-500">
        Loading POS data...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 p-4 text-zinc-950">
      <div className="mx-auto grid h-[calc(100vh-2rem)] min-h-[720px] max-w-[1600px] grid-cols-1 gap-4 lg:grid-cols-[1fr_420px]">
        <main className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Point of Sale
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Select products, review the cart, and complete payment.
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-10 w-full rounded-md border border-zinc-300 bg-white pl-10 pr-3 text-sm outline-none transition placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 sm:w-80"
                    placeholder="Search products, unit, code..."
                  />
                </div>

                <button
                  type="button"
                  onClick={refetch}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {(error || actionError) && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {actionError || error}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
            <div>
              <p className="text-sm font-semibold">Products</p>
              <p className="text-xs text-zinc-500">
                {filteredProducts.length} item
                {filteredProducts.length === 1 ? "" : "s"} found
              </p>
            </div>

            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-sm font-semibold text-zinc-700">
              Cart: {cart.length}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-5">
            {filteredProducts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    type="button"
                    key={product.id}
                    onClick={() => {
                      addToCart(product);
                      setActionError("");
                    }}
                    className="group rounded-lg border border-zinc-200 bg-white p-4 text-left transition hover:border-zinc-900 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
                        <ShoppingCart size={18} />
                      </div>

                      <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-700">
                        {money.format(product.price || 0)}
                      </span>
                    </div>

                    <h3 className="mt-4 truncate text-sm font-bold text-zinc-950">
                      {product.name || "Unnamed product"}
                    </h3>

                    <p className="mt-1 truncate text-xs text-zinc-500">
                      {product.latinName ||
                        product.unit_name ||
                        `ID ${product.id}`}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-md bg-zinc-50 px-3 py-2">
                        <p className="text-zinc-400">Unit</p>
                        <p className="mt-1 truncate font-semibold text-zinc-700">
                          {product.unit_name || "No unit"}
                        </p>
                      </div>

                      <div className="rounded-md bg-zinc-50 px-3 py-2">
                        <p className="text-zinc-400">Stock</p>
                        <p className="mt-1 truncate font-semibold text-zinc-700">
                          {money.format(product.quantity || 0)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex h-9 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white transition group-hover:bg-emerald-600">
                      Add to cart
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50">
                <div className="text-center">
                  <Search size={28} className="mx-auto text-zinc-400" />
                  <h3 className="mt-3 font-bold text-zinc-900">
                    No products found
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Try another product name, unit, or code.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm lg:flex lg:flex-col">
          <div className="border-b border-zinc-200 p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Cart</h2>
                <p className="text-xs text-zinc-500">
                  {cart.length} selected item{cart.length === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={clearCart}
                disabled={!cart.length}
                className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Trash2 size={16} />
                Clear
              </button>
            </div>

            <div className="space-y-1.5 text-sm font-semibold text-zinc-700">
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
                  [customer.name || "Walk-in customer", customer.phone]
                    .filter(Boolean)
                    .join(" - ")
                }
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full min-h-[320px] items-center justify-center text-center">
                <div>
                  <ShoppingCart size={32} className="mx-auto text-zinc-400" />
                  <h3 className="mt-3 font-bold">Cart is empty</h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    Click any product to start a sale.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-bold">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-500">
                          {money.format(item.price || 0)} each
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-md p-2 text-red-500 transition hover:bg-red-50"
                        aria-label="Remove item"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex overflow-hidden rounded-md border border-zinc-300 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.qty - 1)}
                          className="p-2.5 text-zinc-600 transition hover:bg-zinc-100"
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
                          className="w-14 border-x border-zinc-300 px-2 text-center text-sm font-bold outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          className="p-2.5 text-zinc-600 transition hover:bg-zinc-100"
                          aria-label="Increase quantity"
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-zinc-400">Subtotal</p>
                        <p className="font-bold">
                          {money.format((item.price || 0) * item.qty)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-zinc-200 p-5">
            <div className="mb-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex items-center justify-between text-sm text-zinc-500">
                <span>Total amount</span>
                <span>
                  {cart.length} item{cart.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-2 text-3xl font-bold tracking-tight">
                {money.format(subtotal)}
              </div>
            </div>

            <button
              type="button"
              onClick={openCheckout}
              disabled={!cart.length || checkingOut}
              className="flex h-12 w-full items-center justify-center rounded-md bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {checkingOut ? "Processing..." : "Checkout"}
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-4 bottom-4 z-40 rounded-lg border border-zinc-200 bg-white p-3 shadow-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-zinc-500">Cart total</p>
            <p className="text-xl font-bold">{money.format(subtotal)}</p>
          </div>

          <button
            type="button"
            onClick={openCheckout}
            disabled={!cart.length || checkingOut}
            className="rounded-md bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
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
