// Statement of account builder — the single source for Excel/PDF exports.
//
// Reads by CONTACT: a customer or supplier id resolves to its contact, and
// the statement covers every row of that contact (sales side + purchase side).
// Partners stay on party_type/party_id.
//
// Debit / credit come straight from party_history.side (company's books).
// Balance = Σ debit − Σ credit.  > 0 → Dr (party owes you)
//                                < 0 → Cr (you owe the party)

import { findLegacyContact } from "./contacts";

const SUPPORTED_TYPES = ["customer", "supplier", "partner"];
const ACCOUNT_ORDER = { customer: 0, supplier: 1, partner: 2 };

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const partyKey = (partyType, partyId) => `${partyType}:${Number(partyId)}`;

export function balanceSide(value) {
  if (value > 0.005) return "dr";
  if (value < -0.005) return "cr";
  return "zero";
}

// How a payment row is named.
// Customer & supplier: named by cash direction — "received" / "made".
// Partner: capital movements — "deposit" / "withdrawal".
//
// Cash IN:  customer decrease, supplier increase, partner increase
// Cash OUT: customer increase, supplier decrease, partner decrease
export function getPaymentKind(row) {
  if (row?.record_type !== "payment") return null;
  // Non-cash half of a settlement — named as such, not as cash in/out.
  if (row.settlement_id) return "settlement";

  const isIncrease = row.movement_type === "increase";

  if (row.party_type === "partner") {
    return isIncrease ? "deposit" : "withdrawal";
  }

  const cashIn = row.party_type === "customer" ? !isIncrease : isIncrease;
  return cashIn ? "received" : "made";
}

export default function buildPartyStatement(
  db,
  { parties, startDate, endDate },
) {
  const list = (parties || []).filter(
    (p) => p?.partyId && SUPPORTED_TYPES.includes(p.partyType),
  );

  // Customer / supplier → contact id; partner stays as-is.
  const contactIds = new Set();
  const partnerIds = [];
  for (const p of list) {
    if (p.partyType === "partner") {
      partnerIds.push(Number(p.partyId));
    } else {
      const contactId = findLegacyContact(db, p.partyType, p.partyId);
      if (contactId) contactIds.add(contactId);
    }
  }

  if (contactIds.size === 0 && partnerIds.length === 0) {
    throw new Error("MISSING_REQUIRED_FIELDS");
  }

  const clauses = [];
  const partyValues = [];
  if (contactIds.size > 0) {
    clauses.push(
      `p.contact_id IN (${[...contactIds].map(() => "?").join(", ")})`,
    );
    partyValues.push(...contactIds);
  }
  for (const id of partnerIds) {
    clauses.push("(p.party_type = 'partner' AND p.party_id = ?)");
    partyValues.push(id);
  }
  const partyClause = clauses.join(" OR ");

  // Per-account accumulators (customer side / supplier side / partner),
  // created from whatever rows the contact actually has.
  const accounts = new Map();
  const accountFor = (partyType, partyId) => {
    const key = partyKey(partyType, partyId);
    if (!accounts.has(key)) {
      accounts.set(key, {
        partyType,
        partyId: Number(partyId),
        broughtForward: 0,
        debit: 0,
        credit: 0,
      });
    }
    return accounts.get(key);
  };

  const signedAmount = `CASE WHEN p.side = 'debit' THEN p.amount ELSE -p.amount END`;

  // ---- Balance brought forward: everything before the start date ----
  let broughtForward = 0;
  if (startDate) {
    const bfRows = db
      .prepare(
        `
        SELECT
          p.party_type,
          p.party_id,
          COALESCE(SUM(${signedAmount}), 0) AS total
        FROM party_history p
        WHERE (${partyClause})
          AND date(p.date) < date(?)
        GROUP BY p.party_type, p.party_id
        `,
      )
      .all(...partyValues, startDate);

    for (const r of bfRows) {
      accountFor(r.party_type, r.party_id).broughtForward = round2(r.total);
      broughtForward += Number(r.total || 0);
    }
    broughtForward = round2(broughtForward);
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
        p.contact_id,
        p.record_type,
        p.invoice_type,
        p.invoice_id,
        p.payment_id,
        p.movement_type,
        p.side,
        p.amount,
        p.date,
        p.note,

        COALESCE(si.invoice_name, pi.invoice_name, ex.invoice_name) AS invoice_name,

        pay.fund_id AS payment_fund_id,
        pay.settlement_id,
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

  // ---- Debit / credit from side + running balance ----
  let balance = broughtForward;
  let totalDebit = 0;
  let totalCredit = 0;

  const rows = movements.map((m) => {
    const amount = round2(m.amount);
    const isDebit = m.side === "debit";

    const debit = isDebit ? amount : 0;
    const credit = isDebit ? 0 : amount;

    totalDebit += debit;
    totalCredit += credit;
    balance = round2(balance + debit - credit);

    const account = accountFor(m.party_type, m.party_id);
    account.debit += debit;
    account.credit += credit;

    return {
      ...m,
      amount,
      debit,
      credit,
      balance,
      balance_side: balanceSide(balance),
      payment_kind: getPaymentKind(m),
    };
  });

  totalDebit = round2(totalDebit);
  totalCredit = round2(totalCredit);
  const closing = round2(broughtForward + totalDebit - totalCredit);

  // Per-account closing — customer side first, then supplier, then partner.
  const accountSummaries = [...accounts.values()]
    .sort((a, b) => ACCOUNT_ORDER[a.partyType] - ACCOUNT_ORDER[b.partyType])
    .map((a) => {
      const debit = round2(a.debit);
      const credit = round2(a.credit);
      const accountClosing = round2(a.broughtForward + debit - credit);
      return {
        partyType: a.partyType,
        partyId: a.partyId,
        broughtForward: a.broughtForward,
        broughtForwardSide: balanceSide(a.broughtForward),
        debit,
        credit,
        closing: accountClosing,
        closingSide: balanceSide(accountClosing),
      };
    });

  return {
    period: { startDate: startDate || null, endDate: endDate || null },
    broughtForward,
    broughtForwardSide: balanceSide(broughtForward),
    rows,
    totals: { debit: totalDebit, credit: totalCredit },
    closing,
    closingSide: balanceSide(closing),
    parties: accountSummaries,
  };
}
