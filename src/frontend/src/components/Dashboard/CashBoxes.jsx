import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, Landmark, Wallet } from "lucide-react";
import { formatMoney } from "../../Global/FormatNumber";
import EmptyState from "../../Global/ui/EmptyState";

// Money in each cash box, from get-funds (balance = money in − money out).
//   funds: array | null (null = still loading)
//   money: formats an amount in the shop's main currency
export default function CashBoxes({ funds, money }) {
  const { t, i18n } = useTranslation();
  const Arrow = i18n.dir() === "rtl" ? ArrowLeft : ArrowRight;

  // Each fund's currency_exchangeRate is "fund currency per 1 main currency"
  // (the same rule the payment screen uses), so main = balance / rate.
  const rateOf = (fund) => Number(fund.currency_exchangeRate) || 1;
  const total = (funds || []).reduce(
    (sum, fund) => sum + Number(fund.balance || 0) / rateOf(fund),
    0,
  );
  const mixedCurrencies =
    new Set((funds || []).map((fund) => fund.currency_code)).size > 1;

  return (
    <section className="ui-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Landmark size={24} className="text-brand" />
          {t("simple.cash.title")}
        </h2>
        <Link
          to="/funds"
          className="inline-flex items-center gap-1.5 text-base font-bold text-brand-700 hover:underline"
        >
          {t("simple.cash.manage")}
          <Arrow size={18} />
        </Link>
      </div>

      {funds === null ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : funds.length === 0 ? (
        <EmptyState icon={Wallet} title={t("simple.cash.empty")} />
      ) : (
        <>
          <ul className="space-y-2.5">
            {funds.map((fund) => {
              const balance = Number(fund.balance || 0);
              return (
                <li
                  key={fund.id}
                  className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-ink-muted shadow-sm">
                    <Wallet size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-ink">
                      {fund.name}
                    </span>
                    <span className="text-sm font-semibold text-ink-muted">
                      {fund.currency_code}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-xl font-black tabular-nums ${
                      balance < 0 ? "text-danger-700" : "text-ink"
                    }`}
                  >
                    <span dir="ltr">
                      {formatMoney(
                        balance,
                        {
                          symbol: fund.currency_symbol || fund.currency_code,
                          code: fund.currency_code,
                        },
                        { maximumFractionDigits: 2 },
                      )}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>

          {funds.length > 1 && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t-2 border-slate-100 pt-3">
              <span className="text-base font-bold text-ink-soft">
                {mixedCurrencies ? t("simple.cash.total") : t("simple.pos.total")}
              </span>
              <span className="text-2xl font-black tabular-nums text-ink">
                <span dir="ltr">{money(total)}</span>
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
