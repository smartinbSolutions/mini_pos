import { CheckCircle2, CreditCard, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatNumber } from "../../../Global/FormatNumber";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";

const money = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export default function CheckoutModal({
  funds,
  total,
  checkingOut,
  onClose,
  onCheckout,
}) {
  const { t } = useTranslation();
  const [fundId, setFundId] = useState("");
  const [currencyExchangeRate, setCurrencyExchangeRate] = useState("");
  const [currencyCode, setCurrencyCode] = useState("");
  const { money } = usePrimaryCurrency();

  const [received, setReceived] = useState(total);

  const [error, setError] = useState("");

  useEffect(() => {
    if (!fundId && funds.length) {
      setFundId(String(funds[0].id));
      setCurrencyExchangeRate(funds[0].currency_exchangeRate);
      setCurrencyCode(funds[0]?.currency_code);
    }
    setReceived(total * toNumber(currencyExchangeRate || 1));
  }, [fundId, funds]);

  const convertedTotal = useMemo(() => {
    return total * toNumber(currencyExchangeRate || 1);
  }, [total, currencyExchangeRate]);

  const change = useMemo(
    () => Math.max(0, toNumber(received) - convertedTotal),
    [received, convertedTotal],
  );

  const remaining = useMemo(
    () => Math.max(0, convertedTotal - toNumber(received)),
    [received, convertedTotal],
  );

  const submit = async (event) => {
    event.preventDefault();

    if (!fundId) {
      setError(t("screens.checkout.selectFundError"));
      return;
    }

    // if (received * currencyExchangeRate < total) {
    //   setError("Received amount is less than the total.");
    //   return;
    // }

    try {
      await onCheckout({
        fundId,
        received: toNumber(received),
        change,
        paymentInfundCurrency: convertedTotal,
        currency_code: currencyCode,
        exchange_rate: currencyExchangeRate,
      });
      onClose();
    } catch (err) {
      console.error("Checkout failed:", err);
      setError(err?.message || t("screens.checkout.failed"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl"
      >
        <div className="bg-gradient-to-r from-slate-950 to-slate-800 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-200">
                {t("ui.payment")}
              </div>

              <h2 className="text-2xl font-black">{t("screens.checkout.title")}</h2>

              <p className="mt-1 text-sm text-slate-300">
                {t("screens.checkout.subtitle")}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label={t("screens.checkout.close")}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(92vh-190px)] overflow-auto px-6 py-6">
          <div className="mb-6 rounded-3xl bg-slate-950 p-5 text-white">
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>{t("screens.checkout.totalDue")}</span>
              <span>{t("screens.checkout.currentSale")}</span>
            </div>

            <div className="mt-2 text-4xl font-black">{money(total)}</div>
          </div>

          <div className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-950">{t("screens.checkout.paidIntoFund")}</h3>
                <p className="text-xs text-slate-500">
                  {t("screens.checkout.fundHint")}
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {t("screens.checkout.fundCount", { count: funds.length })}
              </span>
            </div>

            {funds.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {funds.map((fund) => {
                  const selected = fundId === String(fund.id);

                  return (
                    <button
                      type="button"
                      key={fund.id}
                      onClick={() => {
                        setFundId(String(fund.id));
                        setCurrencyExchangeRate(fund.currency_exchangeRate);
                        setCurrencyCode(fund.currency_code);
                        setError("");
                      }}
                      className={`group relative min-h-28 overflow-hidden rounded-3xl border p-4 text-left transition ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-100"
                          : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg hover:shadow-slate-100"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate font-black text-slate-950">
                            {fund.name}
                          </h4>

                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {fund.currency_code ||
                              fund.currency_name ||
                              t("screens.checkout.noCurrency")}
                          </p>
                        </div>

                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                            selected
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600"
                          }`}
                        >
                          {selected ? <CheckCircle2 size={18} /> : null}
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl bg-white/80 px-3 py-2">
                        <p className="text-xs text-slate-400">{t("ui.balance")}</p>
                        <p className="mt-0.5 font-black text-slate-800">
                          {money(fund.balance || 0, fund)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                <p className="font-bold text-slate-800">{t("screens.checkout.noFunds")}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {t("screens.checkout.noFundsHint")}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <label className="flex flex-col gap-2 text-sm font-black text-slate-800">
              {t("screens.checkout.receivedAmount")}
              <input
                type="number"
                value={received}
                onChange={(event) => {
                  setReceived(event.target.value);
                  setError("");
                }}
                className="h-13 rounded-2xl border border-slate-200 bg-white px-4 text-lg font-black text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                placeholder="0"
              />
            </label>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-slate-400">{t("screens.checkout.change")}</p>
                <p className="mt-1 text-xl font-black text-emerald-700">
                  {money(change, currencyCode)}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-bold text-slate-400">{t("ui.remaining")}</p>
                <p
                  className={`mt-1 text-xl font-black ${
                    remaining > 0 ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {money(remaining, currencyCode)}
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-2xl border border-slate-300 px-5 font-bold text-slate-700 transition hover:bg-slate-50"
          >
            {t("common.cancel")}
          </button>

          <button
            type="submit"
            disabled={checkingOut || !funds.length}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CreditCard size={18} />
            {checkingOut ? t("common.saving") : t("screens.checkout.completeSale")}
          </button>
        </div>
      </form>
    </div>
  );
}
