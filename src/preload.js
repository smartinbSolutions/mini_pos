const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  /* ================= PRODUCTS ================= */
  getProducts: () => ipcRenderer.invoke("get-products"),
  getProduct: (id) => ipcRenderer.invoke("get-product", id),
  createProduct: (data) => ipcRenderer.invoke("create-product", data),
  updateProduct: (data) => ipcRenderer.invoke("update-product", data),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),

  /* ================= SALES ================= */
  createSalesInvoice: (data) =>
    ipcRenderer.invoke("create-sales-invoice", data),
  getSalesInvoices: () => ipcRenderer.invoke("get-sales-invoices"),
  getSalesInvoice: (id) => ipcRenderer.invoke("get-sales-invoice", id),
  updateSalesInvoice: (data) =>
    ipcRenderer.invoke("update-sales-invoice", data),
  deleteSalesInvoice: (id) => ipcRenderer.invoke("delete-sales-invoice", id),

  /* ================= SALES ITEMS ================= */
  createSalesItems: (data) => ipcRenderer.invoke("create-sales-items", data),
  getSalesItems: (invoiceId) =>
    ipcRenderer.invoke("get-sales-items", invoiceId),

  /* ================= PAYMENTS ================= */
  createPayment: (data) => ipcRenderer.invoke("create-payment", data),
  getPayments: () => ipcRenderer.invoke("get-payments"),

  /* ================= UNITS ================= */
  getUnits: () => ipcRenderer.invoke("get-units"),
  getUnit: (id) => ipcRenderer.invoke("get-unit", id),
  createUnit: (data) => ipcRenderer.invoke("create-unit", data),
  updateUnit: (data) => ipcRenderer.invoke("update-unit", data),
  deleteUnit: (id) => ipcRenderer.invoke("delete-unit", id),
});
