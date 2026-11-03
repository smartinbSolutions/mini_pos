import { useState } from "react";
import {
  ShoppingBasket,
  Tag,
  Trash2,
  User as UserIcon,
  ChevronDown,
  X,
  Banknote,
} from "lucide-react";
import SearchableSelect from "../../../Global/SearchableSelect";
import SimpleConfirm from "../../../Global/ui/SimpleConfirm";
import POSCartItem from "./POSCartItem";

export default function POSCart({
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
  rawSubtotal,
  itemDiscountSummary,
  itemTaxSummary,
  invoiceDiscount,
  invoiceTaxes,
  afterInvoiceDiscount,
  invoiceTaxValue,
  netTotal,
  money,
  t,
  // "side" = fixed column on wide screens, "drawer" = full-screen sheet
  variant = "side",
  onClose,
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const hasInvoiceDiscount = Number(invoiceDiscount) > 0.005;
  const hasInvoiceTax =
    (invoiceTaxes || []).length > 0 && Number(invoiceTaxValue) > 0.005;
  const hasAdjustments =
    hasInvoiceDiscount ||
    hasInvoiceTax ||
    itemDiscountSummary.length > 0 ||
    itemTaxSummary.length > 0;

  const shell =
    variant === "drawer"
      ? "fixed inset-0 z-50 flex flex-col bg-white lg:hidden"
      : "sticky top-0 hidden h-screen flex-col overflow-hidden border-s border-slate-200 bg-white lg:flex";

  return (
    <aside className={shell} data-no-barcode>
      {/* CART HEADER */}
      <div className="shrink-0 border-b border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand">
              <ShoppingBasket size={26} />
            </span>
            <div>
              <h2 className="text-xl font-black text-ink">
                {t("simple.pos.cartTitle")}
              </h2>
              <p className="text-sm font-semibold text-ink-muted">
                {t("simple.pos.productsCount", { count: cart.length })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              disabled={!cart.length}
              className="ui-btn ui-btn-danger-soft min-h-[44px] px-3 text-sm"
            >
              <Trash2 size={18} />
              {t("simple.pos.clearAll")}
            </button>
            {variant === "drawer" && (
              <button
                type="button"
                onClick={onClose}
                className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-200 text-ink-soft"
                aria-label={t("simple.pos.close")}
              >
                <X size={24} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-ink-soft">
            <UserIcon size={16} />
            {t("simple.pos.customer")}
          </p>
          <SearchableSelect
            label=""
            labelWidth="0"
            height="3.25"
            placeholder={t("simple.pos.walkIn")}
            options={[
              {
                id: "",
                name: t("simple.pos.walkIn"),
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
              [customer.name || t("simple.pos.walkIn"), customer.phone]
                .filter(Boolean)
                .join(" - ")
            }
            onInputChange={searchCustomers}
          />
        </div>
      </div>

      {/* CART BODY */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-3">
        {cart.length === 0 ? (
          <div className="flex h-full min-h-[240px] items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white/70 p-6 text-center">
            <div>
              <ShoppingBasket size={48} className="mx-auto text-slate-400" />
              <h3 className="mt-3 text-lg font-black text-ink">
                {t("simple.pos.emptyCart")}
              </h3>
              <p className="mt-1.5 text-base text-ink-muted">
                {t("simple.pos.emptyCartHint")}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {[...cart].reverse().map((item) => (
              <POSCartItem
                key={item.id}
                item={item}
                onOpenPriceModal={openPriceModal}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                money={money}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* CART FOOTER */}
      <div className="shrink-0 space-y-3 border-t-2 border-slate-200 bg-white p-4">
        {cart.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openTotalModal}
              className="ui-btn ui-btn-soft min-h-[44px] flex-1 px-3 text-sm"
            >
              <Tag size={17} />
              {t("simple.pos.discountOrNote")}
            </button>
            {hasAdjustments && (
              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="ui-btn ui-btn-soft min-h-[44px] px-3 text-sm"
                aria-expanded={showBreakdown}
              >
                {t("simple.pos.details")}
                <ChevronDown
                  size={17}
                  className={`transition-transform ${showBreakdown ? "rotate-180" : ""}`}
                />
              </button>
            )}
          </div>
        )}

        {/* BREAKDOWN — only when a discount or tax actually changes the total */}
        {cart.length > 0 && hasAdjustments && showBreakdown && (
          <div className="space-y-1.5 rounded-2xl bg-slate-50 p-3 text-sm">
            <Row label={t("ui.subtotal")} value={money(rawSubtotal)} />

            {itemDiscountSummary.map((group) => (
              <Row
                key={`item-discount-${group.rate}`}
                label={t("screens.invoices.itemDiscountAt", {
                  rate: Number(group.rate).toFixed(2),
                })}
                value={`-${money(group.amount)}`}
                tone="text-danger-700"
              />
            ))}

            {itemTaxSummary.map((group) => (
              <Row
                key={`item-tax-${group.tax_id}`}
                label={t("screens.invoices.itemTaxAt", { rate: group.rate })}
                value={`+${money(group.value)}`}
              />
            ))}

            {hasInvoiceDiscount && (
              <Row
                label={t("screens.invoices.invoiceDiscountAmount")}
                value={`-${money(invoiceDiscount)}`}
                tone="text-danger-700"
              />
            )}

            {hasInvoiceTax &&
              invoiceTaxes.map((tax) => {
                const rate = Number(tax.rate || 0);
                const value = Number(afterInvoiceDiscount || 0) * (rate / 100);
                return (
                  <Row
                    key={tax.id}
                    label={`${tax.name} (${tax.rate}%)`}
                    value={`+${money(value)}`}
                  />
                );
              })}
          </div>
        )}

        <div className="flex items-end justify-between gap-3 px-1">
          <span className="text-lg font-bold text-ink-soft">
            {t("simple.pos.total")}
          </span>
          <span dir="ltr" className="truncate text-4xl font-black text-ink">
            {money(netTotal)}
          </span>
        </div>

        <button
          type="button"
          onClick={openCheckout}
          disabled={!cart.length || checkingOut}
          className="ui-btn ui-btn-ok ui-btn-lg w-full min-h-[68px] text-2xl"
        >
          <Banknote size={30} />
          {t("simple.pos.pay")}
          {variant === "side" && (
            <kbd className="ms-1 rounded-lg bg-white/20 px-2 py-0.5 font-sans text-sm font-bold">
              F9
            </kbd>
          )}
        </button>
      </div>

      <SimpleConfirm
        open={confirmClear}
        title={t("simple.pos.clearConfirmTitle")}
        message={t("simple.pos.clearConfirmMessage")}
        confirmLabel={t("simple.pos.clearConfirmYes")}
        cancelLabel={t("simple.pos.keep")}
        onConfirm={clearCart}
        onClose={() => setConfirmClear(false)}
      />
    </aside>
  );
}

function Row({ label, value, tone = "text-ink" }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-ink-muted">{label}</span>
      <span dir="ltr" className={`font-bold ${tone}`}>
        {value}
      </span>
    </div>
  );
}
