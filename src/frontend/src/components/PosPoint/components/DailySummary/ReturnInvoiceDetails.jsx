import { ShoppingBag } from "lucide-react";

export default function ReturnInvoiceDetails({
  selectedInvoice,
  items,
  money,
  t,
  onClose,
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-stone-50 p-4 text-sm">
            <div>
              <span className="text-xs text-stone-500">
                {t("screens.pos.customer", "العميل")}
              </span>
              <p className="font-bold text-stone-900 mt-0.5">
                {selectedInvoice.customer?.name ||
                  selectedInvoice.customer_name ||
                  t("screens.pos.walkInCustomer", "زبون سفري")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black text-stone-800 uppercase r">
              {t("screens.pos.returnedProducts", "المنتجات المرجعة")}
            </h4>
            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white px-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3.5 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-stone-50 text-stone-600 border border-stone-200/50">
                      <ShoppingBag size={15} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-stone-950 truncate">
                        {item.name || item.product_name}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {t("screens.pos.returnedQty", "الكمية المرجعة")}:{" "}
                        <span className="font-bold text-stone-800">
                          {item.quantity}
                        </span>{" "}
                        | {t("screens.pos.price", "السعر")}:{" "}
                        <span className="font-bold text-stone-800">
                          {money(item.price)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100">
                    {item.quantity} {t("ui.returned", "مرجع")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-2">
          <h4 className="text-xs font-black text-stone-800">
            {t("screens.pos.totals", "الملخص المالي")}
          </h4>
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">
              {t("screens.pos.returnInvoiceTotal", "إجمالي قيمة المرتجع")}
            </span>
            <span className="font-bold text-rose-600 text-base">
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
      <div className="border-t border-stone-100 px-6 py-4 bg-stone-50/50 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-stone-200 bg-white px-5 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-50"
        >
          {t("common.close", "إغلاق")}
        </button>
      </div>
    </div>
  );
}
