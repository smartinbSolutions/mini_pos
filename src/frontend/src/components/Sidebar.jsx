import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
} from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  return (
    <div
      className={`fixed ${isRtl ? "right-0 border-l" : "left-0 border-r"} top-0 h-screen w-64 bg-[#0b1220] text-white border-white/5 flex flex-col`}
    >
      <div className="p-5 border-b border-white/5">
        <h1 className="text-xl font-bold tracking-wide">{t("app.name")}</h1>
        <p className="text-xs text-gray-400 mt-1">{t("app.tagline")}</p>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <Section title={t("navigation.main")} />

        <SidebarItem to="/" icon={<Home size={18} />} title={t("navigation.dashboard")} />
        <SidebarItem
          to="/products"
          icon={<Package size={18} />}
          title={t("navigation.products")}
        />
        <SidebarItem
          to="/sales"
          icon={<ShoppingCart size={18} />}
          title={t("navigation.sales")}
        />
        <SidebarItem
          to="/purchase"
          icon={<CreditCard size={18} />}
          title={t("navigation.purchase")}
        />

        <Section title={t("navigation.management")} />

        <SidebarItem to="/pos" icon={<Layers size={18} />} title={t("navigation.posSystem")} />
        <SidebarItem to="/unit" icon={<Boxes size={18} />} title={t("navigation.units")} />
        <SidebarItem to="/currency" icon={<DollarIcon />} title={t("navigation.currency")} />
        <SidebarItem to="/funds" icon={<Landmark size={18} />} title={t("navigation.funds")} />
        <SidebarItem to="/tax" icon={<Percent size={18} />} title={t("navigation.taxes")} />

        <Section title={t("navigation.people")} />

        <SidebarItem
          to="/supplier"
          icon={<Factory size={18} />}
          title={t("navigation.suppliers")}
        />
        <SidebarItem
          to="/customer"
          icon={<Users size={18} />}
          title={t("navigation.customers")}
        />

        <Section title={t("navigation.company")} />
        <SidebarItem
          to="/company-settings"
          icon={<Building2 size={18} />}
          title={t("navigation.companySettings")}
        />
      </nav>

      <div className="space-y-3 p-4 border-t border-white/5 text-xs text-gray-500">
        <LanguageSwitcher />
        <div>{t("app.version")}</div>
      </div>
    </div>
  );
}

function Section({ title }) {
  return (
    <div className="pt-4 pb-2 px-2 text-[10px] text-gray-500 tracking-widest">
      {title}
    </div>
  );
}

function SidebarItem({ icon, title, to }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `
        group relative flex items-center gap-3 px-3 py-2 rounded-lg
        transition-all duration-200
        ${
          isActive
            ? "bg-blue-500/10 text-blue-400"
            : "text-gray-300 hover:bg-white/5 hover:text-white"
        }
      `
      }
    >
      <span className="absolute start-0 top-2 bottom-2 w-1 rounded-full bg-blue-500 scale-y-0 group-data-[active=true]:scale-y-100 transition-transform" />
      <span className="opacity-80 group-hover:opacity-100 transition-transform group-hover:scale-110">
        {icon}
      </span>
      <span className="text-sm font-medium tracking-wide">{title}</span>
    </NavLink>
  );
}

function DollarIcon() {
  return <CreditCard size={18} />;
}
