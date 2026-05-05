import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";

import Dashboard from "./pages/DashboardPage";
import Products from "./pages/ProductsPage";
import Sales from "./pages/SalesPage";
import Payments from "./pages/PaymentsPage";
import PosPointPage from "./pages/PosPointPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="sales" element={<Sales />} />
          <Route path="payments" element={<Payments />} />
          <Route path="PosPointPage" element={<PosPointPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
