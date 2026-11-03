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
} from "lucide-react";
import usePrimaryCurrency from "../Global/usePrimaryCurrency";
import useSalesSummary, { periodRange } from "../Global/useSalesSummary";
import { useLowStockLevel } from "../Global/stockStatus";
import { useAuth } from "../Global/AuthContext";
import SalesSummaryCards from "../Global/ui/SalesSummaryCards";
import NeedsAttention from "../components/Dashboard/NeedsAttention";
import LatestSales from "../components/Dashboard/LatestSales";
import BestSellers from "../components/Dashboard/BestSellers";
import CashBoxes from "../components/Dashboard/CashBoxes";
import CustomersOwe from "../components/Dashboard/CustomersOwe";
import GettingStarted from "../components/Dashboard/GettingStarted";
import DashboardDetails from "./DashboardDetails";

// How many products we scan for stock problems. The products API has no
// stock filter, so this is filtered here.
const STOCK_SCAN_LIMIT = 1000;
const LATEST_SALES_COUNT = 5;
// Customers loaded to find the biggest debts (the list API has no sort by
// balance); the totals shown are always for everyone.
const OWED_SCAN_LIMIT = 100;

function timeOfDay(hour) {
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { money } = usePrimaryCurrency();
  const lowStockLevel = useLowStockLevel();

  const today = useMemo(() => periodRange("today"), []);
  const summary = useSalesSummary(today);

  // null = loading; false = failed (the card is hidden rather than guessing)
  const [products, setProducts] = useState(null);
  const [backup, setBackup] = useState(undefined); // undefined = loading, null = unknown
  const [latestSales, setLatestSales] = useState(null);
  const [funds, setFunds] = useState(null);
  const [owed, setOwed] = useState(null);
  const [customerCount, setCustomerCount] = useState(null);
  const [failed, setFailed] = useState({});
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const api = window.api;
    const fail = (key) => (err) => {
      console.error(`Dashboard: failed to load ${key}:`, err);
      setFailed((current) => ({ ...current, [key]: true }));
    };

    api
      ?.getProducts?.({ page: 1, limit: STOCK_SCAN_LIMIT })
      .then((res) => setProducts(res?.data || []))
      .catch((err) => {
        fail("products")(err);
        setProducts([]);
      });

    api
      ?.getBackupSettings?.()
      .then((res) => setBackup(res?.success ? res.data || {} : null))
      .catch(() => setBackup(null));

    api
      ?.getSalesInvoices?.({ page: 1, limit: LATEST_SALES_COUNT })
      .then((res) => setLatestSales(res?.data || []))
      .catch((err) => {
        fail("sales")(err);
        setLatestSales([]);
      });

    api
      ?.getFunds?.()
      .then((res) => setFunds(Array.isArray(res) ? res : []))
      .catch((err) => {
        fail("funds")(err);
        setFunds(false);
      });

    api
      ?.getContacts?.({
        role: "customer",
        balance_filter: "receivable",
        page: 1,
        limit: OWED_SCAN_LIMIT,
      })
      .then((res) => {
        if (!res?.success) throw new Error(res?.error || "contacts");
        setOwed({
          total: Number(res.total || 0),
          amount: Number(res.stats?.receivable || 0),
          top: [...(res.data || [])].sort(
            (a, b) => Number(b.balance || 0) - Number(a.balance || 0),
          ),
        });
      })
      .catch((err) => {
        fail("owed")(err);
        setOwed(false);
      });

    api
      ?.getContacts?.({ role: "customer", page: 1, limit: 1 })
      .then((res) => {
        if (!res?.success) throw new Error(res?.error || "contacts");
        setCustomerCount(Number(res.total || 0));
      })
      .catch((err) => {
        fail("customers")(err);
        setCustomerCount(0);
      });
  }, []);

  const now = new Date();
  const name = user?.full_name || user?.username || "";
  const greeting = t(`simple.greeting.${timeOfDay(now.getHours())}`);
  const dateLabel = now.toLocaleDateString(i18n.language, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

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
              {name
                ? t("simple.greeting.named", { greeting, name })
                : greeting}
            </h1>
            <p className="mt-1 text-lg text-ink-muted">{dateLabel}</p>
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

        {/* FIRST STEPS — only for a brand-new shop */}
        <GettingStarted
          products={products === null ? null : products.length}
          sales={latestSales === null ? null : latestSales.length}
          customers={customerCount}
          reliable={!failed.products && !failed.sales}
        />

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

        {/* WHAT NEEDS ME · WHAT JUST HAPPENED */}
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <NeedsAttention
              products={products}
              backup={backup}
              lowStockLevel={lowStockLevel}
            />
            {funds !== false && <CashBoxes funds={funds} money={money} />}
            {owed !== false && <CustomersOwe owed={owed} money={money} />}
          </div>
          <div className="space-y-6">
            <LatestSales sales={latestSales} money={money} />
            <BestSellers summary={summary} money={money} />
          </div>
        </div>

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
