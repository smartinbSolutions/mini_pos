// Statement of account builder — the single source for Excel/PDF exports
// and, later, the combined customer + supplier statement.
//
// Everything is from the company's books perspective:
//   customer: increase → Debit (they owe more),  decrease → Credit
//   supplier: increase → Credit (you owe more),  decrease → Debit
//   partner:  increase → Credit (deposit),       decrease → Debit
// Balance = Σ debit − Σ credit.  > 0 → Dr (party owes you)
//                                < 0 → Cr (you owe the party)

const DEBIT_ON_INCREASE = {
  customer: true,
  supplier: false,
  partner: false,
};

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function balanceSide(value) {
  if (value > 0.005) return "dr";
  if (value < -0.005) return "cr";
  return "zero";
}

export default function buildPartyStatement(
  db,
  { parties, startDate, endDate },
) {
  const list = (parties || []).filter(
    (p) => p?.partyId && p.partyType in DEBIT_ON_INCREASE,
  );
  if (list.length === 0) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }

  // One or more parties — the combined report just passes two.
  const partyClause = list
    .map(() => "(p.party_type = ? AND p.party_id = ?)")
    .join(" OR ");
  const partyValues = list.flatMap((p) => [p.partyType, Number(p.partyId)]);

  // Signed amount (debit +, credit −) in SQL — used for brought forward.
  const signedAmount = `
    CASE
      WHEN p.party_type = 'customer' AND p.movement_type = 'increase' THEN p.amount
      WHEN p.party_type = 'customer' AND p.movement_type = 'decrease' THEN -p.amount
      WHEN p.movement_type = 'increase' THEN -p.amount
      ELSE p.amount
    END
  `;

  // ---- Balance brought forward: everything before the start date ----
  let broughtForward = 0;
  if (startDate) {
    const row = db
      .prepare(
        `
        SELECT COALESCE(SUM(${signedAmount}), 0) AS total
        FROM party_history p
        WHERE (${partyClause})
          AND date(p.date) < date(?)
        `,
      )
      .get(...partyValues, startDate);
    broughtForward = round2(row?.total || 0);
  }

  // ---- Movements inside the period, oldest first ----
  const rangeConditions = [];
  const rangeValues = [];
  if (startDate) {
    rangeConditions.push("date(p.date) >= date(?)");
    rangeValues.push(startDate);
  }
  if (endDate) {
    rangeConditions.push("date(p.date) <= date(?)");
    rangeValues.push(endDate);
  }
  const rangeFilter = rangeConditions.length
    ? `AND ${rangeConditions.join(" AND ")}`
    : "";

  const movements = db
    .prepare(
      `
      SELECT
        p.id,
        p.party_type,
        p.party_id,
        p.record_type,
        p.invoice_type,
        p.invoice_id,
        p.payment_id,
        p.movement_type,
        p.amount,
        p.date,
        p.note,

        COALESCE(si.invoice_name, pi.invoice_name, ex.invoice_name) AS invoice_name,

        pay.fund_id AS payment_fund_id,
        pay.currency_code,
        pay.exchange_rate,
        pay.effective_rate,
        pay.amount_fund_currency,
        f.name AS fund_name,
        c.code AS fund_currency_code,
        c.symbol AS fund_currency_symbol

      FROM party_history p

      LEFT JOIN sales_invoices si
        ON p.record_type IN ('invoice','return')
        AND p.invoice_type IN ('sales','sales_return')
        AND si.id = p.invoice_id

      LEFT JOIN purchase_invoices pi
        ON p.record_type IN ('invoice','return')
        AND p.invoice_type IN ('purchase','purchase_return')
        AND pi.id = p.invoice_id

      LEFT JOIN expense ex
        ON p.record_type = 'invoice'
        AND p.invoice_type = 'expense'
        AND ex.id = p.invoice_id

      LEFT JOIN payments pay
        ON p.record_type = 'payment'
        AND pay.id = p.payment_id

      LEFT JOIN funds f
        ON f.id = pay.fund_id

      LEFT JOIN currencies c
        ON c.id = f.currency_id

      WHERE (${partyClause})
        ${rangeFilter}

      ORDER BY
        datetime(p.date),
        CASE WHEN p.record_type = 'opening_balance' THEN 0 ELSE 1 END,
        p.id
      `,
    )
    .all(...partyValues, ...rangeValues);

  // ---- Debit / credit split + running balance ----
  let balance = broughtForward;
  let totalDebit = 0;
  let totalCredit = 0;

  const rows = movements.map((m) => {
    const amount = round2(m.amount);
    const isIncrease = m.movement_type === "increase";
    const isDebit = isIncrease === DEBIT_ON_INCREASE[m.party_type];

    const debit = isDebit ? amount : 0;
    const credit = isDebit ? 0 : amount;

    totalDebit += debit;
    totalCredit += credit;
    balance = round2(balance + debit - credit);

    return {
      ...m,
      amount,
      debit,
      credit,
      balance,
      balance_side: balanceSide(balance),
    };
  });

  totalDebit = round2(totalDebit);
  totalCredit = round2(totalCredit);
  const closing = round2(broughtForward + totalDebit - totalCredit);

  return {
    period: { startDate: startDate || null, endDate: endDate || null },
    broughtForward,
    broughtForwardSide: balanceSide(broughtForward),
    rows,
    totals: { debit: totalDebit, credit: totalCredit },
    closing,
    closingSide: balanceSide(closing),
  };
}
