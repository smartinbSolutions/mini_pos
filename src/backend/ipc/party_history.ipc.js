const { ipcMain, dialog, BrowserWindow } = require("electron");
import ExcelJS from "exceljs";
import fs from "fs";
import db from "../db";
import { getPartyCredit, applyPartyCredit } from "../utils/partyCredit";
import buildPartyStatement, {
  getPaymentKind,
} from "../utils/buildPartyStatement";
import { findLegacyContact } from "../utils/contacts";

const EXPORT_LABELS = {
  en: {
    title: "Statement of Account",
    party: "Account",
    period: "Period",
    generatedOn: "Printed on",
    summary: "Summary",
    date: "Date",
    type: "Type",
    document: "Document",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
    balance: "Balance",
    broughtForward: "Balance brought forward",
    totals: "Totals",
    closingBalance: "Closing balance",
    dr: "Dr",
    cr: "Cr",
    allTime: "Beginning",
    present: "Today",
    fundAmount: "Fund amount",
    currency: "Currency",
    combinedTitle: "Combined Statement of Account",
    account: "Account",
    netBalance: "Net balance",
    accountTypes: {
      customer: "Customer",
      supplier: "Supplier",
      partner: "Partner",
    },
    docTypes: {
      sales: "Sales invoice",
      purchase: "Purchase invoice",
      expense: "Expense",
      sales_return: "Sales return",
      purchase_return: "Purchase return",
      payment: "Payment",
      received: "Payment received",
      made: "Payment made",
      deposit: "Deposit",
      withdrawal: "Withdrawal",
      settlement: "Settlement",
      opening_balance: "Opening balance",
    },
  },
  ar: {
    title: "كشف حساب",
    party: "الحساب",
    period: "الفترة",
    generatedOn: "تاريخ الطباعة",
    summary: "الملخص",
    date: "التاريخ",
    type: "النوع",
    document: "المستند",
    description: "البيان",
    debit: "مدين",
    credit: "دائن",
    balance: "الرصيد",
    broughtForward: "رصيد منقول",
    totals: "المجاميع",
    closingBalance: "الرصيد الختامي",
    dr: "مدين",
    cr: "دائن",
    allTime: "البداية",
    present: "اليوم",
    fundAmount: "مبلغ الصندوق",
    currency: "العملة",
    combinedTitle: "كشف حساب موحّد",
    account: "الحساب",
    netBalance: "صافي الرصيد",
    accountTypes: { customer: "عميل", supplier: "مورد", partner: "شريك" },
    docTypes: {
      sales: "فاتورة مبيعات",
      purchase: "فاتورة مشتريات",
      expense: "مصروف",
      sales_return: "مرتجع مبيعات",
      purchase_return: "مرتجع مشتريات",
      payment: "دفعة",
      received: "دفعة مقبوضة",
      made: "دفعة مدفوعة",
      deposit: "إيداع",
      withdrawal: "سحب",
      settlement: "تسوية غير نقدية",
      opening_balance: "رصيد افتتاحي",
    },
  },
  tr: {
    title: "Cari Hesap Ekstresi",
    party: "Cari",
    period: "Dönem",
    generatedOn: "Yazdırma tarihi",
    summary: "Özet",
    date: "Tarih",
    type: "Tür",
    document: "Belge",
    description: "Açıklama",
    debit: "Borç",
    credit: "Alacak",
    balance: "Bakiye",
    broughtForward: "Devreden bakiye",
    totals: "Toplamlar",
    closingBalance: "Kapanış bakiyesi",
    dr: "B",
    cr: "A",
    allTime: "Başlangıç",
    present: "Bugün",
    fundAmount: "Kasa tutarı",
    currency: "Döviz",
    combinedTitle: "Birleşik Cari Hesap Ekstresi",
    account: "Hesap",
    netBalance: "Net bakiye",
    accountTypes: {
      customer: "Müşteri",
      supplier: "Tedarikçi",
      partner: "Ortak",
    },
    docTypes: {
      sales: "Satış faturası",
      purchase: "Alış faturası",
      expense: "Gider",
      sales_return: "Satış iadesi",
      purchase_return: "Alış iadesi",
      payment: "Ödeme",
      received: "Tahsilat",
      made: "Ödeme",
      deposit: "Para yatırma",
      withdrawal: "Para çekme",
      settlement: "Mahsup",
      opening_balance: "Açılış bakiyesi",
    },
  },
};

const getLabels = (language) => EXPORT_LABELS[language] || EXPORT_LABELS.en;

const formatExportDate = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value).slice(0, 10);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Foreign-fund payments: what actually moved in the fund.
// Primary-currency rows (rate 1) return null.
const getFundAmount = (r) => {
  if (r.record_type !== "payment") return null;
  const rate = Number(r.exchange_rate || 1);
  if (rate === 1 || r.amount_fund_currency == null) return null;
  return {
    amount: Number(r.amount_fund_currency),
    unit:
      r.fund_currency_symbol || r.fund_currency_code || r.currency_code || "",
  };
};

// ---- Statement row formatting (shared by Excel + PDF) ----

const formatType = (L, r) => {
  if (r.record_type === "opening_balance") return L.docTypes.opening_balance;
  if (r.record_type === "payment")
    return L.docTypes[r.payment_kind] || L.docTypes.payment;
  return L.docTypes[r.invoice_type] || r.invoice_type || "";
};

const formatDocument = (r) => {
  if (r.record_type === "payment")
    return r.payment_id ? `#${r.payment_id}` : "";
  if (r.record_type === "opening_balance") return "";
  return r.invoice_name || (r.invoice_id ? `#${r.invoice_id}` : "");
};

const formatDescription = (r) => r.note || r.fund_name || "";

const sideLabel = (L, side) =>
  side === "dr" ? L.dr : side === "cr" ? L.cr : "";

const formatPeriod = (L, { startDate, endDate }) =>
  `${startDate || L.allTime} – ${endDate || L.present}`;

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const escapeHtml = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const PARTY_TABLES = {
  customer: "customers",
  supplier: "suppliers",
  partner: "partners",
};

const lookupPartyName = (db, partyType, partyId) => {
  const table = PARTY_TABLES[partyType];
  return table
    ? db.prepare(`SELECT name FROM ${table} WHERE id = ?`).get(partyId)?.name ||
        ""
    : "";
};

// Accounts in the statement (customer side / supplier side of the contact),
// with names. Falls back to the requested party when the period is empty.
function statementAccounts(db, statement, { partyId, partyType, partyName }) {
  const accounts = statement.parties.map((p) => ({
    ...p,
    name: lookupPartyName(db, p.partyType, p.partyId),
  }));
  return accounts.length > 0
    ? accounts
    : [{ partyType, partyId: Number(partyId), name: partyName || "" }];
}

const accountLine = (L, p) => `${p.name} (${L.accountTypes[p.partyType]})`;

function fetchPartyHistoryLedger(
  db,
  {
    partyId,
    partyType,
    contactId: contactIdParam,
    page = 1,
    limit = 50,
    startDate,
    endDate,
    exportAll = false,
  },
) {
  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.max(1, Number(limit) || 50);
  const offset = (currentPage - 1) * perPage;

  // Customer / supplier pages read the whole CONTACT (sales + purchase side).
  // Partners — or a party with no contact yet — keep the legacy scope.
  const contactId = contactIdParam
    ? Number(contactIdParam)
    : findLegacyContact(db, partyType, partyId);
  const scope = contactId
    ? { clause: "p.contact_id = ?", values: [contactId] }
    : {
        clause: "p.party_id = ? AND p.party_type = ?",
        values: [partyId, partyType],
      };

  // "Increase" from the viewed page's point of view, so the screen's existing
  // rules hold: customer page → debit raises the balance (he owes you);
  // supplier page → credit raises it (you owe him).
  const increaseCond = contactId
    ? contactIdParam || partyType === "customer"
      ? "p.side = 'debit'"
      : "p.side = 'credit'"
    : "p.movement_type = 'increase'";
  const signedAmount = `CASE WHEN ${increaseCond} THEN p.amount ELSE -p.amount END`;

  const cashInCond = contactId
    ? "p.side = 'credit'"
    : `((p.party_type = 'customer' AND p.movement_type = 'decrease')
        OR (p.party_type = 'supplier' AND p.movement_type = 'increase'))`;

  const dateConditions = [];
  const dateValues = [];

  if (startDate) {
    dateConditions.push("date(p.date) >= date(?)");
    dateValues.push(startDate);
  }
  if (endDate) {
    dateConditions.push("date(p.date) <= date(?)");
    dateValues.push(endDate);
  }
  const dateFilter = dateConditions.length
    ? `AND ${dateConditions.join(" AND ")}`
    : "";

  const pagingClause = exportAll ? "" : "LIMIT ? OFFSET ?";
  const pagingValues = exportAll ? [] : [perPage, offset];

  // Running balance is computed over the FULL history first (in the CTE),
  // then the date filter / pagination are applied outside — so a filtered
  // range still shows the true balance at each row.
  // Chronological order: by date, opening balance first within the same
  // moment, then insertion id as the final tiebreaker.
  const rows = db
    .prepare(
      `
      WITH ledger AS (
        SELECT
          p.*,
          (${increaseCond}) AS view_increase,
          SUM(${signedAmount}) OVER (
            ORDER BY
              datetime(p.date),
              CASE WHEN p.record_type = 'opening_balance' THEN 0 ELSE 1 END,
              p.id
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
          ) AS running_balance
        FROM party_history p
        WHERE ${scope.clause}
      )
      SELECT
        p.*,

        -- invoice-side info, resolved by invoice_type
        COALESCE(si.invoice_name, pi.invoice_name, ex.invoice_name) AS invoice_name,

        -- payment-side info, resolved via payment_id
        pay.note AS payment_note,
        pay.fund_id AS payment_fund_id,
        f.name AS fund_name

      FROM ledger p

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

      WHERE 1 = 1
        ${dateFilter}
      ORDER BY
        datetime(p.date) DESC,
        CASE WHEN p.record_type = 'opening_balance' THEN 0 ELSE 1 END DESC,
        p.id DESC
      ${pagingClause}
      `,
    )
    .all(...scope.values, ...dateValues, ...pagingValues);

  const { total } = db
    .prepare(
      `
      SELECT COUNT(*) AS total
      FROM party_history p
      WHERE ${scope.clause}
        ${dateFilter}
      `,
    )
    .get(...scope.values, ...dateValues);

  const summary = db
    .prepare(
      `
      SELECT
        COALESCE(SUM(CASE WHEN ${increaseCond} THEN p.amount ELSE 0 END), 0) AS total_increase,
        COALESCE(SUM(CASE WHEN ${increaseCond} THEN 0 ELSE p.amount END), 0) AS total_decrease,
        COALESCE(SUM(CASE WHEN p.record_type = 'invoice' THEN p.amount ELSE 0 END), 0) AS total_invoice,
        COALESCE(SUM(CASE WHEN p.record_type = 'return' THEN p.amount ELSE 0 END), 0) AS total_return,
        COALESCE(SUM(CASE WHEN p.record_type = 'payment' THEN p.amount ELSE 0 END), 0) AS total_payment,
        COALESCE(SUM(CASE WHEN p.invoice_type = 'sales' THEN p.amount ELSE 0 END), 0) AS sales_total,
        COALESCE(SUM(CASE WHEN p.invoice_type = 'sales_return' THEN p.amount ELSE 0 END), 0) AS sales_returns_total,
        COALESCE(SUM(CASE WHEN p.invoice_type IN ('purchase','expense') THEN p.amount ELSE 0 END), 0) AS purchases_total,
        COALESCE(SUM(CASE WHEN p.invoice_type = 'purchase_return' THEN p.amount ELSE 0 END), 0) AS purchase_returns_total,
        COALESCE(SUM(CASE WHEN p.record_type = 'opening_balance' THEN ${signedAmount} ELSE 0 END), 0) AS opening_balance,
        COALESCE(SUM(CASE WHEN p.record_type = 'payment' AND p.settlement_id IS NULL
                           AND ${cashInCond} THEN p.amount ELSE 0 END), 0) AS payments_in_total,
        COALESCE(SUM(CASE WHEN p.record_type = 'payment' AND p.settlement_id IS NULL
                           AND NOT ${cashInCond} THEN p.amount ELSE 0 END), 0) AS payments_out_total,
        -- a settlement writes one row per side with equal amounts; count one side
        COALESCE(SUM(CASE WHEN p.settlement_id IS NOT NULL
                           AND p.side = 'credit' THEN p.amount ELSE 0 END), 0) AS settlements_total
      FROM party_history p
      WHERE ${scope.clause}
        ${dateFilter}
      `,
    )
    .get(...scope.values, ...dateValues);

  return {
    // payment_kind uses the row's OWN party_type + movement_type (true cash
    // direction); movement_type is then re-oriented to the viewed page so
    // the +/− sign and opening-balance wording read correctly.
    data: rows.map(({ view_increase, ...r }) => ({
      ...r,
      payment_kind: getPaymentKind(r),
      movement_type: view_increase ? "increase" : "decrease",
    })),
    page: currentPage,
    limit: perPage,
    total,
    totalPages: Math.ceil(total / perPage),
    summary: {
      total_increase: Number(summary?.total_increase || 0),
      total_decrease: Number(summary?.total_decrease || 0),
      total_invoice: Number(summary?.total_invoice || 0),
      total_return: Number(summary?.total_return || 0),
      total_payment: Number(summary?.total_payment || 0),
      sales_total: Number(summary?.sales_total || 0),
      sales_returns_total: Number(summary?.sales_returns_total || 0),
      purchases_total: Number(summary?.purchases_total || 0),
      purchase_returns_total: Number(summary?.purchase_returns_total || 0),
      opening_balance: Number(summary?.opening_balance || 0),
      payments_in_total: Number(summary?.payments_in_total || 0),
      payments_out_total: Number(summary?.payments_out_total || 0),
      settlements_total: Number(summary?.settlements_total || 0),
    },
  };
}

export default function registerPartyHistoryIPC() {
  ipcMain.handle("get-party-history-ledger", (event, params) => {
    return fetchPartyHistoryLedger(db, params);
  });
  ipcMain.handle("get-customer-credit", (event, customerId) => {
    return getPartyCredit(db, { partyId: customerId, partyType: "customer" });
  });

  ipcMain.handle("get-supplier-credit", (event, supplierId) => {
    return getPartyCredit(db, { partyId: supplierId, partyType: "supplier" });
  });

  ipcMain.handle("get-party-earliest-date", (event, { partyId, partyType }) => {
    try {
      if (!partyId || !partyType) {
        return { success: true, minDate: null };
      }
      const row = db
        .prepare(
          `SELECT MIN(date) AS minDate FROM party_history WHERE party_id = ? AND party_type = ?`,
        )
        .get(partyId, partyType);
      return { success: true, minDate: row?.minDate || null };
    } catch (err) {
      return { success: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle(
    "apply-invoice-credit",
    (event, { partyId, partyType, invoiceId, invoiceType, amount }) => {
      try {
        const applied = applyPartyCredit(db, {
          partyId,
          partyType,
          invoiceId,
          invoiceType,
          amount,
        });
        return { success: true, applied };
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    },
  );

  ipcMain.handle(
    "export-party-history-excel",
    async (
      event,
      {
        partyId,
        partyType,
        startDate,
        endDate,
        language,
        partyName,
        includeLinked,
      },
    ) => {
      try {
        const L = getLabels(language);
        const isRtl = language === "ar";

        const statement = buildPartyStatement(db, {
          parties: [{ partyId, partyType }],
          startDate,
          endDate,
        });

        const accounts = statementAccounts(db, statement, {
          partyId,
          partyType,
          partyName,
        });
        const isCombined = accounts.length > 1;

        const headerName = isCombined
          ? accounts.map((p) => accountLine(L, p)).join(" + ")
          : partyName || accounts[0].name;

        // Column layout — Account column only on the combined statement.
        const columns = [
          { key: "date", header: L.date, width: 12 },
          ...(isCombined
            ? [{ key: "account", header: L.account, width: 12 }]
            : []),
          { key: "type", header: L.type, width: 18 },
          { key: "document", header: L.document, width: 16 },
          { key: "description", header: L.description, width: 36 },
          { key: "debit", header: L.debit, width: 14, money: true },
          { key: "credit", header: L.credit, width: 14, money: true },
          { key: "fundAmount", header: L.fundAmount, width: 14, money: true },
          { key: "currency", header: L.currency, width: 10 },
          { key: "balance", header: L.balance, width: 14, money: true },
          { key: "side", header: "", width: 8 },
        ];
        const toRow = (values) => columns.map((c) => values[c.key] ?? null);

        const HEADER_ROW = 6;
        const COLUMN_COUNT = columns.length;
        const MONEY_FORMAT = "#,##0.00";

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet(
          isCombined ? L.combinedTitle.slice(0, 31) : L.title,
        );

        sheet.views = [
          { rightToLeft: isRtl, state: "frozen", ySplit: HEADER_ROW },
        ];
        columns.forEach((c, i) => {
          sheet.getColumn(i + 1).width = c.width;
        });

        // ---- Title block ----
        const titleLines = [
          {
            text: isCombined ? L.combinedTitle : L.title,
            font: { bold: true, size: 14 },
          },
          { text: `${L.party}: ${headerName}`, font: { bold: true } },
          { text: `${L.period}: ${formatPeriod(L, statement.period)}` },
          {
            text: `${L.generatedOn}: ${formatExportDate(new Date())}`,
            font: { color: { argb: "FF64748B" } },
          },
        ];
        titleLines.forEach((line, i) => {
          const rowNumber = i + 1;
          sheet.mergeCells(rowNumber, 1, rowNumber, COLUMN_COUNT);
          const cell = sheet.getCell(rowNumber, 1);
          cell.value = line.text;
          if (line.font) cell.font = line.font;
        });

        // ---- Column headings ----
        const header = sheet.getRow(HEADER_ROW);
        header.values = columns.map((c) => c.header);
        header.font = { bold: true };
        header.eachCell((cell) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFEEF3FF" },
          };
          cell.border = { bottom: { style: "thin" } };
        });

        // ---- Brought forward ----
        if (statement.period.startDate) {
          const bf = sheet.addRow(
            toRow({
              description: L.broughtForward,
              balance: Math.abs(statement.broughtForward),
              side: sideLabel(L, statement.broughtForwardSide),
            }),
          );
          bf.font = { italic: true, bold: true };
        }

        // ---- Movements ----
        statement.rows.forEach((r) => {
          const fund = getFundAmount(r);
          sheet.addRow(
            toRow({
              date: formatExportDate(r.date),
              account: L.accountTypes[r.party_type],
              type: formatType(L, r),
              document: formatDocument(r),
              description: formatDescription(r),
              debit: r.debit || null,
              credit: r.credit || null,
              fundAmount: fund ? fund.amount : null,
              currency: fund ? fund.unit : null,
              balance: Math.abs(r.balance),
              side: sideLabel(L, r.balance_side),
            }),
          );
        });

        // ---- Totals + closing ----
        const totalsRow = sheet.addRow(
          toRow({
            description: L.totals,
            debit: statement.totals.debit,
            credit: statement.totals.credit,
          }),
        );
        totalsRow.font = { bold: true };
        totalsRow.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = { top: { style: "thin" } };
        });

        // Combined: each account's own closing, then the net.
        if (isCombined) {
          accounts.forEach((p) => {
            sheet.addRow(
              toRow({
                description: accountLine(L, p),
                balance: Math.abs(p.closing),
                side: sideLabel(L, p.closingSide),
              }),
            );
          });
        }

        const closingRow = sheet.addRow(
          toRow({
            description: isCombined ? L.netBalance : L.closingBalance,
            balance: Math.abs(statement.closing),
            side: sideLabel(L, statement.closingSide),
          }),
        );
        closingRow.font = { bold: true };

        // Money columns: numeric cells, consistent format
        const moneyColumns = columns
          .map((c, i) => (c.money ? i + 1 : null))
          .filter(Boolean);
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber <= HEADER_ROW) return;
          moneyColumns.forEach((col) => {
            row.getCell(col).numFmt = MONEY_FORMAT;
          });
        });

        // Filter dropdowns on the heading row
        sheet.autoFilter = {
          from: { row: HEADER_ROW, column: 1 },
          to: { row: HEADER_ROW, column: COLUMN_COUNT },
        };

        const { canceled, filePath } = await dialog.showSaveDialog({
          title: isCombined ? L.combinedTitle : L.title,
          defaultPath: `${accounts[0].name || partyName || "party"}-statement.xlsx`,
          filters: [{ name: "Excel Workbook", extensions: ["xlsx"] }],
        });

        if (canceled || !filePath) {
          return { success: false, error: "Export cancelled" };
        }

        await workbook.xlsx.writeFile(filePath);
        return { success: true, path: filePath };
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    },
  );

  ipcMain.handle(
    "export-party-history-pdf",
    async (
      event,
      {
        partyId,
        partyType,
        startDate,
        endDate,
        language,
        partyName,
        includeLinked,
      },
    ) => {
      try {
        const L = getLabels(language);
        const isRtl = language === "ar";

        const statement = buildPartyStatement(db, {
          parties: [{ partyId, partyType }],
          startDate,
          endDate,
        });

        const accounts = statementAccounts(db, statement, {
          partyId,
          partyType,
          partyName,
        });
        const isCombined = accounts.length > 1;

        const headerName = isCombined
          ? accounts.map((p) => accountLine(L, p)).join(" + ")
          : partyName || accounts[0].name;

        const title = isCombined ? L.combinedTitle : L.title;

        // Cells before Debit: Date, [Account], Type, Document, Description
        const labelSpan = isCombined ? 5 : 4;

        const balanceCell = (value, side) =>
          `${fmtMoney(Math.abs(value))} <span class="side">${escapeHtml(
            sideLabel(L, side),
          )}</span>`;

        const broughtForwardHtml = statement.period.startDate
          ? `
          <tr class="bf">
            <td colspan="${labelSpan}">${escapeHtml(L.broughtForward)}</td>
            <td class="num"></td>
            <td class="num"></td>
            <td class="num"></td>
            <td class="num">${balanceCell(
              statement.broughtForward,
              statement.broughtForwardSide,
            )}</td>
          </tr>`
          : "";

        const rowsHtml = statement.rows
          .map((r) => {
            const fund = getFundAmount(r);
            return `
          <tr>
            <td class="nowrap">${escapeHtml(formatExportDate(r.date))}</td>
            ${
              isCombined
                ? `<td class="nowrap">${escapeHtml(L.accountTypes[r.party_type])}</td>`
                : ""
            }
            <td>${escapeHtml(formatType(L, r))}</td>
            <td class="nowrap">${escapeHtml(formatDocument(r))}</td>
            <td>${escapeHtml(formatDescription(r))}</td>
            <td class="num">${r.debit ? fmtMoney(r.debit) : ""}</td>
            <td class="num">${r.credit ? fmtMoney(r.credit) : ""}</td>
            <td class="num">${
              fund ? `${fmtMoney(fund.amount)} ${escapeHtml(fund.unit)}` : ""
            }</td>
            <td class="num">${balanceCell(r.balance, r.balance_side)}</td>
          </tr>`;
          })
          .join("");

        // Combined: each account's own closing above the net line.
        const accountSummaryHtml = isCombined
          ? accounts
              .map(
                (p) =>
                  `<tr><td>${escapeHtml(accountLine(L, p))}</td><td class="num">${balanceCell(p.closing, p.closingSide)}</td></tr>`,
              )
              .join("")
          : "";

        const closingLabel = isCombined ? L.netBalance : L.closingBalance;

        const html = `
        <html dir="${isRtl ? "rtl" : "ltr"}" lang="${escapeHtml(language || "en")}">
          <head>
            <meta charset="UTF-8" />
            <style>
              @page { size: A4; margin: 14mm 12mm 16mm; }
              * { box-sizing: border-box; }
              body {
                font-family: "Segoe UI", Tahoma, Arial, sans-serif;
                font-size: 10.5px;
                color: #1c2340;
                margin: 0;
              }
              .head {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 24px;
                padding-bottom: 12px;
                border-bottom: 2px solid #1c2340;
              }
              h1 { font-size: 18px; margin: 0 0 6px; }
              .meta { margin: 2px 0; color: #475569; }
              .meta strong { color: #1c2340; }
              .summary { border-collapse: collapse; min-width: 240px; }
              .summary td { padding: 3px 0; }
              .summary td.num { padding-inline-start: 16px; }
              .summary tr.closing td {
                border-top: 1px solid #1c2340;
                font-weight: 700;
                padding-top: 5px;
              }
              table.lines {
                width: 100%;
                border-collapse: collapse;
                margin-top: 14px;
              }
              table.lines th {
                background: #eef3ff;
                font-weight: 700;
                text-align: start;
                padding: 6px 6px;
                border-bottom: 1px solid #c7d2fe;
              }
              table.lines td {
                padding: 5px 6px;
                border-bottom: 1px solid #e5e7eb;
                vertical-align: top;
              }
              thead { display: table-header-group; }
              tr { page-break-inside: avoid; }
              .num {
                text-align: end;
                white-space: nowrap;
                font-variant-numeric: tabular-nums;
              }
              th.num { text-align: end; }
              .nowrap { white-space: nowrap; }
              .side { color: #64748b; font-size: 9px; margin-inline-start: 2px; }
              tr.bf td { font-style: italic; font-weight: 700; background: #f8fafc; }
              tfoot td { font-weight: 700; border-bottom: none; }
              tfoot tr.totals td { border-top: 1.5px solid #1c2340; }
              tfoot tr.closing td { background: #eef3ff; }
            </style>
          </head>
          <body>
            <div class="head">
              <div>
                <h1>${escapeHtml(title)}</h1>
                <p class="meta">${escapeHtml(L.party)}: <strong>${escapeHtml(headerName)}</strong></p>
                <p class="meta">${escapeHtml(L.period)}: <strong>${escapeHtml(formatPeriod(L, statement.period))}</strong></p>
                <p class="meta">${escapeHtml(L.generatedOn)}: ${escapeHtml(formatExportDate(new Date()))}</p>
              </div>

              <table class="summary">
                ${
                  statement.period.startDate
                    ? `<tr><td>${escapeHtml(L.broughtForward)}</td><td class="num">${balanceCell(statement.broughtForward, statement.broughtForwardSide)}</td></tr>`
                    : ""
                }
                <tr><td>${escapeHtml(L.debit)}</td><td class="num">${fmtMoney(statement.totals.debit)}</td></tr>
                <tr><td>${escapeHtml(L.credit)}</td><td class="num">${fmtMoney(statement.totals.credit)}</td></tr>
                ${accountSummaryHtml}
                <tr class="closing"><td>${escapeHtml(closingLabel)}</td><td class="num">${balanceCell(statement.closing, statement.closingSide)}</td></tr>
              </table>
            </div>

            <table class="lines">
              <thead>
                <tr>
                  <th>${escapeHtml(L.date)}</th>
                  ${isCombined ? `<th>${escapeHtml(L.account)}</th>` : ""}
                  <th>${escapeHtml(L.type)}</th>
                  <th>${escapeHtml(L.document)}</th>
                  <th>${escapeHtml(L.description)}</th>
                  <th class="num">${escapeHtml(L.debit)}</th>
                  <th class="num">${escapeHtml(L.credit)}</th>
                  <th class="num">${escapeHtml(L.fundAmount)}</th>
                  <th class="num">${escapeHtml(L.balance)}</th>
                </tr>
              </thead>
              <tbody>
                ${broughtForwardHtml}
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr class="totals">
                  <td colspan="${labelSpan}">${escapeHtml(L.totals)}</td>
                  <td class="num">${fmtMoney(statement.totals.debit)}</td>
                  <td class="num">${fmtMoney(statement.totals.credit)}</td>
                  <td class="num"></td>
                  <td class="num"></td>
                </tr>
                <tr class="closing">
                  <td colspan="${labelSpan}">${escapeHtml(closingLabel)}</td>
                  <td class="num"></td>
                  <td class="num"></td>
                  <td class="num"></td>
                  <td class="num">${balanceCell(statement.closing, statement.closingSide)}</td>
                </tr>
              </tfoot>
            </table>
          </body>
        </html>
      `;

        const win = new BrowserWindow({ show: false });
        await win.loadURL(
          "data:text/html;charset=utf-8," + encodeURIComponent(html),
        );

        const pdfBuffer = await win.webContents.printToPDF({
          printBackground: true,
          preferCSSPageSize: true,
          displayHeaderFooter: true,
          headerTemplate: "<div></div>",
          footerTemplate: `
            <div style="width:100%;font-size:8px;color:#64748b;text-align:center;font-family:Tahoma,Arial,sans-serif;">
              <span class="pageNumber"></span> / <span class="totalPages"></span>
            </div>`,
        });
        win.close();

        const { canceled, filePath } = await dialog.showSaveDialog({
          title,
          defaultPath: `${accounts[0].name || partyName || "party"}-statement.pdf`,
          filters: [{ name: "PDF Document", extensions: ["pdf"] }],
        });

        if (canceled || !filePath) {
          return { success: false, error: "Export cancelled" };
        }

        fs.writeFileSync(filePath, pdfBuffer);
        return { success: true, path: filePath };
      } catch (err) {
        return { success: false, error: err.message || String(err) };
      }
    },
  );
}
