import {
  RefreshCw,
  Search,
  Monitor,
  ArrowBigLeft,
  ArrowBigRight,
  LogOut,
  User as UserIcon,
  Receipt,
  X,
  AlertCircle,
  ShoppingBasket,
  Banknote,
} from "lucide-react";
import useLatinMode from "../../../Global/useLatinMode";
import EmptyState from "../../../Global/ui/EmptyState";
import { getStockStatus, useLowStockLevel } from "../../../Global/stockStatus";
import { useEffect, useMemo, useRef, useState } from "react";
import usePosCheckout, { PAGE_SIZE_OPTIONS } from "../hooks/usePosCheckout";
import { formatNumber } from "../../../Global/FormatNumber";
import useWeight from "../hooks/useWeight";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import { ToastContainer, toast } from "react-toastify";
import POSSystemEditPriceProdcutCart from "./POSSystemEditPriceProdcutCart";
import POSSystemEditTotalPrice from "./POSSystemEditTotalPrice";
import UnifiedCheckoutModal from "./CheckoutCombinedModal";
import { useAuth } from "../../../Global/AuthContext";
import { Link } from "react-router-dom";
import DailySummaryModal from "./DailySummary/DailySummaryModal";
import POSProductTile from "./POSProductTile";
import POSCart from "./POSCart";
import SaleDoneModal from "./SaleDoneModal";
import ScaleControl from "./ScaleControl";
import POSSettings, { COLUMN_OPTIONS } from "./POSSettings";
import POSPagination from "./POSPagination";
import POSCategoryFilter from "./POSCategoryFilter";

const COLUMNS_KEY = "pos:columns";

function readColumns() {
  try {
    const saved = localStorage.getItem(COLUMNS_KEY);
    const value = saved === "auto" ? "auto" : Number(saved);
    return COLUMN_OPTIONS.includes(value) ? value : "auto";
  } catch {
    return "auto";
  }
}

export default function POSSystem() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { isLatin } = useLatinMode();

  const { user, isAdmin, logout } = useAuth();
  const lowStockLevel = useLowStockLevel();
  const searchRef = useRef(null);

  // products per row — a screen setting, remembered on this computer
  const [columns, setColumnsState] = useState(readColumns);
  const setColumns = (value) => {
    setColumnsState(value);
    try {
      localStorage.setItem(COLUMNS_KEY, String(value));
    } catch {
      /* storage unavailable — keep it for this session only */
    }
  };

  const [currentWeight, setCurrentWeight] = useState(0);

  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
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
    searchCustomers,
    funds,
    taxes,
    cart,
    search,
    setSearch,
    selectedCustomerId,
    setSelectedCustomerId,
    loading,
    productsLoading,
    checkingOut,
    error,
    subtotal,
    itemDiscountTotal,
    afterItemDiscounts,
    itemTaxTotal,
    invoiceDiscountRate,
    setInvoiceDiscountRate,
    invoiceDiscount,
    afterInvoiceDiscount,
    invoiceTaxes,
    addInvoiceTax,
    removeInvoiceTax,
    clearInvoiceTaxes,
    posTaxMode,
    invoiceTaxValue,
    invoiceNote,
    setInvoiceNote,
    netTotal,
    refetch,
    addToCart,
    updateQuantity,
    updatePrice,
    updateItemDiscountRate,
    updateItemNote,
    removeFromCart,
    clearCart,
    checkout,
    printReceipt,
    clearError,
    allowNegativeStock,
    itemTaxSummary,
    itemDiscountSummary,
    itemsNetTotal,

    allTags,
    selectedTagIds,
    selectTag,
    clearTags,

    pageSize,
    setPageSize,
    page,
    setPage,
    totalPages,
  } = usePosCheckout({ weight });
  const { money, primaryCurrency } = usePrimaryCurrency();
  const editingItem = cart.find((item) => item.id === editingItemId) || null;
  const [isDailySummaryOpen, setIsDailySummaryOpen] = useState(false);
  const openCustomerDisplay = () => {
    window.api?.openCustomerDisplay?.();
  };

  useEffect(() => {
    window.api?.pushCartToCustomerDisplay?.({
      items: cart,
      subtotal,
      itemDiscountTotal,
      afterItemDiscounts,
      itemTaxTotal,
      itemDiscountSummary,
      itemTaxSummary,
      invoiceDiscountRate,
      invoiceDiscount,
      afterInvoiceDiscount,
      invoiceTaxes,
      invoiceTaxValue,
      itemsNetTotal,
      total: netTotal,
      currencyCode: primaryCurrency?.symbol || primaryCurrency?.code || "",
      language: i18n.language,
      isRtl,
    });
  }, [
    cart,
    subtotal,
    itemDiscountTotal,
    afterItemDiscounts,
    itemTaxTotal,
    itemDiscountSummary,
    itemTaxSummary,
    invoiceDiscountRate,
    invoiceDiscount,
    afterInvoiceDiscount,
    invoiceTaxes,
    invoiceTaxValue,
    itemsNetTotal,
    netTotal,
    primaryCurrency,
    i18n.language,
    isRtl,
  ]);

  const activeWeight = Number(currentWeight) > 0 ? Number(currentWeight) : 0;

  const [selectedScalePort, setSelectedScalePort] = useState("");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [isTotalModalOpen, setIsTotalModalOpen] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // Only show scale controls when this computer actually has a scale port.
  const showScale = isScaleConnected || scalePorts.length > 0;

  const qtyInCart = useMemo(() => {
    const map = {};
    for (const item of cart) map[item.id] = Number(item.qty || 0);
    return map;
  }, [cart]);

  const visibleError = actionError || error;

  useEffect(() => {
    searchRef.current?.focus();
  }, [loading]);

  const openPriceModal = (item) => {
    const taxRate = Number(item.tax_rate || 0);
    const qty = Number(item.qty || 1);
    const catalogPrice = Number(item.catalog_price ?? item.price);
    const catalogInclusive =
      taxRate > 0 ? catalogPrice * (1 + taxRate / 100) : catalogPrice;
    const catalogLineTotal = catalogInclusive * qty;

    const discountRate = Number(item.discount_rate || 0);

    // Effective price right now: if a discount is active, apply it to
    // the catalog baseline; otherwise show item.price as-is (covers both
    // "no adjustment" and "a previously saved markup").
    const currentLineTotal =
      discountRate > 0
        ? catalogLineTotal * (1 - discountRate / 100)
        : (taxRate > 0 ? item.price * (1 + taxRate / 100) : item.price) * qty;

    setEditingItemId(item.id);
    setNewPrice(currentLineTotal.toFixed(2));
    setIsPriceModalOpen(true);
  };

  const handleSavePrice = () => {
    if (editingItem) {
      const qty = Number(editingItem.qty || 1);
      const target = Number(newPrice || 0);
      const taxRate = Number(editingItem.tax_rate || 0);
      const catalogPrice = Number(
        editingItem.catalog_price ?? editingItem.price,
      );
      const catalogInclusive =
        taxRate > 0 ? catalogPrice * (1 + taxRate / 100) : catalogPrice;
      const catalogLineTotal = catalogInclusive * qty;

      if (target > catalogLineTotal) {
        // Genuine markup, measured against the TRUE catalog price.
        const perUnitInclusive = target / qty;
        updatePrice(editingItem.id, perUnitInclusive);
        updateItemDiscountRate(editingItem.id, 0);
      } else if (Number(editingItem.price) !== catalogPrice) {
        // A markup was saved earlier but the cashier is now choosing a
        // discount or no change — reset price back to the true catalog
        // baseline so it never stays permanently inflated.
        updatePrice(editingItem.id, catalogInclusive);
      }
      // else: no markup was ever saved, discount_rate is already
      // committed live by the modal — nothing further to persist.
    }
    setIsPriceModalOpen(false);
    setEditingItemId(null);
  };
  const openTotalModal = () => setIsTotalModalOpen(true);

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
    setIsCartDrawerOpen(false);
    setIsCheckoutOpen(true);
  };

  const completeCheckout = async (details) => {
    const result = await checkout(details);

    if (!result?.ok) {
      toast.error(result?.message || t("simple.done.failed"));
      return result;
    }

    setActionError("");
    setIsCheckoutOpen(false);
    setLastSale({
      total: result.receipt?.total ?? netTotal,
      change: Number(details?.change || 0),
      receipt: result.receipt,
      printed: result.printed,
    });
    return result;
  };

  // F2 → search, F9 → pay. Ignored while a window (payment, price…) is open.
  const openCheckoutRef = useRef(null);
  openCheckoutRef.current = openCheckout;
  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector('[role="dialog"]')) return;
      if (e.key === "F2") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      } else if (e.key === "F9") {
        e.preventDefault();
        openCheckoutRef.current?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const finishSale = () => {
    setLastSale(null);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const addProduct = (product) => {
    addToCart(product, activeWeight || 1, Boolean(activeWeight));
    setActionError("");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="ui-card p-8 text-center">
          <div className="mx-auto h-14 w-14 animate-spin rounded-full border-[5px] border-brand border-t-transparent" />
          <p className="mt-5 text-lg font-bold text-ink-soft">
            {t("screens.pos.loading")}
          </p>
        </div>
      </div>
    );
  }

  const cartProps = {
    cart,
    customers,
    searchCustomers,
    selectedCustomerId,
    setSelectedCustomerId,
    clearCart,
    removeFromCart,
    updateQuantity,
    openPriceModal,
    openTotalModal,
    openCheckout,
    checkingOut,
    rawSubtotal: subtotal,
    itemDiscountSummary,
    itemTaxSummary,
    invoiceDiscount,
    invoiceTaxes,
    afterInvoiceDiscount,
    invoiceTaxValue,
    netTotal,
    money,
    t,
  };

  const headerBtn =
    "flex h-12 shrink-0 items-center gap-2 rounded-2xl border-2 border-slate-200 bg-white px-3 text-base font-bold text-ink-soft transition hover:border-brand hover:text-brand-700 active:scale-95";

  return (
    <div className="min-h-screen bg-slate-100 text-ink">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] 2xl:grid-cols-[minmax(0,1fr)_460px]">
        {/* MAIN SHOPPING INTERFACE */}
        <main className="flex h-screen min-w-0 flex-col overflow-y-auto">
          {/* HEADER — where am I, how do I leave */}
          <div className="sticky top-0 z-20 border-b-2 border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
              {isAdmin && (
                <Link to="/" className={headerBtn}>
                  {!isRtl ? (
                    <ArrowBigLeft size={22} strokeWidth={2.2} />
                  ) : (
                    <ArrowBigRight size={22} strokeWidth={2.2} />
                  )}
                  <span className="hidden sm:inline">
                    {t("simple.pos.back")}
                  </span>
                </Link>
              )}

              <h1 className="flex items-center gap-2 px-1 text-2xl font-black text-ink">
                <ShoppingBasket size={26} className="text-brand" />
                {t("simple.pos.title")}
              </h1>

              <div className="ms-auto flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDailySummaryOpen(true)}
                  className={headerBtn}
                >
                  <Receipt size={20} />
                  <span>{t("simple.pos.todaySales")}</span>
                </button>

                <button
                  type="button"
                  onClick={openCustomerDisplay}
                  className={headerBtn}
                  title={t("simple.pos.customerScreen")}
                >
                  <Monitor size={20} />
                  <span className="hidden 2xl:inline">
                    {t("simple.pos.customerScreen")}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={refetch}
                  className={headerBtn}
                  title={t("simple.pos.refresh")}
                >
                  <RefreshCw size={20} />
                  <span className="hidden 2xl:inline">
                    {t("simple.pos.refresh")}
                  </span>
                </button>

                <POSSettings
                  t={t}
                  columns={columns}
                  setColumns={setColumns}
                  pageSize={pageSize}
                  setPageSize={setPageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                />

                <div className="flex h-12 shrink-0 items-center gap-2 rounded-2xl bg-slate-100 ps-3 pe-1">
                  <UserIcon size={18} className="text-ink-muted" />
                  <span className="max-w-[120px] truncate text-base font-bold text-ink">
                    {user?.full_name || user?.username}
                  </span>
                  <button
                    type="button"
                    onClick={logout}
                    title={t("simple.nav.logout")}
                    aria-label={t("simple.nav.logout")}
                    className="flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-sm font-bold text-danger-700 transition hover:bg-danger-50"
                  >
                    <LogOut size={18} />
                    <span className="hidden 2xl:inline">
                      {t("simple.nav.logout")}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* SEARCH — the main way in: type or scan */}
          <div className="border-b-2 border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="relative min-w-0 flex-1" data-pos-search>
                <Search
                  size={26}
                  className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-ink-muted"
                />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t("simple.pos.searchPlaceholder")}
                  aria-label={t("simple.pos.searchPlaceholder")}
                  className="h-16 w-full rounded-2xl border-2 border-slate-300 bg-slate-50 pe-14 ps-14 text-xl font-semibold text-ink outline-none transition placeholder:font-normal placeholder:text-slate-500 focus:border-brand focus:bg-white focus:ring-4 focus:ring-brand-100"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      searchRef.current?.focus();
                    }}
                    className="absolute end-2 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-xl text-ink-muted hover:bg-slate-200 hover:text-ink"
                    aria-label={t("simple.pos.clearSearch")}
                  >
                    <X size={24} />
                  </button>
                )}
              </div>

              {showScale && (
                <ScaleControl
                  t={t}
                  weight={weight}
                  activeWeight={activeWeight}
                  status={scaleStatus}
                  isConnected={isScaleConnected}
                  ports={scalePorts}
                  selectedPort={selectedScalePort}
                  setSelectedPort={setSelectedScalePort}
                  connect={connectScale}
                  disconnect={disconnectScale}
                />
              )}
            </div>

            {visibleError && (
              <div
                role="alert"
                className="mt-3 flex items-center gap-3 rounded-2xl border-2 border-danger-100 bg-danger-50 px-4 py-3 text-base font-bold text-danger-700"
              >
                <AlertCircle size={22} className="shrink-0" />
                <span className="flex-1">{visibleError}</span>
                <button
                  type="button"
                  onClick={() => {
                    setActionError("");
                    clearError();
                  }}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-danger-100"
                  aria-label={t("simple.pos.close")}
                >
                  <X size={20} />
                </button>
              </div>
            )}
          </div>

          {/* CATEGORIES — one row, one category at a time */}
          {allTags.length > 0 && (
            <div className="border-b-2 border-slate-200 bg-white px-4 py-2.5">
              <POSCategoryFilter
                t={t}
                tags={allTags}
                selectedId={selectedTagIds[0] ?? null}
                onSelect={selectTag}
                onClear={clearTags}
              />
            </div>
          )}

          {/* PRODUCTS */}
          <div
            className={`flex-1 p-4 pb-32 transition-opacity lg:pb-4 ${productsLoading ? "opacity-50" : ""}`}
            aria-busy={productsLoading}
          >
            {products.length > 0 ? (
              <div
                className={`grid gap-3 ${
                  columns === "auto"
                    ? "grid-cols-[repeat(auto-fill,minmax(170px,1fr))]"
                    : ""
                }`}
                style={
                  columns === "auto"
                    ? undefined
                    : {
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      }
                }
              >
                {products.map((product) => {
                  const outOfStock =
                    product.type !== "service" &&
                    !allowNegativeStock &&
                    Number(product.quantity) <= 0;

                  return (
                    <POSProductTile
                      key={product.id}
                      product={product}
                      outOfStock={outOfStock}
                      stockStatus={getStockStatus(product, lowStockLevel)}
                      inCartQty={qtyInCart[product.id] || 0}
                      compact={columns !== "auto" && columns >= 5}
                      isLatin={isLatin}
                      money={money}
                      formatNumber={formatNumber}
                      t={t}
                      onClick={() => {
                        if (outOfStock) return;
                        addProduct(product);
                      }}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon={Search}
                title={t("simple.pos.noProducts")}
                hint={t("simple.pos.noProductsHint")}
                action={
                  search ? (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      className="ui-btn ui-btn-soft"
                    >
                      <X size={20} />
                      {t("simple.pos.clearSearch")}
                    </button>
                  ) : null
                }
              />
            )}

            <POSPagination
              t={t}
              page={page}
              totalPages={totalPages}
              onPageChange={(next) => {
                setPage(next);
                // back to the top of the list when turning the page
                document.querySelector("main")?.scrollTo({ top: 0 });
              }}
            />
          </div>
        </main>

        {/* SIDE CART (wide screens) */}
        <POSCart {...cartProps} />
      </div>

      {/* BOTTOM BAR (tablet / phone) */}
      <div className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="rounded-3xl border-2 border-slate-200 bg-white p-3 shadow-2xl">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCartDrawerOpen(true)}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-2 py-1 text-start"
            >
              <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand">
                <ShoppingBasket size={26} />
                {cart.length > 0 && (
                  <span className="absolute -end-1 -top-1 flex h-6 min-w-[24px] items-center justify-center rounded-full bg-ok px-1 text-xs font-black text-white">
                    {cart.length}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-ink-muted">
                  {t("simple.pos.viewCart")}
                </span>
                <span className="block truncate text-2xl font-black text-ink">
                  <span dir="ltr">{money(netTotal)}</span>
                </span>
              </span>
            </button>
            <button
              type="button"
              onClick={openCheckout}
              disabled={!cart.length || checkingOut}
              className="ui-btn ui-btn-ok ui-btn-lg px-7 text-xl"
            >
              <Banknote size={26} />
              {t("simple.pos.pay")}
            </button>
          </div>
        </div>
      </div>

      {isCartDrawerOpen && (
        <POSCart
          {...cartProps}
          variant="drawer"
          onClose={() => setIsCartDrawerOpen(false)}
        />
      )}

      {/* MODALS */}
      {isTotalModalOpen && (
        <POSSystemEditTotalPrice
          isTotalModalOpen={isTotalModalOpen}
          setIsTotalModalOpen={setIsTotalModalOpen}
          subtotal={afterItemDiscounts}
          itemTax={itemTaxTotal}
          discountRate={invoiceDiscountRate}
          setDiscountRate={setInvoiceDiscountRate}
          posTaxMode={posTaxMode}
          invoiceTaxes={invoiceTaxes}
          addInvoiceTax={addInvoiceTax}
          removeInvoiceTax={removeInvoiceTax}
          clearInvoiceTaxes={clearInvoiceTaxes}
          taxes={taxes}
          note={invoiceNote}
          setNote={setInvoiceNote}
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
          discountRate={editingItem?.discount_rate}
          setDiscountRate={(rate) =>
            editingItem && updateItemDiscountRate(editingItem.id, rate)
          }
          note={editingItem?.description}
          setNote={(note) =>
            editingItem && updateItemNote(editingItem.id, note)
          }
          handleSavePrice={handleSavePrice}
          editingItem={editingItem}
          isPriceModalOpen={isPriceModalOpen}
          money={money}
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

      {lastSale && (
        <SaleDoneModal
          sale={lastSale}
          onReprint={printReceipt}
          onClose={finishSale}
          money={money}
          t={t}
        />
      )}

      <DailySummaryModal
        isOpen={isDailySummaryOpen}
        onClose={() => setIsDailySummaryOpen(false)}
        t={t}
        money={money}
        funds={funds}
      />
      <ToastContainer position="top-center" rtl={isRtl} />
    </div>
  );
}
