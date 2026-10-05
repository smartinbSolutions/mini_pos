const { ipcMain } = require("electron");
import db from "../db";
import { upsertOpeningBalance } from "../utils/openingBalance";
import {
  getOpenDocuments,
  proposeAllocation,
  resolveContactId,
} from "../utils/paymentAllocation";
import {
  previewSettlement,
  createSettlement,
  deleteSettlement,
} from "../utils/settlement";

// One contact = one person/company. Roles decide which legacy row exists
// behind it (dual write until cutover): customer → customers row,
// supplier → suppliers row. Balance is one account, in debit/credit:
// > 0 → Dr (he owes you), < 0 → Cr (you owe him).
const ROLES = {
  customer: {
    table: "customers",
    legacy: "legacy_customer_id",
    flag: "is_customer",
  },
  supplier: {
    table: "suppliers",
    legacy: "legacy_supplier_id",
    flag: "is_supplier",
  },
};

const clean = (value) => String(value ?? "").trim();

function readInput(data) {
  return {
    name: clean(data.name),
    phone: clean(data.phone),
    address: clean(data.address),
    is_customer: data.is_customer ? 1 : 0,
    is_supplier: data.is_supplier ? 1 : 0,
  };
}

function createLegacyRow(db, role, { name, phone, address }) {
  return db
    .prepare(
      `INSERT INTO ${ROLES[role].table} (name, phone, address) VALUES (?, ?, ?)`,
    )
    .run(name, phone, address).lastInsertRowid;
}

// Anything on this side of the account (invoices, returns, payments,
// opening balance) — or a quotation for the customer side.
function roleInUse(db, contactId, role) {
  const history = db
    .prepare(
      `SELECT 1 FROM party_history WHERE contact_id = ? AND party_type = ? LIMIT 1`,
    )
    .get(contactId, role);
  if (history) return true;

  if (role === "customer") {
    return Boolean(
      db
        .prepare(`SELECT 1 FROM sales_quotations WHERE contact_id = ? LIMIT 1`)
        .get(contactId),
    );
  }
  return false;
}

// Opening balance in company terms ('debit' = they owe you, 'credit' = you
// owe them) → the legacy owner + direction upsertOpeningBalance expects.
function openingOwner(contact, side) {
  const isDebit = side !== "credit";
  if (isDebit) {
    return contact.legacy_customer_id
      ? {
          owner_type: "customer",
          owner_id: contact.legacy_customer_id,
          balance_type: "increase",
        }
      : {
          owner_type: "supplier",
          owner_id: contact.legacy_supplier_id,
          balance_type: "decrease",
        };
  }
  return contact.legacy_supplier_id
    ? {
        owner_type: "supplier",
        owner_id: contact.legacy_supplier_id,
        balance_type: "increase",
      }
    : {
        owner_type: "customer",
        owner_id: contact.legacy_customer_id,
        balance_type: "decrease",
      };
}

const BALANCE_COLUMNS = `
 ROUND(COALESCE(SUM(CASE WHEN ph.side = 'debit' THEN ph.amount ELSE 0 END), 0), 2) AS total_debit,
  ROUND(COALESCE(SUM(CASE WHEN ph.side = 'credit' THEN ph.amount ELSE 0 END), 0), 2) AS total_credit,
  ROUND(COALESCE(SUM(CASE WHEN ph.side = 'debit' THEN ph.amount ELSE -ph.amount END), 0), 2) AS balance
`;

export default function registerContactsIPC() {
  // LIST
  ipcMain.handle("get-contacts", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    // Fixed enums only — never interpolate raw input.
    const role = ["customer", "supplier"].includes(params.role)
      ? params.role
      : "all";
    const balanceFilter = ["receivable", "payable", "settled"].includes(
      params.balance_filter,
    )
      ? params.balance_filter
      : "all";

    const conditions = [];
    const values = [];

    if (role !== "all") conditions.push(`ct.${ROLES[role].flag} = 1`);

    const search = clean(params.search);
    if (search) {
      conditions.push("(ct.name LIKE ? OR ct.phone LIKE ?)");
      values.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const HAVING = {
      all: "",
      receivable: "HAVING balance > 0.005",
      payable: "HAVING balance < -0.005",
      settled: "HAVING ABS(balance) <= 0.005",
    };

    const perContact = (having) => `
      SELECT
        ct.id,
        ct.name,
        ct.phone,
        ct.address,
        ct.is_customer,
        ct.is_supplier,
        ct.legacy_customer_id,
        ct.legacy_supplier_id,
        ct.createdAt,
        ${BALANCE_COLUMNS}
      FROM contacts ct
      LEFT JOIN party_history ph ON ph.contact_id = ct.id
      ${whereClause}
      GROUP BY ct.id
      ${having}
    `;

    try {
      const rows = db
        .prepare(
          `SELECT * FROM (${perContact(HAVING[balanceFilter])})
           ORDER BY createdAt DESC, id DESC
           LIMIT ? OFFSET ?`,
        )
        .all(...values, limit, offset);

      const { total } = db
        .prepare(
          `SELECT COUNT(*) AS total FROM (${perContact(HAVING[balanceFilter])})`,
        )
        .get(...values);

      // Cross-page totals for the current filter.
      const stats = db
        .prepare(
          `
          SELECT
            COUNT(*) AS count,
            COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) AS receivable,
            COALESCE(SUM(CASE WHEN balance < 0 THEN -balance ELSE 0 END), 0) AS payable
          FROM (${perContact(HAVING[balanceFilter])})
          `,
        )
        .get(...values);

      // Bucket counts — independent of the balance filter, search applies.
      const counts = db
        .prepare(
          `
          SELECT
            COUNT(*) AS all_count,
            SUM(CASE WHEN balance > 0.005 THEN 1 ELSE 0 END) AS receivable_count,
            SUM(CASE WHEN balance < -0.005 THEN 1 ELSE 0 END) AS payable_count,
            SUM(CASE WHEN ABS(balance) <= 0.005 THEN 1 ELSE 0 END) AS settled_count
          FROM (${perContact("")})
          `,
        )
        .get(...values);

      return {
        success: true,
        data: rows,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        stats,
        counts: {
          all: counts.all_count || 0,
          receivable: counts.receivable_count || 0,
          payable: counts.payable_count || 0,
          settled: counts.settled_count || 0,
        },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // GET ONE
  ipcMain.handle("get-contact", (event, id) => {
    try {
      const contact = db
        .prepare(
          `
          SELECT ct.*, ${BALANCE_COLUMNS}
          FROM contacts ct
          LEFT JOIN party_history ph ON ph.contact_id = ct.id
          WHERE ct.id = ?
          GROUP BY ct.id
          `,
        )
        .get(id);

      if (!contact) return { success: false, error: "CONTACT_NOT_FOUND" };
      return { success: true, data: contact };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // CREATE
  ipcMain.handle("create-contact", (event, data = {}) => {
    const input = readInput(data);

    if (!input.name)
      return { success: false, error: "MISSING_REQUIRED_FIELDS" };
    if (!input.is_customer && !input.is_supplier) {
      return { success: false, error: "CONTACT_ROLE_REQUIRED" };
    }

    const createTx = db.transaction(() => {
      const legacyCustomerId = input.is_customer
        ? createLegacyRow(db, "customer", input)
        : null;
      const legacySupplierId = input.is_supplier
        ? createLegacyRow(db, "supplier", input)
        : null;

      const contactId = db
        .prepare(
          `
          INSERT INTO contacts
            (name, phone, address, is_customer, is_supplier,
             legacy_customer_id, legacy_supplier_id)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
        )
        .run(
          input.name,
          input.phone || null,
          input.address || null,
          input.is_customer,
          input.is_supplier,
          legacyCustomerId,
          legacySupplierId,
        ).lastInsertRowid;

      // Opening balance: 'debit' = they owe you, 'credit' = you owe them.
      const openingAmount = Math.abs(Number(data.opening_balance || 0));
      if (openingAmount > 0) {
        upsertOpeningBalance(db, {
          ...openingOwner(
            {
              legacy_customer_id: legacyCustomerId,
              legacy_supplier_id: legacySupplierId,
            },
            data.opening_side,
          ),
          amount: openingAmount,
          date: data.date,
        });
      }

      return {
        id: contactId,
        legacy_customer_id: legacyCustomerId,
        legacy_supplier_id: legacySupplierId,
      };
    });

    try {
      return { success: true, ...createTx() };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // UPDATE — details + roles. Opening balance stays on its own endpoint.
  ipcMain.handle("update-contact", (event, data = {}) => {
    const input = readInput(data);

    if (!data.id || !input.name) {
      return { success: false, error: "MISSING_REQUIRED_FIELDS" };
    }
    if (!input.is_customer && !input.is_supplier) {
      return { success: false, error: "CONTACT_ROLE_REQUIRED" };
    }

    const updateTx = db.transaction(() => {
      const contact = db
        .prepare(`SELECT * FROM contacts WHERE id = ?`)
        .get(data.id);
      if (!contact) throw new Error("CONTACT_NOT_FOUND");

      for (const role of Object.keys(ROLES)) {
        const { table, legacy, flag } = ROLES[role];
        const wanted = input[flag] === 1;
        const legacyId = contact[legacy];

        if (wanted && !legacyId) {
          // Role added → create its legacy row.
          const newId = createLegacyRow(db, role, input);
          db.prepare(`UPDATE contacts SET ${legacy} = ? WHERE id = ?`).run(
            newId,
            contact.id,
          );
        } else if (wanted && legacyId) {
          // Role kept → keep the legacy row's details in step.
          db.prepare(
            `UPDATE ${table} SET name = ?, phone = ?, address = ? WHERE id = ?`,
          ).run(input.name, input.phone, input.address, legacyId);
        } else if (!wanted && legacyId) {
          // Role removed → only when that side has nothing on it.
          if (roleInUse(db, contact.id, role)) {
            throw new Error("CONTACT_ROLE_IN_USE");
          }
          db.prepare(`UPDATE contacts SET ${legacy} = NULL WHERE id = ?`).run(
            contact.id,
          );
          db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(legacyId);
        }
      }

      db.prepare(
        `
        UPDATE contacts
        SET name = ?, phone = ?, address = ?, is_customer = ?, is_supplier = ?
        WHERE id = ?
        `,
      ).run(
        input.name,
        input.phone || null,
        input.address || null,
        input.is_customer,
        input.is_supplier,
        contact.id,
      );
    });

    try {
      updateTx();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // DELETE — only a contact with no transactions.
  ipcMain.handle("delete-contact", (event, id) => {
    const deleteTx = db.transaction(() => {
      const contact = db.prepare(`SELECT * FROM contacts WHERE id = ?`).get(id);
      if (!contact) throw new Error("CONTACT_NOT_FOUND");

      const hasTransactions = db
        .prepare(
          `
          SELECT 1 FROM party_history
          WHERE contact_id = ? AND record_type <> 'opening_balance'
          LIMIT 1
          `,
        )
        .get(id);
      const hasQuotation = db
        .prepare(`SELECT 1 FROM sales_quotations WHERE contact_id = ? LIMIT 1`)
        .get(id);

      if (hasTransactions || hasQuotation) {
        throw new Error("CONTACT_HAS_TRANSACTIONS");
      }

      db.prepare(
        `DELETE FROM party_history WHERE contact_id = ? AND record_type = 'opening_balance'`,
      ).run(id);
      db.prepare(`DELETE FROM contacts WHERE id = ?`).run(id);

      if (contact.legacy_customer_id) {
        db.prepare(`DELETE FROM customers WHERE id = ?`).run(
          contact.legacy_customer_id,
        );
      }
      if (contact.legacy_supplier_id) {
        db.prepare(`DELETE FROM suppliers WHERE id = ?`).run(
          contact.legacy_supplier_id,
        );
      }
    });

    try {
      deleteTx();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // PREVIEW — what a payment would close, before the user confirms.
  // Read-only: nothing is written.
  ipcMain.handle("preview-payment-allocation", (event, params = {}) => {
    try {
      const direction = params.direction === "out" ? "out" : "in";
      const amount = Number(params.amount || 0);

      const contactId = resolveContactId(db, params);
      if (!contactId) return { success: false, error: "CONTACT_NOT_FOUND" };

      const documents = getOpenDocuments(db, { contactId, direction });
      const proposal = proposeAllocation(documents, amount > 0 ? amount : 0);

      return {
        success: true,
        contactId,
        direction,
        amount,
        ...proposal,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // GET ONE SETTLEMENT — contact, both sides, and what each side closed.
  // Reads straight from settlements + payment_allocations; no payments
  // table involved, since settlements never create payment rows.
  ipcMain.handle("get-settlement", (event, id) => {
    try {
      const settlement = db
        .prepare(
          `
          SELECT
            s.*,
            ct.name AS contact_name,
            u.full_name AS created_by_name
          FROM settlements s
          LEFT JOIN contacts ct ON ct.id = s.contact_id
          LEFT JOIN users u ON u.id = s.created_by
          WHERE s.id = ?
          `,
        )
        .get(id);

      if (!settlement) return { success: false, error: "SETTLEMENT_NOT_FOUND" };

      // Both sides' allocations, each resolved to its invoice's name.
      // receivable = sales / purchase_return (he owed you, now reduced)
      // payable    = purchase / expense / sales_return (you owed him, now reduced)
      const allocations = db
        .prepare(
          `
          SELECT
            pa.invoice_id,
            pa.invoice_type,
            pa.amount,
            COALESCE(si.invoice_name, pi.invoice_name, ex.invoice_name, pr.invoice_name, sr.invoice_name) AS invoice_name
          FROM payment_allocations pa
          LEFT JOIN sales_invoices si
            ON pa.invoice_type = 'sales' AND si.id = pa.invoice_id
          LEFT JOIN purchase_invoices pi
            ON pa.invoice_type = 'purchase' AND pi.id = pa.invoice_id
          LEFT JOIN expense ex
            ON pa.invoice_type = 'expense' AND ex.id = pa.invoice_id
          LEFT JOIN purchase_returns pr
            ON pa.invoice_type = 'purchase_return' AND pr.id = pa.invoice_id
          LEFT JOIN sales_returns sr
            ON pa.invoice_type = 'sales_return' AND sr.id = pa.invoice_id
          WHERE pa.settlement_id = ?
          ORDER BY pa.id ASC
          `,
        )
        .all(id);

      const RECEIVABLE_TYPES = ["sales", "purchase_return"];
      const receivable = allocations.filter((a) =>
        RECEIVABLE_TYPES.includes(a.invoice_type),
      );
      const payable = allocations.filter(
        (a) => !RECEIVABLE_TYPES.includes(a.invoice_type),
      );

      return {
        success: true,
        data: { ...settlement, receivable, payable },
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // LIST SETTLEMENTS — paginated, newest first. Optional contact filter.
  ipcMain.handle("get-settlements", (event, params = {}) => {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const limit = Math.max(1, Number(params.limit) || 20);
      const offset = (page - 1) * limit;

      const whereConditions = [];
      const whereValues = [];

      if (params.contactId) {
        whereConditions.push("s.contact_id = ?");
        whereValues.push(params.contactId);
      }
      if (params.search) {
        whereConditions.push("ct.name LIKE ?");
        whereValues.push(`%${params.search}%`);
      }

      const whereClause = whereConditions.length
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

      const rows = db
        .prepare(
          `
          SELECT
            s.*,
            ct.name AS contact_name
          FROM settlements s
          LEFT JOIN contacts ct ON ct.id = s.contact_id
          ${whereClause}
          ORDER BY s.id DESC
          LIMIT ? OFFSET ?
          `,
        )
        .all(...whereValues, limit, offset);

      const { total } = db
        .prepare(
          `
          SELECT COUNT(*) AS total
          FROM settlements s
          LEFT JOIN contacts ct ON ct.id = s.contact_id
          ${whereClause}
          `,
        )
        .get(...whereValues);

      return {
        success: true,
        data: rows,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // PREVIEW SETTLEMENT — both sides of the account, before confirming.
  // Read-only: nothing is written.
  ipcMain.handle("preview-settlement", (event, params = {}) => {
    try {
      const contactId = resolveContactId(db, params);
      if (!contactId) return { success: false, error: "CONTACT_NOT_FOUND" };

      return {
        success: true,
        contactId,
        ...previewSettlement(db, { contactId, amount: params.amount }),
      };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
  // SAVE SETTLEMENT — confirmed lines on both sides; all-or-nothing.
  ipcMain.handle("create-settlement", (event, data = {}) => {
    try {
      const contactId = resolveContactId(db, data);
      if (!contactId) return { success: false, error: "CONTACT_NOT_FOUND" };

      const settlementId = db.transaction(() =>
        createSettlement(db, {
          contactId,
          amount: data.amount,
          receivable: data.receivable,
          payable: data.payable,
          date: data.date,
          note: data.note,
          created_by: data.created_by,
        }),
      )();

      return { success: true, id: settlementId };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // DELETE SETTLEMENT — removes both halves together.
  ipcMain.handle("delete-settlement", (event, { id, deletedBy } = {}) => {
    try {
      db.transaction(() => deleteSettlement(db, { settlementId: id }))();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });
}
