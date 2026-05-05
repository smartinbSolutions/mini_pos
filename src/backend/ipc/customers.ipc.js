const { ipcMain } = require("electron");
import db from "../db";

export default function registerCustomersIPC() {
  // CREATE
  ipcMain.handle("create-customer", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO customers (name, phone, address, total, total_paid)
      VALUES (?,?,?,?,?)
    `,
      )
      .run(data.name, data.phone, data.address, data.total, data.total_paid);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-customers", () => {
    const customers = db
      .prepare(
        `
      SELECT * FROM customers
    `,
      )
      .all();

    return customers;
  });

  ipcMain.handle("get-customer", (event, id) => {
    const customer = db
      .prepare(
        `
      SELECT * FROM customers WHERE id = ?
    `,
      )
      .get(id);

    return customer;
  });

  ipcMain.handle("update-customer", (event, data) => {
    db.prepare(
      `
      UPDATE customers
      SET name = ?, phone = ?, address = ?, total = ?, total_paid = ?
      WHERE id = ?
    `,
    ).run(
      data.name,
      data.phone,
      data.address,
      data.total,
      data.total_paid,
      data.id,
    );

    return { success: true };
  });

  ipcMain.handle("delete-customer", (event, id) => {
    db.prepare(
      `
      DELETE FROM customers WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}
