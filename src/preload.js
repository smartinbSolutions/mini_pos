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
  /* ================= AUTH ================= */
  login: (pin) => ipcRenderer.invoke("auth:login", { pin }),
  getUsers: () => ipcRenderer.invoke("auth:get-users"),
  createUser: (data) => ipcRenderer.invoke("auth:create-user", data),
  updateUser: (data) => ipcRenderer.invoke("auth:update-user", data),
  deleteUser: (data) => ipcRenderer.invoke("auth:delete-user", data),
  /* ================= CURRENCY ================= */
  getCurrencies: () => ipcRenderer.invoke("get-currencies"),
  getCurrency: (id) => ipcRenderer.invoke("get-currency", id),
  createCurrency: (data) => ipcRenderer.invoke("create-currencies", data),
  updateCurrency: (data) => ipcRenderer.invoke("update-currency", data),
  deleteCurrency: (id) => ipcRenderer.invoke("delete-currency", id),

  /* ================= CUSTOMER ================= */
  getCustomers: (params) => ipcRenderer.invoke("get-customers", params),
  getCustomer: (id) => ipcRenderer.invoke("get-customer", id),
  createCustomer: (data) => ipcRenderer.invoke("create-customer", data),
  updateCustomer: (data) => ipcRenderer.invoke("update-customer", data),
  deleteCustomer: (id) => ipcRenderer.invoke("delete-customer", id),
  getCustomerCredit: (customerId) =>
    ipcRenderer.invoke("get-customer-credit", customerId),

  /* ================= FUND ================= */
  getFunds: () => ipcRenderer.invoke("get-funds"),
  getFund: (id) => ipcRenderer.invoke("get-fund", id),
  getFundHistory: (params) => ipcRenderer.invoke("get-fund-history", params),
  createFund: (data) => ipcRenderer.invoke("create-fund", data),
  updateFund: (data) => ipcRenderer.invoke("update-fund", data),
  deleteFund: (id) => ipcRenderer.invoke("delete-fund", id),
  transferFundToFund: (transferData) =>
    ipcRenderer.invoke("transfer-fund-to-fund", transferData),
  getFundTransfers: (params) =>
    ipcRenderer.invoke("get-fund-transfers", params),
  getFundTransfer: (id) => ipcRenderer.invoke("get-fund-transfer", id),
  updateFundTransfer: (data) =>
    ipcRenderer.invoke("update-fund-transfer", data),
  deleteFundTransfer: (id) => ipcRenderer.invoke("delete-fund-transfer", id),
  exportFundHistoryExcel: (params) =>
    ipcRenderer.invoke("export-fund-history-excel", params),
  exportFundHistoryPdf: (params) =>
    ipcRenderer.invoke("export-fund-history-pdf", params),

  /* ================= PAYMENTS ================= */
  getPayments: (params) => ipcRenderer.invoke("get-payments", params),
  getPayment: (id) => ipcRenderer.invoke("get-payment", id),
  getPaymentAllocations: (paymentId) =>
    ipcRenderer.invoke("get-payment-allocations", paymentId),
  getPaymentFund: (id) => ipcRenderer.invoke("get-payment-fund", id),
  getPartyLedger: (params) => ipcRenderer.invoke("get-party-ledger", params),
  createPayment: (data) => ipcRenderer.invoke("create-payment", data),
  updatePayment: (data) => ipcRenderer.invoke("update-payment", data),
  deletePayment: (id) => ipcRenderer.invoke("delete-payment", id),

  /* ================= PARTY HISTORY ================= */
  getPartyHistoryLedger: (params) =>
    ipcRenderer.invoke("get-party-history-ledger", params),

  /* ================= PRODUCT BARCODE ================= */
  getProductBarcodes: () => ipcRenderer.invoke("get-product-barcodes"),
  getProductBarcode: (id) => ipcRenderer.invoke("get-product-barcode", id),
  getProductMovements: (id) => ipcRenderer.invoke("get-product-movements", id),
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
  downloadProductImportTemplate: () =>
    ipcRenderer.invoke("download-product-import-template"),
  importProducts: () => ipcRenderer.invoke("import-products"),
  getProductImports: () => ipcRenderer.invoke("get-product-imports"),
  getProductImportItems: (importId) =>
    ipcRenderer.invoke("get-product-import-items", importId),

  /* ================= PURCHASE INVOICE ================= */
  getPurchaseInvoices: (params) =>
    ipcRenderer.invoke("get-purchase-invoices", params),
  getPurchaseInvoiceById: (id) =>
    ipcRenderer.invoke("get-purchase-invoice", id),
  createPurchaseInvoice: (data) =>
    ipcRenderer.invoke("create-purchase-invoice", data),
  updatePurchaseInvoice: (data) =>
    ipcRenderer.invoke("update-purchase-invoice", data),
  deletePurchaseInvoice: (id) =>
    ipcRenderer.invoke("delete-purchase-invoice", id),

  /* ================= PURCHASE RETURN ================= */
  getPurchaseReturns: (params) =>
    ipcRenderer.invoke("get-purchase-returns", params),
  getPurchaseReturnById: (id) => ipcRenderer.invoke("get-purchase-return", id),
  createPurchaseReturn: (data) =>
    ipcRenderer.invoke("create-purchase-return", data),

  /* ================= SALES ================= */
  getSalesInvoices: (params) =>
    ipcRenderer.invoke("get-sales-invoices", params),
  getSalesInvoiceById: (id) => ipcRenderer.invoke("get-sales-invoice", id),
  createSalesInvoice: (data) =>
    ipcRenderer.invoke("create-sales-invoice", data),
  updateSalesInvoice: (data) =>
    ipcRenderer.invoke("update-sales-invoice", data),
  deleteSalesInvoice: (id) => ipcRenderer.invoke("delete-sales-invoice", id),
  posCheckout: (data) => ipcRenderer.invoke("pos-checkout", data),
  printReceipt: (data) => ipcRenderer.invoke("print-receipt", data),
  applyInvoiceCredit: (data) =>
    ipcRenderer.invoke("apply-invoice-credit", data),

  /* ================= SALES RETURN ================= */
  getSalesReturns: (params) => ipcRenderer.invoke("get-sales-returns", params),
  getSalesReturnById: (id) => ipcRenderer.invoke("get-sales-return-by-id", id),
  createSalesReturn: (data) => ipcRenderer.invoke("create-sales-return", data),

  /* ================= SCALE ================= */
  listScalePorts: () => ipcRenderer.invoke("scale:list-ports"),
  getScaleStatus: () => ipcRenderer.invoke("scale:get-status"),
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
  getSuppliers: (params) => ipcRenderer.invoke("get-suppliers", params),
  getSupplier: (id) => ipcRenderer.invoke("get-supplier", id),
  createSupplier: (data) => ipcRenderer.invoke("create-supplier", data),
  updateSupplier: (data) => ipcRenderer.invoke("update-supplier", data),
  deleteSupplier: (id) => ipcRenderer.invoke("delete-supplier", id),
  getSupplierCredit: (supplierId) =>
    ipcRenderer.invoke("get-supplier-credit", supplierId),

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

  /* ================= PARTNERS ================= */
  getPartners: (params) => ipcRenderer.invoke("get-partners", params),
  getPartner: (id) => ipcRenderer.invoke("get-partner", id),
  createPartner: (data) => ipcRenderer.invoke("create-partner", data),
  updatePartner: (data) => ipcRenderer.invoke("update-partner", data),
  deletePartner: (id) => ipcRenderer.invoke("delete-partner", id),

  /* ================= EXPENSES ================= */
  getExpenses: (params) => ipcRenderer.invoke("get-expenses", params),
  getExpense: (id) => ipcRenderer.invoke("get-expense", id),
  createExpense: (data) => ipcRenderer.invoke("create-expense", data),
  updateExpense: (data) => ipcRenderer.invoke("update-expense", data),
  deleteExpense: (id) => ipcRenderer.invoke("delete-expense", id),

  /* ================= EXPENSES CATEGORY ================= */
  getExpensesCategory: (params) =>
    ipcRenderer.invoke("get-expence_category", params),
  getExpenseCategoryById: (id) =>
    ipcRenderer.invoke("get-expence_category-by-id", id),
  createExpenseCategory: (data) =>
    ipcRenderer.invoke("create-expence_category", data),
  updateExpenseCategory: (data) =>
    ipcRenderer.invoke("update-expence_category", data),
  deleteExpenseCategory: (id) =>
    ipcRenderer.invoke("delete-expence_category", id),
  /* ================= CUSTOMER DISPLAY ================= */
  openCustomerDisplay: () => ipcRenderer.invoke("customer-display:open"),
  closeCustomerDisplay: () => ipcRenderer.invoke("customer-display:close"),
  isCustomerDisplayOpen: () => ipcRenderer.invoke("customer-display:is-open"),
  pushCartToCustomerDisplay: (cartPayload) =>
    ipcRenderer.send("customer-display:push-cart", cartPayload),

  // received by the customer display window only - the POS window never
  // calls this, since it's the one sending, not receiving
  onCustomerDisplayCartUpdate: (callback) => {
    const listener = (_event, cartPayload) => callback(cartPayload);
    ipcRenderer.on("customer-display:cart-update", listener);
    return () =>
      ipcRenderer.removeListener("customer-display:cart-update", listener);
  },
});

contextBridge.exposeInMainWorld("license", {
  activate: (licenseKey) => ipcRenderer.invoke("license:activate", licenseKey),
  status: () => ipcRenderer.invoke("license:status"),
});
