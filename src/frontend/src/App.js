import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";

import Dashboard from "./pages/DashboardPage";
import Payments from "./pages/PaymentsPage";
import PosPointPage from "./pages/PosPointPage";
import UnitList from "./components/Unit/components/UnitList";
import CurrencyList from "./components/Cash/Currency/components/CurrencyList";
import FundList from "./components/Cash/Fund/components/FundList";
import TaxList from "./components/Tax/components/TaxList";
import { SuppliersList } from "./components/Supplier/components/SuppliersList";
import { CustomerList } from "./components/Customer/components/CustomerList";
import ProductList from "./components/Products/components/productList";
import PurchaseList from "./components/Invoices/Purchase/components/PurchaseList";
import AddPurchase from "./components/Invoices/Purchase/components/AddPurchase";
import UpdatePurchase from "./components/Invoices/Purchase/components/UpdatePurchase";
import SalesList from "./components/Invoices/Sales/components/SalesList";
import AddSales from "./components/Invoices/Sales/components/AddSales";
import UpdateSales from "./components/Invoices/Sales/components/UpdateSales";
import SetupPage from "./components/SetupPage";

import { useEffect, useState } from "react";

export default function App() {
  const [isSetup, setIsSetup] = useState(null);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await window.api.getCompanySetting();
        console.log(res);

        setIsSetup(!!res?.exists);
      } catch (err) {
        console.error(err);
        setIsSetup(false);
      }
    };

    check();
  }, []);

  if (isSetup === null) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* SETUP MODE */}
        {!isSetup ? (
          <>
            <Route path="/setup" element={<SetupPage />} />
            <Route path="*" element={<Navigate to="/setup" />} />
          </>
        ) : (
          <>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="products" element={<ProductList />} />
              <Route path="sales" element={<SalesList />} />
              <Route path="add-sales" element={<AddSales />} />
              <Route path="edit-sales/:id" element={<UpdateSales />} />
              <Route path="purchase" element={<PurchaseList />} />
              <Route path="add-purchase" element={<AddPurchase />} />
              <Route path="edit-purchase/:id" element={<UpdatePurchase />} />
              <Route path="payments" element={<Payments />} />
              <Route path="pos" element={<PosPointPage />} />
              <Route path="unit" element={<UnitList />} />
              <Route path="currency" element={<CurrencyList />} />
              <Route path="funds" element={<FundList />} />
              <Route path="tax" element={<TaxList />} />
              <Route path="supplier" element={<SuppliersList />} />
              <Route path="customer" element={<CustomerList />} />
            </Route>

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
