import { CreditCard, Wallet, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cents = (value) => Math.round(toNumber(value) * 100) / 100;

export default function CheckoutSingleFundModal({
  funds,
  total,
  checkingOut,
  onClose,
  onCheckout,
}) {
  const { t } = useTranslation();

  const { money } = usePrimaryCurrency();

  const [fundId, setFundId] = useState("");

  const [amount, setAmount] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    if (funds.length) {
      setFundId(String(funds[0].id));
      const rate = toNumber(funds[0].currency_exchangeRate || 1) || 1;
      setAmount(cents(total * rate));
    }
  }, [funds, total]);

  const selectedFund = useMemo(() => {
    return funds.find((f) => String(f.id) === String(fundId));
  }, [funds, fundId]);

  const exchangeRate = useMemo(() => {
    return toNumber(selectedFund?.currency_exchangeRate || 1) || 1;
  }, [selectedFund]);

  const paidTotal = useMemo(() => {
    return cents(toNumber(amount) / exchangeRate);
  }, [amount, exchangeRate]);

  const change = useMemo(() => {
    return Math.max(0, cents(paidTotal - total));
  }, [paidTotal, total]);

  const remaining = useMemo(() => {
    return Math.max(0, cents(total - paidTotal));
  }, [paidTotal, total]);

  const submit = async (e) => {
    e.preventDefault();

    if (!selectedFund) {
      setError(t("screens.checkout.selectFundError"));
      return;
    }

    if (remaining > 0) {
      const msg = t("screens.checkout.remainingMustBeZero");
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      await onCheckout({
        payments: [
          {
            fundId: Number(selectedFund.id),
            amount: paidTotal,
            amount_fund_currency: Number(amount),
            currency_code: selectedFund.currency_code,
            exchange_rate: exchangeRate,
          },
        ],

        received: paidTotal,
        receivedFundTotal: Number(amount),
        change,
        changeFundId: selectedFund.id,
      });

      onClose();
    } catch (err) {
      console.error("Checkout failed", err);

      setError(err?.message || t("screens.checkout.failed"));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
      <form
        onSubmit={submit}
        className="w-full max-w-xl rounded-2xl bg-[#f8fafc] overflow-hidden shadow-2xl"
      >
        <div className="border-b bg-white px-5 py-4 flex justify-between">
          <div className="flex gap-3">
            <div className="h-11 w-11 rounded-xl bg-teal-500 flex items-center justify-center text-white">
              <CreditCard size={21} />
            </div>

            <div>
              <h2 className="text-xl font-black">
                {t("screens.checkout.title")}
              </h2>

              <p className="text-sm text-stone-500">
                {t("screens.checkout.fundHint")}
              </p>
            </div>
          </div>

          <button type="button" onClick={onClose}>
            <X />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="rounded-2xl bg-stone-950 p-5 text-white">
            <p className="text-sm text-stone-300">
              {t("screens.checkout.totalDue")}
            </p>

            <h1 className="text-4xl font-black mt-2">{money(total)}</h1>
          </div>

          <div>
            <h3 className="font-black mb-3">
              {t("screens.checkout.paidIntoFund")}
            </h3>

            <div className="space-y-3">
              {funds.map((fund) => {
                const selected = String(fund.id) === fundId;

                return (
                  <button
                    key={fund.id}
                    type="button"
                    onClick={() => {
                      setFundId(String(fund.id));

                      setAmount(
                        cents(
                          total *
                            (toNumber(fund.currency_exchangeRate || 1) || 1),
                        ),
                      );
                    }}
                    className={`w-full text-left rounded-xl border p-4 ${selected ? "border-teal-500 bg-teal-50" : "border-stone-200 bg-white"}`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-black">{fund.name}</h4>

                        <p className="text-xs text-stone-500">
                          {fund.currency_code}
                        </p>
                      </div>

                      <Wallet size={20} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-black text-sm">
              {t("ui.amount")}

              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);

                  setError("");
                }}
                className="mt-2 h-11 w-full rounded-xl border px-3 font-black"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-stone-500">
                {t("screens.checkout.change")}
              </p>

              <b className="text-emerald-600">{money(change)}</b>
            </div>

            <div className="rounded-xl bg-white p-3">
              <p className="text-xs text-stone-500">{t("ui.remaining")}</p>

              <b className={remaining > 0 ? "text-red-600" : ""}>
                {money(remaining)}
              </b>
            </div>
          </div>

          {error && (
            <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-stone-200 bg-white px-5 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-stone-300 px-5 font-bold text-stone-700 transition hover:bg-stone-50"
          >
            {t("common.cancel")}
          </button>

          <button
            disabled={checkingOut || !funds.length || remaining > 0}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 font-black text-white shadow-lg shadow-teal-200 transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CreditCard size={18} />

            {checkingOut
              ? t("common.saving")
              : t("screens.checkout.completeSale")}
          </button>
        </div>
      </form>
    </div>
  );
}
