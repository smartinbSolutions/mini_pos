import React, { useEffect, useState } from "react";
import usePrimaryCurrency from "../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState({
    totalSales: 0,
    products: 0,
    customers: 0,
    profit: 0,
    todaySales: 0,
    todayPurchases: 0,
    invoiceCount: 0,
    paidInvoices: 0,
    unpaidInvoices: 0,
    inventoryValue: 0,
    lowStockProducts: 0,
    totalIncome: 0,
    totalExpense: 0,
    salesTrend: [],
    purchaseTrend: [],
    expenseTrend: [],
    topProducts: [],
  });

  const [loading, setLoading] = useState(true);
  const { money } = usePrimaryCurrency();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const res = await window.api.getDashboardStats();

        setData((current) => ({ ...current, ...(res || {}) }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const Card = ({ title, value, color }) => (
    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg flex flex-col gap-2">
      <span className="text-gray-400 text-sm">{title}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );

  const maxTrendValue = Math.max(
    1,
    ...data.salesTrend.map((item) => Number(item.sales || 0)),
    ...data.purchaseTrend.map((item) => Number(item.purchases || 0)),
    ...data.expenseTrend.map((item) => Number(item.expense || 0)),
  );

  const topProductMax = Math.max(
    1,
    ...data.topProducts.map((item) => Number(item.quantity || 0)),
  );

  const statusTotal = Math.max(1, data.paidInvoices + data.unpaidInvoices);
  const paidPercent = Math.round((data.paidInvoices / statusTotal) * 100);
  const unpaidPercent = Math.round((data.unpaidInvoices / statusTotal) * 100);

  const trendByDay = data.salesTrend.map((item, index) => ({
    day: item.day,
    sales: Number(item.sales || 0),
    purchases: Number(data.purchaseTrend[index]?.purchases || 0),
    expense: Number(data.expenseTrend[index]?.expense || 0),
  }));

  const formatDay = (value) =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: "short",
      day: "2-digit",
    }).format(new Date(`${value}T00:00:00`));

  const AnalyticsPanel = ({ title, children }) => (
    <div className="bg-white rounded-xl p-6 shadow">
      <h2 className="text-lg font-bold text-gray-900 mb-5">{title}</h2>
      {children}
    </div>
  );

  if (loading) {
    return <div className="p-6 text-gray-500">{t("dashboard.loading")}</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          title={t("dashboard.totalSales")}
          value={money(data.totalSales)}
          color="text-green-400"
        />

        <Card
          title={t("dashboard.products")}
          value={data.products}
          color="text-blue-400"
        />

        <Card
          title={t("dashboard.customers")}
          value={data.customers}
          color="text-yellow-400"
        />

        <Card
          title={t("dashboard.profit")}
          value={money(data.profit)}
          color="text-purple-400"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        <Card
          title={t("dashboard.todaySales")}
          value={money(data.todaySales)}
          color="text-emerald-400"
        />
        <Card
          title={t("dashboard.todayPurchases")}
          value={money(data.todayPurchases)}
          color="text-red-300"
        />
        <Card
          title={t("dashboard.inventoryValue")}
          value={money(data.inventoryValue)}
          color="text-cyan-300"
        />
        {/* <Card
          title={t("dashboard.lowStock")}
          value={data.lowStockProducts}
          color="text-orange-300"
        /> */}
      </div>

      <div className="mt-10 grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <AnalyticsPanel title={t("dashboard.salesPurchasesTrend")}>
            <div className="h-72 flex items-end gap-3 border-b border-gray-200 pb-4">
              {trendByDay.map((item) => (
                <div
                  key={item.day}
                  className="flex-1 min-w-0 h-full flex flex-col justify-end gap-2"
                >
                  <div className="flex items-end justify-center gap-1 h-full">
                    <div
                      className="w-4 rounded-t bg-emerald-500"
                      title={`${t("dashboard.totalSales")}: ${money(item.sales)}`}
                      style={{
                        height: `${Math.max(5, (item.sales / maxTrendValue) * 100)}%`,
                      }}
                    />
                    <div
                      className="w-4 rounded-t bg-rose-500"
                      title={`${t("dashboard.purchases")}: ${money(item.purchases)}`}
                      style={{
                        height: `${Math.max(5, (item.purchases / maxTrendValue) * 100)}%`,
                      }}
                    />
                    <div
                      className="w-4 rounded-t bg-blue-500"
                      title={`${t("dashboard.expense")}: ${money(item.expense)}`}
                      style={{
                        height: `${Math.max(5, (item.expense / maxTrendValue) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-center text-xs text-gray-500 truncate">
                    {formatDay(item.day)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-emerald-500" />
                {t("dashboard.sales")}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-rose-500" />
                {t("dashboard.purchases")}
              </span>
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded bg-blue-500" />
                {t("dashboard.expense")}
              </span>
            </div>
          </AnalyticsPanel>
        </div>

        <AnalyticsPanel title={t("dashboard.invoiceStatus")}>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {t("dashboard.paidInvoices")}
                </span>
                <span className="font-semibold text-gray-900">
                  {data.paidInvoices}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${paidPercent}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">
                  {t("dashboard.unpaidInvoices")}
                </span>
                <span className="font-semibold text-gray-900">
                  {data.unpaidInvoices}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500"
                  style={{ width: `${unpaidPercent}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">
                  {t("dashboard.invoices")}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {data.invoiceCount}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500">
                  {t("dashboard.cashFlow")}
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {money(data.totalIncome - data.totalExpense)}
                </p>
              </div>
            </div>
          </div>
        </AnalyticsPanel>

        <AnalyticsPanel title={t("dashboard.topProducts")}>
          {data.topProducts.length ? (
            <div className="space-y-4">
              {data.topProducts.map((product) => (
                <div key={product.name}>
                  <div className="flex justify-between gap-3 text-sm mb-2">
                    <span className="font-medium text-gray-700 truncate">
                      {product.name}
                    </span>
                    <span className="text-gray-500 shrink-0">
                      {Number(product.quantity || 0)}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{
                        width: `${(Number(product.quantity || 0) / topProductMax) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              {t("dashboard.noSalesData")}
            </div>
          )}
        </AnalyticsPanel>
      </div>
    </div>
  );
}
