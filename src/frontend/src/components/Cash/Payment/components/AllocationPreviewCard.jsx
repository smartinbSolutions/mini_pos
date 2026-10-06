import NumberInput from "../../../../Global/NumberInput";

export default function AllocationPreviewCard({
  t,
  money,
  allocationLoading,
  allocationLines,
  allocationLeftover,
  updateAllocationLine,
}) {
  return (
    <div className="rounded-2xl border border-[#e9edfb] bg-white p-4">
      <p className="mb-3 text-xs font-black text-[#4663ff]">
        {t("screens.payments.willCloseTitle", "This will close")}
      </p>

      {allocationLoading ? (
        <p className="text-sm text-slate-400">{t("common.loading")}</p>
      ) : (
        <div className="space-y-2">
          {allocationLines.map((line, index) => (
            <div
              key={`${line.invoice_type}-${line.invoice_id}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-[#f8faff] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#1c2340]">
                  {line.name ||
                    t("screens.payments.openingBalanceLine", "Opening balance")}
                </p>
                <p className="text-xs text-slate-400">
                  {t("screens.invoices.remaining_amount", "Remaining")}:{" "}
                  {money(line.remaining)}
                </p>
              </div>
              <NumberInput
                value={line.allocate}
                onChange={(val) => updateAllocationLine(index, val)}
                className="h-9 w-28 shrink-0 rounded-lg border border-[#e9edfb] bg-white px-2 text-end text-sm font-bold tabular-nums outline-none focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10"
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-[#eef1ff] pt-3 text-sm">
        <span className="font-semibold text-slate-500">
          {t("screens.payments.leftoverAsCredit", "Leftover (stays as credit)")}
        </span>
        <span
          dir="ltr"
          className={`font-black tabular-nums ${
            allocationLeftover < -0.005 ? "text-red-600" : "text-[#1c2340]"
          }`}
        >
          {money(allocationLeftover)}
        </span>
      </div>
    </div>
  );
}
