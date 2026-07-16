import { useState, useEffect } from "react";
import {
  Minus,
  Plus,
  Undo2,
  RotateCcw,
  AlertCircle,
  ShoppingBag,
} from "lucide-react";

export default function InvoiceReturnModal({
  selectedInvoice,
  salesInvoicesItem,
  money,
  t,
  onClose,
  onSuccess,
}) {
  const [returnQuantities, setReturnQuantities] = useState({});
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salesInvoicesItem && salesInvoicesItem.length > 0) {
      const initial = {};
      salesInvoicesItem.forEach((item) => {
        initial[item.id] = 0;
      });
      setReturnQuantities(initial);
    }
  }, [salesInvoicesItem]);

  const handleQtyChange = (itemId, maxQty, delta) => {
    setReturnQuantities((prev) => {
      const currentVal = prev[itemId] || 0;
      const newVal = Math.max(0, Math.min(maxQty, currentVal + delta));
      return { ...prev, [itemId]: newVal };
    });
  };

  const handleReturnAll = () => {
    const allQuantities = {};
    salesInvoicesItem.forEach((item) => {
      allQuantities[item.id] = item.available_quantity ?? item.quantity ?? 0;
    });
    setReturnQuantities(allQuantities);
  };

  const returnTotal = salesInvoicesItem.reduce((sum, item) => {
    const returnQty = returnQuantities[item.id] || 0;
    return sum + returnQty * (item.price || 0);
  }, 0);

  const handleConfirmReturn = async () => {
    setActionError("");
    const returnedItems = salesInvoicesItem
      .map((item) => ({
        sales_invoice_item_id: item.id,
        product_id: item.product_id,
        quantity: returnQuantities[item.id] || 0,
        price: item.price,
        sellingPrice: item.sellingPrice || item.price,
      }))
      .filter((item) => item.quantity > 0);

    if (returnedItems.length === 0) {
      setActionError(
        t(
          "screens.pos.selectAtLeastOneItem",
          "الرجاء تحديد كمية إرجاع لمنتج واحد على الأقل."
        )
      );
      return;
    }

    if (
      !confirm(
        t(
          "screens.pos.confirmPartialReturn",
          "هل أنت متأكد من رغبتك في إتمام عملية الإرجاع المحددة؟"
        )
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      const taxPercent = selectedInvoice.tax || 0;
      const taxValue = returnTotal * (taxPercent / 100);
      const netTotal = returnTotal + taxValue;

      const returnData = {
        sales_invoice_id: selectedInvoice.id,
        customer_id: selectedInvoice.customer_id,
        invoice_name: `RTN-SLS-${selectedInvoice.id}`,
        description: t(
          "screens.pos.todayInvoiceReturn",
          "مرتجع سريع من فواتير اليوم"
        ),
        date: new Date().toISOString().split("T")[0],
        subtotal: returnTotal,
        discount: 0,
        tax: taxPercent,
        taxValue,
        net_total: netTotal,
        created_by: selectedInvoice.created_by || 1,
        items: returnedItems,
        payment: null,
      };

      const result = await window.api.createSalesReturn(returnData);
      if (result.success) {
        onSuccess();
      } else {
        setActionError(
          result.error || t("errors.returnFailed", "فشلت عملية الإرجاع")
        );
      }
    } catch (err) {
      setActionError(err.message || t("errors.returnFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-5">
          {actionError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
              <AlertCircle size={14} />
              {actionError}
            </div>
          )}

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
            <div className="flex justify-between items-center">
              <div></div>
              <button
                type="button"
                onClick={handleReturnAll}
                className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition"
              >
                {t("ui.returnAll", "إرجاع الكل")}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black text-stone-800 uppercase r">
              {t("screens.pos.chooseReturnQtys", "حدد الكميات المراد إرجاعها")}
            </h4>

            <div className="divide-y divide-stone-100 rounded-2xl border border-stone-200 bg-white px-4">
              {salesInvoicesItem.map((item) => {
                const originalQty =
                  item.available_quantity ?? item.quantity ?? 0;
                const returnQty = returnQuantities[item.id] || 0;

                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3.5"
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
                          {t("screens.pos.originalQty", "الكمية الأصلية")}:{" "}
                          <span className="font-bold text-stone-800">
                            {originalQty}
                          </span>{" "}
                          | {t("screens.pos.price", "السعر")}:{" "}
                          <span className="font-bold text-stone-800">
                            {money(item.price)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex h-9 items-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50 shadow-sm">
                        <button
                          type="button"
                          onClick={() =>
                            handleQtyChange(item.id, originalQty, -1)
                          }
                          className="flex h-9 w-9 items-center justify-center text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                          disabled={returnQty === 0}
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-10 text-center text-sm font-black text-stone-950">
                          {returnQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQtyChange(item.id, originalQty, 1)
                          }
                          className="flex h-9 w-9 items-center justify-center text-stone-700 hover:bg-stone-100 disabled:opacity-40"
                          disabled={returnQty >= originalQty}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <div className="w-20 text-left">
                        <p className="text-[10px] text-stone-400 font-semibold uppercase">
                          {t("ui.subtotal", "الفرعي")}
                        </p>
                        <span className="text-sm font-black text-stone-900">
                          {money(returnQty * (item.price || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 space-y-2 text-sm">
            <div className="flex justify-between text-stone-600 font-medium">
              <span>
                {t(
                  "screens.pos.originalInvoiceTotal",
                  "إجمالي الفاتورة الأصلية"
                )}
              </span>
              <span className="font-bold text-stone-900">
                {money(
                  selectedInvoice.net_total ||
                    selectedInvoice.netTotal ||
                    selectedInvoice.total ||
                    0
                )}
              </span>
            </div>
            <div className="border-t border-dashed border-stone-200 pt-2 flex justify-between font-black text-base">
              <span className="text-stone-900 flex items-center gap-1.5">
                <RotateCcw size={15} className="text-rose-600 animate-pulse" />
                {t("screens.pos.refundTotal", "المبلغ المسترد المتوقع")}
              </span>
              <span className="text-rose-600 text-lg">
                {money(returnTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-stone-100 px-6 py-4 bg-stone-50/50 flex justify-between items-center">
        <button
          type="button"
          disabled={loading || returnTotal === 0}
          onClick={handleConfirmReturn}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-black text-white hover:bg-rose-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-rose-200"
        >
          <Undo2 size={16} />
          {t("screens.pos.confirmAndRefund", "تأكيد وإرجاع الكميات المحددة")}
        </button>
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
