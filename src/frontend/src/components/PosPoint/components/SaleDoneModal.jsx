import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Banknote,
  Printer,
  ShoppingBasket,
  AlertTriangle,
} from "lucide-react";

// Shown right after a sale is saved: the one number the cashier needs
// now (change to give back), plus "print again" and "new sale".
export default function SaleDoneModal({ sale, onReprint, onClose, money, t }) {
  const [printState, setPrintState] = useState(
    sale.printed ? "printed" : "failed",
  );

  // Enter / Escape both start the next sale — the cashier's hands are
  // usually on the keyboard or scanner.
  useEffect(() => {
    const onKey = (e) => {
      // a focused button handles its own Enter (e.g. "print again")
      const onButton = e.target?.tagName === "BUTTON";
      if (e.key === "Escape" || (e.key === "Enter" && !onButton)) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reprint = async () => {
    setPrintState("printing");
    const ok = await onReprint(sale.receipt);
    setPrintState(ok ? "printed" : "failed");
  };

  const change = Number(sale.change || 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sale-done-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex flex-col items-center bg-ok-50 px-6 pb-6 pt-8 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-ok text-white shadow-lg">
            <CheckCircle2 size={48} />
          </span>
          <h2 id="sale-done-title" className="mt-4 text-3xl font-black text-ok-700">
            {t("simple.done.title")}
          </h2>
          <p className="mt-1 text-lg font-semibold text-ink-soft">
            {t("simple.done.total")}:{" "}
            <span dir="ltr" className="font-black text-ink">
              {money(sale.total)}
            </span>
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div
            className={`flex items-center gap-4 rounded-3xl border-2 p-5 ${
              change > 0
                ? "border-ok-100 bg-white"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <Banknote
              size={44}
              className={`shrink-0 ${change > 0 ? "text-ok" : "text-slate-400"}`}
            />
            <div className="min-w-0">
              <p className="text-lg font-bold text-ink-soft">
                {change > 0 ? t("simple.done.change") : t("simple.done.noChange")}
              </p>
              {change > 0 && (
                <p className="truncate text-5xl font-black tabular-nums text-ink">
                  <span dir="ltr">{money(change)}</span>
                </p>
              )}
            </div>
          </div>

          {printState === "failed" && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-2xl border-2 border-warn-100 bg-warn-50 p-4 text-base font-semibold text-warn-700"
            >
              <AlertTriangle size={24} className="mt-0.5 shrink-0" />
              {t("simple.done.printFailed")}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={reprint}
              disabled={printState === "printing"}
              className="ui-btn ui-btn-soft ui-btn-lg"
            >
              <Printer size={22} />
              {printState === "printing"
                ? t("simple.done.printing")
                : t("simple.done.printAgain")}
            </button>
            <button
              type="button"
              autoFocus
              onClick={onClose}
              className="ui-btn ui-btn-brand ui-btn-lg"
            >
              <ShoppingBasket size={22} />
              {t("simple.done.newSale")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
