import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight, CheckCircle2, HandCoins } from "lucide-react";

const ROWS_SHOWN = 3;

// Customers whose account shows they owe you money (get-contacts with
// balance_filter "receivable"). `owed` is { total, amount, top } or null
// while loading: total = how many owe, amount = how much in all, top = the
// biggest balances among the customers loaded.
export default function CustomersOwe({ owed, money }) {
  const { t, i18n } = useTranslation();
  const Arrow = i18n.dir() === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <section className="ui-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <HandCoins size={24} className="text-warn" />
          {t("simple.owed.title")}
          {owed && owed.total > 0 && (
            <span className="rounded-full bg-warn-100 px-2.5 py-0.5 text-sm font-black text-warn-700">
              {owed.total}
            </span>
          )}
        </h2>
        <Link
          to="/customer"
          className="inline-flex items-center gap-1.5 text-base font-bold text-brand-700 hover:underline"
        >
          {t("simple.owed.all")}
          <Arrow size={18} />
        </Link>
      </div>

      {owed === null ? (
        <div className="space-y-2.5">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : owed.total === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl bg-ok-50 p-4 text-base font-bold text-ok-700">
          <CheckCircle2 size={26} className="shrink-0" />
          {t("simple.owed.none")}
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3 rounded-2xl bg-warn-50 px-4 py-3">
            <span className="text-base font-bold text-warn-700">
              {t("simple.owed.totalLabel")}
            </span>
            <span className="text-2xl font-black tabular-nums text-ink">
              <span dir="ltr">{money(owed.amount)}</span>
            </span>
          </div>

          <ul className="space-y-2">
            {owed.top.slice(0, ROWS_SHOWN).map((customer) => (
              <li key={customer.id}>
                <Link
                  to={`/contact/${customer.id}`}
                  className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-3 transition hover:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-bold text-ink">
                      {customer.name}
                    </span>
                    {customer.phone && (
                      <span className="block text-sm font-semibold text-ink-muted">
                        <span dir="ltr">{customer.phone}</span>
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-lg font-black tabular-nums text-warn-700">
                    <span dir="ltr">{money(customer.balance)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
