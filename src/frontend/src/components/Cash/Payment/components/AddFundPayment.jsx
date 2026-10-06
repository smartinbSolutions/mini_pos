import {
  Save,
  X,
  ArrowRight,
  User,
  Building2,
  Users,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Wallet,
} from "lucide-react";
import { formatMoney } from "../../../../Global/FormatNumber";
import useAddFundPayment from "../hooks/useAddFundPayment";
import NumberInput from "../../../../Global/NumberInput";
import SearchableSelect from "../../../../Global/SearchableSelect";
import AllocationPreviewCard from "./AllocationPreviewCard";

// Defined outside the component so its reference is stable — SearchableSelect
// lists getOptionLabel in its effect deps.
const partyLabel = (p) => `${p.name}${p.phone ? ` (${p.phone})` : ""}`;

export default function AddFundPayment({
  isOpen,
  onClose,
  mode = "in",
  initialFundId,
  refetchList,
}) {
  const {
    form,
    funds,
    partiesList,
    searchParties,
    handlePartyChange,
    partyType,
    setPartyType,
    loading,
    message,
    messageTone,
    isFundLocked,
    selectedFund,

    isForeign,
    baseAmount,
    referenceRate,
    rateChanged,
    rateWarning,

    handleChange,
    handleFundChange,
    handleAmountChange,
    handleRateChange,
    resetRate,
    submit,
    money,
    t,

    allocationLines,
    allocationLoading,
    allocationLeftover,
    updateAllocationLine,
  } = useAddFundPayment({
    isOpen,
    onClose,
    mode,
    initialFundId,
    refetchList,
  });

  if (!isOpen) return null;

  const isCashIn = mode === "in";
  const theme = isCashIn
    ? {
        chip: "bg-green-100 text-green-600",
        btn: "bg-green-600 hover:bg-green-700",
        arrow: "bg-green-100 text-green-600",
        ring: "focus-within:border-green-500 focus-within:ring-green-100",
      }
    : {
        chip: "bg-red-100 text-red-600",
        btn: "bg-red-600 hover:bg-red-700",
        arrow: "bg-red-100 text-red-600",
        ring: "focus-within:border-red-500 focus-within:ring-red-100",
      };

  const partyIcon =
    partyType === "customer" ? (
      <User size={16} />
    ) : partyType === "supplier" ? (
      <Building2 size={16} />
    ) : (
      <Users size={16} />
    );

  const fundCurrency = form.currency_code || form.currency_symbol || "";
  const activeTab = isCashIn
    ? "bg-green-50 text-green-600 shadow-sm"
    : "bg-red-50 text-red-600 shadow-sm";

  const partyCard = (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="text-xs text-gray-500 font-semibold">
        {t("screens.payments.linked_account_type")}
      </div>

      <div className="grid grid-cols-3 gap-1.5 p-1 bg-white rounded-xl text-xs font-semibold border">
        <button
          type="button"
          onClick={() => setPartyType("customer")}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg transition ${partyType === "customer" ? activeTab : "text-gray-500"}`}
        >
          <User size={14} />
          {t("screens.payments.customer")}
        </button>
        <button
          type="button"
          onClick={() => setPartyType("supplier")}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg transition ${partyType === "supplier" ? activeTab : "text-gray-500"}`}
        >
          <Building2 size={14} />
          {t("screens.payments.supplier")}
        </button>
        <button
          type="button"
          onClick={() => setPartyType("partner")}
          className={`flex items-center justify-center gap-1 py-2 rounded-lg transition ${partyType === "partner" ? "bg-orange-50 text-orange-600 shadow-sm" : "text-gray-500"}`}
        >
          <Users size={14} />
          {t("screens.payments.partner")}
        </button>
      </div>

      <SearchableSelect
        placeholder={t("screens.payments.select_name_from_list")}
        options={partiesList}
        selectedValue={form.party_id}
        selectedLabel={form.party_name}
        getOptionLabel={partyLabel}
        onInputChange={searchParties}
        onChange={handlePartyChange}
      />
    </div>
  );

  // Fund card only picks the fund now — the amount has its own section
  // below, since its meaning depends on which fund (currency) was picked.
  const fundCard = (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
      <div className="text-xs text-gray-500 font-semibold">
        {t("screens.payments.target_fund")}
      </div>

      {isFundLocked ? (
        <div className="w-full h-10 rounded-xl border px-3 bg-gray-100 text-sm flex items-center text-slate-700 font-medium">
          {selectedFund
            ? `${selectedFund.name} (${formatMoney(selectedFund.balance, selectedFund)})`
            : "…"}
        </div>
      ) : (
        <select
          value={form.fund_id || ""}
          onChange={handleFundChange}
          className="w-full h-10 rounded-xl border px-3 bg-white outline-none focus:border-blue-500 text-sm"
        >
          <option value="">{t("screens.payments.select_fund")}</option>
          {funds?.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({formatMoney(f.balance, f)})
            </option>
          ))}
        </select>
      )}
    </div>
  );

  const amountSection = !form.fund_id ? (
    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-gray-300 px-4 py-5 text-sm text-gray-500">
      <Wallet size={16} className="shrink-0 text-gray-400" />
      {t(
        "screens.payments.selectFundToEnterAmount",
        "Select a fund first — the amount is entered in that fund's currency.",
      )}
    </div>
  ) : (
    <div className="rounded-2xl border border-gray-200 p-4 space-y-4">
      {/* Primary input: the money that actually moved, in the fund's currency */}
      <div>
        <label className="text-sm font-semibold text-gray-700">
          {isCashIn
            ? t("screens.payments.amountReceived", "Amount received")
            : t("screens.payments.amountPaid", "Amount paid")}
        </label>
        <div
          className={`mt-1.5 flex items-center rounded-xl border bg-white ring-4 ring-transparent transition ${theme.ring}`}
        >
          <NumberInput
            value={form.collected_amount}
            onChange={handleAmountChange}
            className="h-14 w-full min-w-0 flex-1 rounded-xl bg-transparent px-4 text-2xl font-black tabular-nums text-slate-900 outline-none"
            placeholder="0.00"
          />
          <span className="shrink-0 px-4 text-sm font-bold text-gray-500">
            {fundCurrency}
          </span>
        </div>
      </div>

      {/* Conversion — only when the fund isn't in the primary currency */}
      {isForeign && (
        <div className="rounded-xl bg-slate-50 p-3 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500">
                {t("screens.payments.exchangeRate", "Exchange rate")}
              </span>
              <span
                dir="ltr"
                className="flex items-center gap-1.5 text-sm font-bold text-gray-700"
              >
                <span className="tabular-nums">{money(1)}</span>
                <span className="text-gray-400">=</span>
                <NumberInput
                  value={form.rate}
                  onChange={handleRateChange}
                  className={`h-9 w-28 rounded-lg border bg-white px-2 text-center text-sm font-bold tabular-nums outline-none focus:ring-2 ${
                    rateWarning
                      ? "border-amber-400 focus:ring-amber-100"
                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-100"
                  }`}
                />
                <span>{fundCurrency}</span>
              </span>
            </div>

            {rateChanged && (
              <button
                type="button"
                onClick={resetRate}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
              >
                <RotateCcw size={12} />
                {t("screens.payments.resetRate", "Use fund rate")} (
                <span dir="ltr" className="tabular-nums">
                  {referenceRate}
                </span>
                )
              </button>
            )}
          </div>

          {rateWarning && (
            <p className="flex items-start gap-1.5 text-xs font-semibold text-amber-700">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              {t(
                "screens.payments.rateDeviationWarning",
                "This rate is more than 10% away from the fund rate. Check it before saving.",
              )}
            </p>
          )}

          {/* The result — derived, never typed */}
          <div className="flex items-baseline justify-between gap-3 border-t border-slate-200 pt-3">
            <span className="text-xs text-gray-500">
              {t("screens.payments.recordedAs", "Recorded in the account as")}
            </span>
            <span
              dir="ltr"
              className="text-xl font-black tabular-nums text-slate-900"
            >
              {money(baseAmount)}
            </span>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl border">
        <div className="flex items-center justify-between px-5 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-2xl ${theme.chip}`}>{partyIcon}</div>
            <div>
              <h2 className="font-semibold text-gray-800">
                {isCashIn
                  ? t("screens.payments.cash_in_receipt")
                  : t("screens.payments.cash_out_payment")}
              </h2>
              <p className="text-xs text-gray-500">
                {t("screens.payments.free_transaction_outside_invoices")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Horizontal flow expressing the actual movement of cash:
              cash-in -> party is the source, fund is the destination.
              cash-out -> fund is the source, party is the destination. */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            {isCashIn ? partyCard : fundCard}

            <div className="flex h-full items-center justify-center pt-8">
              <div className={`rounded-full p-2 ${theme.arrow}`}>
                <ArrowRight size={18} className="rtl:rotate-180" />
              </div>
            </div>

            {isCashIn ? fundCard : partyCard}
          </div>

          {amountSection}

          {baseAmount > 0 &&
            (allocationLoading || allocationLines.length > 0) && (
              <AllocationPreviewCard
                t={t}
                money={money}
                allocationLoading={allocationLoading}
                allocationLines={allocationLines}
                allocationLeftover={allocationLeftover}
                updateAllocationLine={updateAllocationLine}
              />
            )}

          <div>
            <label className="text-sm font-medium text-gray-600">
              {t("screens.payments.statement_receipt_details")}
            </label>
            <textarea
              rows={2}
              value={form.note || ""}
              onChange={(e) => handleChange("note", e.target.value)}
              className="w-full rounded-xl border p-2 mt-1 outline-none focus:border-blue-500 shadow-sm"
              placeholder={t("screens.payments.write_explanatory_statement")}
            />
          </div>

          {message && (
            <div
              className={`flex items-center justify-center gap-1.5 text-sm font-medium p-2.5 rounded-xl border ${
                messageTone === "success"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {messageTone === "success" ? (
                <CheckCircle2 size={15} />
              ) : (
                <AlertTriangle size={15} />
              )}
              {message}
            </div>
          )}
        </div>

        <div className="p-5 border-t bg-gray-50">
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className={`w-full h-11 rounded-xl text-white flex items-center justify-center gap-2 font-medium transition-all ${theme.btn} shadow-md disabled:opacity-50`}
          >
            <Save size={18} />
            {loading
              ? t("screens.payments.posting_and_saving")
              : t("screens.payments.save_and_post_receipt")}
          </button>
        </div>
      </div>
    </div>
  );
}
