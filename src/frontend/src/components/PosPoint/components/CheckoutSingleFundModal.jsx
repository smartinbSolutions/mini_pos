import {
  Wallet,
  X,
  Check,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Banknote,
  HandCoins,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { formatMoney, formatNumber } from "../../../Global/FormatNumber";
import NumberInput from "../../../Global/NumberInput";

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cents = (value) => Math.round(toNumber(value) * 100) / 100;

// Banknote-style round-ups above the amount due ("customer gave 5,000").
function quickCashAmounts(due) {
  if (!(due > 0)) return [];
  const steps = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
  const out = [];
  for (const step of steps) {
    if (step < due / 20) continue; // too small to matter
    const value = Math.ceil(due / step) * step;
    if (value > due && !out.includes(value)) out.push(value);
    if (out.length === 3) break;
  }
  return out;
}

export default function CheckoutSingleFundModal({
  funds,
  total,
  checkingOut,
  onClose,
  onCheckout,
}) {
  const { t } = useTranslation();

  const { money } = usePrimaryCurrency();

  // Seeded on first render (not only in the effect below) because the
  // amount box is auto-focused, and NumberInput ignores outside value
  // changes while it has focus.
  const [fundId, setFundId] = useState(() =>
    funds.length ? String(funds[0].id) : "",
  );

  const [amount, setAmount] = useState(() =>
    funds.length
      ? cents(total * (toNumber(funds[0].currency_exchangeRate || 1) || 1))
      : "",
  );

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

  const listedRate = useMemo(() => {
    return toNumber(selectedFund?.currency_exchangeRate || 1) || 1;
  }, [selectedFund]);

  // only a foreign-currency fund can have an "effective rate" - a fund in
  // the primary currency has nothing to flex, so overpaying there is just
  // ordinary change, not a rate adjustment
  const isForeignFund = useMemo(() => {
    return listedRate !== 1;
  }, [listedRate]);

  const amountInFundCurrency = useMemo(() => {
    return toNumber(amount);
  }, [amount]);

  const effectiveRate = useMemo(() => {
    if (!isForeignFund || !total || amountInFundCurrency <= 0)
      return listedRate;
    return amountInFundCurrency / total;
  }, [isForeignFund, amountInFundCurrency, total, listedRate]);

  const rateDeviationPct = useMemo(() => {
    if (!isForeignFund || !listedRate) return 0;
    return Math.abs((effectiveRate - listedRate) / listedRate) * 100;
  }, [isForeignFund, effectiveRate, listedRate]);

  // primary-currency-only: real cash change / shortfall, since there's no
  // rate to absorb the difference
  const change = useMemo(() => {
    if (isForeignFund) return 0;
    return Math.max(0, cents(amountInFundCurrency - total));
  }, [isForeignFund, amountInFundCurrency, total]);

  const shortfall = useMemo(() => {
    if (isForeignFund) return 0;
    return Math.max(0, cents(total - amountInFundCurrency));
  }, [isForeignFund, amountInFundCurrency, total]);

  const dueInFund = cents(total * listedRate);
  const fundMoney = (value) =>
    isForeignFund
      ? formatMoney(value, selectedFund?.currency_symbol || selectedFund?.currency_code, {
          maximumFractionDigits: 2,
        })
      : money(value);

  const quickAmounts = useMemo(() => quickCashAmounts(dueInFund), [dueInFund]);

  const selectFund = (fund) => {
    setFundId(String(fund.id));

    setAmount(cents(total * (toNumber(fund.currency_exchangeRate || 1) || 1)));

    setError("");
  };

  const applyAmount = (value) => {
    setAmount(value === "" ? "" : cents(value));
    setError("");
  };

  const submit = async (e) => {
    e.preventDefault();

    if (!selectedFund) {
      setError(t("screens.checkout.selectFundError"));
      return;
    }

    if (amountInFundCurrency <= 0) {
      const msg = t("simple.checkout.enterAmount");
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!isForeignFund && shortfall > 0) {
      const msg = t("simple.checkout.notEnough");
      setError(msg);
      toast.error(msg);
      return;
    }

    const result = await onCheckout({
      payments: [
        {
          fundId: Number(selectedFund.id),
          amount: total,
          // for a primary-currency fund only the invoice total is applied
          // to the fund - any excess is change handed back, not revenue.
          // for a foreign fund the full typed amount is what settled it.
          amount_fund_currency: isForeignFund ? amountInFundCurrency : total,
          currency_code: selectedFund.currency_code,
          exchange_rate: isForeignFund ? effectiveRate : 1,
        },
      ],

      received: amountInFundCurrency,
      receivedFundTotal: amountInFundCurrency,
      change,
      changeFundId: selectedFund.id,
    });

    if (result && result.ok === false) {
      setError(result.message || t("simple.done.failed"));
    }
  };

  const canConfirm =
    !checkingOut &&
    funds.length > 0 &&
    amountInFundCurrency > 0 &&
    (isForeignFund || shortfall === 0);

  return (
    <form
      onSubmit={submit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-auto p-5">
        {/* 1 — WHAT THE CUSTOMER MUST PAY */}
        <div className="rounded-3xl bg-ink p-5 text-white">
          <p className="text-lg font-bold text-slate-300">
            {t("simple.checkout.toPay")}
          </p>
          <p className="mt-1 truncate text-5xl font-black tabular-nums">
            <span dir="ltr">{money(total)}</span>
          </p>
          {isForeignFund && (
            <p className="mt-1 text-lg font-bold text-slate-300">
              <span dir="ltr">= {fundMoney(dueInFund)}</span>
            </p>
          )}
        </div>

        {/* WHERE THE MONEY GOES — only asked when there is a real choice */}
        {funds.length > 1 && (
          <div>
            <h3 className="ui-label">{t("simple.checkout.whereMoney")}</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {funds.map((fund) => {
                const selected = String(fund.id) === fundId;

                return (
                  <button
                    key={fund.id}
                    type="button"
                    onClick={() => selectFund(fund)}
                    aria-pressed={selected}
                    className={`flex min-h-[56px] items-center gap-2 rounded-2xl border-2 px-3 py-2 text-start transition ${
                      selected
                        ? "border-ok bg-ok-50 text-ok-700"
                        : "border-slate-200 bg-white text-ink-soft hover:border-slate-300"
                    }`}
                  >
                    {selected ? (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ok text-white">
                        <Check size={16} strokeWidth={3} />
                      </span>
                    ) : (
                      <Wallet size={22} className="shrink-0 text-slate-400" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold">
                        {fund.name}
                      </span>
                      <span className="block text-sm font-semibold opacity-80">
                        {fund.currency_code}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 2 — MONEY RECEIVED */}
        <div>
          <label htmlFor="checkout-amount" className="ui-label">
            {t("simple.checkout.received")}
          </label>

          <div className="relative">
            <NumberInput
              id="checkout-amount"
              autoFocus
              value={amount}
              onChange={(val) => {
                setAmount(val);
                setError("");
              }}
              onFocusCapture={(e) => e.target.select()}
              className="h-20 w-full rounded-3xl border-[3px] border-slate-300 bg-white pe-28 ps-5 text-4xl font-black tabular-nums text-ink focus:border-ok focus:outline-none focus:ring-4 focus:ring-ok-100"
            />

            <span className="pointer-events-none absolute end-16 top-1/2 -translate-y-1/2 text-lg font-bold text-ink-muted">
              {selectedFund?.currency_code}
            </span>

            {amount !== "" && (
              <button
                type="button"
                onClick={() => applyAmount("")}
                className="absolute end-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-ink-muted hover:bg-slate-100 hover:text-ink"
                aria-label={t("common.clear")}
              >
                <X size={22} />
              </button>
            )}
          </div>

          {/* QUICK CASH */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyAmount(dueInFund)}
              className="ui-btn ui-btn-soft min-h-[48px] px-4"
            >
              <HandCoins size={19} />
              {t("simple.checkout.exact")}
            </button>
            {quickAmounts.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => applyAmount(value)}
                className="ui-btn ui-btn-soft min-h-[48px] px-4 tabular-nums"
                dir="ltr"
              >
                <Banknote size={19} />
                {formatNumber(value, 2)}
              </button>
            ))}
          </div>
        </div>

        {/* 3 — CHANGE / MISSING */}
        {!isForeignFund && amountInFundCurrency > 0 && (
          <div
            aria-live="polite"
            className={`flex items-center gap-4 rounded-3xl border-2 p-5 ${
              shortfall > 0
                ? "border-warn-100 bg-warn-50 text-warn-700"
                : "border-ok-100 bg-ok-50 text-ok-700"
            }`}
          >
            {shortfall > 0 ? (
              <AlertTriangle size={40} className="shrink-0" />
            ) : change > 0 ? (
              <Banknote size={40} className="shrink-0" />
            ) : (
              <CheckCircle2 size={40} className="shrink-0" />
            )}
            <div className="min-w-0">
              <p className="text-lg font-bold">
                {shortfall > 0
                  ? t("simple.checkout.missing")
                  : change > 0
                    ? t("simple.checkout.change")
                    : t("simple.checkout.exactOk")}
              </p>
              {(shortfall > 0 || change > 0) && (
                <p className="truncate text-4xl font-black tabular-nums">
                  <span dir="ltr">
                    {money(shortfall > 0 ? shortfall : change)}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Foreign fund: effective-rate feedback, never blocks */}
        {isForeignFund && amountInFundCurrency > 0 && (
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-base font-bold ${
              rateDeviationPct > 5
                ? "bg-warn-50 text-warn-700"
                : "bg-slate-100 text-ink-soft"
            }`}
          >
            {rateDeviationPct > 5 ? (
              <AlertCircle size={20} className="shrink-0" />
            ) : (
              <CheckCircle2 size={20} className="shrink-0" />
            )}

            <span>
              {t("screens.ledger.effectiveRate")}: 1 {t("ui.primaryCurrency")}{" "}
              = {effectiveRate.toFixed(2)} {selectedFund?.currency_code}
            </span>

            {rateDeviationPct > 5 && (
              <span>
                ({t("screens.checkout.fundRateShort")} {listedRate.toFixed(2)})
              </span>
            )}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-3 rounded-2xl border-2 border-danger-100 bg-danger-50 px-4 py-3 text-base font-bold text-danger-700"
          >
            <AlertCircle size={22} className="shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-3 border-t-2 border-slate-200 bg-white px-5 py-4">
        <button
          type="button"
          onClick={onClose}
          className="ui-btn ui-btn-soft ui-btn-lg"
        >
          {t("simple.checkout.back")}
        </button>

        <button
          type="submit"
          disabled={!canConfirm}
          className="ui-btn ui-btn-ok ui-btn-lg text-xl"
        >
          <CheckCircle2 size={26} />
          {checkingOut
            ? t("simple.checkout.saving")
            : t("simple.checkout.confirm")}
        </button>
      </div>
    </form>
  );
}
