import { NavLink } from "react-router-dom";
import { Home, Box, ShoppingCart, DollarSign } from "lucide-react";

export default function Sidebar() {
  return (
    <div className="w-64 h-screen bg-[#111827] text-white flex flex-col p-4">
      <h1 className="text-2xl font-bold mb-10">POS System</h1>

      <nav className="flex flex-col gap-2">
        <SidebarItem to="/" icon={<Home />} title="Dashboard" />
        <SidebarItem to="/products" icon={<Box />} title="Products" />
        <SidebarItem to="/sales" icon={<ShoppingCart />} title="Sales" />
        <SidebarItem to="/payments" icon={<DollarSign />} title="Payments" />
        <SidebarItem
          to="/PosPointPage"
          icon={<DollarSign />}
          title="Pos Point"
        />
      </nav>
    </div>
  );
}

function SidebarItem({ icon, title, to }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 p-3 rounded-lg transition ${
          isActive ? "bg-blue-600" : "hover:bg-gray-700"
        }`
      }
    >
      {icon}
      <span>{title}</span>
    </NavLink>
  );
}
