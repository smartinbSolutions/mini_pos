const { ipcMain } = require("electron");
import db from "../db";
export default function registerPartnersIPC() {
  // CREATE
  ipcMain.handle("create-partner", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    const result = db
      .prepare(
        `
      INSERT INTO partners (name, phone, address, total, total_paid)
      VALUES (?,?,?,?,?)
    `,
      )
      .run(
        data.name,
        data.phone,
        data.address,
        data.total || 0,
        data.total_paid || 0,
      );

    return {
      success: true,
      id: result.lastInsertRowid,
    };
  });

  ipcMain.handle("get-partners", () => {
    const partners = db
      .prepare(
        `
      SELECT * FROM partners
    `,
      )
      .all();

    return partners;
  });

  ipcMain.handle("get-partner", (event, id) => {
    const partner = db
      .prepare(
        `
      SELECT * FROM partners WHERE id = ?
    `,
      )
      .get(id);

    return partner;
  });

  ipcMain.handle("update-partner", (event, data) => {
    if (!data.name) {
      return { message: "ERROR ENTER DATA", status: 500 };
    }
    db.prepare(
      `
      UPDATE partners
      SET name = ?, phone = ?, address = ?
      WHERE id = ?
    `,
    ).run(data.name, data.phone, data.address, data.id);

    return { success: true };
  });

  ipcMain.handle("delete-partner", (event, id) => {
    db.prepare(
      `
      DELETE FROM partners WHERE id = ?
    `,
    ).run(id);

    return { success: true };
  });
}
