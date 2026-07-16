import { ShoppingBag } from "lucide-react";

export default function InvoiceDetailsModal({
  selectedInvoice,
  salesInvoicesItem,
  money,
  t,
  onClose,
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 rounded-2xl bg-stone-50 p-4 text-sm">
            <div>
              <span className="text-xs text-stone-500">
                {t("screens.pos.customer", "العميل")}
              </span>
              <p className="mt-0.5 font-bold text-stone-900">
                {selectedInvoice.customer?.name ||
                  selectedInvoice.customer_name ||
                  t("screens.pos.walkInCustomer", "زبون سفري")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-stone-800">
              {t("screens.pos.invoiceProducts", "منتجات الفاتورة")}
            </h4>

            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white px-4">
              {salesInvoicesItem.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-stone-200/50 bg-stone-50 text-stone-600">
                      <ShoppingBag size={15} />
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-stone-950">
                        {item.name || item.product_name}
                      </p>

                      <p className="mt-0.5 text-xs text-stone-500">
                        {t("screens.pos.originalQty", "الكمية الأصلية")}:
                        <span className="ml-1 font-bold text-stone-800">
                          {item.quantity}{" "}
                          {item.unit_code || item.unit_name || ""}
                        </span>
                        {" | "}
                        {t("screens.pos.price", "السعر")}:
                        <span className="ml-1 font-bold text-stone-800">
                          {money(item.price)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-1.5">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {item.quantity}
                    </span>

                    {(item.unit_code || item.unit_name) && (
                      <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-600 border border-stone-200/50 uppercase tracking-wide">
                        {item.unit_code || item.unit_name}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4">
            <h4 className="mb-2 text-xs font-black text-stone-800">
              {t("screens.pos.totals", "الملخص المالي")}
            </h4>

            <div className="flex justify-between text-sm">
              <span className="text-stone-600">
                {t(
                  "screens.pos.originalInvoiceTotal",
                  "إجمالي الفاتورة الأصلية",
                )}
              </span>

              <span className="font-bold text-stone-900">
                {money(
                  selectedInvoice.net_total ||
                    selectedInvoice.netTotal ||
                    selectedInvoice.total ||
                    0,
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="shrink-0 border-t border-stone-100 bg-stone-50/50 px-6 py-4">
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-5 py-2 text-sm font-bold text-stone-700 hover:bg-stone-50"
          >
            {t("common.close", "إغلاق")}
          </button>
        </div>
      </div>
    </div>
  );
}
