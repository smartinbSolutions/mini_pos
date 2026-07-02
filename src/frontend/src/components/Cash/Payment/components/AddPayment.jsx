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
  invoice,
  party,
  partyName,
  mode = "purchase", // "purchase" | "sales" | "partner"
  refetchList,
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

  const remaining = Number(invoice?.remaining || 0);

  const [form, setForm] = useState({
    fund_id: "",
    amount: invoice?.net_total || 0,
    fund_exchangeRate: 1,
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
        amount: invoice ? remaining : 0,
        fund_exchangeRate: 1,
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
    remaining,
    isPurchase,
    isExpense,
    isSales,
    isPartner,
    partyName,
    t,
  ]);

  const paymentInfundCurrency = useMemo(() => {
    const baseAmount = invoice ? invoice.net_total : Number(form.amount || 0);
    return baseAmount * Number(form.fund_exchangeRate || 1);
  }, [invoice, form.fund_exchangeRate, form.amount]);

  const submit = async () => {
    if (!form.fund_id) {
      setMessage(t("ui.selectFundRequired") || "الرجاء اختيار الصندوق أولاً");
      return;
    }

    setLoading(true);
    setMessage("");

    let paymentType =
      isPurchase || isExpense
        ? "expense"
        : isSales
          ? "income"
          : form.partner_transaction_type;
    let partyType =
      isPurchase || isExpense ? "supplier" : isSales ? "customer" : "partner";

    try {
      const res = await api.createPayment({
        type: paymentType,
        party_type: partyType,
        party_id: party,
        fund_id: form.fund_id,
        amount: invoice ? Number(invoice.net_total) : Number(form.amount),
        note: form.note,
        invoiceId: invoice?.id || null,
        paymentInfundCurrency,
        exchange_rate: form.fund_exchangeRate,
        currency_code: form.currency_code,
        mode,
      });

      if (!res.success) throw new Error(res.message);

      setMessage(t("screens.payments.saved"));

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setMessage(err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      refetchList();
    }
  }, [loading, isOpen, refetchList]);

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
                {isPurchase || (isExpense && t("ui.supplier"))}
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

          {invoice && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border p-3">
                <p className="text-xs text-gray-500">{t("ui.netTotal")}</p>
                <h3 className="text-lg font-bold">
                  {money(invoice?.net_total)}
                </h3>
              </div>

              <div className="rounded-2xl border p-3">
                <p className="text-xs text-gray-500">{t("ui.remaining")}</p>
                <h3 className="text-lg font-bold text-red-600">
                  {money(invoice?.net_total)}
                </h3>
                {form.currency_symbol && (
                  <h3 className="text-sm font-semibold text-gray-600">
                    {formatMoney(
                      invoice?.net_total * form.fund_exchangeRate,
                      form.currency_symbol,
                    )}
                  </h3>
                )}
              </div>
            </div>
          )}

          {/* Fund Selection */}
          <div>
            <label className="text-sm text-gray-600">{t("ui.cashFund")}</label>
            <select
              value={form.fund_id}
              onChange={(e) => {
                const fundId = Number(e.target.value);
                const fund = funds.find((f) => f.id === fundId);

                handleChange("fund_id", fundId);
                handleChange(
                  "fund_exchangeRate",
                  fund?.currency_exchangeRate || 1,
                );
                handleChange("currency_code", fund?.currency_code || "");
                handleChange("currency_symbol", fund?.currency_symbol || "");
              }}
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

          {/* Amount Input */}
          <div>
            <label className="text-sm text-gray-600">{t("ui.amount")}</label>
            <div className="relative mt-1">
              <input
                type="number"
                value={
                  invoice
                    ? invoice?.net_total * form.fund_exchangeRate
                    : form.amount
                }
                onChange={(e) => handleChange("amount", e.target.value)}
                className="w-full h-11 rounded-xl border px-3 pr-10"
                disabled={invoice} // معطل فقط إذا كان الدفع مرتبطاً بفاتورة محددة
              />
              <Wallet
                className="absolute right-3 top-3 text-gray-400"
                size={18}
              />
            </div>
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
            {loading ? t("common.saving") : t("screens.payments.savePayment")}
          </button>
        </div>
      </div>
    </div>
  );
}
