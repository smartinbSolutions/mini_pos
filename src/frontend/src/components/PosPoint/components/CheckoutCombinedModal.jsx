import { Banknote, Layers, X } from "lucide-react";
import { useState } from "react";
import CheckoutModal from "./CheckoutModal";
import CheckoutSingleFundModal from "./CheckoutSingleFundModal";

export default function UnifiedCheckoutModal({
  funds = [],
  total,
  checkingOut,
  onClose,
  onCheckout,
  t,
  money,
}) {
  const [isMultiMode, setIsMultiMode] = useState(false);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3"
    >
      <div
        className={`flex max-h-[96vh] w-full flex-col overflow-hidden rounded-3xl bg-slate-50 shadow-2xl ${
          isMultiMode ? "max-w-4xl" : "max-w-xl"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b-2 border-slate-200 bg-white px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ok text-white">
              <Banknote size={26} />
            </span>
            <h2
              id="checkout-title"
              className="truncate text-2xl font-black text-ink"
            >
              {t("simple.checkout.title")}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-ink-muted transition hover:bg-slate-100 hover:text-ink"
            aria-label={t("simple.pos.close")}
          >
            <X size={26} />
          </button>
        </div>

        {funds.length > 1 && (
          <div className="border-b-2 border-slate-200 bg-white px-5 py-3">
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => setIsMultiMode(false)}
                aria-pressed={!isMultiMode}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 text-base font-bold transition ${
                  !isMultiMode
                    ? "bg-white text-ok-700 shadow"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Banknote size={20} />
                {t("simple.checkout.normal")}
              </button>

              <button
                type="button"
                onClick={() => setIsMultiMode(true)}
                aria-pressed={isMultiMode}
                className={`flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 text-base font-bold transition ${
                  isMultiMode
                    ? "bg-white text-ok-700 shadow"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                <Layers size={20} />
                {t("simple.checkout.split")}
              </button>
            </div>
          </div>
        )}

        {funds.length > 0 ? (
          isMultiMode ? (
            <CheckoutModal
              funds={funds}
              total={total}
              checkingOut={checkingOut}
              onClose={onClose}
              onCheckout={onCheckout}
              t={t}
              money={money}
            />
          ) : (
            <CheckoutSingleFundModal
              funds={funds}
              total={total}
              checkingOut={checkingOut}
              onClose={onClose}
              onCheckout={onCheckout}
              t={t}
              money={money}
            />
          )
        ) : (
          <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
            <div className="w-full max-w-md rounded-3xl border-2 border-dashed border-slate-300 bg-white p-6">
              <p className="text-lg font-bold text-ink">
                {t("screens.checkout.noFunds")}
              </p>
              <p className="mt-1 text-base text-ink-muted">
                {t("screens.checkout.noFundsHint")}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
