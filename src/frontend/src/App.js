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
import SetupPage from "./components/SetupPage/components/SetupPage";

import { useEffect, useState } from "react";
import CompanySettings from "./components/CompanySettings/components/CompanySettings";
import FundMovementsPage from "./components/Cash/Fund/components/FundPayment";
import PartyLedgerPage from "./components/Payment/components/PartyLedgerPage";
import ActivationPage from "./renderer/ActivationPage";
import SalesInvoiceView from "./components/Invoices/Sales/components/SalesInvoiceView";
import PurchaseInvoiceView from "./components/Invoices/Purchase/components/PurchaseInvoiceView";

export default function App() {
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [isSetup, setIsSetup] = useState(null);

  useEffect(() => {
    const checkLicense = async () => {
      try {
        const status = await window.license?.status();
        setLicenseStatus(status?.valid === true);
      } catch (err) {
        console.error(err);
        setLicenseStatus(false);
      }
    };

    checkLicense();
  }, []);

  useEffect(() => {
    if (!licenseStatus) return;

    const check = async () => {
      try {
        const res = await window.api.getCompanySetting();
        setIsSetup(!!res?.exists);
      } catch (err) {
        console.error(err);
        setIsSetup(false);
      }
    };

    check();
  }, [licenseStatus]);

  if (licenseStatus === null) return <div>Loading...</div>;

  if (!licenseStatus) {
    return <ActivationPage onActivated={() => setLicenseStatus(true)} />;
  }

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
              <Route path="view-sales/:id" element={<SalesInvoiceView />} />
              <Route path="edit-sales/:id" element={<UpdateSales />} />
              <Route path="purchase" element={<PurchaseList />} />
              <Route path="add-purchase" element={<AddPurchase />} />
              <Route
                path="view-purchase/:id"
                element={<PurchaseInvoiceView />}
              />
              <Route path="edit-purchase/:id" element={<UpdatePurchase />} />
              <Route path="payments" element={<Payments />} />
              <Route
                path="payment/:type/:id"
                element={<PartyLedgerPage />}
              />{" "}
              <Route path="pos" element={<PosPointPage />} />
              <Route path="unit" element={<UnitList />} />
              <Route path="currency" element={<CurrencyList />} />
              <Route path="funds" element={<FundList />} />
              <Route path="/fund/:id" element={<FundMovementsPage />} />
              <Route path="tax" element={<TaxList />} />
              <Route path="supplier" element={<SuppliersList />} />
              <Route path="customer" element={<CustomerList />} />
              <Route path="company-settings" element={<CompanySettings />} />
            </Route>

            {/* fallback */}
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}
