const { ipcMain, BrowserWindow } = require("electron");
import db from "../db";
export default function registerSalesInvoiceIPC() {
  // CREATE
  ipcMain.handle("create-sales-invoice", (event, data) => {
    if (!data.items || data.subtotal <= 0) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const invoiceResult = db
      .prepare(
        `
      INSERT INTO sales_invoices
      (customer_id, date, subtotal, discount, tax_id, net_total, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        data.customer_id || null,
        data.date,
        data.subtotal || 0,
        data.discount || 0,
        data.tax_id || null,
        data.net_total || 0,
        data.status || "unpaid",
      );

    const invoiceId = invoiceResult.lastInsertRowid;

    const insertItem = db.prepare(`
      INSERT INTO sales_invoice_items
      (invoice_id, product_id, quantity, price, total)
      VALUES (?, ?, ?, ?, ?)
    `);
    const updateStock = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ?
    `);
    for (const item of data.items) {
      const quantity = Number(item.quantity || 0);
      const price = Number(item.price || 0);
      const total = quantity * price;

      insertItem.run(invoiceId, item.product_id, quantity, price, total);

      updateStock.run(quantity, item.product_id);
    }
    const updateCustomer = db.prepare(`
        UPDATE customers
        SET total = total + ?,
            total_paid = total_paid + ?
        WHERE id = ?
      `);
    const customerPaid =
      data.status === "paid" ? Number(data.paid_amount || 0) : 0;

    updateCustomer.run(
      Number(data.net_total || 0),
      customerPaid,
      data.customer_id,
    );

    if (data.status === "paid") {
      const insertPayment = db.prepare(`
        INSERT INTO payments
        (type, party_type, party_id, fund_id, amount, note,
         currency_code, exchange_rate, amount_fund_currency)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     `);

      const updateFund = db.prepare(`
       UPDATE funds
       SET balance = balance + ?
       WHERE id = ?
     `);

      updateFund.run(data.paid_amount, data.fund_id);

      insertPayment.run(
        "income",
        "customer",
        data.customer_id || null,
        data.fund_id,
        data.paid_amount,
        `Sales Invoice #${invoiceId}`,
        data.currency_code,
        data.exchange_rate,
        data.paymentInfundCurrency,
      );
    }

    return { success: true, invoiceId };
  });

  // GET ALL
  ipcMain.handle("get-sales-invoices", () => {
    return db
      .prepare(
        `
      SELECT 
      sales_invoices.*, 
      customers.name AS customer_name,
      customers.phone AS customer_phone
      FROM sales_invoices  LEFT JOIN customers ON customers.id = sales_invoices.customer_id
      ORDER BY sales_invoices.id DESC
    `,
      )
      .all();
  });

  // GET ONE
  ipcMain.handle("get-sales-invoice", (event, id) => {
    const invoice = db
      .prepare(
        `
      SELECT sa.*,
       c.name AS customer_name,
       t.rate AS tax_rate
      FROM sales_invoices sa
      LEFT JOIN customers c ON c.id = sa.customer_id
      LEFT JOIN taxes t ON t.id = sa.tax_id
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
        p.name AS name
      FROM sales_invoice_items si
      LEFT JOIN products p ON p.id = si.product_id
      WHERE si.invoice_id = ?
    `,
      )
      .all(id);

    return {
      ...invoice,
      items,
    };
  });

  // UPDATE
  ipcMain.handle("update-sales-invoice", (event, data) => {
    if (data.subtotal <= 0 || data.net_total <= 0) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const transaction = db.transaction(() => {
      const oldItems = db
        .prepare(`SELECT * FROM sales_invoice_items WHERE invoice_id = ?`)
        .all(data.id);

      const reverseStock = db.prepare(`
      UPDATE products
      SET quantity = quantity + ?
      WHERE id = ?
    `);
      const oldInvoice = db
        .prepare(`SELECT * FROM sales_invoices WHERE id = ?`)
        .get(data.id);

      const oldPaid =
        oldInvoice.status === "paid" ? Number(oldInvoice.net_total || 0) : 0;

      db.prepare(
        `
      UPDATE customers
      SET total = total - ?,
          total_paid = total_paid - ?
      WHERE id = ?
    `,
      ).run(Number(oldInvoice.net_total || 0), oldPaid, oldInvoice.customer_id);

      for (const item of oldItems) {
        reverseStock.run(item.quantity || 0, item.product_id);
      }

      db.prepare(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`).run(
        data.id,
      );

      db.prepare(
        `
      UPDATE sales_invoices
      SET customer_id = ?,
         date = ?, 
         subtotal = ?,
         discount = ?,
         tax_id = ?,
         net_total = ?
      WHERE id = ?
    `,
      ).run(
        data.customer_id || null,
        data.date,
        data.subtotal || 0,
        data.discount || 0,
        data.tax_id || null,
        data.net_total || 0,
        data.id,
      );
      const insertItem = db.prepare(`
      INSERT INTO sales_invoice_items
      (invoice_id, product_id, quantity, price, total)
      VALUES (?, ?, ?, ?, ?)
    `);

      const addStock = db.prepare(`
      UPDATE products
      SET quantity = quantity - ?
      WHERE id = ?
    `);
      for (const item of data.items) {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);

        if (!item.product_id) continue;

        const total = quantity * price;

        insertItem.run(data.id, item.product_id, quantity, price, total);

        addStock.run(quantity, item.product_id);
      }
      const newPaid =
        data.status === "paid" ? Number(data.paid_amount || 0) : 0;
      const updateCustomer = db
        .prepare(
          `
        UPDATE customers
        SET total = total + ?,
            total_paid = total_paid + ?
        WHERE id = ?
      `,
        )
        .run(Number(data.net_total || 0), newPaid, data.customer_id);
    });

    try {
      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  // DELETE
  ipcMain.handle("delete-sales-invoice", (event, id) => {
    const transaction = db.transaction(() => {
      const items = db
        .prepare(`SELECT * FROM sales_invoice_items WHERE invoice_id = ?`)
        .all(id);

      const reverseStock = db.prepare(`
      UPDATE products
      SET quantity = quantity + ?
      WHERE id = ?
    `);
      const invoice = db
        .prepare(`SELECT * FROM sales_invoices WHERE id = ?`)
        .get(id);
      const updateCustomer = db.prepare(`
        UPDATE customers
        SET total = total - ?,
            total_paid = total_paid - ?
        WHERE id = ?
      `);

      const customerPaid =
        invoice.status === "paid" ? Number(invoice.net_total || 0) : 0;

      updateCustomer.run(
        Number(invoice.net_total || 0),
        customerPaid,
        invoice.customer_id,
      );

      for (const item of items) {
        reverseStock.run(item.quantity || 0, item.product_id);
      }

      db.prepare(`DELETE FROM sales_invoice_items WHERE invoice_id = ?`).run(
        id,
      );

      db.prepare(`DELETE FROM sales_invoices WHERE id = ?`).run(id);
    });

    try {
      transaction();
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle("pos-checkout", (event, data) => {
    const insertInvoice = db.prepare(`
    INSERT INTO sales_invoices
    (customer_id, date, subtotal, discount, tax_id, net_total, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

    const insertItem = db.prepare(`
    INSERT INTO sales_invoice_items
    (invoice_id, product_id, quantity, price, total)
    VALUES (?, ?, ?, ?, ?)
  `);

    const updateStock = db.prepare(`
    UPDATE products
    SET quantity = quantity - ?
    WHERE id = ?
  `);

    const insertPayment = db.prepare(`
    INSERT INTO payments
    (type, party_type, party_id, fund_id, amount, note, currency_code, exchange_rate, amount_fund_currency)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

    const updateFund = db.prepare(`
    UPDATE funds
    SET balance = balance + ?
    WHERE id = ?
  `);

    const transaction = db.transaction(() => {
      const invoiceResult = insertInvoice.run(
        data.customer_id || null,
        data.date || new Date().toISOString(),
        data.subtotal || 0,
        data.discount || 0,
        data.tax_id || null,
        data.net_total || 0,
        "paid",
      );

      const invoiceId = invoiceResult.lastInsertRowid;

      for (const item of data.items) {
        const quantity = Number(item.qty || 0);
        const price = Number(item.price || 0);
        const total = quantity * price;

        insertItem.run(invoiceId, item.id, quantity, price, total);
        updateStock.run(quantity, item.id);
      }

      insertPayment.run(
        "income",
        data.customer_id ? "customer" : "walk-in",
        data.customer_id || null,
        data.fund_id,
        data.paid_amount,
        `POS Invoice #${invoiceId}`,
        data.currency_code,
        data.exchange_rate,
        data.paymentInfundCurrency,
      );

      updateFund.run(data.paymentInfundCurrency, data.fund_id);

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
        <td class="item">${item.name}</td>
        <td class="center">${item.quantity}</td>
        <td class="right">${Number(item.price).toFixed(2)}</td>
        <td class="right">${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `,
      )
      .join("");

    const html = `
  <html>
    <head>
      <style>
        @page {
          margin: 0;
          size: 80mm auto;
        }

        body {
          font-family: monospace;
          width: 270px;
          margin: 0;
          padding: 4mm;
          box-sizing: border-box;
          color: #000;
        }

        .header {
          text-align: center;
          margin-bottom: 8px;
        }

        .header h1 {
          font-size: 16px;
          margin: 0;
          letter-spacing: 2px;
        }

        .header p {
          font-size: 12px;
          margin: 2px 0;
        }

        .line {
          border-top: 1px dashed #000;
          margin: 6px 0;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        th {
          text-align: left;
          border-bottom: 1px solid #000;
          padding-bottom: 4px;
        }

        td {
          padding: 3px 0;
          border-bottom: 1px dotted #ccc;
        }

        .item {
          word-break: break-word;
        }

        .center { text-align: center; }
        .right { text-align: right; }

        .summary {
          margin-top: 8px;
          font-size: 13px;
        }

        .summary div {
          display: flex;
          justify-content: space-between;
          margin: 3px 0;
        }

        .total {
          border-top: 1px dashed #000;
          margin-top: 6px;
          padding-top: 4px;
          font-weight: bold;
          font-size: 14px;
        }

        .footer {
          text-align: center;
          font-size: 12px;
          margin-top: 10px;
        }
      </style>
    </head>

    <body>

      <div class="header">
        <h1>MY STORE</h1>
        <p>Invoice #${data.id}</p>
        <p>${new Date().toLocaleString()}</p>
      </div>

      <div class="line"></div>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th class="center">Qty</th>
            <th class="right">Price</th>
            <th class="right">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="line"></div>

      <div class="summary">
        <div>
          <span>Subtotal</span>
          <span>${data.total}</span>
        </div>

        <div>
          <span>Paid</span>
          <span>${data.received}</span>
        </div>

        <div>
          <span>Change</span>
          <span>${data.change}</span>
        </div>

        <div class="total">
          <span>TOTAL</span>
          <span>${data.total}</span>
        </div>
      </div>

      <div class="footer">
        Thank you <br/>
        Visit again
      </div>

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
        margins: {
          marginType: "none",
        },
        scaleFactor: 100,
      },
      () => {
        win.close();
      },
    );
  });
}
