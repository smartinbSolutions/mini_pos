const { ipcMain, BrowserWindow } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";
import createProductMovement from "../utils/createPorductMovment";
import {
  buildDefaultInvoiceName,
  buildDefaultPaymentNote,
} from "../utils/helpers";
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

        const dateOnly = data.date.slice(0, 10);
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        // ---- Invoice-level tax — never trust a client-sent rate ----
        const invoiceTaxId = data.tax || null;
        let invoiceTaxRate = 0;

        if (invoiceTaxId) {
          const taxRow = db
            .prepare(
              `SELECT rate FROM taxes WHERE id = ? AND category IN ('invoice', 'both')`
            )
            .get(invoiceTaxId);
          if (!taxRow) {
            throw new Error("INVALID_TAX_ID");
          }
          invoiceTaxRate = Number(taxRow.rate || 0);
        }

        const invoiceDiscountRate = Number(data.discount_rate || 0);

        // ---- Per-item cascade — sale price is sourced from whichever unit
        // was selected (each unit has its own registered sale_price, unlike
        // purchase where only the base has a real cost and alt units are
        // derived by multiplication). quantity/price stored are always
        // BASE-UNIT — re-derived server-side, never trusted from client. ----
        const preparedItems = [];
        let subtotal = 0;
        let itemDiscountTotal = 0;
        let itemTaxTotal = 0;

        for (const item of data.items) {
          const enteredQuantity = Number(item.entered_quantity || 0);
          const enteredPrice = Number(item.entered_price || 0);
          const factor = Number(item.unit_conversion_factor || 1);

          if (!item.product_id || enteredQuantity <= 0 || enteredPrice < 0) {
            throw new Error("INVALID ITEM DATA");
          }

          const baseQuantity = enteredQuantity * factor;
          const basePrice = factor > 0 ? enteredPrice / factor : enteredPrice;
          const total = enteredQuantity * enteredPrice;

          const discountRate = Number(item.discount_rate || 0);
          const discount = Number(((total * discountRate) / 100).toFixed(2));
          const afterDiscount = total - discount;

          let taxId = null;
          let taxRate = 0;

          if (item.tax_id) {
            const taxRow = db
              .prepare(
                `SELECT rate FROM taxes WHERE id = ? AND category IN ('product', 'both')`
              )
              .get(item.tax_id);
            if (!taxRow) {
              throw new Error("INVALID_ITEM_TAX_ID");
            }
            taxId = item.tax_id;
            taxRate = Number(taxRow.rate || 0);
          }

          const taxValue = Number(((afterDiscount * taxRate) / 100).toFixed(2));

          subtotal += total;
          itemDiscountTotal += discount;
          itemTaxTotal += taxValue;

          // buyingPrice: the product's BASE-unit cost at time of sale — never
          // shown/editable in the UI, saved purely for later profit/COGS
          // reporting. Re-derived here from the product row, not trusted
          // from the client, same principle as everything else.
          const productRow = db
            .prepare(`SELECT costPrice FROM products WHERE id = ?`)
            .get(item.product_id);
          const buyingPrice = Number(productRow?.costPrice || 0);

          preparedItems.push({
            product_id: item.product_id,
            product_name: item.name || null,
            unit_name: item.unit_name || null,
            unit_conversion_factor: factor,
            baseQuantity,
            basePrice,
            buyingPrice,
            total,
            discount_rate: discountRate,
            discount,
            tax_id: taxId,
            tax_rate: taxRate,
            taxValue,
            description: item.description || null,
          });
        }

        subtotal = Number(subtotal.toFixed(2));
        itemDiscountTotal = Number(itemDiscountTotal.toFixed(2));
        itemTaxTotal = Number(itemTaxTotal.toFixed(2));

        if (subtotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        const afterItemDiscounts = subtotal - itemDiscountTotal;

        const invoiceDiscount = Number(
          ((afterItemDiscounts * invoiceDiscountRate) / 100).toFixed(2)
        );
        const afterInvoiceDiscount = afterItemDiscounts - invoiceDiscount;

        const invoiceTaxValue = Number(
          ((afterInvoiceDiscount * invoiceTaxRate) / 100).toFixed(2)
        );

        const netTotal = Number(
          Math.max(
            0,
            afterInvoiceDiscount + itemTaxTotal + invoiceTaxValue
          ).toFixed(2)
        );

        // ---- Payment validation (unchanged) ----
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

        // ---- Insert invoice header ----
        const invoiceResult = db
          .prepare(
            `
            INSERT INTO sales_invoices
            (
              customer_id, invoice_name, description, date,
              subtotal, discount, discount_rate,
              tax, taxRate, taxValue,
              net_total, created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(
            data.customer_id || null,
            data.invoice_name?.trim() || null,
            data.description?.trim() || null,
            fullDateTime,
            subtotal,
            invoiceDiscount,
            invoiceDiscountRate,
            invoiceTaxId,
            invoiceTaxRate,
            invoiceTaxValue,
            netTotal,
            data.created_by || ""
          );

        const invoiceId = invoiceResult.lastInsertRowid;

        let invoiceName = data.invoice_name?.trim();
        if (!invoiceName) {
          invoiceName = buildDefaultInvoiceName(db, "sales", invoiceId);
          db.prepare(
            `UPDATE sales_invoices SET invoice_name = ? WHERE id = ?`
          ).run(invoiceName, invoiceId);
        }

        // ---- Insert items + reduce stock + record movements ----
        const insertItem = db.prepare(`
          INSERT INTO sales_invoice_items
          (
            invoice_id, product_id, quantity, price, buyingPrice, total,
            product_name, unit_name, unit_conversion_factor,
            tax_id, tax_rate, taxValue,
            discount, discount_rate, description
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStock = db.prepare(`
          UPDATE products
          SET quantity = quantity - ?
          WHERE id = ?
        `);

        for (const item of preparedItems) {
          insertItem.run(
            invoiceId,
            item.product_id,
            item.baseQuantity,
            item.basePrice,
            item.buyingPrice,
            item.total,
            item.product_name,
            item.unit_name,
            item.unit_conversion_factor,
            item.tax_id,
            item.tax_rate,
            item.taxValue,
            item.discount,
            item.discount_rate,
            item.description
          );

          updateStock.run(item.baseQuantity, item.product_id);

          createProductMovement(db, {
            product_id: item.product_id,
            reference_id: invoiceId,
            reference_type: "sale",
            type: "out",
            action: "create",
            quantity: item.baseQuantity,
            outPrice: item.basePrice,
            date: fullDateTime,
          });
        }

        // ---- Party history, payment/credit (unchanged) ----
        if (data.customer_id) {
          createPartyHistory(db, {
            party_type: "customer",
            party_id: data.customer_id,
            invoice_id: invoiceId,
            invoice_type: "sales",
            record_type: "invoice",
            movement_type: "increase",
            amount: netTotal,
            date: fullDateTime,
            note: invoiceName,
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
            note:
              payment.note ||
              buildDefaultPaymentNote(db, "payment", invoiceName),
            fundOperation: "add",
            date: fullDateTime,
            created_by: data.created_by,
          });

          createFundHistory(db, {
            fund_id: payment.fund_id,
            record_type: "payment",
            payment_id: insertPaymentId,
            movement_type: "in",
            amount: payment.collected_amount,
            date: fullDateTime,
            note: buildDefaultPaymentNote(db, "payment", invoiceName),
          });
        }

        return {
          invoiceId,
          invoiceName,
          paymentId: insertPaymentId,
          creditApplied,
        };
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

    const whereConditions = [];
    const whereParams = [];
    const havingConditions = [];
    const havingParams = [];

    if (params.dateFrom) {
      whereConditions.push("DATE(s.date) >= ?");
      whereParams.push(params.dateFrom);
    }
    if (params.dateTo) {
      whereConditions.push("DATE(s.date) <= ?");
      whereParams.push(params.dateTo);
    }
    if (params.customerId) {
      whereConditions.push("s.customer_id = ?");
      whereParams.push(params.customerId);
    }
    if (
      params.minTotal !== undefined &&
      params.minTotal !== "" &&
      params.minTotal !== null
    ) {
      whereConditions.push("s.net_total >= ?");
      whereParams.push(Number(params.minTotal));
    }
    if (
      params.maxTotal !== undefined &&
      params.maxTotal !== "" &&
      params.maxTotal !== null
    ) {
      whereConditions.push("s.net_total <= ?");
      whereParams.push(Number(params.maxTotal));
    }

    if (params.status) {
      havingConditions.push(`
        CASE
          WHEN COALESCE(SUM(pa.amount), 0) >= s.net_total THEN 'paid'
          WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END = ?
      `);
      havingParams.push(params.status);
    }

    if (params.returnStatus) {
      havingConditions.push(`
        CASE
          WHEN COALESCE(ret.total_returned, 0) <= 0 THEN 'none'
          WHEN ret.total_returned >= ret.total_quantity THEN 'full'
          ELSE 'partial'
        END = ?
      `);
      havingParams.push(params.returnStatus);
    }

    const whereClause = whereConditions.length
      ? `WHERE ${whereConditions.join(" AND ")}`
      : "";
    const havingClause = havingConditions.length
      ? `HAVING ${havingConditions.join(" AND ")}`
      : "";

    const invoices = db
      .prepare(
        `
      SELECT
        s.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        creator.full_name AS created_by_name,
        updater.full_name AS updated_by_name,
        t.name AS tax_name,
        COALESCE(SUM(pa.amount), 0) AS paid_amount,
  
        COALESCE(itemAgg.item_tax_total, 0) AS item_tax_total,
        COALESCE(itemAgg.item_discount_total, 0) AS item_discount_total,
        (s.taxValue + COALESCE(itemAgg.item_tax_total, 0)) AS total_tax_value,
        (s.discount + COALESCE(itemAgg.item_discount_total, 0)) AS total_discount_value,
  
        s.net_total - COALESCE(SUM(pa.amount), 0) AS remaining_amount,
  
        CASE
          WHEN COALESCE(SUM(pa.amount), 0) >= s.net_total THEN 'paid'
          WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status,
  
        CASE
          WHEN COALESCE(ret.total_returned, 0) <= 0 THEN 'none'
          WHEN ret.total_returned >= ret.total_quantity THEN 'full'
          ELSE 'partial'
        END AS return_status
  
      FROM sales_invoices s
  
      LEFT JOIN customers c
        ON c.id = s.customer_id
  
      LEFT JOIN taxes t
        ON t.id = s.tax
  
      LEFT JOIN payment_allocations pa
        ON pa.invoice_id = s.id
       AND pa.invoice_type = 'sales'
  
      LEFT JOIN users creator
        ON creator.id = s.created_by
  
      LEFT JOIN users updater
        ON updater.id = s.updated_by
  
      LEFT JOIN (
        SELECT
          invoice_id,
          SUM(taxValue) AS item_tax_total,
          SUM(discount) AS item_discount_total
        FROM sales_invoice_items
        GROUP BY invoice_id
      ) itemAgg ON itemAgg.invoice_id = s.id
  
      LEFT JOIN (
        SELECT
          si.invoice_id,
          SUM(si.quantity) AS total_quantity,
          SUM(COALESCE(sri.returned_qty, 0)) AS total_returned
        FROM sales_invoice_items si
        LEFT JOIN (
          SELECT sales_invoice_item_id, SUM(quantity) AS returned_qty
          FROM sales_return_items
          GROUP BY sales_invoice_item_id
        ) sri ON sri.sales_invoice_item_id = si.id
        GROUP BY si.invoice_id
      ) ret ON ret.invoice_id = s.id
  
         ${whereClause}
      GROUP BY s.id
         ${havingClause}
  
      ORDER BY s.id DESC
  
      LIMIT ? OFFSET ?
      `
      )
      .all(...whereParams, ...havingParams, limit, offset);

    const { total } = db
      .prepare(
        `
        SELECT COUNT(*) AS total FROM (
          SELECT s.id
          FROM sales_invoices s
          LEFT JOIN payment_allocations pa
            ON pa.invoice_id = s.id AND pa.invoice_type = 'sales'
          LEFT JOIN (
            SELECT
              si.invoice_id,
              SUM(si.quantity) AS total_quantity,
              SUM(COALESCE(sri.returned_qty, 0)) AS total_returned
            FROM sales_invoice_items si
            LEFT JOIN (
              SELECT sales_invoice_item_id, SUM(quantity) AS returned_qty
              FROM sales_return_items
              GROUP BY sales_invoice_item_id
            ) sri ON sri.sales_invoice_item_id = si.id
            GROUP BY si.invoice_id
          ) ret ON ret.invoice_id = s.id
          ${whereClause}
          GROUP BY s.id
          ${havingClause}
        ) t
        `
      )
      .get(...whereParams, ...havingParams);

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
      t.name AS tax_name,
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
    `
      )
      .get(id);

    if (!invoice) return null;

    const items = db
      .prepare(
        `
    SELECT
      si.*,
      p.name,
      t.name AS tax_name,
  
      COALESCE(r.returned_quantity, 0) AS returned_quantity,
  
      (
        si.quantity - COALESCE(r.returned_quantity, 0)
      ) AS available_quantity,
  
      (
        (si.quantity - COALESCE(r.returned_quantity, 0))
        * (
            (si.price - (si.discount / NULLIF(si.quantity, 0)))
            - si.buyingPrice
          )
      ) AS item_profit,
  
      (
        (si.price - (si.discount / NULLIF(si.quantity, 0)))
        - si.buyingPrice
      ) AS item_profit_per_unit,
  
      CASE
        WHEN si.price > 0 THEN
          ROUND(
            (
              (
                (si.price - (si.discount / NULLIF(si.quantity, 0)))
                - si.buyingPrice
              ) / si.price
            ) * 100,
            2
          )
        ELSE 0
      END AS item_margin_percent
  
    FROM sales_invoice_items si
  
    LEFT JOIN products p
    ON p.id = si.product_id
  
    LEFT JOIN taxes t
    ON t.id = si.tax_id
  
    LEFT JOIN (
    SELECT
      sales_invoice_item_id,
      SUM(quantity) AS returned_quantity
    FROM sales_return_items
    GROUP BY sales_invoice_item_id
    ) r
    ON r.sales_invoice_item_id = si.id
  
    WHERE si.invoice_id = ?
    `
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
    `
      )
      .all(id);

    // ---- Invoice-level profit summary, derived from items (never trusted
    // from client). Revenue/cogs computed on the DISCOUNTED per-unit price
    // (item-level discount), restricted to available_quantity (post-return).
    // Invoice-level discount is then prorated by the same
    // available/original-quantity ratio used everywhere else in this
    // summary, so a partial return doesn't overstate the discount credited
    // against units that were actually given back. ----
    let itemLevelRevenue = 0;
    let proratedInvoiceDiscount = 0;

    const totalOriginalQuantity = items.reduce(
      (sum, i) => sum + Number(i.quantity || 0),
      0
    );
    const invoiceDiscountTotal = Number(invoice.discount || 0);

    for (const i of items) {
      const quantity = Number(i.quantity || 0);
      const availableQuantity = Number(i.available_quantity || 0);

      const discountPerUnit =
        quantity > 0 ? Number(i.discount || 0) / quantity : 0;
      const discountedPrice = Number(i.price || 0) - discountPerUnit;
      itemLevelRevenue += availableQuantity * discountedPrice;

      // This item's share of the invoice-level discount, prorated by its
      // share of the invoice's total original quantity, then scaled down
      // further by however much of it is still actually sold.
      const itemShareOfInvoiceDiscount =
        totalOriginalQuantity > 0
          ? (quantity / totalOriginalQuantity) * invoiceDiscountTotal
          : 0;
      const perUnitInvoiceDiscount =
        quantity > 0 ? itemShareOfInvoiceDiscount / quantity : 0;
      proratedInvoiceDiscount += perUnitInvoiceDiscount * availableQuantity;
    }

    const revenue = Math.max(0, itemLevelRevenue - proratedInvoiceDiscount);

    const cogs = items.reduce(
      (sum, i) =>
        sum + Number(i.available_quantity) * Number(i.buyingPrice || 0),
      0
    );

    const grossProfit = Number((revenue - cogs).toFixed(2));
    const marginPercent =
      revenue > 0 ? Number(((grossProfit / revenue) * 100).toFixed(2)) : 0;

    return {
      ...invoice,
      items,
      allocations,
      profitSummary: {
        revenue: Number(revenue.toFixed(2)),
        cogs: Number(cogs.toFixed(2)),
        grossProfit,
        marginPercent,
      },
    };
  });

  // UPDATE
  ipcMain.handle("update-sales-invoice", (event, data) => {
    if (
      !data.id ||
      !data.date ||
      !Array.isArray(data.items) ||
      data.items.length === 0
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

        const hasReturn = db
          .prepare(
            `
            SELECT 1
            FROM sales_return_items sri
            JOIN sales_invoice_items sii ON sii.id = sri.sales_invoice_item_id
            WHERE sii.invoice_id = ?
            LIMIT 1
          `
          )
          .get(data.id);

        if (hasReturn) {
          throw new Error("CANNOT_MODIFY_INVOICE_WITH_RETURN");
        }

        const oldCustomerId = oldInvoice.customer_id || null;
        const newCustomerId = data.customer_id || null;

        // ---- Resolve invoice-level tax — never trust a client-sent rate ----
        const invoiceTaxId = data.tax || null;
        let invoiceTaxRate = 0;

        if (invoiceTaxId) {
          const taxRow = db
            .prepare(
              `SELECT rate FROM taxes WHERE id = ? AND category IN ('invoice', 'both')`
            )
            .get(invoiceTaxId);
          if (!taxRow) {
            throw new Error("INVALID_TAX_ID");
          }
          invoiceTaxRate = Number(taxRow.rate || 0);
        }

        const invoiceDiscountRate = Number(data.discount_rate || 0);

        // ---- Per-item cascade, recomputed from raw inputs only ----
        const preparedItems = [];
        let subtotal = 0;
        let itemDiscountTotal = 0;
        let itemTaxTotal = 0;

        for (const item of data.items) {
          if (!item.product_id) continue;

          const enteredQuantity = Number(item.entered_quantity || 0);
          const enteredPrice = Number(item.entered_price || 0);
          const factor = Number(item.unit_conversion_factor || 1);

          if (enteredQuantity <= 0 || enteredPrice < 0) {
            throw new Error("INVALID ITEM DATA");
          }

          const baseQuantity = enteredQuantity * factor;
          const basePrice = factor > 0 ? enteredPrice / factor : enteredPrice;
          const total = enteredQuantity * enteredPrice;

          const discountRate = Number(item.discount_rate || 0);
          const discount = Number(((total * discountRate) / 100).toFixed(2));
          const afterDiscount = total - discount;

          let taxId = null;
          let taxRate = 0;

          if (item.tax_id) {
            const taxRow = db
              .prepare(
                `SELECT rate FROM taxes WHERE id = ? AND category IN ('product', 'both')`
              )
              .get(item.tax_id);
            if (!taxRow) {
              throw new Error("INVALID_ITEM_TAX_ID");
            }
            taxId = item.tax_id;
            taxRate = Number(taxRow.rate || 0);
          }

          const taxValue = Number(((afterDiscount * taxRate) / 100).toFixed(2));

          subtotal += total;
          itemDiscountTotal += discount;
          itemTaxTotal += taxValue;

          // buyingPrice: base-unit cost at time of edit — re-derived from the
          // product row, never trusted from the client.
          const productRow = db
            .prepare(`SELECT costPrice FROM products WHERE id = ?`)
            .get(item.product_id);
          const buyingPrice = Number(productRow?.costPrice || 0);

          preparedItems.push({
            product_id: item.product_id,
            product_name: item.name || null,
            unit_name: item.unit_name || null,
            unit_conversion_factor: factor,
            baseQuantity,
            basePrice,
            buyingPrice,
            total,
            discount_rate: discountRate,
            discount,
            tax_id: taxId,
            tax_rate: taxRate,
            taxValue,
            description: item.description || null,
          });
        }

        subtotal = Number(subtotal.toFixed(2));
        itemDiscountTotal = Number(itemDiscountTotal.toFixed(2));
        itemTaxTotal = Number(itemTaxTotal.toFixed(2));

        if (subtotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        const afterItemDiscounts = subtotal - itemDiscountTotal;

        const invoiceDiscount = Number(
          ((afterItemDiscounts * invoiceDiscountRate) / 100).toFixed(2)
        );
        const afterInvoiceDiscount = afterItemDiscounts - invoiceDiscount;

        const invoiceTaxValue = Number(
          ((afterInvoiceDiscount * invoiceTaxRate) / 100).toFixed(2)
        );

        const netTotal = Number(
          Math.max(
            0,
            afterInvoiceDiscount + itemTaxTotal + invoiceTaxValue
          ).toFixed(2)
        );

        // ---- Reverse old stock, delete old items/movements ----
        const oldItems = db
          .prepare(`SELECT * FROM sales_invoice_items WHERE invoice_id = ?`)
          .all(data.id);

        const reverseStock = db.prepare(`
          UPDATE products SET quantity = quantity + ? WHERE id = ?
        `);
        const applyStock = db.prepare(`
          UPDATE products SET quantity = quantity - ? WHERE id = ?
        `);

        for (const item of oldItems) {
          reverseStock.run(item.quantity || 0, item.product_id);
        }

        db.prepare(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`).run(
          data.id
        );
        db.prepare(
          `
          DELETE FROM product_movements
          WHERE reference_type = 'sale' AND reference_id = ?
        `
        ).run(data.id);

        // ---- Insert new items + apply stock + record movements ----
        const insertItem = db.prepare(`
          INSERT INTO sales_invoice_items
          (
            invoice_id, product_id, quantity, price, buyingPrice, total,
            product_name, unit_name, unit_conversion_factor,
            tax_id, tax_rate, taxValue,
            discount, discount_rate, description
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of preparedItems) {
          insertItem.run(
            data.id,
            item.product_id,
            item.baseQuantity,
            item.basePrice,
            item.buyingPrice,
            item.total,
            item.product_name,
            item.unit_name,
            item.unit_conversion_factor,
            item.tax_id,
            item.tax_rate,
            item.taxValue,
            item.discount,
            item.discount_rate,
            item.description
          );

          applyStock.run(item.baseQuantity, item.product_id);

          createProductMovement(db, {
            product_id: item.product_id,
            reference_id: data.id,
            reference_type: "sale",
            action: "update",
            type: "out",
            quantity: item.baseQuantity,
            outPrice: item.basePrice,
            date: fullDateTime,
          });
        }

        // ---- Update invoice header ----
        const invoiceName =
          data.invoice_name?.trim() || oldInvoice.invoice_name;

        db.prepare(
          `
          UPDATE sales_invoices
          SET customer_id = ?,
              invoice_name = ?,
              description = ?,
              date = ?,
              subtotal = ?,
              discount = ?,
              discount_rate = ?,
              tax = ?,
              taxRate = ?,
              taxValue = ?,
              net_total = ?,
              updated_by = ?
          WHERE id = ?
        `
        ).run(
          newCustomerId,
          invoiceName,
          data.description?.trim() || null,
          fullDateTime,
          subtotal,
          invoiceDiscount,
          invoiceDiscountRate,
          invoiceTaxId,
          invoiceTaxRate,
          invoiceTaxValue,
          netTotal,
          data.updated_by,
          data.id
        );

        // ---- Party history ----
        if (oldCustomerId && oldCustomerId === newCustomerId) {
          db.prepare(
            `
            UPDATE party_history
            SET amount = ?, date = ?, note = ?
            WHERE invoice_id = ? AND invoice_type = 'sales' AND record_type = 'invoice'
          `
          ).run(netTotal, fullDateTime, invoiceName, data.id);
        } else {
          if (oldCustomerId) {
            db.prepare(
              `
              DELETE FROM party_history
              WHERE invoice_id = ? AND invoice_type = 'sales' AND record_type = 'invoice'
            `
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
              amount: netTotal,
              date: fullDateTime,
              note: invoiceName,
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
        const invoice = db
          .prepare(`SELECT * FROM sales_invoices WHERE id = ?`)
          .get(id);

        if (!invoice) {
          throw new Error("SALES INVOICE NOT FOUND");
        }

        const hasReturn = db
          .prepare(
            `
            SELECT 1
            FROM sales_return_items sri
            JOIN sales_invoice_items sii ON sii.id = sri.sales_invoice_item_id
            WHERE sii.invoice_id = ?
            LIMIT 1
          `
          )
          .get(id);

        if (hasReturn) {
          throw new Error("CANNOT_DELETE_INVOICE_WITH_RETURN");
        }

        const hasPayment = db
          .prepare(
            `
            SELECT 1 FROM payment_allocations
            WHERE invoice_id = ? AND invoice_type = 'sales'
            LIMIT 1
          `
          )
          .get(id);

        if (hasPayment) {
          throw new Error("CANNOT_DELETE_PAID_INVOICE");
        }

        const items = db
          .prepare(`SELECT * FROM sales_invoice_items WHERE invoice_id = ?`)
          .all(id);

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
            reference_type: "sale",
            action: "delete",
            type: "in",
            quantity: item.quantity,
            enterPrice: item.price,
            date,
          });
        }

        db.prepare(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`).run(
          id
        );
        db.prepare(
          `
          DELETE FROM party_history
          WHERE invoice_id = ? AND invoice_type = 'sales'
        `
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
                0
            ),
            currencyCode: payment.currency_code,
            exchangeRate: Number(payment.exchange_rate || 1) || 1,
          }))
          .filter(
            (payment) =>
              payment.fundId &&
              payment.amount > 0 &&
              payment.amountFundCurrency > 0
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
      payments.reduce((sum, payment) => sum + payment.amount, 0)
    );
    const invoiceTotal = Number(data.net_total || 0);

    if (!payments.length || Math.abs(paidTotal - invoiceTotal) > 0.01) {
      throw new Error("POS payments must exactly cover invoice total");
    }

    const rawDate = data.date || new Date().toISOString();
    const dateOnly = rawDate.slice(0, 10);
    const time = new Date().toTimeString().slice(0, 8);
    const fullDateTime = `${dateOnly} ${time}`;

    const insertInvoice = db.prepare(`
      INSERT INTO sales_invoices
      (customer_id, invoice_name, description, date, subtotal, discount, tax, net_total, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        data.invoice_name?.trim() || null,
        data.description || null,
        fullDateTime,
        data.subtotal || 0,
        data.discount || 0,
        data.tax_rate || 0,
        data.net_total || 0,
        data.created_by || null
      );

      const invoiceId = invoiceResult.lastInsertRowid;

      let invoiceName = data.invoice_name?.trim();
      if (!invoiceName) {
        invoiceName = buildDefaultInvoiceName(db, "sales", invoiceId);
        db.prepare(
          `UPDATE sales_invoices SET invoice_name = ? WHERE id = ?`
        ).run(invoiceName, invoiceId);
      }

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
          total
        );
        updateStock.run(quantity, item.id);

        createProductMovement(db, {
          product_id: item.id,
          reference_id: invoiceId,
          reference_type: "sale",
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
          amount: data.net_total,
          date: fullDateTime,
          note: invoiceName,
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
          note: invoiceName,
          fundOperation: "add",
          date: fullDateTime,
        });

        createFundHistory(db, {
          fund_id: payment.fundId,
          record_type: "payment",
          payment_id: paymentId,
          movement_type: "in",
          amount: payment.amountFundCurrency,
          date: fullDateTime,
          note: buildDefaultPaymentNote(db, "payment", invoiceName),
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
            date: fullDateTime,
            note: buildDefaultPaymentNote(db, "payment", invoiceName),
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

  ipcMain.handle("get-daily-pos-report", (event, params = {}) => {
    const date = params.date || new Date().toLocaleDateString("en-CA");
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const rows = db
      .prepare(
        `
      SELECT * FROM (
        SELECT
          s.id,
          s.date,
          s.net_total,
          s.net_total AS paid_amount,
          'paid' AS status,
          'sale' AS type,
          NULL AS sales_invoice_id
        FROM sales_invoices s
        WHERE DATE(s.date) = ? AND s.customer_id IS NULL
  
        UNION ALL
  
        SELECT
          r.id,
          r.date,
          r.net_total,
          r.net_total AS paid_amount,
          NULL AS status,
          'return' AS type,
          r.sales_invoice_id
        FROM sales_returns r
        WHERE DATE(r.date) = ? AND r.customer_id IS NULL
      )
      ORDER BY date DESC, id DESC
      LIMIT ? OFFSET ?
      `
      )
      .all(date, date, limit, offset);

    const { total } = db
      .prepare(
        `
        SELECT
          (SELECT COUNT(*) FROM sales_invoices WHERE DATE(date) = ? AND customer_id IS NULL) +
          (SELECT COUNT(*) FROM sales_returns WHERE DATE(date) = ? AND customer_id IS NULL) AS total
        `
      )
      .get(date, date);

    const salesStats = db
      .prepare(
        `
        SELECT COUNT(*) AS count, COALESCE(SUM(net_total), 0) AS total
        FROM sales_invoices
        WHERE DATE(date) = ? AND customer_id IS NULL
        `
      )
      .get(date);

    const returnStats = db
      .prepare(
        `
        SELECT COUNT(*) AS count, COALESCE(SUM(net_total), 0) AS total
        FROM sales_returns
        WHERE DATE(date) = ? AND customer_id IS NULL
        `
      )
      .get(date);

    const fundIn = db
      .prepare(
        `
        SELECT
          f.id AS fund_id,
          f.name AS fund_name,
          cur.code AS currency_code,
          cur.symbol AS currency_symbol,
          COALESCE(SUM(p.amount), 0) AS amount,
          COALESCE(SUM(p.amount_fund_currency), 0) AS fund_amount
        FROM payment_allocations pa
        JOIN payments p ON p.id = pa.payment_id
        JOIN funds f ON f.id = p.fund_id
        JOIN currencies cur ON cur.id = f.currency_id
        JOIN sales_invoices s ON s.id = pa.invoice_id
        WHERE pa.invoice_type = 'sales'
          AND DATE(s.date) = ?
          AND s.customer_id IS NULL
        GROUP BY f.id, f.name, cur.code, cur.symbol
        ORDER BY amount DESC
        `
      )
      .all(date);

    const fundOut = db
      .prepare(
        `
        SELECT
          f.id AS fund_id,
          f.name AS fund_name,
          cur.code AS currency_code,
          cur.symbol AS currency_symbol,
          COALESCE(SUM(p.amount), 0) AS amount,
          COALESCE(SUM(p.amount_fund_currency), 0) AS fund_amount
        FROM payment_allocations pa
        JOIN payments p ON p.id = pa.payment_id
        JOIN funds f ON f.id = p.fund_id
        JOIN currencies cur ON cur.id = f.currency_id
        JOIN sales_returns r ON r.id = pa.invoice_id
        WHERE pa.invoice_type = 'sales_return'
          AND DATE(r.date) = ?
          AND r.customer_id IS NULL
        GROUP BY f.id, f.name, cur.code, cur.symbol
        ORDER BY amount DESC
        `
      )
      .all(date);

    // Per-invoice fund allocations — batched for just the ids on this page,
    // not one query per row. Grouped by invoice_id + fund so a single
    // invoice split across two funds shows both lines.
    const saleIds = rows.filter((r) => r.type === "sale").map((r) => r.id);
    const returnIds = rows.filter((r) => r.type === "return").map((r) => r.id);

    const getInvoiceAllocations = (ids, invoiceType) => {
      if (!ids.length) return [];
      const placeholders = ids.map(() => "?").join(",");
      return db
        .prepare(
          `
          SELECT
            pa.invoice_id,
            f.id AS fund_id,
            f.name AS fund_name,
            cur.code AS currency_code,
            cur.symbol AS currency_symbol,
            COALESCE(SUM(p.amount), 0) AS amount,
            COALESCE(SUM(p.amount_fund_currency), 0) AS fund_amount
          FROM payment_allocations pa
          JOIN payments p ON p.id = pa.payment_id
          JOIN funds f ON f.id = p.fund_id
          JOIN currencies cur ON cur.id = f.currency_id
          WHERE pa.invoice_type = ? AND pa.invoice_id IN (${placeholders})
          GROUP BY pa.invoice_id, f.id, f.name, cur.code, cur.symbol
          `
        )
        .all(invoiceType, ...ids);
    };

    const saleAllocations = getInvoiceAllocations(saleIds, "sales").map(
      (a) => ({ ...a, rowType: "sale" })
    );
    const returnAllocations = getInvoiceAllocations(
      returnIds,
      "sales_return"
    ).map((a) => ({ ...a, rowType: "return" }));

    const allocationsByKey = {};
    for (const a of [...saleAllocations, ...returnAllocations]) {
      const key = `${a.rowType}-${a.invoice_id}`;
      if (!allocationsByKey[key]) allocationsByKey[key] = [];
      allocationsByKey[key].push({
        fund_id: a.fund_id,
        fund_name: a.fund_name,
        currency_code: a.currency_code,
        currency_symbol: a.currency_symbol,
        amount: a.amount,
        fund_amount: a.fund_amount,
      });
    }

    const rowsWithAllocations = rows.map((r) => ({
      ...r,
      allocations: allocationsByKey[`${r.type}-${r.id}`] || [],
    }));

    return {
      data: rowsWithAllocations,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      stats: {
        salesCount: salesStats.count,
        salesTotal: salesStats.total,
        returnCount: returnStats.count,
        returnTotal: returnStats.total,
        fundIn,
        fundOut,
      },
    };
  });

  ipcMain.handle("print-receipt", async (event, data) => {
    const companySettings = db
      .prepare(
        `SELECT company_name, company_latin_name, language FROM company_settings LIMIT 1`
      )
      .get();
    const language = getReceiptLanguage(
      data.language || companySettings?.language
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

    const itemsHtml = (data.items || [])
      .map(
        (item) => `
      <tr>
        <td class="item">${escapeHtml(item.name)}</td>
        <td class="center">${escapeHtml(item.quantity)}</td>
        <td class="right">${Number(item.price).toFixed(2)}</td>
        <td class="right">${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `
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
      "data:text/html;charset=utf-8," + encodeURIComponent(html)
    );

    win.webContents.print(
      {
        silent: true,
        printBackground: true,
        margins: { marginType: "none" },
        scaleFactor: 100,
      },
      () => win.close()
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
            }
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
