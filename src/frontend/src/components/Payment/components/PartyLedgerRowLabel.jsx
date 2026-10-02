/**
 * Builds the human-readable sentence for a single party_history row
 * (payment / invoice / return / opening_balance), scoped to which
 * party type's ledger is currently being viewed (customer/supplier/partner).
 *
 * Plain function, not a component — it's called once per row inside a
 * .map(), so it must not use hooks (useTranslation, etc.) itself.
 * The caller passes in `t` from its own useTranslation() call instead.
 */
export default function partyLedgerRowLabel({
  row,
  partyName,
  partyType,
  t,
  formattedAmount,
}) {
  const fund = row.fund_name || t("ui.fund", "Fund");

  if (row.record_type === "opening_balance") {
    const isPositive = row.movement_type === "increase";

    return isPositive
      ? t("screens.ledger.openingBalancePositiveFor", {
          party: partyName,
          amount: formattedAmount,
          defaultValue: `${partyName} started with a balance of ${formattedAmount}`,
        })
      : t("screens.ledger.openingBalanceNegativeFor", {
          party: partyName,
          amount: formattedAmount,
          defaultValue: `${partyName} started owing ${formattedAmount}`,
        });
  }

  if (row.record_type === "payment") {
    const key = {
      received: "paymentReceived",
      made: "paymentMade",
      deposit: "partnerDeposit",
      withdrawal: "partnerWithdrawal",
      settlement: "paymentSettlement",
    }[row.payment_kind];

    const defaults = {
      paymentReceived: `Payment received into ${fund}`,
      paymentMade: `Payment made from ${fund}`,
      partnerDeposit: `Deposit into ${fund}`,
      partnerWithdrawal: `Withdrawal from ${fund}`,
      paymentSettlement: "Settlement (no cash)",
    };

    return key
      ? t(`screens.ledger.${key}`, { fund, defaultValue: defaults[key] })
      : t("ui.payment");
  }

  if (row.record_type === "invoice" || row.record_type === "return") {
    const typeLabel = t(
      `screens.invoices.invoiceType.${row.invoice_type}`,
      row.invoice_type,
    );

    return row.record_type === "return"
      ? t("screens.ledger.returnCreatedFor", {
          type: typeLabel,
          party: partyName,
          defaultValue: `${typeLabel} return created for ${partyName}`,
        })
      : t("screens.ledger.invoiceCreatedFor", {
          type: typeLabel,
          party: partyName,
          defaultValue: `${typeLabel} created for ${partyName}`,
        });
  }

  return t("ui.transaction", "Transaction");
}
