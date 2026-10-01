import { useTranslation } from "react-i18next";
import { Tag } from "lucide-react";
import usePrimaryCurrency from "../usePrimaryCurrency";
import { toEnteredLine } from "../printLine";
import { useEffect } from "react";

// Sales items expose tax_value, the others taxValue — read either.
const lineTax = (item) => Number(item.taxValue ?? item.tax_value ?? 0);

/**
 * Shared A4 document layout for invoices / returns / quotations / expenses.
 *
 * Props:
 *   doc                 the document row (items, subtotal, discount, taxes, net_total...)
 *   company             company settings
 *   pick                latin/original picker from usePrintDocument
 *   numberLabel         e.g. t("DOCS.INVOICE_NO")
 *   number              displayed document number
 *   badge               optional small badge next to the number label (POS, status...)
 *   meta                [{ label, value }] rows under the number (date, original invoice...)
 *   party               { label, name, phone }
 *   showUnitConversion  show "x Box × 12 = 24 base unit" line under product name
 *   variant             "product" (default) | "expense" — expense has no qty/unit columns
 */
export default function PrintDocument({
  doc,
  company,
  pick,
  numberLabel,
  number,
  badge,
  meta = [],
  party,
  showUnitConversion = false,
  variant = "product",
}) {
  const { t, i18n } = useTranslation();
  const { money } = usePrimaryCurrency();

  // Tell the main process the document is fully rendered (fonts + logo loaded)
  useEffect(() => {
    let cancelled = false;
    const images = Array.from(document.images).map((img) =>
      img.complete
        ? null
        : new Promise((resolve) => {
            img.onload = img.onerror = resolve;
          }),
    );
    Promise.all([document.fonts.ready, ...images]).then(() => {
      if (!cancelled) document.body.dataset.printReady = "1";
    });
    return () => {
      cancelled = true;
      delete document.body.dataset.printReady;
    };
  }, []);

  const isExpense = variant === "expense";
  const items = doc.items || [];
  const hasAnyTax =
    items.some((i) => Number(i.tax_rate) > 0) || Number(doc.taxValue) > 0;
  const hasAnyDiscount =
    items.some((i) => Number(i.discount) > 0) || Number(doc.discount) > 0;

  const itemDiscountTotal = items.reduce(
    (sum, item) => sum + Number(item.discount || 0),
    0,
  );

  // Group item-level tax by tax_id, same treatment as doc.taxes[]
  const itemTaxGroups = Object.values(
    items.reduce((groups, item) => {
      if (!item.tax_id || lineTax(item) <= 0) return groups;
      const key = item.tax_id;
      if (!groups[key]) {
        groups[key] = {
          tax_id: item.tax_id,
          tax_name: item.tax_name,
          tax_rate: item.tax_rate,
          tax_value: 0,
        };
      }
      groups[key].tax_value += lineTax(item);
      return groups;
    }, {}),
  );

  const itemTaxTotal = itemTaxGroups.reduce((sum, g) => sum + g.tax_value, 0);
  const hasDeductions = itemDiscountTotal > 0 || Number(doc.discount) > 0;

  const th =
    "px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B6F76] whitespace-nowrap";
  const td = "px-3 py-2.5 align-top";
  const num = "font-mono tabular-nums text-end whitespace-nowrap";

  return (
    <table
      className="w-[210mm] mx-auto border-collapse bg-white"
      dir={i18n.dir()}
    >
      {/* Repeats on every printed page = top margin on every page */}
      <thead>
        <tr>
          <td className="p-0" style={{ height: "12mm" }} />
        </tr>
      </thead>
      <tbody>
        <tr style={{ breakInside: "auto", pageBreakInside: "auto" }}>
          <td className="p-0">
            <div className="px-8 pb-6 text-xs text-[#33363D]">
              {/* Header */}
              <div className="rounded border border-[#E5E5E2] p-5 mb-4 break-inside-avoid">
                <div className="flex justify-between">
                  <div className="w-1/2">
                    {company?.logo && (
                      <img
                        src={company.logo}
                        alt="Logo"
                        className="max-h-20 w-auto object-contain mb-2"
                      />
                    )}
                    <h2 className="text-base font-semibold">
                      {company?.company_name}
                    </h2>
                    <p className="text-[#6B6F76]">{company?.address}</p>
                    <p className="text-[#6B6F76]">
                      {t("DOCS.PHONE")}: {company?.phone}
                    </p>
                    <p className="text-[#6B6F76]">
                      {t("DOCS.EMAIL")}: {company?.email}
                    </p>
                  </div>
                  <div className="w-2/5 text-start">
                    <h3 className="text-[11px] uppercase tracking-wide text-[#6B6F76] mb-1">
                      {numberLabel}
                      {badge && (
                        <span className="ms-2 bg-[#33363D] text-white text-[9px] px-1.5 py-0.5 rounded">
                          {badge}
                        </span>
                      )}
                    </h3>
                    <p className="font-mono tabular-nums text-lg font-semibold mb-2">
                      {number}
                    </p>
                    {meta.length > 0 && (
                      <div
                        className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-2"
                        style={{ borderTop: "1px dashed #C9C8C2" }}
                      >
                        {meta.map((row) => (
                          <div key={row.label} className="contents">
                            <p className="text-[10px] uppercase text-[#6B6F76] whitespace-nowrap">
                              {row.label} :
                            </p>
                            <p className="font-mono tabular-nums text-[13px]">
                              {row.value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-[1px] bg-[#9C7B45] mt-4" />
              </div>

              {/* Party Info */}
              <div className="rounded border border-[#E5E5E2] p-5 mb-4 break-inside-avoid">
                <div className="flex justify-between gap-6">
                  <div className="w-1/2">
                    <h4 className="text-[11px] uppercase text-[#6B6F76] mb-2">
                      {party?.label}
                    </h4>
                    <p className="text-[13px] font-medium">{party?.name}</p>
                    {party?.phone && (
                      <p className="text-[#6B6F76]">{party.phone}</p>
                    )}
                  </div>
                  <div className="w-[1px] bg-[#E5E5E2]" />
                  <div className="w-1/2">
                    <h4 className="text-[11px] uppercase text-[#6B6F76] mb-2">
                      {t("DOCS.ISSUED_BY")}
                    </h4>
                    <p className="text-[13px] font-medium">
                      {doc.created_by_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="rounded border border-[#E5E5E2] mb-4 overflow-hidden">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F5F2] border-b border-[#33363D]">
                      <th className={`${th} w-8 text-center`}>#</th>
                      {isExpense ? (
                        <>
                          <th className={`${th} text-start`}>
                            {t("DOCS.EXPENSE_CATEGORY")}
                          </th>
                          <th className={`${th} text-end`}>
                            {t("DOCS.AMOUNT")}
                          </th>
                        </>
                      ) : (
                        <>
                          <th className={`${th} text-start`}>
                            {t("DOCS.PRODUCT")}
                          </th>
                          <th className={`${th} text-end`}>
                            {t("DOCS.QUANTITY")}
                          </th>
                          <th className={`${th} text-end`}>
                            {t("DOCS.UNIT_PRICE")}
                          </th>
                        </>
                      )}
                      {hasAnyDiscount && (
                        <th className={`${th} text-end`}>
                          {t("DOCS.DISCOUNT")}
                        </th>
                      )}
                      {hasAnyTax && (
                        <th className={`${th} text-end`}>{t("DOCS.TAX")}</th>
                      )}
                      <th className={`${th} text-end`}>{t("DOCS.TOTAL")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const afterDiscount =
                        Number(item.total || 0) - Number(item.discount || 0);
                      const lineTotal = afterDiscount + lineTax(item);
                      const line = isExpense ? null : toEnteredLine(item, pick);

                      return (
                        <tr
                          key={item.id}
                          className="border-b border-[#E5E5E2] last:border-b-0 even:bg-[#FAFAF8]"
                        >
                          <td
                            className={`${td} text-center font-mono tabular-nums text-[11px] text-[#6B6F76]`}
                          >
                            {index + 1}
                          </td>

                          {isExpense ? (
                            <>
                              <td className={td}>
                                <span className="text-[12.5px] font-medium">
                                  {item.category_name || "—"}
                                </span>
                                {item.description && (
                                  <div className="text-[10px] text-[#6B6F76] whitespace-pre-wrap mt-0.5">
                                    {item.description}
                                  </div>
                                )}
                              </td>
                              <td className={`${td} ${num} text-[13px]`}>
                                {money(item.price)}
                              </td>
                            </>
                          ) : (
                            <>
                              <td className={td}>
                                <span className="text-[12.5px] font-medium">
                                  {line.productName}
                                </span>
                                {item.product_code && (
                                  <div className="text-[10px] text-[#6B6F76]">
                                    #{item.product_code}
                                  </div>
                                )}
                                {item.description && (
                                  <div className="text-[10px] text-[#6B6F76] whitespace-pre-wrap mt-0.5">
                                    {item.description}
                                  </div>
                                )}
                                {showUnitConversion &&
                                  item.unit_conversion_factor &&
                                  Number(item.unit_conversion_factor) !== 1 && (
                                    <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-[#6B6F76]">
                                      <Tag size={10} className="shrink-0" />
                                      {t(
                                        "screens.invoices.unitConversionDetail",
                                        {
                                          enteredQty: line.quantity,
                                          unitName: line.unitName,
                                          factor: item.unit_conversion_factor,
                                          baseQty: item.quantity,
                                        },
                                      )}
                                    </div>
                                  )}
                              </td>
                              <td className={`${td} ${num} text-[12.5px]`}>
                                {line.quantity}{" "}
                                <span className="text-[10px] text-[#6B6F76]">
                                  {line.unitName}
                                </span>
                              </td>
                              <td className={`${td} ${num} text-[13px]`}>
                                {money(line.price)}
                              </td>
                            </>
                          )}

                          {hasAnyDiscount && (
                            <td
                              className={`${td} ${num} text-[12px] text-[#9B3B3B]`}
                            >
                              {Number(item.discount || 0) > 0 ? (
                                <>
                                  {item.discount_rate ? (
                                    <span className="text-[10px]">
                                      [{item.discount_rate}%]{" "}
                                    </span>
                                  ) : null}
                                  {money(item.discount)}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                          )}
                          {hasAnyTax && (
                            <td className={`${td} ${num} text-[12px]`}>
                              {lineTax(item) > 0 ? (
                                <>
                                  <span className="text-[10px] text-[#6B6F76]">
                                    {item.tax_rate}%{" "}
                                  </span>
                                  {money(lineTax(item))}
                                </>
                              ) : (
                                "—"
                              )}
                            </td>
                          )}
                          <td
                            className={`${td} ${num} text-[13.5px] font-semibold`}
                          >
                            {money(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="border-t border-[#E5E5E2] bg-[#F5F5F2] px-3 py-2 text-[11px] text-[#6B6F76]">
                  {t("DOCS.ITEM_COUNT")}:{" "}
                  <span className="font-mono tabular-nums font-semibold text-[#33363D]">
                    {items.length}
                  </span>
                </div>
              </div>

              {/* Totals */}
              <div className="rounded border border-[#E5E5E2] p-6 flex justify-between gap-8 break-inside-avoid">
                <div className="w-1/2 pe-3">
                  {doc.description && (
                    <>
                      <span className="text-[#6B6F76]">
                        {t("DOCS.NOTES")} :
                      </span>
                      <p className="text-[#6B6F76] whitespace-pre-wrap">
                        {doc.description}
                      </p>
                    </>
                  )}
                </div>

                <div className="w-1/2 max-w-[320px] ms-auto">
                  {/* Subtotal */}
                  <div className="flex justify-between items-baseline pb-3 border-b-2 border-[#33363D]">
                    <span className="text-[11px] uppercase tracking-wide text-[#6B6F76]">
                      {t("DOCS.TOTAL")}
                    </span>
                    <span className="font-mono tabular-nums text-lg font-semibold">
                      {money(doc.subtotal)}
                    </span>
                  </div>

                  {/* Deductions */}
                  {hasDeductions && (
                    <div className="mt-2 rounded bg-[#FBF2F2] px-3 py-2 space-y-1.5">
                      {itemDiscountTotal > 0 && (
                        <div className="flex justify-between text-[12px] text-[#9B3B3B]">
                          <span>{t("DOCS.ITEM_DISCOUNT")}</span>
                          <span className="font-mono tabular-nums text-[13px]">
                            −{money(itemDiscountTotal)}
                          </span>
                        </div>
                      )}
                      {doc.discount > 0 && (
                        <div className="flex justify-between text-[12px] text-[#9B3B3B]">
                          <span>
                            {t("DOCS.DISCOUNT")}
                            {doc.discount_rate
                              ? ` [${doc.discount_rate}%]`
                              : ""}
                          </span>
                          <span className="font-mono tabular-nums text-[13px]">
                            −{money(doc.discount)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Taxes */}
                  {hasAnyTax && (
                    <div className="mt-2 rounded bg-[#FBF7EF] px-3 py-2 space-y-1.5">
                      {itemTaxGroups.map((g) => (
                        <div
                          key={`item-tax-${g.tax_id}`}
                          className="flex justify-between gap-2 text-[12px] text-[#8A6A32]"
                        >
                          <span className="flex-1 min-w-0 break-words">
                            {g.tax_name} {g.tax_rate}%
                          </span>
                          <span className="font-mono tabular-nums text-[13px] shrink-0 whitespace-nowrap">
                            +{money(g.tax_value)}
                          </span>
                        </div>
                      ))}
                      {(doc.taxes || []).map((tax) => (
                        <div
                          key={`doc-tax-${tax.id}`}
                          className="flex justify-between gap-2 text-[12px] text-[#8A6A32]"
                        >
                          <span className="flex-1 min-w-0 break-words">
                            {tax.tax_name} {tax.tax_rate}%
                          </span>
                          <span className="font-mono tabular-nums text-[13px] shrink-0 whitespace-nowrap">
                            +{money(tax.tax_value)}
                          </span>
                        </div>
                      ))}
                      <div className="flex justify-between text-[12px] font-medium text-[#8A6A32] pt-1.5 border-t border-[#EADFC5]">
                        <span>{t("DOCS.TOTAL_TAX")}</span>
                        <span className="font-mono tabular-nums text-[13px]">
                          +{money(itemTaxTotal + Number(doc.taxValue || 0))}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Grand total */}
                  <div className="mt-4 rounded-lg bg-[#33363D] px-4 py-4 flex justify-between items-baseline">
                    <span className="text-[11px] uppercase tracking-wide text-[#C9C8C2]">
                      {t("DOCS.TOTAL_WITH_TAX")}
                    </span>
                    <span className="font-mono tabular-nums text-[26px] font-bold text-white">
                      {money(doc.net_total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}
