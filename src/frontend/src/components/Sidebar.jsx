import { NavLink } from "react-router-dom";
import {
  Home,
  Box,
  ShoppingCart,
  DollarSign,
  ShelvingUnit,
  Landmark,
  TicketPercent,
  Factory,
  Users,
} from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white flex flex-col p-4 border-r border-gray-800">
      <div className="mb-10">
        <h1 className="text-xl font-bold tracking-wide">
          POS <span className="text-blue-500">System</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">Inventory & Sales Manager</p>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        <SidebarItem to="/" icon={<Home size={18} />} title="Dashboard" />
        <SidebarItem to="/products" icon={<Box size={18} />} title="Products" />
        <SidebarItem
          to="/sales"
          icon={<ShoppingCart size={18} />}
          title="Sales"
        />
        <SidebarItem
          to="/purchase"
          icon={<ShoppingCart size={18} />}
          title="Purchase"
        />
        <SidebarItem
          to="/payments"
          icon={<DollarSign size={18} />}
          title="Payments"
        />

        <div className="mt-4 mb-2 text-[10px] uppercase text-gray-500 tracking-widest">
          Management
        </div>

        <SidebarItem
          to="/PosPointPage"
          icon={<ShoppingCart size={18} />}
          title="POS Point"
        />
        <SidebarItem
          to="/unit"
          icon={<ShelvingUnit size={18} />}
          title="Units"
        />
        <SidebarItem
          to="/currency"
          icon={<DollarSign size={18} />}
          title="Currency"
        />
        <SidebarItem to="/funds" icon={<Landmark size={18} />} title="Funds" />
        <SidebarItem
          to="/tax"
          icon={<TicketPercent size={18} />}
          title="Taxes"
        />

        <div className="mt-4 mb-2 text-[10px] uppercase text-gray-500 tracking-widest">
          People
        </div>

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
      </nav>

      <div className="mt-auto pt-4 border-t border-gray-800 text-xs text-gray-500">
        v1.0.0 • POS System
      </div>
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
        relative flex items-center gap-3 px-3 py-2 rounded-lg
        transition-all duration-200 group
        ${
          isActive
            ? "bg-blue-600/20 text-blue-400"
            : "text-gray-300 hover:bg-gray-800 hover:text-white"
        }
      `
      }
    >
      {/* ACTIVE BAR */}
      <span
        className={({ isActive }) =>
          `
          absolute left-0 top-2 bottom-2 w-1 rounded-full transition-all
          ${isActive ? "bg-blue-500" : "bg-transparent group-hover:bg-gray-600"}
        `
        }
      />

      <span className="opacity-80 group-hover:opacity-100 transition">
        {icon}
      </span>

      <span className="text-sm font-medium">{title}</span>
    </NavLink>
  );
}
