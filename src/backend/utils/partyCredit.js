import createPaymentAllocation from "./createPaymentAllocations";

export function getPartyCredit(db, { partyId, partyType }) {
  const payments = db
    .prepare(
      `
      SELECT
        p.id AS payment_id,
        p.amount,
        p.date,
        p.currency_code,
        p.fund_id,
        f.name AS fund_name,
        COALESCE(SUM(pa.amount), 0) AS allocated,
        p.amount - COALESCE(SUM(pa.amount), 0) AS available
      FROM payments p
      LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
      LEFT JOIN funds f ON f.id = p.fund_id
      WHERE p.party_id = ?
        AND p.party_type = ?
      GROUP BY p.id
      HAVING available > 0
      ORDER BY p.date ASC
    `
    )
    .all(partyId, partyType);

  const totalAvailable = payments.reduce((sum, p) => sum + p.available, 0);

  return {
    totalAvailable,
    payments,
  };
}

export function applyPartyCredit(
  db,
  { partyId, partyType, invoiceId, invoiceType, amount }
) {
  const unallocated = db
    .prepare(
      `
      SELECT
        p.id AS payment_id,
        p.amount - COALESCE(SUM(pa.amount), 0) AS available
      FROM payments p
      LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
      WHERE p.party_id = ?
        AND p.party_type = ?
      GROUP BY p.id
      HAVING available > 0
      ORDER BY p.date ASC
    `
    )
    .all(partyId, partyType);

  let remaining = Number(amount || 0);
  let totalApplied = 0;

  for (const payment of unallocated) {
    if (remaining <= 0) break;

    const take = Math.min(payment.available, remaining);

    createPaymentAllocation(db, {
      payment_id: payment.payment_id,
      invoice_id: invoiceId,
      invoice_type: invoiceType,
      amount: take,
    });

    remaining -= take;
    totalApplied += take;
  }

  return totalApplied;
}
