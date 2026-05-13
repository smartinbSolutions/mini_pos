import React, { useEffect, useState } from "react";

export default function Dashboard() {
  const [data, setData] = useState({
    totalSales: 0,
    products: 0,
    customers: 0,
    profit: 0,
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const res = await window.api.getDashboardStats();

        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);
  console.log(data);

  const formatMoney = (v) =>
    Number(v || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const Card = ({ title, value, color }) => (
    <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg flex flex-col gap-2">
      <span className="text-gray-400 text-sm">{title}</span>
      <span className={`text-2xl font-bold ${color}`}>{value}</span>
    </div>
  );

  if (loading) {
    return <div className="p-6 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      {/* TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card
          title="Total Sales"
          value={`$${formatMoney(data.totalSales)}`}
          color="text-green-400"
        />

        <Card title="Products" value={data.products} color="text-blue-400" />

        <Card
          title="Customers"
          value={data.customers}
          color="text-yellow-400"
        />

        <Card
          title="Profit"
          value={`$${formatMoney(data.profit)}`}
          color="text-purple-400"
        />
      </div>

      {/* FUTURE CHART AREA */}
      <div className="mt-10 bg-white rounded-xl p-6 shadow">
        <h2 className="text-lg font-bold mb-4">Analytics</h2>

        <div className="h-64 flex items-center justify-center text-gray-400">
          Charts will go here (Recharts / Chart.js)
        </div>
      </div>
    </div>
  );
}
