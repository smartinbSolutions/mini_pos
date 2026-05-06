import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./Layout";

import Dashboard from "./pages/DashboardPage";
import Sales from "./pages/SalesPage";
import Payments from "./pages/PaymentsPage";
import PosPointPage from "./pages/PosPointPage";
import UnitList from "./components/Unit/components/UnitList";
import CurrencyList from "./components/Cash/Currency/components/CurrencyList";
import FundList from "./components/Cash/Fund/components/FundList";
import TaxList from "./components/Tax/components/TaxList";
import { SuppliersList } from "./components/Supplier/components/SuppliersList";
import { CustomerList } from "./components/Customer/components/CustomerList";
import ProductList from "./components/Products/components/productList";
import PurchaseList from "./components/Purchase/components/PurchaseList";
import AddPurchase from "./components/Purchase/components/AddPurchase";
import UpdatePurchase from "./components/Purchase/components/UpdatePurchase";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<ProductList />} />
          <Route path="sales" element={<Sales />} />
          <Route path="purchase" element={<PurchaseList />} />
          <Route path="add-purchase" element={<AddPurchase />} />
          <Route path="edit-purchase/:id" element={<UpdatePurchase />} />
          <Route path="payments" element={<Payments />} />
          <Route path="PosPointPage" element={<PosPointPage />} />
          <Route path="unit" element={<UnitList />} />
          <Route path="currency" element={<CurrencyList />} />
          <Route path="funds" element={<FundList />} />
          <Route path="tax" element={<TaxList />} />
          <Route path="supplier" element={<SuppliersList />} />
          <Route path="customer" element={<CustomerList />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
