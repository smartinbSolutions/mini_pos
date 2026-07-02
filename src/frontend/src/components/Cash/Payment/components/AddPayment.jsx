import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Save,
  X,
  Receipt,
  Building2,
  User,
  Users,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { formatMoney } from "../../../../Global/FormatNumber";
import { useTranslation } from "react-i18next";

export default function InvoicePaymentModal({
  isOpen,
  onClose,
  onSubmit,
  invoice, // null/undefined => collector mode, existing invoice => execute mode
  totalAmount, // used in collector mode: the in-progress invoice's net_total
  party,
  partyName,
  mode = "purchase", // "purchase" | "sales" | "expense" | "partner"
  refetchList,
  confirmLabel,
}) {
  const { t } = useTranslation();
  const api = window.api;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [funds, setFunds] = useState([]);
  const { money } = usePrimaryCurrency();

  const isPurchase = mode === "purchase";
  const isExpense = mode === "expense";
  const isSales = mode === "sales";
  const isPartner = mode === "partner";
  const isCollectorMode = !invoice;

  // Full amount only — no partial payments, no "remaining" concept.
  const baseAmount = invoice
    ? Number(invoice.net_total || 0)
    : Number(totalAmount || 0);

  const [form, setForm] = useState({
    fund_id: "",
    fund_exchangeRate: 1, // fund's nominal/reference rate
    collected_amount: 0, // what's actually collected, editable, in fund currency
    currency_code: "",
    currency_symbol: "",
    note: "",
    partner_transaction_type: "income",
  });

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const refetch = useCallback(async () => {
    if (!api) return;
    const res = await api.getFunds();
    setFunds(res || []);
  }, [api]);

  useEffect(() => {
    if (isOpen) {
      refetch();

      let defaultNote = "";
      if (isPurchase) {
        defaultNote = t("screens.payments.paymentForPurchase", {
          id: invoice?.id,
        });
      } else if (isSales) {
        defaultNote = t("screens.payments.paymentForSales", {
          id: invoice?.id,
        });
      } else if (isExpense) {
        defaultNote = t("screens.payments.paymentForExpense", {
          id: invoice?.id,
        });
      } else {
        defaultNote = t("screens.payments.partnerTransaction", {
          name: partyName,
        });
      }

      setForm({
        fund_id: "",
        fund_exchangeRate: 1,
        collected_amount: 0,
        currency_code: "",
        currency_symbol: "",
        note: defaultNote,
        partner_transaction_type: "income",
      });

      setMessage("");
    }
  }, [
    isOpen,
    refetch,
    invoice,
    isPurchase,
    isExpense,
    isSales,
    isPartner,
    partyName,
    t,
  ]);

  // When a fund is picked, default collected_amount to base * nominal rate.
  // User can still hand-adjust it afterward (till count, negotiated rate, etc).
  const handleFundChange = (e) => {
    const fundId = Number(e.target.value);
    const fund = funds.find((f) => f.id === fundId);
    const rate = fund?.currency_exchangeRate || 1;

    setForm((prev) => ({
      ...prev,
      fund_id: fundId,
      fund_exchangeRate: rate,
      // Locked to exact base amount when rate is 1; otherwise default to
      // base * rate, still editable afterward for foreign-currency funds.
      collected_amount: rate === 1 ? baseAmount : baseAmount * rate,
      currency_code: fund?.currency_code || "",
      currency_symbol: fund?.currency_symbol || "",
    }));
  };

  // The rate actually realized by what was collected — may diverge from
  // the fund's nominal rate if collected_amount was hand-adjusted.
  const effectiveRate = useMemo(() => {
    if (!baseAmount) return form.fund_exchangeRate;
    return Number(form.collected_amount || 0) / baseAmount;
  }, [form.collected_amount, baseAmount, form.fund_exchangeRate]);

  const submit = async () => {
    if (!form.fund_id) {
      setMessage(t("ui.selectFundRequired") || "الرجاء اختيار الصندوق أولاً");
      return;
    }

    const paymentType =
      isPurchase || isExpense
        ? "expense"
        : isSales
          ? "income"
          : form.partner_transaction_type;
    const partyType =
      isPurchase || isExpense ? "supplier" : isSales ? "customer" : "partner";

    const paymentData = {
      type: paymentType,
      party_type: partyType,
      party_id: party,
      fund_id: form.fund_id,
      amount: baseAmount, // full invoice/order amount, base currency
      exchange_rate: form.fund_exchangeRate, // fund's nominal/reference rate
      collected_amount: Number(form.collected_amount || 0), // what was actually collected
      effective_rate: effectiveRate, // derived: collected_amount / amount
      currency_code: form.currency_code,
      currency_symbol: form.currency_symbol,
      note: form.note,
      mode,
    };

    if (isCollectorMode) {
      onSubmit?.(paymentData);
      onClose();
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await api.createPayment({
        ...paymentData,
        invoiceId: invoice.id,
      });
      if (!res.success) throw new Error(res.message);

      setMessage(t("screens.payments.saved"));
      setTimeout(() => onClose(), 700);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !isCollectorMode && refetchList) {
      refetchList();
    }
  }, [loading, isOpen, isCollectorMode, refetchList]);

  if (!isOpen) return null;

  const getHeaderStyle = () => {
    if (isPurchase || isExpense) return "bg-red-100 text-red-600";
    if (isSales) return "bg-green-100 text-green-600";
    return form.partner_transaction_type === "income"
      ? "bg-emerald-100 text-emerald-600"
      : "bg-orange-100 text-orange-600";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl ${getHeaderStyle()}`}>
              {isPartner ? <Users size={20} /> : <Receipt size={20} />}
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">
                {isPurchase && t("screens.payments.purchasePayment")}
                {isExpense && t("screens.payments.expensePayment")}
                {isSales && t("screens.payments.salesPayment")}
                {isPartner &&
                  (form.partner_transaction_type === "income"
                    ? "قبض من شريك (عطاء)"
                    : "صرف لشريك (أخذ)")}
              </h2>
              {invoice && (
                <p className="text-xs text-gray-500">
                  {t("ui.invoice")} #{invoice?.id}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Party */}
          <div className="rounded-2xl border p-4 bg-gray-50 flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${
                isPurchase || isExpense
                  ? "bg-blue-100 text-blue-600"
                  : isSales
                    ? "bg-green-100 text-green-600"
                    : "bg-purple-100 text-purple-600"
              }`}
            >
              {isPurchase || isExpense ? (
                <Building2 size={18} />
              ) : isSales ? (
                <User size={18} />
              ) : (
                <Users size={18} />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {(isPurchase || isExpense) && t("ui.supplier")}
                {isSales && t("ui.customer")}
                {isPartner && "الشريك"}
              </p>
              <h3 className="font-medium text-gray-800">{partyName}</h3>
            </div>
          </div>

          {isPartner && (
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() =>
                  handleChange("partner_transaction_type", "income")
                }
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                  form.partner_transaction_type === "income"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ArrowDownLeft size={16} />
                قبض (عطاء)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleChange("partner_transaction_type", "expense")
                }
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                  form.partner_transaction_type === "expense"
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <ArrowUpRight size={16} />
                صرف (أخذ)
              </button>
            </div>
          )}

          {/* Total — no "remaining" card, single source: full amount */}
          {invoice && (
            <div className="rounded-2xl border p-3">
              <p className="text-xs text-gray-500">{t("ui.netTotal")}</p>
              <h3 className="text-lg font-bold">{money(invoice?.net_total)}</h3>
            </div>
          )}

          {/* Fund Selection */}
          <div>
            <label className="text-sm text-gray-600">{t("ui.cashFund")}</label>
            <select
              value={form.fund_id}
              onChange={handleFundChange}
              className="w-full h-11 rounded-xl border px-3 mt-1"
            >
              <option value="">{t("ui.selectFund")}</option>
              {funds?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({formatMoney(f.balance, f)})
                </option>
              ))}
            </select>
          </div>

          {/* Collected amount — editable, defaults to base * nominal rate */}
          <div>
            <label className="text-sm text-gray-600">
              {t("ui.collectedAmount") /* "Amount Collected" */}
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                value={form.collected_amount}
                onChange={(e) =>
                  handleChange("collected_amount", e.target.value)
                }
                className="w-full h-11 rounded-xl border px-3 pr-10 disabled:bg-slate-100"
                disabled={!form.fund_id || form.fund_exchangeRate === 1}
              />
              <Wallet
                className="absolute right-3 top-3 text-gray-400"
                size={18}
              />
            </div>
            {form.fund_id && (
              <p className="mt-1 text-xs text-gray-500">
                {t("ui.fundRate")}: {form.fund_exchangeRate} ·{" "}
                {t("ui.effectiveRate")}: {effectiveRate.toFixed(4)}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-sm text-gray-600">{t("ui.note")}</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              className="w-full rounded-xl border p-2 mt-1"
              placeholder={t("ui.note")}
            />
          </div>

          {/* Message */}
          {message && (
            <div className="text-center text-sm bg-gray-100 p-2 rounded-xl">
              {message}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-gray-50">
          <button
            onClick={submit}
            disabled={loading}
            className={`w-full h-11 rounded-xl text-white flex items-center justify-center gap-2 ${
              isPurchase || isExpense
                ? "bg-red-600 hover:bg-red-700"
                : isSales
                  ? "bg-green-600 hover:bg-green-700"
                  : form.partner_transaction_type === "income"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-orange-600 hover:bg-orange-700"
            }`}
          >
            <Save size={18} />
            {loading
              ? t("common.saving")
              : confirmLabel ||
                (isCollectorMode
                  ? t("screens.payments.confirmPayment")
                  : t("screens.payments.savePayment"))}
          </button>
        </div>
      </div>
    </div>
  );
}
