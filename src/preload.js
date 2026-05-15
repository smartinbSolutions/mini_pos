const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  /* ================= COMPANY SETTING ================= */
  getDashboardStats: () => ipcRenderer.invoke("get-dashboard-stats"),
  getCompanySetting: (id) => ipcRenderer.invoke("get-company-settings", id),
  createCompanySetting: (data) =>
    ipcRenderer.invoke("create-company-settings", data),
  updateCompanySetting: (data) =>
    ipcRenderer.invoke("update-company-settings", data),
  saveLogo: (data) => ipcRenderer.invoke("save-logo", data),
  /* ================= CURRENCY ================= */
  getCurrencies: () => ipcRenderer.invoke("get-currencies"),
  getCurrency: (id) => ipcRenderer.invoke("get-currency", id),
  createCurrency: (data) => ipcRenderer.invoke("create-currencies", data),
  updateCurrency: (data) => ipcRenderer.invoke("update-currency", data),
  deleteCurrency: (id) => ipcRenderer.invoke("delete-currency", id),

  /* ================= CUSTOMER ================= */
  getCustomers: () => ipcRenderer.invoke("get-customers"),
  getCustomer: (id) => ipcRenderer.invoke("get-customer", id),
  createCustomer: (data) => ipcRenderer.invoke("create-customer", data),
  updateCustomer: (data) => ipcRenderer.invoke("update-customer", data),
  deleteCustomer: (id) => ipcRenderer.invoke("delete-customer", id),

  /* ================= FUND ================= */
  getFunds: () => ipcRenderer.invoke("get-funds"),
  getFund: (id) => ipcRenderer.invoke("get-fund", id),
  createFund: (data) => ipcRenderer.invoke("create-fund", data),
  updateFund: (data) => ipcRenderer.invoke("update-fund", data),
  deleteFund: (id) => ipcRenderer.invoke("delete-fund", id),

  /* ================= PAYMENTS ================= */
  getPayments: () => ipcRenderer.invoke("get-payments"),
  getPayment: (id) => ipcRenderer.invoke("get-payment", id),
  getPaymentFund: (id) => ipcRenderer.invoke("get-payment-fund", id),
  getPartyLedger: (params) => ipcRenderer.invoke("get-party-ledger", params),
  createPayment: (data) => ipcRenderer.invoke("create-payment", data),
  updatePayment: (data) => ipcRenderer.invoke("update-payment", data),
  deletePayment: (id) => ipcRenderer.invoke("delete-payment", id),

  /* ================= PRODUCT BARCODE ================= */
  getProductBarcodes: () => ipcRenderer.invoke("get-product-barcodes"),
  getProductBarcode: (id) => ipcRenderer.invoke("get-product-barcode", id),
  createProductBarcode: (data) =>
    ipcRenderer.invoke("create-product-barcode", data),
  updateProductBarcode: (data) =>
    ipcRenderer.invoke("update-product-barcode", data),
  deleteProductBarcode: (id) =>
    ipcRenderer.invoke("delete-product-barcode", id),

  /* ================= PRODUCTS ================= */
  getProducts: () => ipcRenderer.invoke("get-products"),
  getProduct: (id) => ipcRenderer.invoke("get-product", id),
  createProduct: (data) => ipcRenderer.invoke("create-product", data),
  updateProduct: (data) => ipcRenderer.invoke("update-product", data),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
  getProductByBarcode: (barcode) =>
    ipcRenderer.invoke("get-product-by-barcode", barcode),
  /* ================= PURCHASE INVOICE ITEM ================= */
  getPurchaseInvoiceItems: () =>
    ipcRenderer.invoke("get-purchase-invoice-items"),
  getPurchaseInvoiceItem: (id) =>
    ipcRenderer.invoke("get-purchase-invoice-item", id),
  getItemByPurchaseInvoice: (invoice_id) =>
    ipcRenderer.invoke("get-items-by-invoice", invoice_id),
  createPurchaseInvoiceItem: (data) =>
    ipcRenderer.invoke("create-purchase-invoice-item", data),
  updatePurchaseInvoiceItem: (data) =>
    ipcRenderer.invoke("update-purchase-invoice-item", data),
  deletePurchaseInvoiceItem: (id) =>
    ipcRenderer.invoke("delete-purchase-invoice-item", id),

  /* ================= PURCHASE INVOICE ================= */
  getPurchaseInvoices: () => ipcRenderer.invoke("get-purchase-invoices"),
  getPurchaseInvoiceById: (id) =>
    ipcRenderer.invoke("get-purchase-invoice", id),
  createPurchaseInvoice: (data) =>
    ipcRenderer.invoke("create-purchase-invoice", data),
  updatePurchaseInvoice: (data) =>
    ipcRenderer.invoke("update-purchase-invoice", data),
  deletePurchaseInvoice: (id) =>
    ipcRenderer.invoke("delete-purchase-invoice", id),

  /* ================= SALES INVOICE ITEM ================= */
  getSalesInvoiceItems: () => ipcRenderer.invoke("get-sales-invoice-items"),
  getSalesInvoiceItem: (id) => ipcRenderer.invoke("get-sales-invoice-item", id),
  getItemBySalesInvoice: (invoice_id) =>
    ipcRenderer.invoke("get-items-by-sales-invoice", invoice_id),
  createSalesInvoiceItem: (data) =>
    ipcRenderer.invoke("create-sales-invoice-item", data),
  updateSalesInvoiceItem: (data) =>
    ipcRenderer.invoke("update-sales-invoice-item", data),
  deleteSalesInvoiceItem: (id) =>
    ipcRenderer.invoke("delete-sales-invoice-item", id),

  /* ================= SALES ================= */
  getSalesInvoices: () => ipcRenderer.invoke("get-sales-invoices"),
  getSalesInvoiceById: (id) => ipcRenderer.invoke("get-sales-invoice", id),
  createSalesInvoice: (data) =>
    ipcRenderer.invoke("create-sales-invoice", data),
  updateSalesInvoice: (data) =>
    ipcRenderer.invoke("update-sales-invoice", data),
  deleteSalesInvoice: (id) => ipcRenderer.invoke("delete-sales-invoice", id),
  posCheckout: (data) => ipcRenderer.invoke("pos-checkout", data),
  printReceipt: (data) => ipcRenderer.invoke("print-receipt", data),

  /* ================= SCALE ================= */
  listScalePorts: () => ipcRenderer.invoke("scale:list-ports"),
  connectScale: (options) => ipcRenderer.invoke("scale:connect", options),
  disconnectScale: () => ipcRenderer.invoke("scale:disconnect"),
  onScaleData: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("scale:data", listener);
    return () => ipcRenderer.removeListener("scale:data", listener);
  },
  onScaleStatus: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("scale:status", listener);
    return () => ipcRenderer.removeListener("scale:status", listener);
  },

  /* ================= SUPPLIERS ================= */
  getSuppliers: () => ipcRenderer.invoke("get-suppliers"),
  getSupplier: (id) => ipcRenderer.invoke("get-supplier", id),
  createSupplier: (data) => ipcRenderer.invoke("create-supplier", data),
  updateSupplier: (data) => ipcRenderer.invoke("update-supplier", data),
  deleteSupplier: (id) => ipcRenderer.invoke("delete-supplier", id),

  /* ================= TAX ================= */
  getTaxes: () => ipcRenderer.invoke("get-taxes"),
  getTax: (id) => ipcRenderer.invoke("get-tax", id),
  createTax: (data) => ipcRenderer.invoke("create-tax", data),
  updateTax: (data) => ipcRenderer.invoke("update-tax", data),
  deleteTax: (id) => ipcRenderer.invoke("delete-tax", id),

  /* ================= UNITS ================= */
  getUnits: () => ipcRenderer.invoke("get-units"),
  getUnit: (id) => ipcRenderer.invoke("get-unit", id),
  createUnit: (data) => ipcRenderer.invoke("create-unit", data),
  updateUnit: (data) => ipcRenderer.invoke("update-unit", data),
  deleteUnit: (id) => ipcRenderer.invoke("delete-unit", id),
});

contextBridge.exposeInMainWorld("license", {
  activate: (licenseKey) => ipcRenderer.invoke("license:activate", licenseKey),
  status: () => ipcRenderer.invoke("license:status"),
});
