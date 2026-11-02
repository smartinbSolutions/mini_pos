import { Minus, Plus, Trash2, Percent, Tag, StickyNote, Pencil } from "lucide-react";
import HoverTooltip from "../../../Global/HoverTooltip";
import NumberInput from "../../../Global/NumberInput";

export default function POSCartItem({
  item,
  onOpenPriceModal,
  onUpdateQuantity,
  onRemove,
  money,
  t,
}) {
  const taxRate = Number(item.tax_rate || 0);
  const hasTax = Boolean(item.tax_id) && taxRate > 0;

  const discountRate = Number(item.discount_rate || 0);
  const hasDiscount = discountRate > 0.005;

  const hasNote = Boolean(item.description?.trim());

  // Per-unit tax-inclusive price, for the "was → now" comparison line —
  // display only, not used for the actual total.
  const unitPriceWithTax = hasTax
    ? item.price * (1 + taxRate / 100)
    : item.price;
  const originalUnitPrice = hasDiscount
    ? unitPriceWithTax / (1 - discountRate / 100)
    : unitPriceWithTax;

  // The real total — already fully computed by recalcCartItem in the
  // hook (discount then tax applied, same cascade as manual sales).
  // Never recompute this locally; it's the one source of truth.
  const lineTotal = Number(item.lineTotal || 0);

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-ink">
            {item.name}
          </h3>
          <p className="mt-0.5 text-sm font-semibold text-ink-muted">
            {t("simple.pos.priceEach", {
              price: money(originalUnitPrice),
            })}
          </p>
          {(hasDiscount || hasNote || (!item.is_base && item.unit_name)) && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {!item.is_base && item.unit_name && (
                <span className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-ink-muted">
                  <Tag size={12} className="text-brand" />
                  {item.unit_name}
                </span>
              )}
              {hasDiscount && (
                <span className="flex items-center gap-1 rounded-md bg-danger-50 px-1.5 py-0.5 text-xs font-bold text-danger-700">
                  <Percent size={12} />
                  {t("screens.pos.discountApplied", "{{rate}}% off", {
                    rate: discountRate.toFixed(2),
                  })}
                </span>
              )}
              {hasNote && (
                <HoverTooltip
                  placement="top"
                  trigger={
                    <span className="flex items-center gap-1 rounded-md bg-warn-50 px-1.5 py-0.5 text-xs font-bold text-warn-700">
                      <StickyNote size={12} />
                    </span>
                  }
                  content={item.description}
                />
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 text-end">
          {hasDiscount && (
            <p
              dir="ltr"
              className="text-sm font-semibold text-ink-muted line-through"
            >
              {money(originalUnitPrice * item.qty)}
            </p>
          )}
          <p dir="ltr" className="text-xl font-black text-ink">
            {money(lineTotal)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        {/* QUANTITY: − [qty] + */}
        <div className="flex h-12 items-center overflow-hidden rounded-xl border-2 border-slate-200 bg-white">
          <button
            type="button"
            onClick={() =>
              onUpdateQuantity(item.id, item.qty === 1 ? -1 : item.qty - 1)
            }
            className="flex h-12 w-12 items-center justify-center text-ink transition hover:bg-slate-100 active:scale-90"
            aria-label={t("simple.pos.decrease")}
          >
            <Minus size={20} strokeWidth={3} />
          </button>

          <NumberInput
            value={item.qty}
            onChange={(val) => onUpdateQuantity(item.id, val)}
            className="h-12 w-14 border-x-2 border-slate-200 bg-transparent text-center text-lg font-black text-ink outline-none"
            aria-label={t("ui.quantity")}
          />

          <button
            type="button"
            onClick={() => onUpdateQuantity(item.id, item.qty + 1)}
            className="flex h-12 w-12 items-center justify-center text-ink transition hover:bg-slate-100 active:scale-90"
            aria-label={t("simple.pos.increase")}
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpenPriceModal(item)}
          className="flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-slate-200 px-2 text-sm font-bold text-ink-soft transition hover:border-brand hover:text-brand-700"
        >
          <Pencil size={16} className="shrink-0" />
          <span className="truncate">{t("simple.pos.priceShort")}</span>
        </button>

        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-danger-50 text-danger-700 transition hover:bg-danger-100 active:scale-90"
          aria-label={t("simple.pos.remove")}
          title={t("simple.pos.remove")}
        >
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
