const { ipcMain } = require("electron");
const db = require("../backend/db");

function registerSuppliersIPC() {
  // CREATE
  ipcMain.handle("create-supplier", (event, data) => {
    const result = db
      .prepare(
        `
      INSERT INTO suppliers (name, phone, address, total, total_paid)
      VALUES (?,?,?,?,?)
    `,
      )
      .run(data.name, data.phone, data.address, data.total, data.total_paid);

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-suppliers", () => {
    const suppliers = db
      .prepare(
        `
      SELECT * FROM suppliers
    `,
      )
      .all();

    return suppliers;
  });

  ipcMain.handle("get-supplier", (event, id) => {
    const supplier = db
      .prepare(
        `
      SELECT * FROM suppliers WHERE id = ?
    `,
      )
      .get(id);

    return supplier;
  });

  ipcMain.handle("update-supplier", (event, data) => {
    db.prepare(
      `
      UPDATE suppliers
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

  ipcMain.handle("delete-supplier", (event, id) => {
    db.prepare(
      `
      DELETE FROM suppliers WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}

module.exports = registerSuppliersIPC;
