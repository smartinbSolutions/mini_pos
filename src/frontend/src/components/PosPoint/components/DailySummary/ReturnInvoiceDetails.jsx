import { ShoppingBag, Calendar, Wallet, RotateCcw } from "lucide-react";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";

export default function ReturnInvoiceDetails({
  selectedInvoice,
  items,
  money,
  t,
  onClose,
}) {
  const { primaryCurrency } = usePrimaryCurrency();
  const allocations = selectedInvoice.allocations || [];

  return (
    <div className="flex h-full flex-col bg-[#f7f3ee]">
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* SUMMARY */}
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
              <RotateCcw size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-stone-950">
                {selectedInvoice.customer?.name ||
                  selectedInvoice.customer_name ||
                  t("screens.pos.walkInCustomer", "زبون سفري")}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-stone-500">
                <Calendar size={12} />
                {selectedInvoice.date &&
                  new Date(selectedInvoice.date).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
              </p>
              {selectedInvoice.sales_invoice_id && (
                <p className="mt-0.5 text-xs text-stone-500">
                  {t("screens.pos.returnedFromInvoice", "من فاتورة رقم")} #
                  {selectedInvoice.sales_invoice_id}
                </p>
              )}
            </div>
            <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-800">
              {t("ui.return", "مرتجع")}
            </span>
          </div>

          {/* REFUND PAID FROM */}
          {allocations.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-black uppercase text-stone-500">
                <Wallet size={13} />
                {t("screens.pos.refundedFrom", "استُرد المبلغ من")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {allocations.map((alloc) => {
                  const sameCurrency =
                    alloc.currency_code === primaryCurrency?.code;
                  return (
                    <div
                      key={alloc.fund_id}
                      className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2"
                    >
                      <span className="text-sm font-bold text-stone-800">
                        {alloc.fund_name}
                      </span>
                      <span className="text-stone-300">·</span>
                      {sameCurrency ? (
                        <span className="text-sm font-black text-rose-700">
                          {money(alloc.amount)}
                        </span>
                      ) : (
                        <>
                          <span className="text-sm font-black text-rose-700">
                            {Number(alloc.fund_amount).toLocaleString(
                              undefined,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}{" "}
                            {alloc.currency_symbol || alloc.currency_code}
                          </span>
                          <span className="text-xs font-medium text-stone-500">
                            (= {money(alloc.amount)})
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RETURNED PRODUCTS */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase text-stone-500">
              {t("screens.pos.returnedProducts", "المنتجات المرجعة")}
            </h4>

            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white px-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
                      <ShoppingBag size={18} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-950">
                        {item.name || item.product_name}
                      </p>

                      <p className="mt-0.5 text-xs text-stone-500">
                        {t("screens.pos.price", "السعر")}:{" "}
                        <span className="font-bold text-stone-800">
                          {money(item.price)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <span className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-black text-rose-600">
                    {item.quantity} {t("ui.returned", "مرجع")}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* TOTAL */}
          <div className="rounded-2xl bg-rose-600 p-4 text-white shadow-lg shadow-rose-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-90">
                {t("screens.pos.returnInvoiceTotal", "إجمالي قيمة المرتجع")}
              </span>
              <span className="text-2xl font-black">
                {money(
                  selectedInvoice.net_total ||
                    selectedInvoice.netTotal ||
                    selectedInvoice.total ||
                    0
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-stone-200 bg-white px-6 py-4">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-12 rounded-2xl border border-stone-200 bg-white px-6 text-sm font-bold text-stone-700 transition hover:bg-stone-50 active:scale-95"
          >
            {t("common.close", "إغلاق")}
          </button>
        </div>
      </div>
    </div>
  );
}
