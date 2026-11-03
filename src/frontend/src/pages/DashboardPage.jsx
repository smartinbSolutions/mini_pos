import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ShoppingBasket,
  PackagePlus,
  Search,
  Users,
  BarChart3,
  ChevronDown,
  Package,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import usePrimaryCurrency from "../Global/usePrimaryCurrency";
import useSalesSummary, { periodRange } from "../Global/useSalesSummary";
import { getStockStatus, useLowStockLevel } from "../Global/stockStatus";
import { formatNumber } from "../Global/FormatNumber";
import { getAssetUrl } from "../Global/assetUrl";
import SalesSummaryCards from "../Global/ui/SalesSummaryCards";
import StockBadge from "../Global/ui/StockBadge";
import DashboardDetails from "./DashboardDetails";

// How many products we scan for the "needs restocking" list. The products
// API has no stock filter, so this is filtered here.
const STOCK_SCAN_LIMIT = 1000;
const RESTOCK_LIST_SIZE = 8;

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const navigate = useNavigate();
  const { money } = usePrimaryCurrency();
  const lowStockLevel = useLowStockLevel();

  const today = useMemo(() => periodRange("today"), []);
  const summary = useSalesSummary(today);

  const [products, setProducts] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    window.api
      ?.getProducts?.({ page: 1, limit: STOCK_SCAN_LIMIT })
      .then((res) => setProducts(res?.data || []))
      .catch((err) => {
        console.error("Failed to load products:", err);
        setProducts([]);
      });
  }, []);

  const restock = useMemo(() => {
    if (!products) return null;
    return products
      .map((p) => ({ ...p, status: getStockStatus(p, lowStockLevel) }))
      .filter((p) => p.status === "out" || p.status === "low")
      .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0));
  }, [products, lowStockLevel]);

  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  const actions = [
    { to: "/products/new", icon: PackagePlus, label: t("simple.home.addProduct") },
    { to: "/sales", icon: Search, label: t("simple.home.findSale") },
    { to: "/customer", icon: Users, label: t("simple.home.customers") },
    { to: "/reports/summary", icon: BarChart3, label: t("simple.home.reports") },
  ];

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-ink sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* HEADER + MAIN ACTION */}
        <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black sm:text-4xl">
              {t("simple.home.greeting")}
            </h1>
            <p className="mt-1 text-lg text-ink-muted">
              {t("simple.home.subtitle")}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/pos")}
            className="ui-btn ui-btn-ok min-h-[80px] gap-4 rounded-3xl px-8 text-2xl shadow-lg"
          >
            <ShoppingBasket size={36} />
            <span className="text-start">
              <span className="block">{t("simple.home.startSelling")}</span>
              <span className="block text-base font-semibold opacity-90">
                {t("simple.home.startSellingHint")}
              </span>
            </span>
          </button>
        </section>

        {/* TODAY IN NUMBERS */}
        <SalesSummaryCards
          summary={summary}
          money={money}
          labels={{
            sold: t("simple.home.todaySales"),
            profit: t("simple.home.todayProfit"),
            count: t("simple.home.todayCount"),
            items: t("simple.home.itemsSold"),
          }}
        />

        {/* WHAT DO YOU WANT TO DO */}
        <section>
          <h2 className="mb-3 text-xl font-black">
            {t("simple.home.quickTitle")}
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {actions.map(({ to, icon: Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="ui-card flex min-h-[120px] flex-col items-center justify-center gap-3 p-4 text-center text-lg font-bold text-ink transition hover:border-brand hover:bg-brand-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand">
                  <Icon size={30} />
                </span>
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* PRODUCTS TO RESTOCK */}
        <section className="ui-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">
              {t("simple.home.lowStockTitle")}
              {restock && restock.length > 0 && (
                <span className="ms-2 rounded-full bg-warn-50 px-3 py-0.5 text-base text-warn-700">
                  {restock.length}
                </span>
              )}
            </h2>
            <Link
              to="/products"
              className="inline-flex items-center gap-1.5 text-base font-bold text-brand-700 hover:underline"
            >
              {t("simple.home.seeAllProducts")}
              <Arrow size={18} />
            </Link>
          </div>

          {restock === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : restock.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl bg-ok-50 p-4 text-lg font-bold text-ok-700">
              <CheckCircle2 size={28} className="shrink-0" />
              {t("simple.home.lowStockEmpty")}
            </div>
          ) : (
            <ul className="grid gap-2 md:grid-cols-2">
              {restock.slice(0, RESTOCK_LIST_SIZE).map((product) => (
                <li key={product.id}>
                  <Link
                    to={`/products/${product.id}`}
                    className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-3 transition hover:border-brand"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
                      {product.logo ? (
                        <img
                          src={getAssetUrl(product.logo)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package size={22} />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-base font-bold">
                        {product.name}
                      </span>
                      <span className="block text-sm font-semibold text-ink-muted">
                        {t("simple.stock.left", {
                          count: formatNumber(product.quantity || 0, 2),
                        })}
                      </span>
                    </span>
                    <StockBadge status={product.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* FULL DETAILS — the original analytics, one tap away */}
        <section>
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            aria-expanded={showDetails}
            className="ui-btn ui-btn-soft w-full"
          >
            {showDetails
              ? t("simple.home.hideDetails")
              : t("simple.home.showDetails")}
            <ChevronDown
              size={20}
              className={`transition-transform ${showDetails ? "rotate-180" : ""}`}
            />
          </button>
          {showDetails && (
            <div className="mt-5">
              <DashboardDetails />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
