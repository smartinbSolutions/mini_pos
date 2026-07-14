const { ipcMain, BrowserWindow } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";
import createProductMovement from "../utils/createPorductMovment";
import { applyPartyCredit } from "../utils/partyCredit";

const receiptLabels = {
  en: {
    invoice: "Invoice",
    item: "Item",
    quantity: "Qty",
    price: "Price",
    total: "Total",
    subtotal: "Subtotal",
    paid: "Paid",
    change: "Change",
    thankYou: "Thank you",
    visitAgain: "Visit again",
  },
  tr: {
    invoice: "Fatura",
    item: "Urun",
    quantity: "Miktar",
    price: "Fiyat",
    total: "Toplam",
    subtotal: "Ara Toplam",
    paid: "Odenen",
    change: "Para Ustu",
    thankYou: "Tesekkurler",
    visitAgain: "Yine bekleriz",
  },
  ar: {
    invoice: "فاتورة",
    item: "الصنف",
    quantity: "الكمية",
    price: "السعر",
    total: "الإجمالي",
    subtotal: "المجموع الفرعي",
    paid: "المدفوع",
    change: "الباقي",
    thankYou: "شكرا لك",
    visitAgain: "نراك مرة أخرى",
  },
};

const getReceiptLanguage = (value) => {
  const language = String(value || "en").split("-")[0];
  return receiptLabels[language] ? language : "en";
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export default function registerSalesInvoiceIPC() {
  // CREATE
  ipcMain.handle("create-sales-invoice", (event, data) => {
    try {
      const transaction = db.transaction(() => {
        if (
          !data.date ||
          !Array.isArray(data.items) ||
          data.items.length === 0
        ) {
          throw new Error("ERROR ENTER DATA");
        }
        console.log(data);

        const subtotal = Number(data.subtotal || 0);
        const netTotal = Number(data.net_total || 0);
        const discount = Number(data.discount || 0);

        if (subtotal <= 0 || netTotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        const payment = data.payment || null;
        const isPaid = !!payment;
        const isCredit = payment?.source === "credit";

        if (isPaid && !isCredit) {
          if (!payment.fund_id) {
            throw new Error("FUND_REQUIRED");
          }
          if (!payment.amount || Number(payment.amount) <= 0) {
            throw new Error("INVALID_PAYMENT_AMOUNT");
          }
        }

        if (
          isPaid &&
          isCredit &&
          (!payment.amount || Number(payment.amount) <= 0)
        ) {
          throw new Error("INVALID_CREDIT_AMOUNT");
        }

        const dateOnly = data.date.slice(0, 10);
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        const invoiceResult = db
          .prepare(
            `
            INSERT INTO sales_invoices
            (customer_id, invoice_name, description, date, subtotal, discount, tax, net_total, taxValue, created_by, updated_by )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          )
          .run(
            data.customer_id || null,
            data.invoice_name || null,
            data.description || null,
            fullDateTime,
            subtotal,
            discount,
            data.tax_rate || 0,
            netTotal,
            data.taxValue || 0,
            data.created_by || "",
            data.created_by || "",
          );

        const invoiceId = invoiceResult.lastInsertRowid;

        const insertItem = db.prepare(`
          INSERT INTO sales_invoice_items
          (invoice_id, product_id, quantity, price, buyingPrice, total)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const updateStock = db.prepare(`
          UPDATE products
          SET quantity = quantity - ?
          WHERE id = ?
        `);

        for (const item of data.items) {
          const quantity = Number(item.quantity || 0);
          const price = Number(item.price || 0);

          if (!item.product_id || quantity <= 0 || price < 0) {
            throw new Error("INVALID ITEM DATA");
          }

          const total = quantity * price;

          insertItem.run(
            invoiceId,
            item.product_id,
            quantity,
            price,
            item.buyingPrice,
            total,
          );
          updateStock.run(quantity, item.product_id);

          createProductMovement(db, {
            product_id: item.product_id,
            reference_id: invoiceId,
            reference_type: "sales_invoice",
            type: "out",
            action: "create",
            quantity,
            outPrice: price,
            date: fullDateTime,
          });
        }

        if (data.customer_id) {
          createPartyHistory(db, {
            party_type: "customer",
            party_id: data.customer_id,
            invoice_id: invoiceId,
            invoice_type: "sales",
            record_type: "invoice",
            movement_type: "increase",
            amount: netTotal,
            note: data.invoice_name || `Sales Invoice #${invoiceId}`,
          });
        }

        let insertPaymentId = null;
        let creditApplied = null;

        if (isPaid && isCredit) {
          creditApplied = applyPartyCredit(db, {
            partyId: payment.party_id,
            partyType: payment.party_type,
            invoiceId,
            invoiceType: "sales",
            amount: payment.amount,
          });
        } else if (isPaid) {
          insertPaymentId = createPayment(db, {
            type: payment.type,
            party_type: payment.party_type,
            party_id: payment.party_id,
            fund_id: payment.fund_id,
            amount: payment.amount,
            amount_fund_currency: payment.collected_amount,
            currency_code: payment.currency_code,
            exchange_rate: payment.exchange_rate,
            effective_rate: payment.effective_rate,
            invoice_id: invoiceId,
            invoice_type: payment.mode,
            note: `${payment.note} #${invoiceId}`,
            fundOperation: "add",
            date: data.date || new Date().toISOString(),
          });

          createFundHistory(db, {
            fund_id: payment.fund_id,
            record_type: "payment",
            payment_id: insertPaymentId,
            movement_type: "in",
            amount: payment.collected_amount,
            note: `Payment for Sales Invoice #${invoiceId}`,
          });
        }

        return { invoiceId, paymentId: insertPaymentId, creditApplied };
      });

      return { success: true, ...transaction() };
    } catch (err) {
      return {
        success: false,
        error: err.message || String(err),
        code: err.code,
      };
    }
  });

  ipcMain.handle("get-sales-invoices", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const invoices = db
      .prepare(
        `
      SELECT
        s.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name,
        COALESCE(SUM(pa.amount), 0) AS paid_amount,

        s.net_total - COALESCE(SUM(pa.amount), 0) AS remaining_amount,

        CASE
          WHEN COALESCE(SUM(pa.amount), 0) >= s.net_total THEN 'paid'
          WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status

      FROM sales_invoices s

      LEFT JOIN customers c
        ON c.id = s.customer_id

      LEFT JOIN payment_allocations pa
        ON pa.invoice_id = s.id
       AND pa.invoice_type = 'sales'

    LEFT JOIN users creator
    ON creator.id = s.created_by
    
    LEFT JOIN users updater
    ON updater.id = s.updated_by

      GROUP BY s.id

      ORDER BY s.id DESC

      LIMIT ? OFFSET ?
      `,
      )
      .all(limit, offset);

    const { total } = db
      .prepare(`SELECT COUNT(*) AS total FROM sales_invoices`)
      .get();

    return {
      data: invoices,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  });

  // GET ONE
  ipcMain.handle("get-sales-invoice", (event, id) => {
    const invoice = db
      .prepare(
        `
    SELECT
      sa.*,
      c.name AS customer_name,
      c.phone AS customer_phone,
      t.rate AS tax_rate,
      creator.full_name AS created_by_name,
      updater.full_name AS updated_by_name,
      COALESCE(pa_sum.paid_amount, 0) AS paid_amount,
      sa.net_total - COALESCE(pa_sum.paid_amount, 0) AS remaining_amount,

      CASE
        WHEN COALESCE(pa_sum.paid_amount, 0) >= sa.net_total THEN 'paid'
        WHEN COALESCE(pa_sum.paid_amount, 0) > 0 THEN 'partial'
        ELSE 'unpaid'
      END AS status

    FROM sales_invoices sa
    LEFT JOIN customers c ON c.id = sa.customer_id
    
    LEFT JOIN users creator
    ON creator.id = sa.created_by
    
    LEFT JOIN users updater
    ON updater.id = sa.updated_by
    
    LEFT JOIN taxes t ON t.id = sa.tax
    LEFT JOIN (
      SELECT invoice_id, SUM(amount) AS paid_amount
      FROM payment_allocations
      WHERE invoice_type = 'sales'
      GROUP BY invoice_id
    ) pa_sum ON pa_sum.invoice_id = sa.id
    WHERE sa.id = ?
    `,
      )
      .get(id);

    if (!invoice) return null;

    const items = db
      .prepare(
        `
    SELECT
  si.*,
  p.name,

  COALESCE(r.returned_quantity, 0) AS returned_quantity,

  (
    si.quantity - COALESCE(r.returned_quantity, 0)
  ) AS available_quantity

FROM sales_invoice_items si

LEFT JOIN products p
  ON p.id = si.product_id

LEFT JOIN (
  SELECT
    sales_invoice_item_id,
    SUM(quantity) AS returned_quantity
  FROM sales_return_items
  GROUP BY sales_invoice_item_id
) r
  ON r.sales_invoice_item_id = si.id

WHERE si.invoice_id = ?
    `,
      )
      .all(id);

    const allocations = db
      .prepare(
        `
    SELECT
      pa.id,
      pa.payment_id,
      pa.amount,
      p.date,
      p.fund_id,
      p.note,
      p.currency_code,
      p.exchange_rate,
      p.effective_rate,
      p.amount_fund_currency,
      f.name AS fund_name,
      c.code AS fund_currency_code,
      c.symbol AS fund_currency_symbol
    FROM payment_allocations pa
    LEFT JOIN payments p ON p.id = pa.payment_id
    LEFT JOIN funds f ON f.id = p.fund_id
    LEFT JOIN currencies c ON c.id = f.currency_id
    WHERE pa.invoice_id = ?
      AND pa.invoice_type = 'sales'
    ORDER BY pa.id ASC
    `,
      )
      .all(id);

    return {
      ...invoice,
      items,
      allocations,
    };
  });

  // UPDATE
  ipcMain.handle("update-sales-invoice", (event, data) => {
    if (
      !data.id ||
      !data.date ||
      !Array.isArray(data.items) ||
      data.items.length === 0 ||
      Number(data.subtotal) <= 0 ||
      Number(data.net_total) <= 0
    ) {
      return { success: false, error: "ERROR ENTER DATA" };
    }
    const dateOnly = data.date.slice(0, 10);
    const time = new Date().toTimeString().slice(0, 8);
    const fullDateTime = `${dateOnly} ${time}`;
    try {
      const transaction = db.transaction(() => {
        const oldInvoice = db
          .prepare(`SELECT * FROM sales_invoices WHERE id = ?`)
          .get(data.id);

        if (!oldInvoice) {
          throw new Error("SALES INVOICE NOT FOUND");
        }

        const oldCustomerId = oldInvoice.customer_id || null;
        const newCustomerId = data.customer_id || null;

        const oldItems = db
          .prepare(`SELECT * FROM sales_invoice_items WHERE invoice_id = ?`)
          .all(data.id);

        const reverseStock = db.prepare(`
          UPDATE products SET quantity = quantity + ? WHERE id = ?
        `);
        const applyStock = db.prepare(`
          UPDATE products SET quantity = quantity - ? WHERE id = ?
        `);

        // Reverse old stock movement fully — items are being replaced wholesale
        for (const item of oldItems) {
          reverseStock.run(item.quantity || 0, item.product_id);
        }

        db.prepare(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`).run(
          data.id,
        );
        db.prepare(
          `
          DELETE FROM product_movements
          WHERE reference_type = 'sales_invoice' AND reference_id = ?
        `,
        ).run(data.id);

        const insertItem = db.prepare(`
          INSERT INTO sales_invoice_items
          (invoice_id, product_id, quantity, price, buyingPrice, total)
          VALUES (?, ?, ?, ?, ?, ?)
        `);

        const newNetTotal = Number(data.net_total || 0);
        const newSubtotal = Number(data.subtotal || 0);

        for (const item of data.items) {
          if (!item.product_id) continue;

          const quantity = Number(item.quantity || 0);
          const price = Number(item.price || 0);

          if (quantity <= 0 || price < 0) {
            throw new Error("INVALID ITEM DATA");
          }

          const total = quantity * price;

          insertItem.run(
            data.id,
            item.product_id,
            quantity,
            price,
            item.buyingPrice,
            total,
          );
          applyStock.run(quantity, item.product_id);

          createProductMovement(db, {
            product_id: item.product_id,
            reference_id: data.id,
            reference_type: "sales_invoice",
            action: "update",
            type: "out",
            quantity,
            outPrice: price,
            date: fullDateTime,
          });
        }

        // Sales invoice can only reach this handler while unpaid (guard above),
        // so paid_amount/remaining_amount/status stay at their unpaid defaults.
        db.prepare(
          `
          UPDATE sales_invoices
          SET customer_id = ?,
              invoice_name = ?,
              description = ?,             
              date = ?,
              subtotal = ?,
              discount = ?,
              tax = ?,
              net_total = ?,
              taxValue = ?,
              updated_by = ?
          WHERE id = ?
        `,
        ).run(
          newCustomerId,
          data.invoice_name || null,
          data.description || null,
          fullDateTime,
          newSubtotal,
          data.discount || 0,
          data.tax_rate || null,
          newNetTotal,
          data.taxValue || 0,
          data.id,
          data.updated_by,
        );

        // Customer party_history reconciliation for the invoice amount
        if (oldCustomerId && oldCustomerId === newCustomerId) {
          db.prepare(
            `
            UPDATE party_history
            SET amount = ?, note = ?
            WHERE invoice_id = ? AND invoice_type = 'sales' AND record_type = 'invoice'
          `,
          ).run(newNetTotal, `Sales Invoice #${data.id}`, data.id);
        } else {
          if (oldCustomerId) {
            db.prepare(
              `
              DELETE FROM party_history
              WHERE invoice_id = ? AND invoice_type = 'sales' AND record_type = 'invoice'
            `,
            ).run(data.id);
          }

          if (newCustomerId) {
            createPartyHistory(db, {
              party_type: "customer",
              party_id: newCustomerId,
              invoice_id: data.id,
              invoice_type: "sales",
              record_type: "invoice",
              movement_type: "increase",
              amount: newNetTotal,
              note: `Sales Invoice #${data.id}`,
            });
          }
        }
      });

      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  // DELETE
  ipcMain.handle("delete-sales-invoice", (event, id) => {
    try {
      const transaction = db.transaction(() => {
        const items = db
          .prepare(`SELECT * FROM sales_invoice_items WHERE invoice_id = ?`)
          .all(id);

        const invoice = db
          .prepare(`SELECT * FROM sales_invoices WHERE id = ?`)
          .get(id);

        if (!invoice) {
          throw new Error("SALES INVOICE NOT FOUND");
        }

        const reverseStock = db.prepare(`
          UPDATE products SET quantity = quantity + ? WHERE id = ?
        `);

        for (const item of items) {
          reverseStock.run(item.quantity || 0, item.product_id);
          const now = new Date();

          const date =
            now.getFullYear() +
            "-" +
            String(now.getMonth() + 1).padStart(2, "0") +
            "-" +
            String(now.getDate()).padStart(2, "0") +
            " " +
            String(now.getHours()).padStart(2, "0") +
            ":" +
            String(now.getMinutes()).padStart(2, "0") +
            ":" +
            String(now.getSeconds()).padStart(2, "0");
          createProductMovement(db, {
            product_id: item.product_id,
            reference_id: id,
            reference_type: "sales_invoice",
            action: "delete",
            type: "in",
            quantity: item.quantity,
            enterPrice: item.price,
            date,
          });
        }

        db.prepare(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`).run(
          id,
        );
        db.prepare(
          `
          DELETE FROM party_history
          WHERE invoice_id = ? AND invoice_type = 'sales'
        `,
        ).run(id);
        db.prepare(`DELETE FROM sales_invoices WHERE id = ?`).run(id);
      });

      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message || String(err) };
    }
  });

  // POS CHECKOUT
  ipcMain.handle("pos-checkout", (event, data) => {
    const roundCents = (value) => Math.round(Number(value || 0) * 100) / 100;
    const payments = Array.isArray(data.payments)
      ? data.payments
          .map((payment) => ({
            fundId: Number(payment.fundId || payment.fund_id),
            amount: Number(payment.amount || 0),
            amountFundCurrency: Number(
              payment.amount_fund_currency ||
                payment.amountFundCurrency ||
                payment.paymentInfundCurrency ||
                0,
            ),
            currencyCode: payment.currency_code,
            exchangeRate: Number(payment.exchange_rate || 1) || 1,
          }))
          .filter(
            (payment) =>
              payment.fundId &&
              payment.amount > 0 &&
              payment.amountFundCurrency > 0,
          )
      : [];

    if (!payments.length && data.fund_id && data.paymentInfundCurrency) {
      payments.push({
        fundId: Number(data.fund_id),
        amount: Number(data.net_total || 0),
        amountFundCurrency: Number(data.paymentInfundCurrency || 0),
        currencyCode: data.currency_code,
        exchangeRate: Number(data.exchange_rate || 1) || 1,
      });
    }

    const paidTotal = roundCents(
      payments.reduce((sum, payment) => sum + payment.amount, 0),
    );
    const invoiceTotal = Number(data.net_total || 0);

    if (!payments.length || Math.abs(paidTotal - invoiceTotal) > 0.01) {
      throw new Error("POS payments must exactly cover invoice total");
    }

    const insertInvoice = db.prepare(`
      INSERT INTO sales_invoices
      (customer_id, date, subtotal, discount, tax, net_total, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO sales_invoice_items
      (invoice_id, product_id, quantity, price, buyingPrice, total)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const updateStock = db.prepare(`
      UPDATE products SET quantity = quantity - ? WHERE id = ?
    `);

    const transaction = db.transaction(() => {
      const invoiceResult = insertInvoice.run(
        data.customer_id || null,
        data.date || new Date().toISOString(),
        data.subtotal || 0,
        data.discount || 0,
        data.tax_rate || 0,
        data.net_total || 0,
        data.created_by || null,
      );

      const invoiceId = invoiceResult.lastInsertRowid;

      for (const item of data.items) {
        const quantity = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const total = quantity * price;
        insertItem.run(
          invoiceId,
          item.id,
          quantity,
          price,
          item.costPrice,
          total,
        );
        updateStock.run(quantity, item.id);

        createProductMovement(db, {
          product_id: item.id,
          reference_id: invoiceId,
          reference_type: "sales_invoice",
          type: "out",
          action: "create",
          quantity,
          outPrice: price,
          date: data.date || new Date().toISOString(),
        });
      }

      if (data.customer_id) {
        createPartyHistory(db, {
          party_type: "customer",
          party_id: data.customer_id,
          invoice_id: invoiceId,
          invoice_type: "sales",
          record_type: "invoice",
          movement_type: "increase",
          amount: data.net_total,
          note: `POS Invoice #${invoiceId}`,
        });
      }

      for (const payment of payments) {
        const paymentId = createPayment(db, {
          type: "income",
          party_type: data.customer_id ? "customer" : "walk-in",
          party_id: data.customer_id || null,
          fund_id: payment.fundId,
          amount: payment.amount,
          amount_fund_currency: payment.amountFundCurrency,
          currency_code: payment.currencyCode,
          exchange_rate: payment.exchangeRate,
          effective_rate: payment.exchangeRate,
          invoice_id: invoiceId,
          invoice_type: "sales",
          note: `POS Invoice`,
          fundOperation: "add",
        });

        createFundHistory(db, {
          fund_id: payment.fundId,
          record_type: "payment",
          payment_id: paymentId,
          movement_type: "in",
          amount: payment.amountFundCurrency,
          note: `Payment for POS Invoice #${invoiceId}`,
        });

        if (data.customer_id) {
          createPartyHistory(db, {
            party_type: "customer",
            party_id: data.customer_id,
            invoice_type: "payment",
            record_type: "payment",
            movement_type: "decrease",
            payment_id: paymentId,
            amount: payment.amount,
            note: `Payment for POS Invoice #${invoiceId}`,
          });
        }
      }

      return invoiceId;
    });

    try {
      const invoiceId = transaction();
      return { success: true, invoiceId };
    } catch (err) {
      console.error(err);
      throw err;
    }
  });

  ipcMain.handle("print-receipt", async (event, data) => {
    console.log(data);
    const companySettings = db
      .prepare(
        `SELECT company_name, company_latin_name, language FROM company_settings LIMIT 1`,
      )
      .get();
    const language = getReceiptLanguage(
      data.language || companySettings?.language,
    );
    const labels = receiptLabels[language];
    const direction = language === "ar" ? "rtl" : "ltr";
    const companyName =
      companySettings?.company_name ||
      companySettings?.company_latin_name ||
      "POS System";

    const win = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });
    console.log(data);

    const itemsHtml = (data.items || [])
      .map(
        (item) => `
      <tr>
        <td class="item">${escapeHtml(item.name)}</td>
        <td class="center">${escapeHtml(item.quantity)}</td>
        <td class="right">${Number(item.price).toFixed(2)}</td>
        <td class="right">${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
  <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        @page { margin: 0; size: 80mm auto; }
        body { font-family: monospace; width: 270px; margin: 0; padding: 4mm; box-sizing: border-box; color: #000; direction: ${direction}; }
        .header { text-align: center; margin-bottom: 8px; }
        .header h1 { font-size: 16px; margin: 0; letter-spacing: 2px; }
        .header p { font-size: 12px; margin: 2px 0; }
        .line { border-top: 1px dashed #000; margin: 6px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: start; border-bottom: 1px solid #000; padding-bottom: 4px; }
        td { padding: 3px 0; border-bottom: 1px dotted #ccc; }
        .item { word-break: break-word; }
        .center { text-align: center; }
        .right { text-align: right; }
        .summary { margin-top: 8px; font-size: 13px; }
        .summary div { display: flex; justify-content: space-between; margin: 3px 0; }
        .total { border-top: 1px dashed #000; margin-top: 6px; padding-top: 4px; font-weight: bold; font-size: 14px; }
        .footer { text-align: center; font-size: 12px; margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${escapeHtml(companyName)}</h1>
        <p>${labels.invoice} #${escapeHtml(data.id)}</p>
        <p>${escapeHtml(data.date)}</p>
      </div>
      <div class="line"></div>
      <table>
        <thead>
          <tr>
            <th>${labels.item}</th>
            <th class="center">${labels.quantity}</th>
            <th class="right">${labels.price}</th>
            <th class="right">${labels.total}</th>
          </tr>
        </thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div class="line"></div>
      <div class="summary">
        <div><span>${labels.subtotal}</span><span>${escapeHtml(data.total)}</span></div>
        <div><span>${labels.paid}</span><span>${escapeHtml(data.received)}</span></div>
        <div><span>${labels.change}</span><span>${escapeHtml(data.change)}</span></div>
        <div class="total"><span>${labels.total}</span><span>${escapeHtml(data.total)}</span></div>
      </div>
      <div class="footer">${labels.thankYou} <br/> ${labels.visitAgain}</div>
    </body>
  </html>
  `;

    await win.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html),
    );

    win.webContents.print(
      {
        silent: true,
        printBackground: true,
        margins: { marginType: "none" },
        scaleFactor: 100,
      },
      () => win.close(),
    );
  });

  ipcMain.handle("print-sales-invoice", async (_, invoiceId) => {
    let printWindow = new BrowserWindow({
      width: 900,
      height: 1000,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    return new Promise((resolve, reject) => {
      printWindow.webContents.on("did-finish-load", () => {
        setTimeout(() => {
          printWindow.webContents.print(
            {
              silent: false,
              printBackground: true,
            },
            (success, failureReason) => {
              if (!success) {
                console.error(`Print failed: ${failureReason}`);
                resolve({ success: false, error: failureReason });
              } else {
                resolve({ success: true });
              }

              printWindow.destroy();
              printWindow = null;
            },
          );
        }, 600);
      });

      printWindow.webContents.on("did-fail-load", (e) => {
        printWindow.destroy();
        reject(new Error("Failed to load print route"));
      });

      const baseUrl =
        process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
      printWindow.loadURL(`${baseUrl}/print-sales/${invoiceId}`);
    });
  });
}
