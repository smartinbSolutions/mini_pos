const { ipcMain } = require("electron");
import db from "../db";
import createFundHistory from "../utils/createFundHistory";
import createPayment from "../utils/createPayment";
import createPartyHistory from "../utils/createPaymentHistory";
import createProductMovement from "../utils/createPorductMovment";

export default function registerPurchaseReturnIPC() {
  // CREATE
  ipcMain.handle("create-purchase-return", (event, data) => {
    try {
      const transaction = db.transaction(() => {
        if (
          !data.supplier_id ||
          !data.purchase_invoice_id ||
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

        const payment = data.payment || null;
        const isRefunded = !!payment;

        if (isRefunded) {
          if (!payment.fund_id) {
            throw new Error("FUND_REQUIRED");
          }
          if (!payment.amount || Number(payment.amount) <= 0) {
            throw new Error("INVALID_PAYMENT_AMOUNT");
          }
        }

        const dateOnly = data.date.slice(0, 10);
        const now = new Date();
        const time = now.toTimeString().slice(0, 8);
        const fullDateTime = `${dateOnly} ${time}`;

        const getOriginalItemQty = db.prepare(`
          SELECT quantity
          FROM purchase_invoice_items
          WHERE id = ?
        `);

        const getAlreadyReturnedQty = db.prepare(`
          SELECT COALESCE(SUM(quantity), 0) AS total_returned
          FROM purchase_return_items
          WHERE purchase_invoice_item_id = ?
        `);

        for (const item of data.items) {
          const quantityToReturnNow = Number(item.quantity || 0);

          if (!item.purchase_invoice_item_id || quantityToReturnNow <= 0) {
            throw new Error("INVALID ITEM DATA");
          }

          const originalRow = getOriginalItemQty.get(
            item.purchase_invoice_item_id
          );

          if (!originalRow) {
            throw new Error(
              `PRODUCT_NOT_FOUND_IN_ORIGINAL_INVOICE: ${item.product_id}`
            );
          }

          const returnedRow = getAlreadyReturnedQty.get(
            item.purchase_invoice_item_id
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
            INSERT INTO purchase_returns
            (
              purchase_invoice_id,
              supplier_id,
              invoice_name,
              description,
              date,
              subtotal,
              discount,
              tax,
              taxValue,
              net_total,
              created_by
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `
          )
          .run(
            data.purchase_invoice_id,
            data.supplier_id,
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
          INSERT INTO purchase_return_items
          (return_id, purchase_invoice_item_id, product_id, quantity, price, buyingPrice, total)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const updateStock = db.prepare(`
          UPDATE products
          SET quantity = quantity - ?
          WHERE id = ?
        `);

        for (const item of data.items) {
          const quantity = Number(item.quantity || 0);
          const price = Number(item.price || 0);
          const buyingPrice = Number(item.buyingPrice || price);

          if (!item.product_id || quantity <= 0 || price < 0) {
            throw new Error("INVALID ITEM DATA");
          }

          const total = quantity * price;

          insertItem.run(
            returnId,
            item.purchase_invoice_item_id,
            item.product_id,
            quantity,
            price,
            buyingPrice,
            total
          );

          updateStock.run(quantity, item.product_id);

          createProductMovement(db, {
            product_id: item.product_id,
            reference_id: returnId,
            reference_type: "purchase_return",
            type: "out",
            action: "return",
            quantity: quantity,
            enterPrice: price,
            date: fullDateTime,
          });
        }

        createPartyHistory(db, {
          party_type: "supplier",
          party_id: data.supplier_id,
          invoice_id: returnId,
          invoice_type: "purchase_return",
          record_type: "return",
          movement_type: "decrease",
          amount: netTotal,
          date: fullDateTime,
          note: `Purchase Return #${returnId} for Invoice #${data.purchase_invoice_id}`,
        });

        let insertPaymentId = null;

        if (isRefunded) {
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
            invoice_id: returnId,
            invoice_type: "purchase_return",
            note: `${payment.note || "Refund"} #${returnId}`,
            fundOperation: "add",
            date: fullDateTime,
          });

          createFundHistory(db, {
            fund_id: payment.fund_id,
            record_type: "payment",
            payment_id: insertPaymentId,
            movement_type: "in",
            amount: payment.collected_amount,
            date: fullDateTime,
            note: `Refund received for Purchase Return #${returnId}`,
          });
        }

        return {
          returnId,
          paymentId: insertPaymentId,
        };
      });

      return {
        success: true,
        ...transaction(),
      };
    } catch (err) {
      return {
        success: false,
        error: err.message || String(err),
        code: err.code,
      };
    }
  });
  // GET ALL
  ipcMain.handle("get-purchase-returns", (event, params = {}) => {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Number(params.limit) || 20);
    const offset = (page - 1) * limit;

    const { dateFrom, dateTo, supplierId, status, minTotal, maxTotal } = params;

    const whereConditions = [];
    const whereValues = [];

    if (dateFrom) {
      whereConditions.push("date(pr.date) >= date(?)");
      whereValues.push(dateFrom);
    }
    if (dateTo) {
      whereConditions.push("date(pr.date) <= date(?)");
      whereValues.push(dateTo);
    }
    if (supplierId) {
      whereConditions.push("pr.supplier_id = ?");
      whereValues.push(supplierId);
    }
    if (minTotal !== undefined && minTotal !== "" && minTotal !== null) {
      whereConditions.push("pr.net_total >= ?");
      whereValues.push(Number(minTotal));
    }
    if (maxTotal !== undefined && maxTotal !== "" && maxTotal !== null) {
      whereConditions.push("pr.net_total <= ?");
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
        pr.*,
  
        p.invoice_name AS purchase_invoice_name,
        p.date AS purchase_date,
  
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        creator.full_name AS created_by_name,
  
        COALESCE(
          SUM(pa.amount),
          0
        ) AS refunded_amount,
        pr.net_total - COALESCE(SUM(pa.amount), 0) AS remaining_amount,
  
        CASE
          WHEN COALESCE(SUM(pa.amount),0) >= pr.net_total
            THEN 'paid'
  
          WHEN COALESCE(SUM(pa.amount),0) > 0
            THEN 'partial'
  
          ELSE 'unpaid'
        END AS status
  
  
      FROM purchase_returns pr
  
  
  LEFT JOIN purchase_invoices p
  ON p.id = pr.purchase_invoice_id
  
    LEFT JOIN users creator
    ON creator.id = pr.created_by
  
      LEFT JOIN suppliers s
        ON s.id = pr.supplier_id
  
  
      LEFT JOIN payment_allocations pa
        ON pa.invoice_id = pr.id
       AND pa.invoice_type = 'purchase_return'
  
      ${whereClause}
  
      GROUP BY pr.id
  
      ${havingClause}
  
      ORDER BY pr.id DESC
  
  
      LIMIT ? OFFSET ?
      `
      )
      .all(...whereValues, ...havingValues, limit, offset);

    const { total } = db
      .prepare(
        `
      SELECT COUNT(*) AS total FROM (
        SELECT
          pr.id,
          CASE
            WHEN COALESCE(SUM(pa.amount),0) >= pr.net_total THEN 'paid'
            WHEN COALESCE(SUM(pa.amount),0) > 0 THEN 'partial'
            ELSE 'unpaid'
          END AS status
        FROM purchase_returns pr
        LEFT JOIN payment_allocations pa
          ON pa.invoice_id = pr.id
         AND pa.invoice_type = 'purchase_return'
        ${whereClause}
        GROUP BY pr.id
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
  });
  // GET ONE

  ipcMain.handle("get-purchase-return", (event, id) => {
    const returnInvoice = db
      .prepare(
        `
      SELECT 
        pr.*,
        s.name AS supplier_name,
        s.phone AS supplier_phone,
        t.rate AS tax_rate,
        creator.full_name AS created_by_name,

        COALESCE(pa_sum.paid_amount, 0) AS paid_amount,

        pr.net_total - COALESCE(pa_sum.paid_amount, 0) AS remaining_amount,

        CASE
          WHEN COALESCE(pa_sum.paid_amount, 0) >= pr.net_total THEN 'paid'
          WHEN COALESCE(pa_sum.paid_amount, 0) > 0 THEN 'partial'
          ELSE 'unpaid'
        END AS status

      FROM purchase_returns pr

      LEFT JOIN suppliers s 
        ON s.id = pr.supplier_id

      LEFT JOIN taxes t 
        ON t.id = pr.tax
        
    LEFT JOIN users creator
    ON creator.id = pr.created_by

      LEFT JOIN (
        SELECT 
          invoice_id,
          SUM(amount) AS paid_amount
        FROM payment_allocations
        WHERE invoice_type = 'purchase_return'
        GROUP BY invoice_id
      ) pa_sum 
        ON pa_sum.invoice_id = pr.id

      WHERE pr.id = ?
      `
      )
      .get(id);

    if (!returnInvoice) return null;

    const items = db
      .prepare(
        `
      SELECT 
        pri.*,
        p.name AS name

      FROM purchase_return_items pri

      LEFT JOIN products p 
        ON p.id = pri.product_id

      WHERE pri.return_id = ?
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
        AND pa.invoice_type = 'purchase_return'

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
