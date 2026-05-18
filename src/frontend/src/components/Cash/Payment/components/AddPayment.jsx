import { useCallback, useEffect, useMemo, useState } from "react";
import { Wallet, Save, X, Receipt, Building2, User } from "lucide-react";
import usePrimaryCurrency from "../../../../Global/usePrimaryCurrency";
import { formatMoney } from "../../../../Global/FormatNumber";

export default function InvoicePaymentModal({
  isOpen,
  onClose,
  invoice,
  party,
  partyName,
  mode = "purchase",
  refetchList,
}) {
  const api = window.api;

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [funds, setFunds] = useState([]);
  const { money } = usePrimaryCurrency();

  const isPurchase = mode === "purchase";

  const remaining = Number(invoice?.remaining || 0);

  const [form, setForm] = useState({
    fund_id: "",
    amount: invoice?.net_total,
    fund_exchangeRate: 1,
    currency_code: "",
    note: "",
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

      setForm({
        fund_id: "",
        amount: remaining,
        note: isPurchase
          ? `Payment for Purchase Invoice #${invoice?.id}`
          : `Payment for Sales Invoice #${invoice?.id}`,
      });

      setMessage("");
    }
  }, [isOpen, refetch, invoice?.id, remaining, isPurchase]);
  const paymentInfundCurrency = useMemo(() => {
    return invoice?.net_total * Number(form.fund_exchangeRate || 1);
  }, [invoice, form]);

  const submit = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await api.createPayment({
        type: isPurchase ? "expense" : "income",
        party_type: isPurchase ? "supplier" : "customer",
        party_id: party,
        fund_id: form.fund_id,
        amount: Number(invoice.net_total),
        note: form.note,
        invoiceId: invoice.id,
        paymentInfundCurrency,
        exchange_rate: form.fund_exchangeRate,
        currency_code: form.currency_code,
      });

      if (!res.success) throw new Error(res.message);

      setMessage("Payment saved successfully");

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setMessage(err.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    refetchList();
  }, [loading]);
  console.log(form.currency_symbol);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-2xl ${
                isPurchase
                  ? "bg-red-100 text-red-600"
                  : "bg-green-100 text-green-600"
              }`}
            >
              <Receipt size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-gray-800">
                {isPurchase ? "Purchase Payment" : "Sales Payment"}
              </h2>
              <p className="text-xs text-gray-500">Invoice #{invoice?.id}</p>
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
                isPurchase
                  ? "bg-blue-100 text-blue-600"
                  : "bg-green-100 text-green-600"
              }`}
            >
              {isPurchase ? <Building2 size={18} /> : <User size={18} />}
            </div>

            <div>
              <p className="text-sm text-gray-500">
                {isPurchase ? "Supplier" : "Customer"}
              </p>
              <h3 className="font-medium text-gray-800">{partyName}</h3>
            </div>
          </div>

          {/* Invoice */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border p-3">
              <p className="text-xs text-gray-500">Net Total</p>
              <h3 className="text-lg font-bold">{money(invoice?.net_total)}</h3>
            </div>

            <div className="rounded-2xl border p-3">
              <p className="text-xs text-gray-500">Remaining</p>
              <h3 className="text-lg font-bold text-red-600">
                {money(invoice?.net_total)}
              </h3>
              <h3 className="text-lg font-bold text-red-600">
                {formatMoney(
                  invoice?.net_total * form.fund_exchangeRate,
                  form.currency_symbol,
                )}
              </h3>
            </div>
          </div>

          {/* Fund */}
          <div>
            <label className="text-sm text-gray-600">Cash Fund</label>

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
              <option value="">Select Fund</option>

              {funds?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({formatMoney(f.balance, f)})
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="text-sm text-gray-600">Amount</label>

            <div className="relative">
              <input
                type="number"
                value={
                  invoice?.net_total * form.fund_exchangeRate ||
                  invoice?.net_total
                }
                onChange={(e) => handleChange("amount", e.target.value)}
                className="w-full h-11 rounded-xl border px-3 pr-10"
                disabled
              />
              <Wallet className="absolute right-3 top-3 text-gray-400" />
            </div>
          </div>

          {/* Note */}
          <textarea
            rows={3}
            value={form.note}
            onChange={(e) => handleChange("note", e.target.value)}
            className="w-full rounded-xl border p-2"
            placeholder="Note..."
          />

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
              isPurchase
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            <Save size={18} />
            {loading ? "Saving..." : "Save Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}
