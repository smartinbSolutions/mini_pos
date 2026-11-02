import { Package2, Plus, ShoppingBasket } from "lucide-react";
import { getAssetUrl } from "../../../Global/assetUrl";
import { pickLatin } from "../../../Global/useLatinMode";
import StockBadge from "../../../Global/ui/StockBadge";

export default function POSProductTile({
  product,
  outOfStock,
  stockStatus,
  inCartQty = 0,
  // smaller text for 5-6 products per row
  compact = false,
  onClick,
  money,
  isLatin,
  formatNumber,
  t,
}) {
  const taxRate = Number(product.tax_rate || 0);
  const hasTax = Boolean(product.tax_id) && taxRate > 0;
  const priceWithTax = hasTax
    ? Number(product.price || 0) * (1 + taxRate / 100)
    : Number(product.price || 0);
  const unitName = pickLatin(
    isLatin,
    product.unit_latin_name,
    product.unit_name,
  );
  const baseUnitName = pickLatin(
    isLatin,
    product.base_unit_latin_name,
    product.base_unit_name,
  );

  const displayName =
    isLatin && product.latin_name
      ? product.is_base
        ? product.latin_name
        : `${product.latin_name} (${unitName})`
      : product.name;

  const unitLabel = !product.is_base
    ? t("screens.pos.unitOfBase", "{{unit}} of {{baseUnit}}", {
        unit: unitName,
        baseUnit: baseUnitName,
      })
    : null;

  const isService = product.type === "service";

  return (
    <button
      type="button"
      disabled={outOfStock}
      onClick={onClick}
      className={`group relative block h-full w-full overflow-hidden rounded-3xl border-2 bg-white text-start shadow-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100 ${
        inCartQty > 0 ? "border-ok" : "border-slate-200"
      } ${
        outOfStock
          ? "cursor-not-allowed opacity-60"
          : "hover:border-brand hover:shadow-md active:scale-[0.97]"
      }`}
    >
      {/* Explicit full-width column: Chromium does not reliably stretch
          the children of a flex <button>. */}
      <span className="flex h-full w-full flex-col">
      {/* IMAGE */}
      <div className="relative aspect-[3/2] w-full bg-slate-100">
        {product.logo ? (
          <img
            src={getAssetUrl(product.logo)}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Package2 size={40} />
          </div>
        )}

        {inCartQty > 0 && (
          <span className="absolute end-2 top-2 inline-flex items-center gap-1 rounded-full bg-ok px-2.5 py-1 text-sm font-black text-white shadow">
            <ShoppingBasket size={15} />
            <span dir="ltr">{formatNumber(inCartQty, 2)}</span>
          </span>
        )}

        {!isService && stockStatus && stockStatus !== "available" && (
          <StockBadge
            status={stockStatus}
            size="sm"
            className="absolute bottom-2 start-2 shadow"
          />
        )}
      </div>

      {/* BODY */}
      <div className={`flex w-full flex-1 flex-col ${compact ? "p-2" : "p-3"}`}>
        <h3
          className={`line-clamp-2 font-bold leading-snug text-ink ${compact ? "text-sm" : "text-base"}`}
        >
          {displayName || t("ui.unnamedProduct")}
        </h3>

        {unitLabel && (
          <p className="mt-0.5 truncate text-sm font-semibold text-ink-muted">
            {t(
              "screens.pos.unitEquals",
              "{{unitLabel}} = {{factor}} {{baseUnit}}",
              {
                unitLabel,
                factor: formatNumber(product.conversion_factor || 1, 0),
                baseUnit: baseUnitName,
              },
            )}
          </p>
        )}

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0">
            {/* PRICE — forced LTR: currency symbol + digits, not a sentence */}
            <p
              className={`font-black leading-none text-ink ${compact ? "text-lg" : "text-2xl"}`}
            >
              <span dir="ltr" className="whitespace-nowrap">
                {money(priceWithTax)}
              </span>
            </p>
            {!isService && (
              <p className="mt-1 text-sm font-semibold text-ink-muted">
                {t("simple.stock.left", {
                  count: formatNumber(product.quantity || 0, 2),
                })}
              </p>
            )}
          </div>

          {/* small hint that tapping the card adds it */}
          {!outOfStock && !compact && (
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-white transition group-hover:bg-brand-600"
            >
              <Plus size={24} strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
      </span>
    </button>
  );
}
