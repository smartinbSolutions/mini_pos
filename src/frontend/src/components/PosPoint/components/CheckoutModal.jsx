import { Wallet, CreditCard } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cents = (value) => Math.round(toNumber(value) * 100) / 100;

export default function CheckoutModal({
  funds,
  total,
  checkingOut,
  onClose,
  onCheckout,
  t,
  money,
}) {
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [changeFundId, setChangeFundId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!funds.length) {
      setPaymentAmounts({});
      return;
    }

    setPaymentAmounts((current) => {
      const fundIds = new Set(funds.map((fund) => String(fund.id)));
      return Object.fromEntries(
        Object.entries(current).filter(([fundId]) => fundIds.has(fundId)),
      );
    });

    setChangeFundId((current) =>
      current && funds.some((fund) => String(fund.id) === String(current))
        ? current
        : String(funds[0].id),
    );
  }, [funds]);

  const payments = useMemo(() => {
    return funds
      .map((fund) => {
        const amountFundCurrency = toNumber(paymentAmounts[String(fund.id)]);
        const exchangeRate = toNumber(fund.currency_exchangeRate || 1) || 1;

        return {
          fundId: Number(fund.id),
          amount: cents(amountFundCurrency / exchangeRate),
          amount_fund_currency: amountFundCurrency,
          currency_code: fund.currency_code,
          exchange_rate: exchangeRate,
        };
      })
      .filter((payment) => payment.amount_fund_currency > 0);
  }, [funds, paymentAmounts]);

  const paidTotal = useMemo(
    () => cents(payments.reduce((sum, payment) => sum + payment.amount, 0)),
    [payments],
  );

  const receivedTotal = useMemo(
    () =>
      cents(
        payments.reduce(
          (sum, payment) => sum + payment.amount_fund_currency,
          0,
        ),
      ),
    [payments],
  );

  const change = useMemo(
    () => Math.max(0, cents(paidTotal - total)),
    [paidTotal, total],
  );

  const remaining = useMemo(
    () => Math.max(0, cents(total - paidTotal)),
    [paidTotal, total],
  );

  const submit = async (event) => {
    event.preventDefault();

    if (!payments.length) {
      setError(t("screens.checkout.selectFundError"));
      return;
    }

    if (remaining > 0) {
      const message = t("screens.checkout.remainingMustBeZero");
      setError(message);
      toast.error(message);
      return false;
    }

    if (change > 0 && !changeFundId) {
      const message = t("screens.checkout.selectChangeFundError");
      setError(message);
      toast.error(message);
      return false;
    }

    try {
      await onCheckout({
        payments,
        received: paidTotal,
        receivedFundTotal: receivedTotal,
        change,
        changeFundId: change > 0 ? Number(changeFundId) : null,
      });
      onClose();
    } catch (err) {
      console.error("Checkout failed:", err);
      setError(err?.message || t("screens.checkout.failed"));
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="min-w-0">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-stone-950">
                  {t("screens.checkout.paidIntoFund")}
                </h3>
                <p className="text-xs text-stone-500">
                  {t("screens.checkout.fundHint")}
                </p>
              </div>

              <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-stone-600 shadow-sm ring-1 ring-stone-200">
                {t("screens.checkout.fundCount", { count: funds.length })}
              </span>
            </div>

            <div className="space-y-2.5">
              {funds.map((fund) => {
                const amount = paymentAmounts[String(fund.id)] ?? "";
                const exchangeRate =
                  toNumber(fund.currency_exchangeRate || 1) || 1;
                const convertedAmount = cents(toNumber(amount) / exchangeRate);

                return (
                  <div
                    key={fund.id}
                    className="grid gap-3 rounded-xl border border-stone-200 bg-white p-3 shadow-sm shadow-stone-200/60 sm:grid-cols-[minmax(0,1fr)_150px_220px] sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                        <Wallet size={19} />
                      </div>

                      <div className="min-w-0">
                        <h4 className="truncate font-black text-stone-950">
                          {fund.name}
                        </h4>
                        <p className="mt-1 truncate text-xs font-semibold text-stone-500">
                          {fund.currency_code ||
                            fund.currency_name ||
                            t("screens.checkout.noCurrency")}
                        </p>
                      </div>
                    </div>

                    <div className="min-w-0 rounded-xl bg-stone-50 px-3 py-2">
                      <p className="text-xs font-semibold text-stone-400">
                        {t("ui.balance")}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-black text-stone-800">
                        {money(fund.balance || 0, fund)}
                      </p>
                    </div>

                    <label className="flex min-w-0 flex-col gap-1.5 text-xs font-black text-stone-600">
                      <span className="flex items-center justify-between gap-2">
                        <span>{t("ui.amount")}</span>
                      </span>

                      <div className="flex h-11 overflow-hidden rounded-xl border border-stone-200 bg-white focus-within:border-teal-400 focus-within:ring-4 focus-within:ring-teal-100">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={amount}
                          onChange={(event) => {
                            setPaymentAmounts((current) => ({
                              ...current,
                              [String(fund.id)]: event.target.value,
                            }));
                            setError("");
                          }}
                          className="min-w-0 flex-1 bg-transparent px-3 text-base font-black text-stone-950 outline-none placeholder:text-stone-400"
                          placeholder="0"
                        />
                        <span className="flex items-center border-l border-stone-200 bg-stone-50 px-3 text-xs font-black text-stone-500">
                          {fund.currency_code || fund.currency_symbol || ""}
                        </span>
                      </div>

                      {toNumber(amount) > 0 && (
                        <span className="truncate text-[11px] font-bold text-stone-400">
                          {money(convertedAmount)}
                        </span>
                      )}
                    </label>
                  </div>
                );
              })}
            </div>
          </section>

          <aside className="lg:sticky lg:top-0 lg:self-start">
            <div className="rounded-2xl bg-stone-950 p-5 text-white shadow-xl shadow-stone-300/60">
              <div className="flex items-center justify-between gap-3 text-sm text-stone-300">
                <span>{t("screens.checkout.totalDue")}</span>
                <span>{t("screens.checkout.currentSale")}</span>
              </div>
              <div className="mt-3 truncate text-3xl font-black">
                {money(total)}
              </div>
            </div>

            <div className="mt-3 grid gap-2 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm shadow-stone-200/60">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                <span className="text-xs font-bold text-stone-500">
                  {t("screens.checkout.receivedAmount")}
                </span>
                <span className="truncate text-sm font-black text-stone-950">
                  {money(paidTotal)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                <span className="text-xs font-bold text-stone-500">
                  {t("screens.checkout.change")}
                </span>
                <span className="truncate text-sm font-black text-emerald-700">
                  {money(change)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                <span className="text-xs font-bold text-stone-500">
                  {t("ui.remaining")}
                </span>
                <span
                  className={`truncate text-sm font-black ${remaining > 0 ? "text-red-600" : "text-stone-950"}`}
                >
                  {money(remaining)}
                </span>
              </div>
            </div>

            {change > 0 && (
              <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
                <label className="flex flex-col gap-2 text-xs font-black text-emerald-900">
                  {t("screens.checkout.changeFund")}
                  <select
                    value={changeFundId}
                    onChange={(event) => {
                      setChangeFundId(event.target.value);
                      setError("");
                    }}
                    className="h-11 rounded-xl border border-emerald-200 bg-white px-3 text-sm font-black text-stone-950 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                  >
                    {funds.map((fund) => (
                      <option key={fund.id} value={fund.id}>
                        {[fund.name, fund.currency_code || fund.currency_name]
                          .filter(Boolean)
                          .join(" - ")}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {error}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* أزرار الـ Footer أسفل الفورم الداخلي مباشرة */}
      <div className="flex flex-col-reverse gap-3 border-t border-stone-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-xl border border-stone-300 px-5 font-bold text-stone-700 transition hover:bg-stone-50"
        >
          {t("common.cancel")}
        </button>

        <button
          type="submit"
          disabled={
            checkingOut ||
            !funds.length ||
            remaining > 0 ||
            (change > 0 && !changeFundId)
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 font-black text-white shadow-lg shadow-teal-200 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <CreditCard size={18} />
          {checkingOut
            ? t("common.saving")
            : t("screens.checkout.completeSale")}
        </button>
      </div>
    </form>
  );
}
