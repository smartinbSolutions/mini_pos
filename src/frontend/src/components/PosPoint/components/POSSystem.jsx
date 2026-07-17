import {
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  Scale,
  Package2,
  Monitor,
  ArrowBigLeft,
  ArrowBigRight,
  LogOut,
  User as UserIcon,
  Receipt,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import DailySummaryModal from "./DailySummary/DailySummaryModal";

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
    search,
    setSearch,
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
    currencies,
  } = usePosCheckout({ weight });
  const { money, primaryCurrency } = usePrimaryCurrency();
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
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
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCheckoutMultiOpen, setIsCheckoutMultiOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isTotalModalOpen, setIsTotalModalOpen] = useState(false);
  const [customNetTotal, setCustomNetTotal] = useState("");

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
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
          <p className="mt-5 text-sm font-semibold text-stone-700">
            {t("screens.pos.loading")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f3ee] text-stone-900">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_440px]">
        {/* MAIN SHOPPING INTERFACE */}
        <main className="flex min-w-0 flex-col h-screen overflow-y-auto pb-28 lg:pb-0">
          {/* HEADER BAR 1 — identity & navigation */}
          <div className="sticky top-0 z-20 border-b border-stone-200/80 bg-white/95 shadow-sm shadow-stone-200/50 backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5">
              {isAdmin && (
                <Link
                  to="/"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 shadow-sm transition-all duration-200 hover:border-stone-300 hover:bg-stone-50 hover:text-stone-900 focus:outline-none focus:ring-4 focus:ring-stone-100 active:scale-95"
                  aria-label="Go Back"
                >
                  {!isRtl ? (
                    <ArrowBigLeft size={22} strokeWidth={2.2} />
                  ) : (
                    <ArrowBigRight size={22} strokeWidth={2.2} />
                  )}
                </Link>
              )}

              <button
                type="button"
                onClick={() => setIsDailySummaryOpen(true)}
                className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 text-sm font-bold text-blue-700 transition hover:bg-blue-100 active:scale-95"
              >
                <Receipt size={18} />
                {t("screens.pos.dailyInvoices", "today Invoices")}
              </button>

              <div className="min-w-0 shrink-0 px-1">
                <h1 className="truncate text-lg font-black leading-tight text-stone-950">
                  {t("screens.pos.title")}
                </h1>
                <p className="truncate text-[11px] font-semibold text-stone-400">
                  {t("screens.pos.subtitle")}
                </p>
              </div>

              <div className="ml-auto flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={refetch}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
                  aria-label={t("common.refresh")}
                >
                  <RefreshCw size={19} />
                </button>

                <button
                  type="button"
                  onClick={openCustomerDisplay}
                  className="flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 active:scale-95"
                >
                  <Monitor size={18} />
                  {t("screens.pos.customerDisplay")}
                </button>

                <div className="flex h-12 shrink-0 items-center gap-2.5 rounded-2xl border border-stone-200 bg-stone-50 pl-4 pr-1.5">
                  <UserIcon size={16} className="text-stone-500" />
                  <span className="max-w-[120px] truncate text-sm font-bold text-stone-800">
                    {user?.full_name || user?.username}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-stone-400 transition hover:bg-rose-50 hover:text-rose-500 active:scale-95"
                    aria-label={t("navigation.logout")}
                  >
                    <LogOut size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* HEADER BAR 2 — search & scale */}
          <div className="sticky top-[65px] z-10 border-b border-stone-200/80 bg-white shadow-sm shadow-stone-200/30">
            <div className="flex flex-wrap items-center gap-2.5 px-4 py-2.5">
              <div className="relative min-w-[220px] flex-1">
                <Search
                  size={17}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400"
                />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("screens.pos.search")}
                  className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50 pl-11 pr-4 text-[15px] font-medium text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                />
              </div>

              <div className="flex h-12 shrink-0 items-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                <div className="flex h-full items-center gap-2 border-r border-stone-200 px-3.5">
                  <Scale
                    size={16}
                    className={
                      isScaleConnected ? "text-blue-600" : "text-stone-400"
                    }
                  />
                  <span className="min-w-[84px] text-sm font-bold">
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
                  className={`h-full px-4 text-sm font-bold transition active:scale-95 ${
                    isScaleConnected
                      ? "text-rose-600 hover:bg-rose-50"
                      : "text-blue-700 hover:bg-blue-50"
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
                  className="h-12 max-w-[170px] shrink-0 rounded-2xl border border-stone-200 bg-white px-3.5 text-sm text-stone-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
            </div>

            {(error || actionError) && (
              <div className="px-4 pb-3">
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                  {actionError || error}
                </div>
              </div>
            )}
          </div>

          {/* PRODUCTS LIST */}
          <div className="flex-1 p-4">
            {products.length > 0 ? (
              <div className="grid gap-3.5 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {products.map((product) => (
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
                    className="group overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm shadow-stone-200/70 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-100 active:scale-[0.97]"
                  >
                    <div className="relative aspect-[4/3] bg-stone-100">
                      {product.logo ? (
                        <img
                          src={getAssetUrl(product.logo)}
                          alt={product.name || t("ui.product")}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-blue-600">
                          <Package2 size={30} />
                        </div>
                      )}

                      <div className="absolute right-2 top-2 rounded-xl bg-white/95 px-2.5 py-1.5 text-sm font-black text-blue-700 shadow-sm backdrop-blur">
                        {money(product.price || 0)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 p-3">
                      <h3 className="truncate text-sm font-black text-stone-950">
                        {product.name || t("ui.unnamedProduct")}
                      </h3>
                      <span className="shrink-0 rounded-lg bg-stone-100 px-2 py-1 text-xs font-bold text-stone-600">
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

        {/* SIDE CART */}
        <aside className="hidden border-l border-stone-200 bg-white lg:flex lg:flex-col h-screen sticky top-0 overflow-hidden">
          {/* CART HEADER */}
          <div className="shrink-0 border-b border-stone-200 p-4 bg-white">
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
                className="h-11 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-bold text-rose-600 transition hover:bg-rose-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("screens.pos.clear")}
              </button>
            </div>

            <div className="mt-3.5">
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
                  ...customers,
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

          {/* CART BODY */}
          <div className="flex-1 overflow-y-auto p-3.5 bg-stone-50/30">
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
              <div className="space-y-2.5">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-stone-200 bg-white p-3.5 cursor-pointer shadow-sm hover:border-blue-200 hover:shadow-md transition duration-150"
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
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 active:scale-90"
                        aria-label={t("screens.pos.clear")}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex h-11 items-center overflow-hidden rounded-xl border border-stone-200 bg-white">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(
                              item.id,
                              item.qty === 1 ? -1 : item.qty - 1
                            );
                          }}
                          className="flex h-11 w-11 items-center justify-center text-stone-700 transition hover:bg-stone-100 active:scale-90"
                        >
                          <Minus size={15} />
                        </button>

                        <input
                          type="number"
                          value={item.qty}
                          onChange={(event) => {
                            event.stopPropagation();
                            updateQuantity(item.id, event.target.value);
                          }}
                          className="h-11 w-14 bg-transparent text-center text-base font-black text-stone-950 outline-none"
                        />

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateQuantity(item.id, item.qty + 1);
                          }}
                          className="flex h-11 w-11 items-center justify-center text-stone-700 transition hover:bg-stone-100 active:scale-90"
                        >
                          <Plus size={15} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-[10px] text-stone-500">
                          {t("ui.subtotal")}
                        </p>
                        <h3 className="text-base font-black text-blue-700">
                          {money((item.price || 0) * item.qty)}
                        </h3>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CART FOOTER */}
          <div className="shrink-0 space-y-3 border-t border-stone-200 bg-white p-4 shadow-lg shadow-stone-300">
            {cart.length > 0 && (
              <div className="rounded-2xl border border-stone-200 bg-white p-3.5 shadow-sm">
                <div className="mb-2.5 flex items-center justify-between">
                  <h3 className="text-sm font-black text-stone-800">
                    {t("ui.discount")}
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                    {t("ui.optional")}
                  </span>
                </div>

                <div className="grid grid-cols-[84px_1fr] gap-2.5">
                  <select
                    value={discount.type}
                    onChange={(e) =>
                      setDiscount((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className="h-12 rounded-xl border border-stone-300 bg-stone-50 px-2 text-base font-semibold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                    className="h-12 rounded-xl border border-stone-300 bg-white px-3 text-center text-base font-bold outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <button
                  type="button"
                  onClick={openTotalModal}
                  className="mt-2.5 flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-black text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 active:scale-[0.98]"
                >
                  {t("screens.pos.changeTotal")}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={openCheckout}
              className="w-full cursor-pointer rounded-2xl bg-blue-500 p-5 text-left text-white shadow-lg shadow-blue-200 transition hover:bg-blue-600 active:scale-[0.98]"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] font-black uppercase">
                  {t("screens.pos.totalAmount")}
                </span>
                <span className="text-[11px] font-black uppercase">
                  {t("screens.pos.itemCount", { count: cart.length })}
                </span>
              </div>
              {Number(discount.value) > 0 && (
                <p className="mt-0.5 text-xs font-bold line-through opacity-75">
                  {money(subtotal)}
                </p>
              )}
              <h2 className="mt-0.5 truncate text-3xl font-black">
                {money(netTotal)}
              </h2>
            </button>
          </div>
        </aside>
      </div>

      {/* MOBILE LOWER BAR CONTROLS */}
      <div className="fixed inset-x-4 bottom-4 z-40 lg:hidden">
        <div className="rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-2xl shadow-stone-300/60 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase text-stone-500">
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
              className="h-14 rounded-2xl bg-blue-600 px-6 text-base font-black text-white transition hover:bg-blue-700 active:scale-95"
            >
              {t("screens.pos.checkout")} ({cart.length})
            </button>
          </div>
        </div>
      </div>

      {/* MODALS */}
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
      <DailySummaryModal
        isOpen={isDailySummaryOpen}
        onClose={() => setIsDailySummaryOpen(false)}
        t={t}
        money={money}
        funds={funds}
      />
      <ToastContainer />
    </div>
  );
}
