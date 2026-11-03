import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckCircle2,
  PackagePlus,
  Rocket,
  ShoppingBasket,
  UserPlus,
  X,
} from "lucide-react";

const HIDDEN_KEY = "dashboard:gettingStartedHidden";

function readHidden() {
  try {
    return localStorage.getItem(HIDDEN_KEY) === "1";
  } catch {
    return false;
  }
}

// A short "what to do first" list for a brand-new shop. It is shown only
// until the shop has a product AND a sale, or until the owner hides it.
//   products / sales / customers: counts, or null while loading
//   reliable: false when one of those loads failed (so we don't guess)
export default function GettingStarted({ products, sales, customers, reliable }) {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(readHidden);

  const loading = products === null || sales === null || customers === null;
  if (loading || !reliable || hidden) return null;

  const hasProducts = products > 0;
  const hasSales = sales > 0;
  if (hasProducts && hasSales) return null;

  const steps = [
    {
      key: "product",
      done: hasProducts,
      Icon: PackagePlus,
      title: t("simple.start.addProduct"),
      hint: t("simple.start.addProductHint"),
      to: "/products/new",
    },
    {
      key: "sale",
      done: hasSales,
      Icon: ShoppingBasket,
      title: t("simple.start.firstSale"),
      hint: t("simple.start.firstSaleHint"),
      to: "/pos",
      // nothing to sell yet
      locked: !hasProducts,
    },
    {
      key: "customer",
      done: customers > 0,
      Icon: UserPlus,
      title: t("simple.start.addCustomer"),
      hint: t("simple.start.addCustomerHint"),
      to: "/customer",
    },
  ];
  const done = steps.filter((step) => step.done).length;

  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(HIDDEN_KEY, "1");
    } catch {
      /* storage unavailable — hidden for this session only */
    }
  };

  return (
    <section className="ui-card border-brand-100 bg-brand-50/60 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black">
            <Rocket size={24} className="text-brand" />
            {t("simple.start.title")}
          </h2>
          <p className="mt-1 text-base font-semibold text-ink-muted">
            {t("simple.start.progress", { done, total: steps.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={hide}
          className="ui-btn ui-btn-soft min-h-[44px] px-3 text-sm"
          aria-label={t("simple.start.hide")}
        >
          <X size={18} />
          {t("simple.start.hide")}
        </button>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={done}
        className="mb-4 h-2.5 overflow-hidden rounded-full bg-white"
      >
        <div
          className="h-full rounded-full bg-ok transition-all"
          style={{ width: `${(done / steps.length) * 100}%` }}
        />
      </div>

      <ul className="grid gap-3 lg:grid-cols-3">
        {steps.map(({ key, done: isDone, Icon, title, hint, to, locked }) => (
          <li
            key={key}
            className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-4 ${
              isDone ? "border-ok-100" : "border-slate-200"
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  isDone ? "bg-ok-50 text-ok" : "bg-brand-50 text-brand"
                }`}
              >
                {isDone ? <CheckCircle2 size={28} /> : <Icon size={26} />}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-black text-ink">{title}</span>
                <span className="mt-0.5 block text-sm font-semibold text-ink-muted">
                  {hint}
                </span>
              </span>
            </div>

            {isDone ? (
              <span className="inline-flex items-center gap-1.5 text-base font-bold text-ok-700">
                <CheckCircle2 size={18} />
                {t("simple.start.done")}
              </span>
            ) : locked ? (
              <span
                className="ui-btn ui-btn-soft w-full cursor-not-allowed opacity-60"
                aria-disabled="true"
              >
                {t("simple.start.needProduct")}
              </span>
            ) : (
              <Link to={to} className="ui-btn ui-btn-brand w-full">
                {t("simple.start.go")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
