import { useState, useEffect, useMemo } from "react";
import {
  Minus,
  Plus,
  Undo2,
  RotateCcw,
  AlertCircle,
  ShoppingBag,
  Wallet,
} from "lucide-react";

// Mirrors the refund across the same funds the original sale was paid
// through, proportional to how much of the sale is being returned. The
// last fund absorbs any rounding remainder so the primary-currency total
// always matches returnTotal exactly.
function computeRefundAllocations(allocations, originalTotal, refundTotal) {
  if (!allocations?.length || !originalTotal || refundTotal <= 0) return [];

  let allocatedPrimary = 0;

  return allocations
    .map((alloc, idx) => {
      const isLast = idx === allocations.length - 1;
      const share = alloc.amount / originalTotal;

      const amount = isLast
        ? Number((refundTotal - allocatedPrimary).toFixed(2))
        : Number((refundTotal * share).toFixed(2));

      allocatedPrimary += amount;

      const rate = alloc.amount > 0 ? alloc.fund_amount / alloc.amount : 1;
      const fundAmount = Number((amount * rate).toFixed(2));

      return {
        fund_id: alloc.fund_id,
        fund_name: alloc.fund_name,
        currency_code: alloc.currency_code,
        currency_symbol: alloc.currency_symbol,
        amount,
        fund_amount: fundAmount,
      };
    })
    .filter((row) => row.amount > 0);
}

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

  const originalTotal =
    selectedInvoice.net_total ||
    selectedInvoice.netTotal ||
    selectedInvoice.total ||
    0;

  const refundAllocations = useMemo(
    () =>
      computeRefundAllocations(
        selectedInvoice.allocations || [],
        originalTotal,
        returnTotal
      ),
    [selectedInvoice.allocations, originalTotal, returnTotal]
  );

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

      const payments = refundAllocations.map((alloc) => ({
        fund_id: alloc.fund_id,
        amount: alloc.amount,
        amount_fund_currency: alloc.fund_amount,
        currency_code: alloc.currency_code,
        exchange_rate: alloc.amount > 0 ? alloc.fund_amount / alloc.amount : 1,
        effective_rate: alloc.amount > 0 ? alloc.fund_amount / alloc.amount : 1,
        note: `Refund via ${alloc.fund_name}`,
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
        payments,
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

          {/* REFUND GOES BACK TO — auto-mirrors the original payment split */}
          {refundAllocations.length > 0 && (
            <div className="rounded-2xl border border-stone-200 bg-white p-4">
              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-black uppercase text-stone-500">
                <Wallet size={13} />
                {t("screens.pos.refundGoesBackTo", "المبلغ يُرد إلى")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {refundAllocations.map((alloc) => (
                  <div
                    key={alloc.fund_id}
                    className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2"
                  >
                    <span className="text-sm font-bold text-stone-800">
                      {alloc.fund_name}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="text-sm font-black text-rose-700">
                      {Number(alloc.fund_amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      {alloc.currency_symbol || alloc.currency_code}
                    </span>
                    {alloc.fund_amount !== alloc.amount && (
                      <span className="text-xs font-medium text-stone-500">
                        (= {money(alloc.amount)})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
          onClick={handleConfirmReturn}
          className="flex h-12 items-center gap-2 rounded-2xl bg-rose-600 px-6 text-sm font-black text-white shadow-md shadow-rose-200 transition hover:bg-rose-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Undo2 size={17} />
          {t("screens.pos.confirmAndRefund", "تأكيد وإرجاع الكميات المحددة")}
        </button>
      </div>
    </div>
  );
}
