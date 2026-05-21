import {
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Scale,
  Wallet,
  Package2,
} from "lucide-react";
import { useMemo, useState } from "react";
import SearchableSelect from "../../../Global/SearchableSelect";
import CheckoutModal from "../components/CheckoutModal";
import usePosCheckout from "../hooks/usePosCheckout";
import { formatNumber } from "../../../Global/FormatNumber";
import useWeight from "../hooks/useWeight";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { getAssetUrl } from "../../../Global/assetUrl";
import { useTranslation } from "react-i18next";

export default function POSSystem() {
  const { t } = useTranslation();
  const [currentWeight, setCurrentWeight] = useState(0);

  const {
    weight,
    status: scaleStatus,
    isConnected: isScaleConnected,
    ports: scalePorts,
    connect: connectScale,
    close: disconnectScale,
  } = useWeight({
    setCurrentWeight,
  });

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
  } = usePosCheckout({ weight });
  const { money } = usePrimaryCurrency();

  const activeWeight = Number(currentWeight) > 0 ? Number(currentWeight) : 0;

  const [selectedScalePort, setSelectedScalePort] = useState("");
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
      setActionError(t("screens.pos.addBeforeCheckout"));
      return;
    }

    if (!funds.length) {
      setActionError(t("screens.pos.noFundsForPayment"));
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
      <div className="flex min-h-screen items-center justify-center bg-stone-50">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-xl shadow-stone-200/70">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
          <p className="mt-5 text-sm font-semibold text-stone-700">
            {t("screens.pos.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-stone-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
        <main className="flex min-w-0 flex-col">
          <div className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 shadow-sm shadow-stone-200/50 backdrop-blur-xl">
            <div className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500 text-white shadow-lg shadow-teal-500/20">
                  <ShoppingCart size={21} strokeWidth={2.6} />
                </div>

                <div>
                  <h1 className="text-xl font-black tracking-tight text-stone-950 sm:text-2xl">
                    {t("screens.pos.title")}
                  </h1>
                  <p className="text-xs font-medium text-stone-500">
                    {t("screens.pos.subtitle")}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex h-11 items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                  <div className="flex h-full items-center gap-2 border-r border-stone-200 px-3">
                    <Scale
                      size={16}
                      className={
                        isScaleConnected ? "text-teal-600" : "text-stone-400"
                      }
                    />
                    <span className="min-w-[96px] text-sm font800 font-bold">
                      {activeWeight
                        ? `${formatNumber(weight)} KG`
                        : scaleStatus}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      isScaleConnected
                        ? disconnectScale()
                        : connectScale(selectedScalePort)
                    }
                    className={`h-full px-4 text-sm font-bold transition ${
                      isScaleConnected
                        ? "text-rose-600 hover:bg-rose-50"
                        : "text-teal-700 hover:bg-teal-50"
                    }`}
                  >
                    {isScaleConnected ? t("screens.pos.disconnect") : t("screens.pos.connect")}
                  </button>
                </div>

                {!isScaleConnected && scalePorts.length > 1 && (
                  <select
                    value={selectedScalePort}
                    onChange={(event) =>
                      setSelectedScalePort(event.target.value)
                    }
                    className="h-11 max-w-[220px] rounded-xl border border-stone-200 bg-white px-3 text-sm text-stone-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                  >
                    <option value="">{t("screens.pos.autoCom")}</option>

                    {scalePorts.map((port) => (
                      <option key={port.path} value={port.path}>
                        {[port.path, port.friendlyName || port.manufacturer]
                          .filter(Boolean)
                          .join(" - ")}
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative w-full sm:w-[320px]">
                  <Search
                    size={17}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                  />

                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={t("screens.pos.search")}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                  />
                </div>

                <button
                  type="button"
                  onClick={refetch}
                  className="flex h-11 items-center gap-2 rounded-xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-teal-200 hover:bg-teal-50"
                >
                  <RefreshCw size={16} />
                  {t("common.refresh")}
                </button>
              </div>
            </div>

            {(error || actionError) && (
              <div className="px-4 pb-4">
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {actionError || error}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-3 p-4 md:grid-cols-3">
            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/70">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("ui.products")}
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-stone-950">
                    {filteredProducts.length}
                  </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <Package2 size={23} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/70">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("screens.pos.cartItems")}
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-stone-950">
                    {cart.length}
                  </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <ShoppingCart size={23} />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm shadow-stone-200/70">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                    {t("ui.total")}
                  </p>
                  <h2 className="mt-2 truncate text-3xl font-black text-stone-950">
                    {money(subtotal)}
                  </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Wallet size={23} />
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-4 pb-28 lg:pb-4">
            {filteredProducts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      addToCart(
                        product,
                        activeWeight || 1,
                        Boolean(activeWeight),
                      );
                      setActionError("");
                    }}
                    className="group overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100"
                  >
                    <div className="relative aspect-[4/3] bg-stone-100">
                      {product.logo ? (
                        <img
                          src={getAssetUrl(product.logo)}
                          alt={product.name || t("ui.product")}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-teal-600">
                          <Package2 size={34} />
                        </div>
                      )}

                      <div className="absolute right-3 top-3 rounded-xl bg-white/95 px-3 py-1.5 text-sm font-black text-teal-700 shadow-sm backdrop-blur">
                        {money(product.price || 0)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-black text-stone-950">
                          {product.name || t("ui.unnamedProduct")}
                        </h3>
                      </div>

                      <span className="shrink-0 rounded-xl bg-stone-100 px-2.5 py-1 text-xs font-bold text-stone-600">
                        {formatNumber(product.quantity || 0, 2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[460px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/70">
                <div className="text-center">
                  <Search size={38} className="mx-auto text-stone-400" />
                  <h2 className="mt-4 text-xl font-black text-stone-950">
                    {t("screens.pos.emptyProducts")}
                  </h2>
                  <p className="mt-2 text-sm text-stone-500">
                    {t("screens.pos.emptyProductsHint")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden border-l border-stone-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-stone-200 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-stone-950">
                  {t("screens.pos.currentCart")}
                </h2>
                <p className="mt-1 text-sm text-stone-500">
                  {t("screens.pos.itemCount", { count: cart.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={clearCart}
                disabled={!cart.length}
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("screens.pos.clear")}
              </button>
            </div>

            <div className="mt-5">
              <p className="mb-2 text-sm font-bold text-stone-700">{t("ui.customer")}</p>

              <SearchableSelect
                label=""
                labelWidth="0"
                placeholder={t("screens.pos.walkInCustomer")}
                options={[
                  { id: "", name: t("screens.pos.walkInCustomer"), phone: "", address: "" },
                  ...customers,
                ]}
                selectedValue={selectedCustomerId}
                onChange={(customer) =>
                  setSelectedCustomerId(customer.id ? String(customer.id) : "")
                }
                getOptionLabel={(customer) =>
                  [customer.name || t("screens.pos.walkInCustomer"), customer.phone]
                    .filter(Boolean)
                    .join(" - ")
                }
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 text-center">
                <div>
                  <ShoppingCart size={46} className="mx-auto text-stone-400" />
                  <h3 className="mt-4 text-lg font-black text-stone-950">
                    {t("screens.pos.cartEmpty")}
                  </h3>
                  <p className="mt-2 text-sm text-stone-500">
                    {t("screens.pos.cartEmptyHint")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-stone-200 bg-stone-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-stone-950">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs text-stone-500">
                          {money(item.price || 0)} {t("screens.pos.each")}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-xl bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <div className="flex h-10 items-center overflow-hidden rounded-xl border border-stone-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.qty - 1)}
                          className="flex h-10 w-10 items-center justify-center text-stone-700 transition hover:bg-stone-100"
                        >
                          <Minus size={14} />
                        </button>

                        <input
                          type="number"
                          value={item.qty}
                          onChange={(event) =>
                            updateQuantity(item.id, event.target.value)
                          }
                          className="h-10 w-16 bg-transparent text-center text-sm font-black text-stone-950 outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.qty + 1)}
                          className="flex h-10 w-10 items-center justify-center text-stone-700 transition hover:bg-stone-100"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-stone-500">{t("ui.subtotal")}</p>
                        <h3 className="text-lg font-black text-teal-700">
                          {money((item.price || 0) * item.qty)}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="border-t border-stone-200 p-5">
            <div className="rounded-2xl bg-teal-500 p-5 text-white shadow-xl shadow-teal-200">
              <div className="flex items-center justify-between gap-4">
                <span className="text-xs font-black uppercase tracking-wide">
                  {t("screens.pos.totalAmount")}
                </span>

                <span className="text-xs font-black uppercase tracking-wide">
                  {t("screens.pos.itemCount", { count: cart.length })}
                </span>
              </div>

              <h2 className="mt-3 truncate text-4xl font-black tracking-tight">
                {money(subtotal)}
              </h2>
            </div>

            <button
              type="button"
              onClick={openCheckout}
              disabled={!cart.length || checkingOut}
              className="mt-4 flex h-14 w-full items-center justify-center rounded-2xl bg-teal-600 text-lg font-black text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {checkingOut ? t("screens.pos.processing") : t("screens.pos.checkout")}
            </button>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <div className="rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-2xl shadow-stone-300/60 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {t("screens.pos.cartTotal")}
              </p>
              <h2 className="truncate text-2xl font-black text-stone-950">
                {money(subtotal)}
              </h2>
            </div>

            <button
              type="button"
              onClick={openCheckout}
              disabled={!cart.length || checkingOut}
              className="shrink-0 rounded-xl bg-teal-500 px-5 py-3 text-sm font-black text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t("screens.pos.checkout")} ({cart.length})
            </button>
          </div>
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
