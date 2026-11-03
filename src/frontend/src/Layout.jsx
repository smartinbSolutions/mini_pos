import Sidebar from "./components/Sidebar";
import { Outlet, useLocation, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCallback, useState } from "react";
import { Menu, ShoppingBasket } from "lucide-react";

export default function Layout() {
  const { t } = useTranslation();

  const location = useLocation();
  const isPos = location.pathname.startsWith("/pos");

  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // POS mode → no sidebar
  if (isPos) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Outlet />
      </div>
    );
  }

  return (
    <div>
      <Sidebar mobileOpen={menuOpen} onClose={closeMenu} />

      {/* TOP BAR — phones / tablets only, where the menu slides out */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b-2 border-slate-200 bg-white px-3 py-2 lg:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="ui-btn ui-btn-soft px-4"
          aria-label={t("simple.nav.openMenu")}
        >
          <Menu size={24} />
          {t("simple.nav.menu")}
        </button>
        <NavLink to="/pos" className="ui-btn ui-btn-ok px-5">
          <ShoppingBasket size={22} />
          {t("simple.nav.sell")}
        </NavLink>
      </div>

      <div className="min-h-screen bg-gray-100 p-4 lg:ms-64">
        <Outlet />
      </div>
    </div>
  );
}
