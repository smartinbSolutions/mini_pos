import Sidebar from "./components/Sidebar";
import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function Layout() {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";

  return (
    <div>
      <Sidebar />

      <div className={`${isRtl ? "mr-64" : "ml-64"} bg-gray-100 min-h-screen p-4`}>
        <Outlet />
      </div>
    </div>
  );
}
