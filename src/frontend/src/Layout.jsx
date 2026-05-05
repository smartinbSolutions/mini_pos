import Sidebar from "./components/Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div className="flex">
      <Sidebar />

      <div className="flex-1 bg-gray-100 min-h-screen p-4">
        <Outlet />
      </div>
    </div>
  );
}
