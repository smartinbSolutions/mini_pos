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
  DollarSign,
} from "lucide-react";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { formatMoney } from "../../../../Global/FormatNumber";
import { useTranslation } from "react-i18next";

export default function InvoicePaymentModal({
  isOpen,
  onClose,
  onSubmit,
  invoice,
  totalAmount,
  party,
  partyName,
  mode = "purchase", // "purchase" | "sales" | "expense" | "partner" | "customer" | "supplier"
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
  const isCustomer = mode === "customer";
  const isSupplier = mode === "supplier";
  const isCollectorMode = !invoice;

  // Initial calculated base amount from invoice or totalAmount prop
  const initialBaseAmount = invoice
    ? Number(invoice.remaining_amount || 0)
    : Number(invoice?.net_total || 0);

  const [form, setForm] = useState({
    fund_id: "",
    fund_exchangeRate: 1, // Fund's nominal exchange rate
    amount_in_base: 0, // Editable base currency amount
    collected_amount: 0, // Editable fund currency amount
    currency_code: "",
    currency_symbol: "",
    note: "",
    partner_transaction_type: "",
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
      } else if (isCustomer) {
        defaultNote = `Payment receipt from customer: ${partyName}`;
      } else if (isSupplier) {
        defaultNote = `Payment settlement to supplier: ${partyName}`;
      } else {
        defaultNote = t("screens.payments.partnerTransaction", {
          name: partyName,
        });
      }

      setForm({
        fund_id: "",
        fund_exchangeRate: 1,
        amount_in_base: initialBaseAmount,
        collected_amount: initialBaseAmount,
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
    isCustomer,
    isSupplier,
    partyName,
    initialBaseAmount,
    t,
  ]);

  const handleFundChange = (e) => {
    const fundId = Number(e.target.value);
    const fund = funds.find((f) => f.id === fundId);
    const rate = fund?.currency_exchangeRate || 1;
    const currentBase = form.amount_in_base || initialBaseAmount;

    setForm((prev) => ({
      ...prev,
      fund_id: fundId,
      fund_exchangeRate: rate,
      amount_in_base: currentBase,
      collected_amount: rate === 1 ? currentBase : currentBase * rate,
      currency_code: fund?.currency_code || "",
      currency_symbol: fund?.currency_symbol || "",
    }));
  };

  const handleBaseAmountChange = (val) => {
    const baseVal = Number(val || 0);
    setForm((prev) => ({
      ...prev,
      amount_in_base: baseVal,
      collected_amount:
        prev.fund_exchangeRate === 1
          ? baseVal
          : baseVal * prev.fund_exchangeRate,
    }));
  };

  const effectiveRate = useMemo(() => {
    if (!form.amount_in_base) return form.fund_exchangeRate;
    return Number(form.collected_amount || 0) / Number(form.amount_in_base);
  }, [form.collected_amount, form.amount_in_base, form.fund_exchangeRate]);

  const submit = async () => {
    if (!form.fund_id) {
      setMessage(t("ui.selectFundRequired") || "Please select a fund first");
      return;
    }
    if (Number(form.amount_in_base) <= 0) {
      setMessage("Please enter a valid amount");
      return;
    }

    const paymentType =
      isPurchase || isExpense || isSupplier
        ? "expense"
        : isSales || isCustomer
          ? "income"
          : form.partner_transaction_type;

    const partyType =
      isPurchase || isExpense || isSupplier
        ? "supplier"
        : isSales || isCustomer
          ? "customer"
          : "partner";

    const paymentData = {
      type: paymentType,
      party_type: partyType,
      party_id: party,
      fund_id: form.fund_id,
      amount: Number(form.amount_in_base),
      exchange_rate: form.fund_exchangeRate,
      collected_amount: Number(form.collected_amount || 0),
      effective_rate: effectiveRate,
      currency_code: form.currency_code,
      currency_symbol: form.currency_symbol,
      note: form.note,
      mode,
    };

    if (isCollectorMode && onSubmit) {
      onSubmit?.(paymentData);
      onClose();
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const res = await api.createPayment({
        ...paymentData,
        invoiceId: invoice?.id || null,
      });
      if (!res.success) throw new Error(res.message);

      setMessage(t("screens.payments.saved") || "Saved successfully");
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
    if (isPurchase || isExpense || isSupplier) return "bg-red-100 text-red-600";
    if (isSales || isCustomer) return "bg-green-100 text-green-600";
    return form.partner_transaction_type === "income"
      ? "bg-emerald-100 text-emerald-600"
      : "bg-orange-100 text-orange-600";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border">
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
                {isCustomer && "Customer Account Collection"}
                {isSupplier && "Supplier Balance Settlement"}
                {isPartner &&
                  (form.partner_transaction_type === "income"
                    ? "Receipt from Partner (Give)"
                    : "Payment to Partner (Take)")}
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

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="rounded-2xl border p-4 bg-gray-50 flex items-center gap-3">
            <div
              className={`p-2 rounded-xl ${isPurchase || isExpense || isSupplier ? "bg-blue-100 text-blue-600" : isSales || isCustomer ? "bg-green-100 text-green-600" : "bg-purple-100 text-purple-600"}`}
            >
              {isPurchase || isExpense || isSupplier ? (
                <Building2 size={18} />
              ) : isSales || isCustomer ? (
                <User size={18} />
              ) : (
                <Users size={18} />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500">
                {(isPurchase || isExpense || isSupplier) && t("ui.supplier")}
                {(isSales || isCustomer) && t("ui.customer")}
                {isPartner && "Partner"}
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
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${form.partner_transaction_type === "income" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <ArrowDownLeft size={16} />
                Receipt (Give)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleChange("partner_transaction_type", "expense")
                }
                className={`flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${form.partner_transaction_type === "expense" ? "bg-white text-orange-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                <ArrowUpRight size={16} />
                Payment (Take)
              </button>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-600">{t("ui.cashFund")}</label>
            <select
              value={form.fund_id}
              onChange={handleFundChange}
              className="w-full h-11 rounded-xl border px-3 mt-1 bg-white outline-none"
            >
              <option value="">{t("ui.selectFund")}</option>
              {funds?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({formatMoney(f.balance, f)})
                </option>
              ))}
            </select>
          </div>

          <hr className="border-dashed" />

          <div>
            <label className="text-sm font-medium text-gray-700">
              Amount to Receive / Pay (Base Currency)
            </label>
            <div className="relative mt-1">
              <input
                type="number"
                value={form.amount_in_base}
                onChange={(e) => handleBaseAmountChange(e.target.value)}
                className="w-full h-11 rounded-xl border px-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="0.00"
                disabled={!form.fund_id}
              />
              <DollarSign
                className="absolute right-3 top-3 text-gray-400"
                size={18}
              />
            </div>
            {invoice && (
              <p className="mt-1 text-xs text-gray-400">
                Original Net Total: {money(invoice?.net_total)}
              </p>
            )}
          </div>

          {form.fund_exchangeRate !== 1 && (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Collected / Paid Amount (Fund Currency)
              </label>
              <div className="relative mt-1">
                <input
                  type="number"
                  value={form.collected_amount}
                  onChange={(e) =>
                    handleChange("collected_amount", e.target.value)
                  }
                  className="w-full h-11 rounded-xl border px-3 pr-10 focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                  disabled={!form.fund_id}
                />
                <Wallet
                  className="absolute right-3 top-3 text-gray-400"
                  size={18}
                />
              </div>
              {form.fund_id && (
                <div className="mt-1 flex justify-between text-xs text-gray-500 bg-slate-50 p-2 rounded-lg border border-dashed">
                  <span>
                    {t("ui.fundRate")}:{" "}
                    <strong>{form.fund_exchangeRate}</strong>
                  </span>
                  <span>
                    {t("ui.effectiveRate")}:{" "}
                    <strong className="text-blue-600">
                      {effectiveRate.toFixed(4)}
                    </strong>
                  </span>
                </div>
              )}
            </div>
          )}
          <div>
            <label className="text-sm text-gray-600">{t("ui.note")}</label>
            <textarea
              rows={2}
              value={form.note}
              onChange={(e) => handleChange("note", e.target.value)}
              className="w-full rounded-xl border p-2 mt-1 outline-none"
              placeholder={t("ui.note")}
            />
          </div>

          {message && (
            <div className="text-center text-sm font-medium bg-amber-50 text-amber-700 p-2.5 rounded-xl border border-amber-200">
              {message}
            </div>
          )}
        </div>

        <div className="p-5 border-t bg-gray-50">
          <button
            onClick={submit}
            disabled={loading}
            className={`w-full h-11 rounded-xl text-white flex items-center justify-center gap-2 font-medium transition-all ${isPurchase || isExpense || isSupplier ? "bg-red-600 hover:bg-red-700" : isSales || isCustomer ? "bg-green-600 hover:bg-green-700" : form.partner_transaction_type === "income" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-orange-600 hover:bg-orange-700"}`}
          >
            <Save size={18} />
            {loading
              ? t("common.saving")
              : confirmLabel ||
                (isCollectorMode
                  ? "Confirm Collection"
                  : t("screens.payments.savePayment"))}
          </button>
        </div>
      </div>
    </div>
  );
}
