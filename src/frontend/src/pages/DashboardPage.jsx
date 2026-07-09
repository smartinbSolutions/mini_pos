import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import usePrimaryCurrency from "../Global/usePrimaryCurrency";
import { formatMoney } from "../Global/FormatNumber";

import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ShoppingCart,
  ReceiptText,
  Boxes,
  Users,
  AlertTriangle,
  PlusCircle,
  HandCoins,
  ArrowRightLeft,
  Landmark,
  Package,
} from "lucide-react";

const emptyStats = {
  sales: {
    total: 0,
    today: 0,
    count: 0,
    trend: [],
    paid: 0,
    partial: 0,
    unpaid: 0,
  },
  purchase: {
    total: 0,
    today: 0,
    count: 0,
    trend: [],
    paid: 0,
    partial: 0,
    unpaid: 0,
  },
  expense: {
    total: 0,
    today: 0,
    count: 0,
    trend: [],
    paid: 0,
    partial: 0,
    unpaid: 0,
  },
  profitLoss: { cogs: 0, grossProfit: 0, netProfit: 0 },
  cashFlow: { totalIncome: 0, totalExpense: 0, net: 0 },
  topProducts: { byQuantity: [], byRevenue: [] },
  fundBalances: [],
  products: 0,
  customers: 0,
  inventoryValue: 0,
  lowStockProducts: 0,
};

const MODULE_META = {
  sales: { icon: ShoppingCart, tone: "emerald" },
  purchase: { icon: Boxes, tone: "blue" },
  expense: { icon: ReceiptText, tone: "rose" },
};

const TONE_CLASSES = {
  emerald: {
    text: "text-emerald-700",
    bg: "bg-emerald-500",
    soft: "bg-emerald-50",
    iconBg: "bg-emerald-100",
  },
  blue: {
    text: "text-[#4663ff]",
    bg: "bg-[#4663ff]",
    soft: "bg-[#eef3ff]",
    iconBg: "bg-[#e5ebff]",
  },
  rose: {
    text: "text-rose-600",
    bg: "bg-rose-500",
    soft: "bg-rose-50",
    iconBg: "bg-rose-100",
  },
};

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { money, primaryCurrency } = usePrimaryCurrency();

  const [data, setData] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [productView, setProductView] = useState("byQuantity");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await window.api.getDashboardStats();
        console.log(res);
        setData((current) => ({ ...current, ...(res || {}) }));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const formatDay = (value) =>
    new Intl.DateTimeFormat(i18n.language, {
      weekday: "short",
      day: "2-digit",
    }).format(new Date(`${value}T00:00:00`));

  const quickActions = [
    {
      key: "sale",
      label: t("dashboard.new_sale", "New Sale"),
      icon: ShoppingCart,
      tone: "emerald",
      to: "/add-sales",
    },
    {
      key: "purchase",
      label: t("dashboard.new_purchase", "New Purchase"),
      icon: Boxes,
      tone: "blue",
      to: "/add-purchase",
    },
    {
      key: "expense",
      label: t("dashboard.new_expense", "New Expense"),
      icon: ReceiptText,
      tone: "rose",
      to: "/add-expense",
    },
    {
      key: "payment",
      label: t("dashboard.new_payment", "New Payment"),
      icon: HandCoins,
      tone: "blue",
      to: "/payments/new",
    },
    {
      key: "transfer",
      label: t("dashboard.transfer", "Transfer Funds"),
      icon: ArrowRightLeft,
      tone: "blue",
      to: "/funds",
    },
  ];

  const topProductsList = data.topProducts?.[productView] || [];
  const topProductMax = Math.max(
    1,
    ...topProductsList.map((p) =>
      Number(productView === "byQuantity" ? p.quantity : p.revenue || 0),
    ),
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6">
        <div className="text-slate-500">{t("dashboard.loading")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* HEADER */}
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-[#4663ff]">
            {t("dashboard.overview", "Overview")}
          </p>
          <h1 className="text-4xl font-black leading-tight text-slate-950">
            {t("dashboard.dashboard", "Dashboard")}
          </h1>
        </div>

        {/* QUICK ACTION BAR */}
        <section className="overflow-x-auto rounded-[24px] border border-white/80 bg-white/80 p-3 shadow-[0_18px_60px_rgba(70,99,255,0.10)] backdrop-blur">
          <div className="flex min-w-max gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const tone = TONE_CLASSES[action.tone];
              return (
                <button
                  key={action.key}
                  onClick={() => navigate(action.to)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-2xl border border-[#e5ebff] ${tone.soft} px-4 py-3 text-sm font-bold ${tone.text} transition hover:brightness-95`}
                >
                  <Icon size={16} />
                  {action.label}
                  <PlusCircle size={14} className="opacity-50" />
                </button>
              );
            })}
          </div>
        </section>

        {/* MODULE TRIO: sales / purchase / expense */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {["sales", "purchase", "expense"].map((key) => {
            const stat = data[key];
            const meta = MODULE_META[key];
            const tone = TONE_CLASSES[meta.tone];
            const Icon = meta.icon;
            const statusTotal = Math.max(
              1,
              stat.paid + stat.partial + stat.unpaid,
            );
            const maxTrend = Math.max(
              1,
              ...stat.trend.map((d) => Number(d.total || 0)),
            );

            return (
              <div
                key={key}
                className="flex flex-col overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_60px_rgba(70,99,255,0.10)]"
              >
                <div className="flex items-start justify-between p-6 pb-4">
                  <div>
                    <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                      {t(`dashboard.${key}`, key)}
                    </p>
                    <div
                      className={`font-mono tabular-nums text-2xl font-black ${tone.text}`}
                    >
                      {money(stat.total)}
                    </div>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {t("dashboard.today", "Today")}:{" "}
                      <span className="font-mono tabular-nums text-slate-600">
                        {money(stat.today)}
                      </span>
                    </p>
                  </div>
                  <div className={`rounded-2xl ${tone.iconBg} p-3`}>
                    <Icon size={20} className={tone.text} />
                  </div>
                </div>

                {/* sparkline */}
                <div className="flex h-16 items-end gap-1 px-6">
                  {stat.trend.map((d) => (
                    <div key={d.day} className="flex-1">
                      <div
                        className={`w-full rounded-t ${tone.bg} opacity-80`}
                        style={{
                          height: `${Math.max(6, (Number(d.total || 0) / maxTrend) * 100)}%`,
                        }}
                        title={`${formatDay(d.day)}: ${money(d.total)}`}
                      />
                    </div>
                  ))}
                </div>

                {/* paid/partial/unpaid stacked bar */}
                <div className="space-y-2 p-6 pt-4">
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(stat.paid / statusTotal) * 100}%` }}
                    />
                    <div
                      className="h-full bg-amber-400"
                      style={{
                        width: `${(stat.partial / statusTotal) * 100}%`,
                      }}
                    />
                    <div
                      className="h-full bg-slate-300"
                      style={{ width: `${(stat.unpaid / statusTotal) * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>
                      {t("dashboard.paid", "Paid")} {stat.paid}
                    </span>
                    <span>
                      {t("dashboard.partial", "Partial")} {stat.partial}
                    </span>
                    <span>
                      {t("dashboard.unpaid", "Unpaid")} {stat.unpaid}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </section>

        {/* PROFIT & LOSS + CASH FLOW */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
            <h2 className="mb-5 text-lg font-black text-slate-900">
              {t("dashboard.profit_loss", "Profit & Loss")}
            </h2>
            <div className="space-y-3 font-mono tabular-nums text-sm">
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-500">
                  {t("dashboard.revenue", "Revenue")}
                </span>
                <span className="font-bold text-slate-900">
                  {money(data.sales.total)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-500">
                  {t("dashboard.cost_of_goods_sold", "Cost of goods sold")}
                </span>
                <span className="font-bold text-rose-600">
                  -{money(data.profitLoss.cogs)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                <span className="font-sans font-bold text-slate-700">
                  {t("dashboard.gross_profit", "Gross profit")}
                </span>
                <span className="font-bold text-slate-900">
                  {money(data.profitLoss.grossProfit)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-sans text-slate-500">
                  {t("dashboard.expenses", "Expenses")}
                </span>
                <span className="font-bold text-rose-600">
                  -{money(data.expense.total)}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-[#f8faff] px-4 py-3 border-t-0">
                <span className="font-sans font-black text-slate-900">
                  {t("dashboard.net_profit", "Net profit")}
                </span>
                <span
                  className={`text-lg font-black ${
                    data.profitLoss.netProfit >= 0
                      ? "text-emerald-700"
                      : "text-rose-600"
                  }`}
                >
                  {money(data.profitLoss.netProfit)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
            <h2 className="mb-5 text-lg font-black text-slate-900">
              {t("dashboard.cashFlow", "Cash Flow")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl bg-emerald-50 p-4">
                <TrendingUp size={18} className="mb-3 text-emerald-600" />
                <div className="font-mono tabular-nums text-lg font-black text-emerald-700">
                  {money(data.cashFlow.totalIncome)}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {t("dashboard.income", "Income")}
                </div>
              </div>
              <div className="rounded-2xl bg-rose-50 p-4">
                <TrendingDown size={18} className="mb-3 text-rose-500" />
                <div className="font-mono tabular-nums text-lg font-black text-rose-600">
                  {money(data.cashFlow.totalExpense)}
                </div>
                <div className="text-xs font-semibold text-slate-500">
                  {t("dashboard.expense", "Expense")}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-[#f8faff] px-4 py-3">
              <span className="text-sm font-bold text-slate-700">
                {t("dashboard.net_cash_movement", "Net cash movement")}
              </span>
              <span
                className={`font-mono tabular-nums text-lg font-black ${
                  data.cashFlow.net >= 0 ? "text-emerald-700" : "text-rose-600"
                }`}
              >
                {money(data.cashFlow.net)}
              </span>
            </div>
          </div>
        </section>

        {/* FUND BALANCES */}
        <section className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-black text-slate-900">
            <Landmark size={18} className="text-[#4663ff]" />
            {t("dashboard.fund_balances", "Fund Balances")}
          </h2>
          {data.fundBalances.length ? (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {data.fundBalances.map((fund) => (
                <div
                  key={fund.id}
                  className="min-w-[180px] flex-1 rounded-2xl border border-[#e5ebff] bg-[#f8faff] p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">
                      {fund.name}
                    </span>
                    <span className="rounded-lg bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      {fund.currency_code}
                    </span>
                  </div>
                  <div
                    className={`font-mono tabular-nums text-xl font-black ${
                      fund.balance >= 0 ? "text-slate-900" : "text-rose-600"
                    }`}
                  >
                    {formatMoney(
                      fund.balance,
                      fund.currency_code,
                      fund.currency_symbol,
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-slate-400">
              {t("dashboard.noFunds", "No funds yet.")}
            </div>
          )}
        </section>

        {/* TOP PRODUCTS + INVENTORY */}
        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(70,99,255,0.10)] lg:col-span-2">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-black text-slate-900">
                {t("dashboard.topProducts", "Top Products")}
              </h2>
              <div className="flex rounded-xl border border-[#e5ebff] bg-[#f8faff] p-1 text-xs font-bold">
                <button
                  onClick={() => setProductView("byQuantity")}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    productView === "byQuantity"
                      ? "bg-white text-[#4663ff] shadow"
                      : "text-slate-500"
                  }`}
                >
                  {t("dashboard.by_quantity", "By quantity")}
                </button>
                <button
                  onClick={() => setProductView("byRevenue")}
                  className={`rounded-lg px-3 py-1.5 transition ${
                    productView === "byRevenue"
                      ? "bg-white text-[#4663ff] shadow"
                      : "text-slate-500"
                  }`}
                >
                  {t("dashboard.by_revenue", "By revenue")}
                </button>
              </div>
            </div>

            {topProductsList.length ? (
              <div className="space-y-4">
                {topProductsList.map((product) => {
                  const value =
                    productView === "byQuantity"
                      ? product.quantity
                      : product.revenue;
                  return (
                    <div key={product.product_id}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="truncate font-bold text-slate-700">
                          {product.name}
                        </span>
                        <span className="font-mono tabular-nums shrink-0 text-slate-500">
                          {productView === "byQuantity"
                            ? Number(value || 0)
                            : money(value)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-[#4663ff]"
                          style={{
                            width: `${(Number(value || 0) / topProductMax) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center text-sm text-slate-400">
                {t("dashboard.noSalesData")}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {t("dashboard.products", "Products")}
                  </p>
                  <p className="font-mono tabular-nums text-2xl font-black text-slate-900">
                    {data.products}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#e5ebff] p-3">
                  <Package size={20} className="text-[#4663ff]" />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {t("dashboard.customers", "Customers")}
                  </p>
                  <p className="font-mono tabular-nums text-2xl font-black text-slate-900">
                    {data.customers}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#e5ebff] p-3">
                  <Users size={20} className="text-[#4663ff]" />
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_18px_60px_rgba(70,99,255,0.10)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                    {t("dashboard.inventoryValue", "Inventory Value")}
                  </p>
                  <p className="font-mono tabular-nums text-xl font-black text-slate-900">
                    {money(data.inventoryValue)}
                  </p>
                  {data.lowStockProducts > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-amber-600">
                      <AlertTriangle size={12} />
                      {t("dashboard.lowStock", "{{count}} low stock", {
                        count: data.lowStockProducts,
                      })}
                    </p>
                  )}
                </div>
                <div className="rounded-2xl bg-[#e5ebff] p-3">
                  <Wallet size={20} className="text-[#4663ff]" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
