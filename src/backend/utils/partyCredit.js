import createPaymentAllocation from "./createPaymentAllocations";
import { findLegacyContact } from "./contacts";

// Whitelisted table map — invoice_type is passed as a bound SQL parameter,
// table name is not (never interpolate a table name from user input).
const OPEN_INVOICE_TABLES = {
  customer: [
    { invoice_type: "sales", table: "sales_invoices", column: "customer_id" },
  ],
  supplier: [
    {
      invoice_type: "purchase",
      table: "purchase_invoices",
      column: "supplier_id",
    },
    { invoice_type: "expense", table: "expense", column: "supplier_id" },
  ],
};

// Normal direction = how money usually flows on this side of the account.
// Reverse-direction payments (refunds / advances back) with no allocation
// cancel out the same amount of unallocated normal payments.
//   customer side (sales):     money IN is normal, money OUT is a refund
//   supplier side (purchases): money OUT is normal, money IN is a refund
const PAYMENT_DIRECTION = {
  customer: { normal: "income", reverse: "expense" },
  supplier: { normal: "expense", reverse: "income" },
};

// Which payments belong to this side of this account.
// Contact model: contact_id + side (payments.party_type = 'customer' is the
// sales side, 'supplier' the purchase side). Falls back to the old party id
// when the party has no contact yet.
function paymentScope(db, { partyId, partyType }) {
  const contactId = findLegacyContact(db, partyType, partyId);
  return contactId
    ? {
        clause: "p.contact_id = ? AND p.party_type = ?",
        values: [contactId, partyType],
        contactId,
      }
    : {
        clause: "p.party_id = ? AND p.party_type = ?",
        values: [Number(partyId), partyType],
        contactId: null,
      };
}

function getOpenInvoicesForParty(db, { partyId, partyType }) {
  const configs = OPEN_INVOICE_TABLES[partyType] || [];
  const contactId = findLegacyContact(db, partyType, partyId);
  const openInvoices = [];

  // Contact's documents on this side: by contact_id, or by the old id for
  // documents written before contact_id was filled.
  const ownerClause = (column) =>
    contactId
      ? `(inv.contact_id = ? OR inv.${column} = ?)`
      : `inv.${column} = ?`;
  const ownerValues = contactId
    ? [contactId, Number(partyId)]
    : [Number(partyId)];

  for (const { invoice_type, table, column } of configs) {
    const rows = db
      .prepare(
        `
        SELECT
          inv.id AS invoice_id,
          inv.date,
          inv.net_total - COALESCE(SUM(pa.amount), 0) AS remaining
        FROM ${table} inv
        LEFT JOIN payment_allocations pa
          ON pa.invoice_id = inv.id AND pa.invoice_type = ?
        WHERE ${ownerClause(column)}
        GROUP BY inv.id
        HAVING remaining > 0
        `,
      )
      .all(invoice_type, ...ownerValues);

    rows.forEach((r) =>
      openInvoices.push({
        invoice_id: r.invoice_id,
        invoice_type,
        date: r.date,
        remaining: r.remaining,
      }),
    );
  }

  openInvoices.sort((a, b) => new Date(a.date) - new Date(b.date));
  return openInvoices;
}

// Total unallocated amount of reverse-direction payments on this side.
// Targeted return refunds are fully allocated to their return, so they
// contribute 0 here.
function getReverseUnallocated(db, scope, dir) {
  const row = db
    .prepare(
      `
      SELECT COALESCE(SUM(available), 0) AS total
      FROM (
        SELECT p.amount - COALESCE(SUM(pa.amount), 0) AS available
        FROM payments p
        LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
        WHERE ${scope.clause}
          AND p.type = ?
        GROUP BY p.id
      )
      `,
    )
    .get(...scope.values, dir.reverse);

  return Number(row?.total || 0);
}

export function getPartyCredit(db, { partyId, partyType }) {
  const dir = PAYMENT_DIRECTION[partyType];
  if (!dir) return { totalAvailable: 0, payments: [] };

  const scope = paymentScope(db, { partyId, partyType });

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
      WHERE ${scope.clause}
        AND p.type = ?
      GROUP BY p.id
      HAVING available > 0
      ORDER BY p.date ASC
    `,
    )
    .all(...scope.values, dir.normal);

  const grossAvailable = payments.reduce((sum, p) => sum + p.available, 0);
  const reverseUnallocated = getReverseUnallocated(db, scope, dir);
  const totalAvailable = Math.max(0, grossAvailable - reverseUnallocated);

  return {
    totalAvailable,
    payments,
  };
}

export function applyPartyCredit(
  db,
  { partyId, partyType, invoiceId, invoiceType, amount },
) {
  const dir = PAYMENT_DIRECTION[partyType];
  if (!dir) throw new Error("INSUFFICIENT_CREDIT");

  const scope = paymentScope(db, { partyId, partyType });

  const unallocated = db
    .prepare(
      `
      SELECT
        p.id AS payment_id,
        p.amount - COALESCE(SUM(pa.amount), 0) AS available
      FROM payments p
      LEFT JOIN payment_allocations pa ON pa.payment_id = p.id
      WHERE ${scope.clause}
        AND p.type = ?
      GROUP BY p.id
      HAVING available > 0
      ORDER BY p.date ASC
    `,
    )
    .all(...scope.values, dir.normal);

  const requested = Number(amount || 0);

  // Net credit — refunds/advances already handed back part of it.
  const grossAvailable = unallocated.reduce((sum, p) => sum + p.available, 0);
  const netAvailable = grossAvailable - getReverseUnallocated(db, scope, dir);

  if (requested > netAvailable + 0.001) {
    throw new Error("INSUFFICIENT_CREDIT");
  }

  let remaining = requested;
  let totalApplied = 0;

  // No specific invoice given — instead of a specific target, close
  // whatever open invoices this side has, oldest first, using the
  // same unallocated payments, oldest first.
  if (!invoiceId) {
    const openInvoices = getOpenInvoicesForParty(db, { partyId, partyType });
    let paymentIdx = 0;

    for (const invoice of openInvoices) {
      if (remaining <= 0) break;
      let invoiceRemaining = invoice.remaining;

      while (
        invoiceRemaining > 0 &&
        remaining > 0 &&
        paymentIdx < unallocated.length
      ) {
        const payment = unallocated[paymentIdx];

        if (payment.available <= 0) {
          paymentIdx++;
          continue;
        }

        const take = Math.min(payment.available, invoiceRemaining, remaining);

        createPaymentAllocation(db, {
          payment_id: payment.payment_id,
          invoice_id: invoice.invoice_id,
          invoice_type: invoice.invoice_type,
          amount: take,
        });

        payment.available -= take;
        invoiceRemaining -= take;
        remaining -= take;
        totalApplied += take;

        if (payment.available <= 0) paymentIdx++;
      }
    }

    if (totalApplied < requested) {
      throw new Error("INSUFFICIENT_CREDIT");
    }

    return totalApplied;
  }

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

  if (totalApplied < requested) {
    throw new Error("INSUFFICIENT_CREDIT");
  }

  return totalApplied;
}
