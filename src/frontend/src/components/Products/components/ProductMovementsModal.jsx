import { ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import usePrimaryCurrency from "../../../Global/usePrimaryCurrency";
import { formatNumber } from "../../../Global/FormatNumber";

export default function ProductMovementsModal({
  product,
  movements,
  loading,
  error,
  onClose,
}) {
  const { t } = useTranslation();
  const { money } = usePrimaryCurrency();

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#e5ebff] px-6 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              {t("screens.products.movementsTitle")}
            </h2>
            <p className="text-xs font-semibold text-slate-500">
              {product.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-[#eef3ff] hover:text-[#4663ff]"
            aria-label={t("common.close")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm font-semibold text-slate-500">
              {t("screens.products.movementsLoading")}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm font-semibold text-slate-500">
                {t("screens.products.noMovements")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {movements.map((movement) => {
                const isIn = movement.type === "in";
                return (
                  <div
                    key={movement.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#e5ebff] bg-[#f8faff] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      {isIn ? (
                        <ArrowDownCircle
                          size={20}
                          className="shrink-0 text-emerald-500"
                        />
                      ) : (
                        <ArrowUpCircle
                          size={20}
                          className="shrink-0 text-red-500"
                        />
                      )}
                      <div>
                        <div className="text-sm font-bold text-slate-950">
                          {t(`screens.products.action.${movement.action}`, {
                            defaultValue: movement.action,
                          })}
                          <span className="ml-1.5 text-xs font-semibold text-slate-400">
                            ·{" "}
                            {t(
                              `screens.products.refType.${movement.reference_type}`,
                              {
                                defaultValue: movement.reference_type,
                              }
                            )}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {new Date(movement.date).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="text-start">
                      <div
                        className={`text-sm font-black ${isIn ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {isIn ? "+" : "-"}
                        {formatNumber(movement.quantity, 2)}{" "}
                        {movement.unit_code || ""}
                      </div>
                      {(movement.enterPrice > 0 || movement.outPrice > 0) && (
                        <div className="text-xs text-slate-500">
                          {money(movement.enterPrice || movement.outPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
