import React, { useEffect, useState } from "react";
import { ArrowLeft, Receipt, HandCoins } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

const ExpenseView = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const api = window.api;

  const { money } = usePrimaryCurrency();

  const [expense, setExpense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadExpense = async () => {
    try {
      setLoading(true);

      const res = await api.getExpense(id);

      setExpense(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpense();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center">Loading...</div>;
  }

  if (!expense) {
    return (
      <div className="p-10 text-center text-red-500">
        {error || "Expense not found"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] p-6 text-slate-900">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="flex items-center justify-between rounded-[32px] bg-white/80 p-6 shadow">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-[#4663ff] text-white">
              <Receipt size={24} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase text-[#4663ff]">
                {t("ui.expenses")}
              </p>

              <h1 className="text-3xl font-black">Expense #{expense.id}</h1>

              <p className="text-sm text-slate-500">{expense.date}</p>
            </div>
          </div>

          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 rounded-2xl border px-4 py-2 font-bold"
          >
            <ArrowLeft size={16} />

            {t("common.back")}
          </button>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
          <section className="overflow-hidden rounded-[28px] bg-white shadow">
            <div className="border-b p-5">
              <h2 className="text-lg font-black">{t("ui.items")}</h2>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-[#f8faff]">
                <tr>
                  <th className="p-4 text-left">{t("ui.category")}</th>

                  <th className="p-4">{t("ui.price")}</th>

                  <th className="p-4">{t("ui.total")}</th>
                </tr>
              </thead>

              <tbody>
                {expense.items?.map((item, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-4 font-bold">
                      {item.category_name || item.name || "-"}
                    </td>

                    <td className="p-4 text-center">{money(item.price)}</td>

                    <td className="p-4 text-center font-black">
                      {money(item.total || item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <aside className="space-y-4">
            <section className="rounded-[28px] bg-white p-5 shadow">
              <div className="flex items-center gap-3 mb-4">
                <HandCoins className="text-[#4663ff]" />

                <h3 className="font-black">{t("ui.summary")}</h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{t("ui.supplier")}</span>

                  <b>{expense.supplier_name || "-"}</b>
                </div>

                <div className="flex justify-between">
                  <span>{t("ui.status")}</span>

                  <span
                    className={`rounded-xl px-3 py-1 text-xs font-bold ${
                      expense.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {expense.status}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span>{t("ui.subtotal")}</span>

                  <b>{money(expense.subtotal)}</b>
                </div>

                <div className="flex justify-between text-xl font-black">
                  <span>{t("ui.total")}</span>

                  <span className="text-[#4663ff]">
                    {money(expense.net_total)}
                  </span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ExpenseView;
