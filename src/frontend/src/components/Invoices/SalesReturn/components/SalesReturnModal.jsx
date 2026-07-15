import React, { useState, useEffect } from "react";
import { X, Undo2, AlertCircle } from "lucide-react";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../../Global/AuthContext";
const SalesReturnModal = ({ isOpen, onClose, id }) => {
  const { t } = useTranslation();
  const { money } = usePrimaryCurrency();

  const [returnItems, setReturnItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [note, setNote] = useState("");
  const [validationError, setValidationError] = useState("");
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!isOpen || !id) return;
    let cancelled = false;

    const loadInvoice = async () => {
      try {
        setLoading(true);
        const data = await window.api.getSalesInvoiceById(id);
        if (!cancelled) {
          setInvoice(data);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setInvoice(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    loadInvoice();
    return () => {
      cancelled = true;
    };
  }, [id, isOpen]);

  useEffect(() => {
    if (invoice && invoice.items) {
      const itemsWithReturnQty = invoice.items.map((item) => ({
        ...item,
        returnQuantity: 0,
        maxAvailable: item.available_quantity,
      }));

      setReturnItems(itemsWithReturnQty);
      setTaxPercent(invoice.tax || 0);
      setDiscount(0);
      setNote("");
      setValidationError("");
    }
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const handleReturnAll = () => {
    const allItems = returnItems.map((item) => ({
      ...item,
      returnQuantity: item.maxAvailable,
    }));

    setReturnItems(allItems);
    setDiscount(invoice.discount || 0);
    setValidationError("");
  };

  const handleQtyChange = (itemId, val) => {
    const qty = Math.max(0, Number(val) || 0);

    const updated = returnItems.map((item) => {
      if (item.id === itemId) {
        if (qty > item.maxAvailable) {
          setValidationError(t("errors.returnQtyExceeded"));

          return {
            ...item,
            returnQuantity: item.maxAvailable,
          };
        }

        return {
          ...item,
          returnQuantity: qty,
        };
      }

      return item;
    });

    if (updated.every((item) => item.returnQuantity <= item.maxAvailable)) {
      setValidationError("");
    }

    setReturnItems(updated);
  };

  const subtotal = returnItems.reduce(
    (sum, item) => sum + item.returnQuantity * (item.price || 0),
    0,
  );

  const taxValue = (subtotal - discount) * (taxPercent / 100);
  const netTotal = Math.max(0, subtotal - discount + taxValue);

  const handleSave = async (returnData) => {
    try {
      const result = await window.api.createSalesReturn(returnData);

      if (result.success) {
        onClose();
      } else {
        setValidationError(result.error);
      }
    } catch (err) {
      setValidationError(err.message);
    }
  };

  const handleSubmit = () => {
    const itemsToReturn = returnItems.filter((item) => item.returnQuantity > 0);

    if (itemsToReturn.length === 0) {
      setValidationError(t("errors.noItemsSelected"));
      return;
    }

    if (netTotal <= 0) {
      setValidationError(t("errors.invalidReturnTotal"));
      return;
    }

    const returnData = {
      sales_invoice_id: invoice.id,
      customer_id: invoice.customer_id,
      invoice_name: `RTN-SLS-${invoice.id}`,
      description: note,
      date: new Date().toISOString().split("T")[0],
      subtotal,
      discount,
      tax: taxPercent,
      taxValue,
      net_total: netTotal,
      created_by: user.id,
      items: itemsToReturn.map((item) => ({
        sales_invoice_item_id: item.id,
        product_id: item.product_id,
        quantity: item.returnQuantity,
        price: item.price,
        sellingPrice: item.sellingPrice || item.price,
      })),
      payment: null,
    };
    handleSave(returnData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] rounded-[28px] border border-white bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-[#f8faff]">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Undo2 className="text-[#4663ff]" size={20} />
              {t("ui.createSalesReturn")}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("ui.referencingInvoice")}{" "}
              <span className="font-semibold text-slate-700">
                #{invoice.id}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50 border border-amber-200/60">
            <div className="text-sm font-medium text-amber-900">
              {t("ui.returnAllPrompt")}
            </div>
            <button
              type="button"
              onClick={handleReturnAll}
              className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-700 transition"
            >
              {t("ui.returnAll")}
            </button>
          </div>

          {validationError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700">
              <AlertCircle size={14} />
              {validationError}
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-start">{t("ui.product")}</th>
                  <th className="px-4 py-3 text-start">{t("ui.soldQty")}</th>
                  <th className="px-4 py-3 text-start">{t("ui.price")}</th>
                  <th className="px-4 py-3 text-start w-36">
                    {t("ui.returnQty")}
                  </th>
                  <th className="px-4 py-3 text-start">{t("ui.total")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {returnItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 text-start font-semibold text-slate-800">
                      {item.name || `${t("ui.product")} #${item.product_id}`}
                    </td>
                    <td className="px-4 py-3 text-start text-slate-500 font-medium">
                      {item.maxAvailable}
                    </td>
                    <td className="px-4 py-3 text-start text-slate-600 tabular-nums">
                      {money(item.price || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="0"
                        max={item.maxAvailable}
                        value={
                          item.returnQuantity === 0 ? "" : item.returnQuantity
                        }
                        placeholder="0"
                        onChange={(e) =>
                          handleQtyChange(item.id, e.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-start font-bold text-slate-800 shadow-sm focus:border-[#4663ff] focus:outline-none focus:ring-1 focus:ring-[#4663ff]"
                      />
                    </td>
                    <td className="px-4 py-3 text-start text-slate-900 font-bold tabular-nums">
                      {money(item.returnQuantity * (item.price || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wide text-slate-500 block mb-1.5">
                  {t("screens.salesReturn.returnNotes")}
                </label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("screens.salesReturn.returnNotePlaceholder")}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 placeholder-slate-400 shadow-sm focus:border-[#4663ff] focus:outline-none focus:ring-1 focus:ring-[#4663ff]"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-[#f8faff] p-4 space-y-2.5 border border-slate-100 text-sm font-medium text-slate-600">
              <div className="flex justify-between">
                <span>{t("screens.salesReturn.subtotal")}</span>
                <span className="font-bold text-slate-800 tabular-nums">
                  {money(subtotal)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span>{t("screens.salesReturn.discount")}</span>
                <input
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discount === 0 ? "" : discount}
                  placeholder="0"
                  onChange={(e) =>
                    setDiscount(
                      Math.min(
                        subtotal,
                        Math.max(0, Number(e.target.value) || 0),
                      ),
                    )
                  }
                  className="w-24 text-start font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2 py-0.5"
                />
              </div>

              <div className="flex justify-between">
                <span>
                  {t("screens.salesReturn.tax")} ({taxPercent}%)
                </span>
                <span className="font-bold text-slate-800 tabular-nums">
                  +{money(taxValue)}
                </span>
              </div>

              <div className="border-t border-slate-200/80 my-2 pt-2 flex justify-between items-center text-base font-bold text-slate-900">
                <span className="text-[#4663ff]">
                  {t("screens.salesReturn.returnTotal")}
                </span>
                <span className="text-emerald-700 text-lg tabular-nums">
                  {money(netTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-6 py-4 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-xl bg-[#4663ff] px-6 py-2.5 text-sm font-bold text-white shadow-md hover:bg-[#354fd4] transition"
          >
            {t("screens.salesReturn.confirmReturn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesReturnModal;
