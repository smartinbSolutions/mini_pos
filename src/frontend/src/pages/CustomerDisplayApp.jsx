import { useEffect, useMemo, useState } from "react";
import { Tag, Receipt } from "lucide-react";
import QRCode from "qrcode";
import { useTranslation } from "react-i18next";

const emptyPayload = {
  items: [],
  subtotal: 0,
  itemDiscountTotal: 0,
  afterItemDiscounts: 0,
  itemTaxTotal: 0,
  itemDiscountSummary: [],
  itemTaxSummary: [],
  invoiceDiscountRate: 0,
  invoiceDiscount: 0,
  afterInvoiceDiscount: 0,
  invoiceTaxes: [],
  invoiceTaxValue: 0,
  itemsNetTotal: 0,
  total: 0,
  currencyCode: "",
};

// Empty-cart / side-panel ad target, per language.
// When the dedicated NoonPos landing pages go live, swap these 3 URLs
// (and the adTitle translation values in the i18n files) — nothing else
// in this component needs to change.
const ADVERTISED_URLS = {
  ar: "https://smartinb.com/ar/المنتجات/نظام-نقاط-البيع",
  en: "https://smartinb.com/products/smart-pos",
  tr: "https://smartinb.com/tr/urunler/akilli-pos",
};

// Plain SVG QR renderer built on the `qrcode` package (no React dependency
// inside the package itself), so there's no risk of a second React copy
// getting pulled into the tree via a UI-library's own hooks.
function QrCode({ value, fg = "#1c2340", bg = "#ffffff" }) {
  const modules = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: "M" });
    return qr.modules;
  }, [value]);

  return (
    <svg
      viewBox={`0 0 ${modules.size} ${modules.size}`}
      className="h-full w-full"
      shapeRendering="crispEdges"
    >
      <rect width={modules.size} height={modules.size} fill={bg} />
      {Array.from({ length: modules.size }).map((_, row) =>
        Array.from({ length: modules.size }).map((_, col) =>
          modules.get(col, row) ? (
            <rect
              key={`${row}-${col}`}
              x={col}
              y={row}
              width={1}
              height={1}
              fill={fg}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}

function PromoPanel({ qrUrl, t, compact = false }) {
  return (
    <div
      className={`relative flex h-full items-center justify-center overflow-hidden bg-gradient-to-b from-[#1c2340] to-[#0f1326] text-white ${
        compact ? "flex-col gap-8 px-8 py-10" : "flex-row gap-14 px-14"
      }`}
    >
      <div className="pointer-events-none absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[#4663ff]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-[#4663ff]/10 blur-3xl" />

      <div
        className={`relative shrink-0 rounded-[28px] bg-white shadow-2xl shadow-black/50 ring-1 ring-white/10 ${
          compact ? "aspect-square w-[80%] p-6" : "aspect-square h-[62vh] p-5"
        }`}
      >
        <QrCode value={qrUrl} fg="#1c2340" bg="#ffffff" />
      </div>

      <div
        className={`relative ${
          compact ? "space-y-4 text-center" : "max-w-xl space-y-5 text-start"
        }`}
      >
        <p
          className={`font-bold uppercase text-[#7d93ff] ${
            compact ? "text-lg tracking-[0.25em]" : "text-lg tracking-[0.3em]"
          }`}
        >
          NoonPos
        </p>
        <h1
          className={`font-black leading-tight text-white ${
            compact ? "text-4xl" : "text-6xl"
          }`}
        >
          {t("screens.customerDisplay.adTitle", "Scan to discover NoonPos")}
        </h1>
        <p
          className={`font-semibold leading-snug text-stone-300 ${
            compact ? "text-lg" : "text-2xl"
          }`}
        >
          {t(
            "screens.customerDisplay.adSubtitle",
            "Smart point-of-sale software for shops, restaurants, and retailers",
          )}
        </p>

        <div
          className={`flex flex-wrap items-center gap-4 border-t border-white/10 pt-4 font-bold text-white/90 ${
            compact ? "justify-center text-base" : "text-xl"
          }`}
        >
          <span>www.smartinb.com</span>
          <span className="text-white/20">•</span>
          <span className="text-stone-300">
            {t("screens.customerDisplay.adContact", "Sales")}:
            sales.smartinb.com
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CustomerDisplayApp() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(emptyPayload);

  // Derived directly from the pushed payload's language, not i18n.language —
  // this i18next instance's reactivity is unreliable here (it's missing
  // .dir() entirely), so don't depend on it for something as visible as RTL.
  const isRtl = i18n.dir() === "rtl";

  useEffect(() => {
    const unsubscribe = window.api?.onCustomerDisplayCartUpdate?.((payload) => {
      setData({ ...emptyPayload, ...(payload || {}) });

      if (payload?.language && payload.language !== i18n.language) {
        i18n.changeLanguage(payload.language);
      }
    });

    return unsubscribe;
  }, [i18n]);

  useEffect(() => {
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
    document.documentElement.lang = data.language || i18n.language;
  }, [isRtl, data.language, i18n.language]);

  const {
    items,
    subtotal,
    itemDiscountSummary,
    itemTaxSummary,
    invoiceDiscountRate,
    invoiceDiscount,
    invoiceTaxes,
    total,
    currencyCode,
  } = data;

  const money = (value) =>
    `${Number(value || 0).toFixed(2)} ${currencyCode}`.trim();

  const langKey = (i18n.language || "en").slice(0, 2);
  const qrUrl = ADVERTISED_URLS[langKey] || ADVERTISED_URLS.en;

  if (!items.length) {
    return (
      <div dir={isRtl ? "rtl" : "ltr"} className="h-screen">
        <PromoPanel qrUrl={qrUrl} t={t} />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-stone-50" dir={isRtl ? "rtl" : "ltr"}>
      <div className="flex w-[60%] flex-col">
        <div className="flex-1 space-y-2.5 overflow-auto p-6">
          {items.map((item, i) => {
            const hasDiscount = Number(item.discount_rate || 0) > 0;
            const hasTax = Number(item.tax_rate || 0) > 0;
            const lineTotal = Number(item.lineTotal ?? item.qty * item.price);

            return (
              <div
                key={i}
                className="rounded-2xl bg-white p-4 shadow-sm shadow-stone-200/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-lg font-black text-stone-900">
                      {item.name}
                    </h4>
                    <p className="text-sm font-semibold text-stone-500">
                      {item.qty} × {money(item.price)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xl font-black text-stone-900">
                    {money(lineTotal)}
                  </span>
                </div>

                {(hasDiscount || hasTax) && (
                  <div className="mt-2 flex flex-wrap gap-2 border-t border-stone-100 pt-2">
                    {hasDiscount && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-600">
                        <Tag size={11} />-{item.discount_rate}% (
                        {money(item.discount)})
                      </span>
                    )}
                    {hasTax && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-600">
                        <Receipt size={11} />+{item.tax_rate}% (
                        {money(item.taxValue)})
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2 bg-stone-950 px-6 pb-6 pt-5 text-white">
          <div className="space-y-1.5 border-b border-white/10 pb-3 text-sm">
            <div className="flex items-center justify-between text-stone-300">
              <span>{t("ui.subtotal")}</span>
              <span className="font-bold tabular-nums text-white">
                {money(subtotal)}
              </span>
            </div>

            {(itemDiscountSummary || []).map((group) => (
              <div
                key={`item-discount-${group.rate}`}
                className="flex items-center justify-between text-rose-400"
              >
                <span>
                  {t("screens.invoices.itemDiscountAt", {
                    rate: Number(group.rate).toFixed(2),
                  })}
                </span>
                <span className="font-bold tabular-nums">
                  -{money(group.amount)}
                </span>
              </div>
            ))}

            {(itemTaxSummary || []).map((group) => (
              <div
                key={`item-tax-${group.tax_id}`}
                className="flex items-center justify-between text-emerald-400"
              >
                <span>
                  {t("screens.invoices.itemTaxAt", { rate: group.rate })}
                </span>
                <span className="font-bold tabular-nums">
                  +{money(group.value)}
                </span>
              </div>
            ))}

            {invoiceDiscount > 0 && (
              <div className="flex items-center justify-between text-rose-400">
                <span>
                  {t("screens.invoices.invoiceDiscountAmount")}
                  {invoiceDiscountRate ? ` (${invoiceDiscountRate}%)` : ""}
                </span>
                <span className="font-bold tabular-nums">
                  -{money(invoiceDiscount)}
                </span>
              </div>
            )}

            {(invoiceTaxes || []).map((tax) => {
              const rate = Number(tax.rate || 0);
              const value =
                Number(data.afterInvoiceDiscount || 0) * (rate / 100);

              return (
                <div
                  key={tax.id}
                  className="flex items-center justify-between text-emerald-400"
                >
                  <span>
                    {tax.name} ({tax.rate}%)
                  </span>
                  <span className="font-bold tabular-nums">
                    +{money(value)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-lg font-bold text-stone-300">
              {t("ui.total")}
            </span>
            <span className="text-4xl font-black tabular-nums">
              {money(total)}
            </span>
          </div>
        </div>
      </div>

      <div className="w-[40%] shrink-0">
        <PromoPanel qrUrl={qrUrl} t={t} compact />
      </div>
    </div>
  );
}
