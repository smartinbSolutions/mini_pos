import { ipcMain } from "electron";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";
import createProductMovement from "../utils/createPorductMovment";
import db from "../db";

export default function registerSalesReturnsIpc() {
  ipcMain.handle("create-sales-return", (event, data) => {
    try {
      const transaction = db.transaction(() => {
        if (
          !data.sales_invoice_id ||
          !data.date ||
          !Array.isArray(data.items) ||
          data.items.length === 0
        ) {
          throw new Error("ERROR ENTER DATA");
        }

        const subtotal = Number(data.subtotal || 0);
        const netTotal = Number(data.net_total || 0);
        const discount = Number(data.discount || 0);
        const tax = Number(data.tax || 0);

        if (subtotal <= 0 || netTotal <= 0) {
          throw new Error("INVALID TOTALS");
        }

        const payments = Array.isArray(data.payments) ? data.payments : [];
        const isRefunded = payments.length > 0;

        if (isRefunded) {
          for (const p of payments) {
            if (!p.fund_id) throw new Error("FUND_REQUIRED");
            if (!p.amount || Number(p.amount) <= 0) {
              throw new Error("INVALID_PAYMENT_AMOUNT");
            }
          }
        }

        const dateOnly = data.date.slice(0, 10);
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        const getOriginalItemQty = db.prepare(`
          SELECT quantity FROM sales_invoice_items WHERE id = ?
        `);
        const getAlreadyReturnedQty = db.prepare(`
          SELECT COALESCE(SUM(quantity),0) AS total_returned
          FROM sales_return_items WHERE sales_invoice_item_id = ?
        `);

        for (const item of data.items) {
          const quantityToReturnNow = Number(item.quantity || 0);

          if (!item.sales_invoice_item_id || quantityToReturnNow <= 0) {
            throw new Error("INVALID ITEM DATA");
          }

          const originalRow = getOriginalItemQty.get(
            item.sales_invoice_item_id
          );
          if (!originalRow) {
            throw new Error(
              `PRODUCT_NOT_FOUND_IN_ORIGINAL_INVOICE: ${item.product_id}`
            );
          }

          const returnedRow = getAlreadyReturnedQty.get(
            item.sales_invoice_item_id
          );
          const alreadyReturnedQty = returnedRow?.total_returned || 0;
          const maxAllowedToReturn = originalRow.quantity - alreadyReturnedQty;

          if (quantityToReturnNow > maxAllowedToReturn) {
            throw new Error(`EXCEEDED_RETURN_LIMIT: ${item.product_id}`);
          }
        }

        const returnResult = db
          .prepare(
            `
            INSERT INTO sales_returns
            (sales_invoice_id, customer_id, invoice_name, description, date, subtotal, discount, tax, taxValue, net_total, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(
            data.sales_invoice_id,
            data.customer_id || null,
            data.invoice_name || null,
            data.description || null,
            fullDateTime,
            subtotal,
            discount,
            tax,
            data.taxValue || 0,
            netTotal,
            data.created_by
          );

        const returnId = returnResult.lastInsertRowid;

        const insertItem = db.prepare(`
          INSERT INTO sales_return_items
          (return_id, sales_invoice_item_id, product_id, quantity, price, total)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        const updateStock = db.prepare(`
          UPDATE products SET quantity = quantity + ? WHERE id = ?
        `);

        for (const item of data.items) {
          const quantity = Number(item.quantity || 0);
          const price = Number(item.price || 0);
          const total = quantity * price;

          insertItem.run(
            returnId,
            item.sales_invoice_item_id,
            item.product_id,
            quantity,
            price,
            total
          );
          updateStock.run(quantity, item.product_id);

          createProductMovement(db, {
            product_id: item.product_id,
            reference_id: returnId,
            reference_type: "sales_return",
            type: "in",
            action: "return",
            quantity,
            enterPrice: price,
            date: fullDateTime,
          });
        }

        createPartyHistory(db, {
          party_type: "customer",
          party_id: data.customer_id || null,
          invoice_id: returnId,
          invoice_type: "sales_return",
          record_type: "invoice",
          movement_type: "decrease",
          amount: netTotal,
          date: fullDateTime,
          note: `Sales Return #${returnId} for Invoice #${data.sales_invoice_id}`,
        });

        // Refund out through the same funds the sale came in through —
        // one payment + fund history row per fund, mirroring the original
        // payment_allocations split instead of one lump refund.
        const insertPaymentIds = [];

        for (const p of payments) {
          const paymentId = createPayment(db, {
            type: p.type || "refund",
            party_type: "customer",
            party_id: data.customer_id || null,
            fund_id: p.fund_id,
            amount: p.amount,
            amount_fund_currency: p.amount_fund_currency,
            currency_code: p.currency_code,
            exchange_rate: p.exchange_rate,
            effective_rate: p.effective_rate,
            invoice_id: returnId,
            invoice_type: "sales_return",
            note: `${p.note || "Refund"} #${returnId}`,
            fundOperation: "subtract",
            date: fullDateTime,
          });

          createFundHistory(db, {
            fund_id: p.fund_id,
            record_type: "payment",
            payment_id: paymentId,
            movement_type: "out",
            amount: p.amount_fund_currency,
            date: fullDateTime,
            note: `Refund paid out for Sales Return #${returnId}`,
          });

          insertPaymentIds.push(paymentId);
        }

        return { returnId, paymentIds: insertPaymentIds };
      });

      const result = transaction();
      return { success: true, ...result };
    } catch (err) {
      return {
        success: false,
        error: err.message || String(err),
        code: err.code,
      };
    }
  });

  ipcMain.handle("get-sales-returns", (event, params = {}) => {
    try {
      const page = Math.max(1, Number(params.page) || 1);
      const limit = Math.max(1, Number(params.limit) || 20);
      const offset = (page - 1) * limit;

      const { dateFrom, dateTo, customerId, status, minTotal, maxTotal } =
        params;

      const whereConditions = [];
      const whereValues = [];

      if (dateFrom) {
        whereConditions.push("date(sr.date) >= date(?)");
        whereValues.push(dateFrom);
      }
      if (dateTo) {
        whereConditions.push("date(sr.date) <= date(?)");
        whereValues.push(dateTo);
      }
      if (customerId) {
        whereConditions.push("sr.customer_id = ?");
        whereValues.push(customerId);
      }
      if (minTotal !== undefined && minTotal !== "" && minTotal !== null) {
        whereConditions.push("sr.net_total >= ?");
        whereValues.push(Number(minTotal));
      }
      if (maxTotal !== undefined && maxTotal !== "" && maxTotal !== null) {
        whereConditions.push("sr.net_total <= ?");
        whereValues.push(Number(maxTotal));
      }

      const whereClause = whereConditions.length
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

      const havingClause = status ? `HAVING status = ?` : "";
      const havingValues = status ? [status] : [];

      const returns = db
        .prepare(
          `
        SELECT
          sr.*,
          c.name AS customer_name,
          c.phone AS customer_phone,
          si.invoice_name AS original_invoice_name,
          creator.full_name AS created_by_name,
  
          COALESCE(SUM(pa.amount), 0) AS refunded_amount, 
  
          sr.net_total - COALESCE(SUM(pa.amount), 0) AS remaining_amount,
  
          CASE
            WHEN COALESCE(SUM(pa.amount), 0) >= sr.net_total THEN 'paid' 
            WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'          
            ELSE 'unpaid'                                                
          END AS status
  
        FROM sales_returns sr
        LEFT JOIN customers c ON c.id = sr.customer_id
            LEFT JOIN users creator
    ON creator.id = sr.created_by
        LEFT JOIN sales_invoices si ON si.id = sr.sales_invoice_id
        LEFT JOIN payment_allocations pa 
          ON pa.invoice_id = sr.id 
         AND pa.invoice_type = 'sales_return'
  
         ${whereClause}
  
        GROUP BY sr.id
  
        ${havingClause}
  
        ORDER BY sr.id DESC
        LIMIT ? OFFSET ?
        `
        )
        .all(...whereValues, ...havingValues, limit, offset);

      const { total } = db
        .prepare(
          `
        SELECT COUNT(*) AS total FROM (
          SELECT
            sr.id,
            CASE
              WHEN COALESCE(SUM(pa.amount), 0) >= sr.net_total THEN 'paid'
              WHEN COALESCE(SUM(pa.amount), 0) > 0 THEN 'partial'
              ELSE 'unpaid'
            END AS status
          FROM sales_returns sr
          LEFT JOIN payment_allocations pa
            ON pa.invoice_id = sr.id
           AND pa.invoice_type = 'sales_return'
          ${whereClause}
          GROUP BY sr.id
          ${havingClause}
        )
        `
        )
        .get(...whereValues, ...havingValues).total;

      return {
        data: returns,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (err) {
      return { data: [], total: 0, totalPages: 1, error: err.message };
    }
  });

  ipcMain.handle("get-sales-return-by-id", (event, id) => {
    const returnInvoice = db
      .prepare(
        `
      SELECT
        sr.*,

        c.name AS customer_name,
        c.phone AS customer_phone,
        creator.full_name AS created_by_name,

        t.rate AS tax_rate,

        si.invoice_name AS original_invoice_name,

        COALESCE(pa_sum.paid_amount, 0) AS paid_amount,

        sr.net_total - COALESCE(pa_sum.paid_amount, 0) AS remaining_amount,

        CASE
          WHEN COALESCE(pa_sum.paid_amount, 0) >= sr.net_total THEN 'paid'
          WHEN COALESCE(pa_sum.paid_amount, 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status

      FROM sales_returns sr

      LEFT JOIN customers c
        ON c.id = sr.customer_id

    LEFT JOIN users creator
    ON creator.id = sr.created_by

      LEFT JOIN taxes t
        ON t.id = sr.tax

      LEFT JOIN sales_invoices si
        ON si.id = sr.sales_invoice_id

      LEFT JOIN (
        SELECT
          invoice_id,
          SUM(amount) AS paid_amount
        FROM payment_allocations
        WHERE invoice_type = 'sales_return'
        GROUP BY invoice_id
      ) pa_sum
        ON pa_sum.invoice_id = sr.id

      WHERE sr.id = ?
      `
      )
      .get(id);

    if (!returnInvoice) return null;

    const items = db
      .prepare(
        `
      SELECT
        sri.*,

        p.name AS name

      FROM sales_return_items sri

      LEFT JOIN products p
        ON p.id = sri.product_id

      WHERE sri.return_id = ?
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

        f.name AS fund_name,

        c.code AS fund_currency_code,
        c.symbol AS fund_currency_symbol

      FROM payment_allocations pa

      LEFT JOIN payments p
        ON p.id = pa.payment_id

      LEFT JOIN funds f
        ON f.id = p.fund_id

      LEFT JOIN currencies c
        ON c.id = f.currency_id

      WHERE pa.invoice_id = ?
        AND pa.invoice_type = 'sales_return'

      ORDER BY pa.id ASC
      `
      )
      .all(id);

    return {
      ...returnInvoice,
      items,
      allocations,
    };
  });
}
