import { NavLink } from "react-router-dom";
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
  Settings,
  Wallet,
  Layers,
} from "lucide-react";

export default function Sidebar() {
  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-[#0b1220] text-white border-r border-white/5 flex flex-col">
      {/* HEADER */}
      <div className="p-5 border-b border-white/5">
        <h1 className="text-xl font-bold tracking-wide">
          POS <span className="text-blue-500">System</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">Inventory & Sales Manager</p>
      </div>

      {/* NAV */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <Section title="MAIN" />

        <SidebarItem to="/" icon={<Home size={18} />} title="Dashboard" />
        <SidebarItem
          to="/products"
          icon={<Package size={18} />}
          title="Products"
        />
        <SidebarItem
          to="/sales"
          icon={<ShoppingCart size={18} />}
          title="Sales"
        />
        <SidebarItem
          to="/purchase"
          icon={<CreditCard size={18} />}
          title="Purchase"
        />
        <SidebarItem
          to="/payments"
          icon={<Wallet size={18} />}
          title="Payments"
        />

        <Section title="MANAGEMENT" />

        <SidebarItem to="/pos" icon={<Layers size={18} />} title="POS System" />
        <SidebarItem to="/unit" icon={<Boxes size={18} />} title="Units" />
        <SidebarItem to="/currency" icon={<DollarIcon />} title="Currency" />
        <SidebarItem to="/funds" icon={<Landmark size={18} />} title="Funds" />
        <SidebarItem to="/tax" icon={<Percent size={18} />} title="Taxes" />

        <Section title="PEOPLE" />

        <SidebarItem
          to="/supplier"
          icon={<Factory size={18} />}
          title="Suppliers"
        />
        <SidebarItem
          to="/customer"
          icon={<Users size={18} />}
          title="Customers"
        />

        <Section title="COMPANY" />
        <SidebarItem
          to="/company-settings"
          icon={<Building2 size={18} />}
          title="Company"
        />
        {/* <SidebarItem
          to="/settings"
          icon={<Settings size={18} />}
          title="Settings"
        /> */}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-white/5 text-xs text-gray-500">
        v1.0.0 • POS System
      </div>
    </div>
  );
}

/* ================= SECTION ================= */
function Section({ title }) {
  return (
    <div className="pt-4 pb-2 px-2 text-[10px] text-gray-500 tracking-widest">
      {title}
    </div>
  );
}

/* ================= ITEM ================= */
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
      {/* ACTIVE BAR */}
      <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-blue-500 scale-y-0 group-data-[active=true]:scale-y-100 transition-transform" />

      {/* ICON */}
      <span className="opacity-80 group-hover:opacity-100 transition-transform group-hover:scale-110">
        {icon}
      </span>

      {/* TEXT */}
      <span className="text-sm font-medium tracking-wide">{title}</span>
    </NavLink>
  );
}

/* optional nicer icon */
function DollarIcon() {
  return <CreditCard size={18} />;
}
