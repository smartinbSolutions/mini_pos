import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

import {
  Home,
  Package,
  CreditCard,
  Landmark,
  Factory,
  Layers,
  ChevronDown,
  Settings,
  Handshake,
  LogOut,
  User as UserIcon,
  Coins,
  ReceiptIcon,
  ShoppingBasket,
  ReceiptText,
  Users,
  BarChart3,
  MoreHorizontal,
  ShoppingCart,
  X,
} from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "../Global/AuthContext";

// The everyday screens, in plain words, always visible.
const PRIMARY = [
  { title: "simple.nav.home", icon: Home, path: "/", end: true },
  { title: "simple.nav.pastSales", icon: ReceiptText, path: "/sales" },
  { title: "simple.nav.products", icon: Package, path: "/products" },
  { title: "simple.nav.customers", icon: Users, path: "/customer" },
  { title: "simple.nav.reports", icon: BarChart3, path: "/reports/summary" },
];

export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isPos = location.pathname.startsWith("/pos");

  const [open, setOpen] = useState({});
  const [moreOpen, setMoreOpen] = useState(false);

  // Everything else — every existing screen is still reachable here.
  const menu = [
    {
      title: "navigation.sales",
      icon: <ShoppingCart size={20} />,
      children: [
        { title: "navigation.sales", path: "/sales" },
        { title: "navigation.salesQuotations", path: "/sales-quotations" },
        { title: "navigation.salesReturn", path: "/sales-return" },
        { title: "navigation.customers", path: "/customer" },
      ],
    },
    {
      title: "navigation.purchase",
      icon: <CreditCard size={20} />,
      children: [
        { title: "navigation.purchase", path: "/purchase" },
        { title: "navigation.purchaseReturn", path: "/purchase-return" },
        { title: "navigation.suppliers", path: "/supplier" },
      ],
    },
    {
      title: "navigation.expense",
      icon: <Coins size={20} />,
      children: [
        { title: "navigation.expense", path: "/expense" },
        { title: "navigation.expensesCategory", path: "/expense-category" },
      ],
    },
    {
      title: "navigation.cash",
      icon: <Landmark size={20} />,
      children: [
        { title: "navigation.funds", path: "/funds" },
        { title: "navigation.payment", path: "/payments" },
        { title: "navigation.settlements", path: "/settlements" },
        { title: "navigation.transfers", path: "/fundTransfer" },
      ],
    },
    {
      title: "navigation.stock",
      icon: <Package size={20} />,
      children: [
        { title: "navigation.products", path: "/products" },
        { title: "navigation.importReports", path: "/import-reports" },
      ],
    },
    {
      title: "navigation.manufacturing",
      icon: <Factory size={20} />,
      children: [
        { title: "navigation.boms", path: "/boms" },
        {
          title: "navigation.manufacturingOrders",
          path: "/manufacturing-orders",
        },
      ],
    },
    {
      title: "navigation.partners",
      icon: <Handshake size={20} />,
      path: "/partners",
    },
    {
      title: "navigation.reports",
      icon: <ReceiptIcon size={20} />,
      children: [
        { title: "simple.summary.title", path: "/reports/summary" },
        { title: "navigation.profitLoss", path: "/reports/profit-loss" },
        { title: "navigation.salesReport", path: "/reports/sales" },
      ],
    },
    {
      title: "navigation.settings",
      icon: <Settings size={20} />,
      children: [
        { title: "navigation.units", path: "/unit" },
        { title: "navigation.currency", path: "/currency" },
        { title: "navigation.taxes", path: "/tax" },
        { title: "navigation.tags", path: "/tags" },
        ...(user?.role === "admin"
          ? [{ title: "navigation.users", path: "/users" }]
          : []),
        { title: "navigation.companySettings", path: "/company-info" },
        { title: "navigation.settings", path: "/company-settings" },
      ],
    },
  ];

  const isPrimaryPath = (path) =>
    PRIMARY.some((item) =>
      item.end ? path === item.path : path.startsWith(item.path),
    );

  useEffect(() => {
    const newOpen = {};
    let inMore = false;

    menu.forEach((item, index) => {
      const paths = item.children
        ? item.children.map((c) => c.path)
        : [item.path];
      const match = paths.some((p) => location.pathname.startsWith(p));
      if (match && item.children) newOpen[index] = true;
      if (match) inMore = true;
    });

    setOpen((prev) => ({ ...prev, ...newOpen }));
    // keep "More" open when the current screen lives only in there
    if (inMore && !isPrimaryPath(location.pathname)) setMoreOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, user?.role]);

  // close the slide-out menu after navigating (phones / tablets)
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  function toggleGroup(index) {
    setOpen((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  if (isPos) return null;

  const itemClass = (isActive) =>
    `flex min-h-[52px] items-center gap-3 rounded-2xl px-3 text-base font-bold transition ${
      isActive
        ? "bg-brand text-white"
        : "text-slate-200 hover:bg-white/10 hover:text-white"
    }`;

  return (
    <>
      {/* backdrop for the slide-out menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[999] bg-slate-950/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed start-0 top-0 flex h-screen w-72 flex-col border-e border-white/5 bg-[#0b1220] text-white transition-transform lg:w-64 lg:translate-x-0 ${
          mobileOpen
            ? "translate-x-0"
            : "max-lg:ltr:-translate-x-full max-lg:rtl:translate-x-full"
        }`}
        style={{ zIndex: "1000" }}
      >
        {/* BRAND */}
        <div className="flex items-center justify-between gap-3 border-b border-white/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand">
              <Layers size={22} className="text-white" />
            </div>
            <h1 className="text-lg font-black leading-tight">{t("app.name")}</h1>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-300 hover:bg-white/10 lg:hidden"
            aria-label={t("simple.nav.closeMenu")}
          >
            <X size={24} />
          </button>
        </div>

        {/* SELL — the main job, always first */}
        <div className="px-3 pt-4">
          <NavLink
            to="/pos"
            className="flex min-h-[60px] items-center justify-center gap-3 rounded-2xl bg-ok px-4 text-xl font-black text-white shadow-lg transition hover:bg-ok-600"
          >
            <ShoppingBasket size={28} />
            {t("simple.nav.sell")}
          </NavLink>
        </div>

        {/* NAV */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {PRIMARY.map(({ title, icon: Icon, path, end }) => (
            <NavLink
              key={path}
              to={path}
              end={end}
              className={({ isActive }) => itemClass(isActive)}
            >
              <Icon size={22} className="shrink-0" />
              <span>{t(title)}</span>
            </NavLink>
          ))}

          <div className="pt-3">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              className="flex min-h-[48px] w-full items-center justify-between rounded-2xl px-3 text-base font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <span className="flex items-center gap-3">
                <MoreHorizontal size={22} />
                {t("simple.nav.more")}
              </span>
              <ChevronDown
                size={18}
                className={`transition-transform ${moreOpen ? "rotate-180" : ""}`}
              />
            </button>

            {moreOpen && (
              <div className="mt-1 space-y-0.5">
                {menu.map((item, index) => {
                  if (!item.children) {
                    return (
                      <NavLink
                        key={index}
                        to={item.path}
                        className={({ isActive }) =>
                          `flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition ${
                            isActive
                              ? "bg-white/15 text-white"
                              : "text-slate-300 hover:bg-white/10 hover:text-white"
                          }`
                        }
                      >
                        <span className="text-slate-400">{item.icon}</span>
                        {t(item.title)}
                      </NavLink>
                    );
                  }

                  const isActiveGroup = item.children.some((c) =>
                    location.pathname.startsWith(c.path),
                  );

                  return (
                    <div key={index}>
                      <button
                        type="button"
                        onClick={() => toggleGroup(index)}
                        aria-expanded={Boolean(open[index])}
                        className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 text-[15px] font-semibold transition ${
                          isActiveGroup
                            ? "text-white"
                            : "text-slate-300 hover:bg-white/10 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-slate-400">{item.icon}</span>
                          {t(item.title)}
                        </span>
                        <ChevronDown
                          size={15}
                          className={`text-slate-500 transition-transform ${
                            open[index] ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {open[index] && (
                        <div className="ms-5 mt-0.5 space-y-0.5 border-s border-white/10 ps-3">
                          {item.children.map((child) => (
                            <NavLink
                              key={child.path}
                              to={child.path}
                              className={({ isActive }) =>
                                `flex min-h-[40px] items-center rounded-lg px-3 text-[15px] font-semibold transition ${
                                  isActive
                                    ? "bg-white/15 text-white"
                                    : "text-slate-400 hover:bg-white/10 hover:text-white"
                                }`
                              }
                            >
                              {t(child.title)}
                            </NavLink>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </nav>

        {/* FOOTER */}
        <div className="border-t border-white/10 p-3">
          <div className="mb-3 flex items-center justify-between gap-2 rounded-2xl bg-white/5 p-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-slate-200">
                <UserIcon size={20} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-base font-bold text-white">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-sm font-semibold text-slate-400">
                  {t(`screens.users.role_${user?.role}`)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-bold text-red-300 transition hover:bg-red-500/15 hover:text-red-200"
            >
              <LogOut size={18} />
              {t("simple.nav.logout")}
            </button>
          </div>

          <LanguageSwitcher />
        </div>
      </div>
    </>
  );
}
