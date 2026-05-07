import Sidebar from "./components/Sidebar";
import { Outlet } from "react-router-dom";

export default function Layout() {
  return (
    <div>
      <Sidebar />

      <div className="ml-64 bg-gray-100 min-h-screen p-4">
        <Outlet />
      </div>
    </div>
  );
}
