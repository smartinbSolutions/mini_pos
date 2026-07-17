import { useState, useEffect } from "react";
import {
  Minus,
  Plus,
  Undo2,
  RotateCcw,
  AlertCircle,
  ShoppingBag,
  X,
} from "lucide-react";
import UnifiedCheckoutModal from "../CheckoutCombinedModal";

export default function InvoiceReturnModal({
  selectedInvoice,
  salesInvoicesItem,
  funds,
  money,
  t,
  onClose,
  onSuccess,
}) {
  const [returnQuantities, setReturnQuantities] = useState({});
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

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

  const originalTotal =
    selectedInvoice.net_total ||
    selectedInvoice.netTotal ||
    selectedInvoice.total ||
    0;

  const getReturnedItems = () =>
    salesInvoicesItem
      .map((item) => ({
        sales_invoice_item_id: item.id,
        product_id: item.product_id,
        quantity: returnQuantities[item.id] || 0,
        price: item.price,
        sellingPrice: item.sellingPrice || item.price,
      }))
      .filter((item) => item.quantity > 0);

  const openRefundModal = () => {
    if (getReturnedItems().length === 0) {
      setActionError(
        t(
          "screens.pos.selectAtLeastOneItem",
          "الرجاء تحديد كمية إرجاع لمنتج واحد على الأقل."
        )
      );
      return;
    }
    setActionError("");
    setIsRefundModalOpen(true);
  };

  // Called by the same fund-allocation modal used at checkout — the
  // cashier chooses which fund(s) the refund comes out of, exactly like
  // choosing which fund(s) collect a sale. No automatic split.
  const handleConfirmRefund = async ({ payments }) => {
    const returnedItems = getReturnedItems();
    const taxPercent = selectedInvoice.tax || 0;
    const taxValue = returnTotal * (taxPercent / 100);
    const netTotal = returnTotal + taxValue;

    const mappedPayments = payments.map((p) => ({
      fund_id: p.fundId,
      amount: p.amount,
      amount_fund_currency: p.amount_fund_currency,
      currency_code: p.currency_code,
      exchange_rate: p.exchange_rate,
      effective_rate: p.exchange_rate,
      note: `Refund for Invoice #${selectedInvoice.id}`,
    }));

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
      payments: mappedPayments,
    };

    setLoading(true);
    try {
      const result = await window.api.createSalesReturn(returnData);
      if (!result.success) {
        throw new Error(result.error || t("errors.returnFailed"));
      }
      setIsRefundModalOpen(false);
      onSuccess();
    } catch (err) {
      setActionError(err.message || t("errors.returnFailed"));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#f7f3ee]">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          {actionError && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              <AlertCircle size={16} />
              {actionError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white p-4">
            <div>
              <span className="text-xs text-stone-500">
                {t("screens.pos.customer", "العميل")}
              </span>
              <p className="mt-0.5 text-sm font-bold text-stone-900">
                {selectedInvoice.customer?.name ||
                  selectedInvoice.customer_name ||
                  t("screens.pos.walkInCustomer", "زبون سفري")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReturnAll}
              className="h-11 rounded-2xl bg-amber-500 px-4 text-sm font-bold text-white transition hover:bg-amber-600 active:scale-95"
            >
              {t("ui.returnAll", "إرجاع الكل")}
            </button>
          </div>

          <div className="space-y-2.5">
            <h4 className="text-xs font-black uppercase text-stone-500">
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
                    className="flex flex-wrap items-center justify-between gap-3 py-4"
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
                      <div className="flex h-11 items-center overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
                        <button
                          type="button"
                          onClick={() =>
                            handleQtyChange(item.id, originalQty, -1)
                          }
                          className="flex h-11 w-11 items-center justify-center text-stone-700 transition hover:bg-stone-100 active:scale-90 disabled:opacity-40"
                          disabled={returnQty === 0}
                        >
                          <Minus size={15} />
                        </button>
                        <span className="w-10 text-center text-sm font-black text-stone-950">
                          {returnQty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleQtyChange(item.id, originalQty, 1)
                          }
                          className="flex h-11 w-11 items-center justify-center text-stone-700 transition hover:bg-stone-100 active:scale-90 disabled:opacity-40"
                          disabled={returnQty >= originalQty}
                        >
                          <Plus size={15} />
                        </button>
                      </div>
                      <div className="w-20 text-left">
                        <p className="text-[10px] font-semibold uppercase text-stone-400">
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

          <div className="space-y-2 rounded-2xl border border-stone-200 bg-white p-4 text-sm">
            <div className="flex justify-between font-medium text-stone-600">
              <span>
                {t(
                  "screens.pos.originalInvoiceTotal",
                  "إجمالي الفاتورة الأصلية"
                )}
              </span>
              <span className="font-bold text-stone-900">
                {money(originalTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-dashed border-stone-200 pt-2.5 text-base font-black">
              <span className="flex items-center gap-1.5 text-stone-900">
                <RotateCcw size={16} className="text-rose-600" />
                {t("screens.pos.refundTotal", "المبلغ المسترد المتوقع")}
              </span>
              <span className="text-lg text-rose-600">
                {money(returnTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-3 border-t border-stone-200 bg-white px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="h-12 rounded-2xl border border-stone-200 bg-white px-6 text-sm font-bold text-stone-700 transition hover:bg-stone-50 active:scale-95"
        >
          {t("common.close", "إغلاق")}
        </button>
        <button
          type="button"
          disabled={loading || returnTotal === 0}
          onClick={openRefundModal}
          className="flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 text-sm font-black text-white shadow-md shadow-rose-200 transition hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 size={17} />
          {t(
            "screens.pos.chooseRefundMethod",
            "متابعة واختيار طريقة الاسترجاع"
          )}
        </button>
      </div>

      {/* REFUND METHOD — same fund-allocation UI used at checkout,
          just pointed at returnTotal instead of a sale total. The
          cashier picks which fund(s) pay the refund out, same as
          picking which fund(s) collect a sale. */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white">
          <div className="shrink-0 flex items-center justify-between border-b border-stone-200 px-6 py-4">
            <div>
              <h2 className="text-lg font-black text-stone-950">
                {t(
                  "screens.pos.chooseRefundMethod",
                  "اختر طريقة استرجاع المبلغ"
                )}
              </h2>
              <p className="text-xs text-stone-500">
                {t("screens.pos.refundTotal", "المبلغ المسترد المتوقع")}:{" "}
                {money(returnTotal)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsRefundModalOpen(false)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-600 transition hover:bg-stone-200 active:scale-95"
            >
              <X size={20} />
            </button>
          </div>

          <UnifiedCheckoutModal
            funds={funds}
            total={returnTotal}
            checkingOut={loading}
            onClose={() => setIsRefundModalOpen(false)}
            onCheckout={handleConfirmRefund}
            t={t}
            money={money}
          />
        </div>
      )}
    </div>
  );
}
