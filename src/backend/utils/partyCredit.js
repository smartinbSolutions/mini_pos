import createPaymentAllocation from "./createPaymentAllocations";

// Whitelisted table map — invoice_type is passed as a bound SQL parameter,
// table name is not (never interpolate a table name from user input).
const OPEN_INVOICE_TABLES = {
  sales: { table: "sales_invoices", column: "customer_id" },
  purchase: { table: "purchase_invoices", column: "supplier_id" },
  expense: { table: "expense", column: "supplier_id" },
};

// Which payment-type bucket backs credit for each invoice type.
// Unallocated INCOME payments are credit toward future sales.
// Unallocated EXPENSE payments (money you already paid out) are credit
// toward future purchases/expenses. These are two separate buckets per
// contact — never netted against each other.
const DIRECTION_FOR_INVOICE = {
  sales: "income",
  purchase: "expense",
  expense: "expense",
};

function paymentScope(contactId) {
  return contactId
    ? { clause: "p.contact_id = ?", values: [Number(contactId)] }
    : { clause: "1 = 0", values: [] };
}

function unallocatedPayments(db, contactId, paymentType) {
  const scope = paymentScope(contactId);
  return db
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
        AND p.party_type != 'partner'
      GROUP BY p.id
      HAVING available > 0.001
      ORDER BY p.date ASC
    `,
    )
    .all(...scope.values, paymentType);
}

// Open documents of ONE invoice type for this contact — used when applying
// credit with no specific invoice target, so it closes the oldest open
// document of the matching type first.
function getOpenInvoicesForParty(db, { contactId, invoiceType }) {
  const cfg = OPEN_INVOICE_TABLES[invoiceType];
  if (!cfg) return [];

  const rows = db
    .prepare(
      `
      SELECT
        inv.id AS invoice_id,
        inv.date,
        inv.net_total - COALESCE(SUM(pa.amount), 0) AS remaining
      FROM ${cfg.table} inv
      LEFT JOIN payment_allocations pa
        ON pa.invoice_id = inv.id AND pa.invoice_type = ?
      WHERE inv.contact_id = ?
      GROUP BY inv.id
      HAVING remaining > 0
      ORDER BY inv.date ASC
      `,
    )
    .all(invoiceType, Number(contactId));

  return rows.map((r) => ({
    invoice_id: r.invoice_id,
    invoice_type: invoiceType,
    date: r.date,
    remaining: r.remaining,
  }));
}

// Credit available toward a given invoice type = unallocated amount of
// payments in that type's own direction bucket. A $500 expense payment
// allocated $420 leaves $80 available — usable toward this contact's next
// purchase/expense, independent of any income-side payments.
export function getPartyCredit(db, { contactId, invoiceType }) {
  const dir = DIRECTION_FOR_INVOICE[invoiceType];
  if (!dir || !contactId) return { totalAvailable: 0, payments: [] };

  const payments = unallocatedPayments(db, contactId, dir);
  const totalAvailable = payments.reduce((sum, p) => sum + p.available, 0);

  return { totalAvailable, payments };
}

export function applyPartyCredit(
  db,
  { contactId, invoiceId, invoiceType, amount },
) {
  const dir = DIRECTION_FOR_INVOICE[invoiceType];
  if (!dir || !contactId) throw new Error("INSUFFICIENT_CREDIT");

  const unallocated = unallocatedPayments(db, contactId, dir);
  const requested = Number(amount || 0);
  const totalAvailable = unallocated.reduce((sum, p) => sum + p.available, 0);

  if (requested > totalAvailable + 0.001) {
    throw new Error("INSUFFICIENT_CREDIT");
  }

  let remaining = requested;
  let totalApplied = 0;

  // No specific invoice given — close whatever open documents of THIS
  // invoice type the contact has, oldest first, using the matching
  // unallocated payments, oldest first.
  if (!invoiceId) {
    const openInvoices = getOpenInvoicesForParty(db, {
      contactId,
      invoiceType,
    });
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
