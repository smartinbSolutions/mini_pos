import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

import {
  Home,
  Package,
  ShoppingCart,
  CreditCard,
  Landmark,
  Percent,
  Factory,
  Users,
  Boxes,
  Building2,
  Layers,
  ChevronDown,
  Settings,
  Handshake,
} from "lucide-react";

import LanguageSwitcher from "./LanguageSwitcher";

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const location = useLocation();

  const isPos = location.pathname.startsWith("/pos");

  const [open, setOpen] = useState({});

  const menu = [
    {
      title: "navigation.posSystem",
      icon: <Layers size={18} />,
      path: "/pos",
    },
    {
      title: "navigation.dashboard",
      icon: <Home size={18} />,
      path: "/",
    },
    {
      title: "navigation.sales",
      icon: <ShoppingCart size={18} />,
      children: [
        { title: "navigation.sales", path: "/sales" },
        { title: "navigation.customers", path: "/customer" },
      ],
    },
    {
      title: "navigation.purchase",
      icon: <CreditCard size={18} />,
      children: [
        { title: "navigation.purchase", path: "/purchase" },
        { title: "navigation.suppliers", path: "/supplier" },
      ],
    },
    {
      title: "navigation.expense",
      icon: <CreditCard size={18} />,
      children: [
        { title: "navigation.expense", path: "/expense" },
        { title: "navigation.expensesCategory", path: "/expense-category" },
      ],
    },
    {
      title: "navigation.funds",
      icon: <Landmark size={18} />,
      children: [
        {
          title: "navigation.funds",
          path: "/funds",
        },
        {
          title: "navigation.payment",
          path: "/payments",
        },
        {
          title: "navigation.transfer",
          path: "/fundTransfer",
        },
      ],
    },
    {
      title: "navigation.products",
      icon: <Package size={18} />,
      path: "/products",
    },
    {
      title: "navigation.partners",
      icon: <Handshake size={18} />,
      path: "/partners",
    },
    {
      title: "navigation.settings",
      icon: <Settings size={18} />,
      children: [
        { title: "navigation.units", path: "/unit" },
        { title: "navigation.currency", path: "/currency" },
        { title: "navigation.taxes", path: "/tax" },
        { title: "navigation.companySettings", path: "/company-settings" },
      ],
    },
  ];

  useEffect(() => {
    const newOpen = {};

    menu.forEach((item, index) => {
      if (!item.children) return;

      const match = item.children.some((c) =>
        location.pathname.startsWith(c.path)
      );

      if (match) newOpen[index] = true;
    });

    setOpen((prev) => ({ ...prev, ...newOpen }));
  }, [location.pathname]);

  function toggleGroup(index) {
    setOpen((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  if (isPos) {
    return (
      <div className="fixed top-4 left-4 z-50">
        <NavLink
          to="/"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700"
        >
          ← {t("navigation.dashboard")}
        </NavLink>
      </div>
    );
  }

  function SidebarSubItem({ to, title }) {
    return (
      <NavLink
        to={to}
        className={({ isActive }) =>
          `block px-3 py-2 rounded-lg text-sm ${
            isActive
              ? "bg-blue-500/10 text-blue-400"
              : "text-gray-300 hover:bg-white/5 hover:text-white"
          }`
        }
      >
        {t(title)}
      </NavLink>
    );
  }

  function SidebarGroupTitle({ icon, title, index }) {
    return (
      <button
        onClick={() => toggleGroup(index)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs uppercase tracking-wider hover:text-white"
      >
        <div className="flex items-center gap-3">
          {icon}
          <span>{t(title)}</span>
        </div>

        <ChevronDown
          size={16}
          className={`transition-transform ${open[index] ? "rotate-180" : ""}`}
        />
      </button>
    );
  }

  return (
    <div
      className={`fixed ${
        isRtl ? "right-0 border-l" : "left-0 border-r"
      } top-0 h-screen w-64 bg-[#0b1220] text-white border-white/5 flex flex-col`}
    >
      <div className="p-5 border-b border-white/5">
        <h1 className="text-xl font-bold">{t("app.name")}</h1>
        <p className="text-xs text-gray-400">{t("app.tagline")}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menu.map((item, index) => {
          const hasChildren = item.children && item.children.length > 0;

          if (!hasChildren) {
            return (
              <NavLink
                key={index}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                    isActive
                      ? "bg-blue-500/10 text-blue-400"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`
                }
              >
                {item.icon}
                <span>{t(item.title)}</span>
              </NavLink>
            );
          }

          return (
            <div key={index}>
              <SidebarGroupTitle
                icon={item.icon}
                title={item.title}
                index={index}
              />

              {open[index] && (
                <div className="ml-4 border-l border-white/10 pl-2 space-y-1">
                  {item.children.map((child) => (
                    <SidebarSubItem
                      key={child.path}
                      to={child.path}
                      title={child.title}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <LanguageSwitcher />
      </div>
    </div>
  );
}
