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
  X,
  Check,
  ArrowBigLeft,
  Monitor,
  ArrowBigRight,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "../../../Global/SearchableSelect";
import usePosCheckout from "../hooks/usePosCheckout";
import { formatNumber } from "../../../Global/FormatNumber";
import useWeight from "../hooks/useWeight";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { getAssetUrl } from "../../../Global/assetUrl";
import { useTranslation } from "react-i18next";
import { ToastContainer } from "react-toastify";
import POSSystemEditPriceProdcutCart from "./POSSystemEditPriceProdcutCart";
import POSSystemEditTotalPrice from "./POSSystemEditTotalPrice";
import UnifiedCheckoutModal from "./CheckoutCombinedModal";
import { useAuth } from "../../../Global/AuthContext";
import { Link } from "react-router-dom";

export default function POSSystem() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { user, isAdmin, logout } = useAuth();

  const [currentWeight, setCurrentWeight] = useState(0);

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newPrice, setNewPrice] = useState("");

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
    discount,
    setDiscount,
    selectedCustomerId,
    loading,
    checkingOut,
    error,
    subtotal,
    netTotal,
    refetch,
    setSelectedCustomerId,
    addToCart,
    updateQuantity,
    updatePrice,
    removeFromCart,
    clearCart,
    checkout,
  } = usePosCheckout({ weight });
  const { money, primaryCurrency } = usePrimaryCurrency();

  const openCustomerDisplay = () => {
    window.api?.openCustomerDisplay?.();
  };

  useEffect(() => {
    window.api?.pushCartToCustomerDisplay?.({
      items: cart,
      total: netTotal,
      currencyCode: primaryCurrency?.symbol || primaryCurrency?.code || "",
    });
  }, [cart, netTotal, primaryCurrency]);

  const activeWeight = Number(currentWeight) > 0 ? Number(currentWeight) : 0;

  const [selectedScalePort, setSelectedScalePort] = useState("");
  const [search, setSearch] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCheckoutMultiOpen, setIsCheckoutMultiOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isTotalModalOpen, setIsTotalModalOpen] = useState(false);
  const [customNetTotal, setCustomNetTotal] = useState("");

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      [product.name, product.latinName, product.unit_name, product.unit_code]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [products, search]);

  const openPriceModal = (item) => {
    setEditingItem(item);
    setNewPrice(item.price);
    setIsPriceModalOpen(true);
  };

  const handleSavePrice = () => {
    if (editingItem && newPrice !== "") {
      updatePrice(editingItem.id, newPrice);
    }
    setIsPriceModalOpen(false);
    setEditingItem(null);
  };

  const openTotalModal = () => {
    setCustomNetTotal(netTotal.toString());
    setIsTotalModalOpen(true);
  };

  const handleSaveTotal = () => {
    const targetTotal = parseFloat(customNetTotal);
    if (!isNaN(targetTotal) && targetTotal >= 0 && targetTotal <= subtotal) {
      const calculatedDiscount = subtotal - targetTotal;
      setDiscount({ type: "amount", value: calculatedDiscount.toFixed(2) });
    }
    setIsTotalModalOpen(false);
  };

  const openMultiCheckout = () => {
    if (!cart.length) {
      setActionError(t("screens.pos.addBeforeCheckout"));
      return;
    }
    if (!funds.length) {
      setActionError(t("screens.pos.noFundsForPayment"));
      return;
    }
    setActionError("");
    setIsCheckoutMultiOpen(true);
  };

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
    setIsCheckoutMultiOpen(false);
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
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px]">
        <main className="flex min-w-0 flex-col">
          {/* HEADER — single dense bar */}
          <div className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/90 shadow-sm shadow-stone-200/50 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              {isAdmin && (
                <Link
                  to="/"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-600 shadow-sm transition-all duration-200 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-100 active:scale-95"
                  aria-label="Go Back"
                >
                  {!isRtl ? (
                    <ArrowBigLeft size={19} strokeWidth={2.2} />
                  ) : (
                    <ArrowBigRight size={19} strokeWidth={2.2} />
                  )}
                </Link>
              )}

              <div className="min-w-0 shrink-0">
                <h1 className="truncate text-lg font-black leading-tight tracking-tight text-stone-950">
                  {t("screens.pos.title")}
                </h1>
                <p className="truncate text-[11px] font-semibold tracking-wide text-stone-400">
                  {t("screens.pos.subtitle")}
                </p>
              </div>

              <div className="flex h-10 items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                <div className="flex h-full items-center gap-1.5 border-r border-stone-200 px-2.5">
                  <Scale
                    size={14}
                    className={
                      isScaleConnected ? "text-teal-600" : "text-stone-400"
                    }
                  />
                  <span className="min-w-[84px] text-xs font-bold">
                    {activeWeight ? `${formatNumber(weight)} KG` : scaleStatus}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    isScaleConnected
                      ? disconnectScale()
                      : connectScale(selectedScalePort)
                  }
                  className={`h-full px-3 text-xs font-bold transition ${
                    isScaleConnected
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-teal-700 hover:bg-teal-50"
                  }`}
                >
                  {isScaleConnected
                    ? t("screens.pos.disconnect")
                    : t("screens.pos.connect")}
                </button>
              </div>

              {!isScaleConnected && scalePorts.length > 1 && (
                <select
                  value={selectedScalePort}
                  onChange={(event) => setSelectedScalePort(event.target.value)}
                  className="h-10 max-w-[160px] rounded-xl border border-stone-200 bg-white px-2.5 text-xs text-stone-800 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
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

              <div className="relative min-w-[200px] flex-1">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("screens.pos.search")}
                  className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-sm text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/10"
                />
              </div>

              <button
                type="button"
                onClick={refetch}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-teal-200 hover:bg-teal-50"
              >
                <RefreshCw size={14} />
                {t("common.refresh")}
              </button>

              <button
                type="button"
                onClick={openCustomerDisplay}
                className="flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 text-xs font-bold text-stone-700 transition hover:border-teal-200 hover:bg-teal-50"
              >
                <Monitor size={14} />
                {t("screens.pos.customerDisplay")}
              </button>

              {/* USER + LOGOUT */}
              <div className="ml-auto flex h-10 shrink-0 items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 pl-3 pr-1.5">
                <UserIcon size={14} className="text-stone-500" />
                <span className="max-w-[120px] truncate text-xs font-bold text-stone-800">
                  {user?.full_name || user?.username}
                </span>
                <button
                  type="button"
                  onClick={logout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-rose-50 hover:text-rose-500"
                  aria-label={t("navigation.logout")}
                >
                  <LogOut size={15} />
                </button>
              </div>
            </div>

            {(error || actionError) && (
              <div className="px-4 pb-3">
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {actionError || error}
                </div>
              </div>
            )}
          </div>

          {/* STATS STRIP */}
          <div className="grid grid-cols-2 gap-3 p-4 pb-0">
            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-sm shadow-stone-200/70">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  {t("ui.products")}
                </p>
                <h2 className="text-xl font-black text-stone-950">
                  {filteredProducts.length}
                </h2>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                <Package2 size={18} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-2.5 shadow-sm shadow-stone-200/70">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">
                  {t("ui.totalWithOutDiscont")}
                </p>
                <h2 className="truncate text-xl font-black text-stone-950">
                  {money(subtotal)}
                </h2>
              </div>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Wallet size={18} />
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 pb-28 lg:pb-4">
            {filteredProducts.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      addToCart(
                        product,
                        activeWeight || 1,
                        Boolean(activeWeight)
                      );
                      setActionError("");
                    }}
                    className="group overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-sm shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-lg hover:shadow-teal-100"
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
                          <Package2 size={28} />
                        </div>
                      )}

                      <div className="absolute right-2 top-2 rounded-lg bg-white/95 px-2 py-1 text-xs font-black text-teal-700 shadow-sm backdrop-blur">
                        {money(product.price || 0)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-2.5">
                      <h3 className="truncate text-sm font-black text-stone-950">
                        {product.name || t("ui.unnamedProduct")}
                      </h3>
                      <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-stone-600">
                        {formatNumber(product.quantity || 0, 2)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/70">
                <div className="text-center">
                  <Search size={34} className="mx-auto text-stone-400" />
                  <h2 className="mt-3 text-lg font-black text-stone-950">
                    {t("screens.pos.emptyProducts")}
                  </h2>
                  <p className="mt-1.5 text-sm text-stone-500">
                    {t("screens.pos.emptyProductsHint")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="hidden border-l border-stone-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-stone-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-stone-950">
                  {t("screens.pos.currentCart")}
                </h2>
                <p className="text-xs text-stone-500">
                  {t("screens.pos.itemCount", { count: cart.length })}
                </p>
              </div>
              <button
                type="button"
                onClick={clearCart}
                disabled={!cart.length}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("screens.pos.clear")}
              </button>
            </div>

            <div className="mt-3">
              <SearchableSelect
                label=""
                labelWidth="0"
                placeholder={t("screens.pos.walkInCustomer")}
                options={[
                  {
                    id: "",
                    name: t("screens.pos.walkInCustomer"),
                    phone: "",
                    address: "",
                  },
                  ...customers?.data,
                ]}
                selectedValue={selectedCustomerId}
                onChange={(customer) =>
                  setSelectedCustomerId(customer.id ? String(customer.id) : "")
                }
                getOptionLabel={(customer) =>
                  [
                    customer.name || t("screens.pos.walkInCustomer"),
                    customer.phone,
                  ]
                    .filter(Boolean)
                    .join(" - ")
                }
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto p-3">
            {cart.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50/70 text-center">
                <div>
                  <ShoppingCart size={40} className="mx-auto text-stone-400" />
                  <h3 className="mt-3 text-base font-black text-stone-950">
                    {t("screens.pos.cartEmpty")}
                  </h3>
                  <p className="mt-1.5 text-sm text-stone-500">
                    {t("screens.pos.cartEmptyHint")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-stone-200 bg-stone-50 p-3"
                    onClick={() => openPriceModal(item)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 truncate text-sm font-black text-stone-950">
                        {item.name}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromCart(item.id);
                        }}
                        className="rounded-lg bg-rose-50 p-1.5 text-rose-600 transition hover:bg-rose-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex h-9 items-center overflow-hidden rounded-lg border border-stone-200 bg-white">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(
                              item.id,
                              item.qty === 1 ? -1 : item.qty - 1
                            );
                          }}
                          className="flex h-9 w-9 items-center justify-center text-stone-700 transition hover:bg-stone-100"
                        >
                          <Minus size={13} />
                        </button>

                        <input
                          type="number"
                          value={item.qty}
                          onChange={(event) => {
                            event.stopPropagation();
                            updateQuantity(item.id, event.target.value);
                          }}
                          className="h-9 w-14 bg-transparent text-center text-sm font-black text-stone-950 outline-none"
                        />

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, item.qty + 1);
                          }}
                          className="flex h-9 w-9 items-center justify-center text-stone-700 transition hover:bg-stone-100"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-stone-500">
                          {t("ui.subtotal")}
                        </p>
                        <h3 className="text-base font-black text-teal-700">
                          {money((item.price || 0) * item.qty)}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2.5 border-t border-stone-200 p-4">
            {cart.length > 0 && (
              <div className="rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-xs font-black text-stone-800">
                    {t("ui.discount")}
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                    {t("ui.optional")}
                  </span>
                </div>

                <div className="grid grid-cols-[80px_1fr] gap-2">
                  <select
                    value={discount.type}
                    onChange={(e) =>
                      setDiscount((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="h-9 rounded-lg border border-stone-300 bg-stone-50 px-2 text-sm font-semibold outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="amount">$</option>
                    <option value="percent">%</option>
                  </select>

                  <input
                    type="number"
                    value={discount.value}
                    onChange={(e) =>
                      setDiscount((prev) => ({
                        ...prev,
                        value: e.target.value,
                      }))
                    }
                    placeholder="0.00"
                    className="h-9 rounded-lg border border-stone-300 bg-white px-3 text-center text-sm font-bold outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={openTotalModal}
                  className="mt-2.5 flex h-10 w-full items-center justify-center rounded-lg bg-teal-600 text-sm font-black text-white shadow-md shadow-teal-200 transition hover:bg-teal-700 active:scale-[0.99]"
                >
                  {t("screens.pos.changeTotal")}
                </button>
              </div>
            )}

            <div
              className="cursor-pointer rounded-xl bg-teal-500 p-4 text-white shadow-lg shadow-teal-200"
              onClick={openCheckout}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-black uppercase tracking-wide">
                  {t("screens.pos.totalAmount")}
                </span>
                <span className="text-[10px] font-black uppercase tracking-wide">
                  {t("screens.pos.itemCount", { count: cart.length })}
                </span>
              </div>
              {Number(discount) > 0 && (
                <p className="mt-0.5 text-xs font-bold line-through opacity-75">
                  {money(subtotal)}
                </p>
              )}
              <h2 className="mt-0.5 truncate text-3xl font-black tracking-tight">
                {money(netTotal)}
              </h2>
            </div>
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
                {money(netTotal)}
              </h2>
            </div>
            <button
              type="button"
              onClick={openCheckout}
              disabled={!cart.length || checkingOut}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-black text-white transition hover:bg-teal-700"
            >
              {t("screens.pos.checkout")} ({cart.length})
            </button>
          </div>
        </div>
      </div>

      {isTotalModalOpen && (
        <POSSystemEditTotalPrice
          isTotalModalOpen={isTotalModalOpen}
          setIsTotalModalOpen={setIsTotalModalOpen}
          subtotal={netTotal}
          customNetTotal={customNetTotal}
          setCustomNetTotal={setCustomNetTotal}
          handleSaveTotal={handleSaveTotal}
          money={money}
          t={t}
        />
      )}
      {isPriceModalOpen && (
        <POSSystemEditPriceProdcutCart
          setIsPriceModalOpen={setIsPriceModalOpen}
          t={t}
          newPrice={newPrice}
          setNewPrice={setNewPrice}
          handleSavePrice={handleSavePrice}
          editingItem={editingItem}
          isPriceModalOpen={isPriceModalOpen}
        />
      )}

      {isCheckoutOpen && (
        <UnifiedCheckoutModal
          funds={funds}
          total={netTotal}
          checkingOut={checkingOut}
          onClose={() => setIsCheckoutOpen(false)}
          onCheckout={completeCheckout}
          t={t}
          money={money}
        />
      )}

      <ToastContainer />
    </div>
  );
}
