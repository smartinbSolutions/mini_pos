import registerProductIPC from "./ipc/product.ipc";
import registerPaymentsIPC from "./ipc/payments.ipc";
import registerCurrenciesIPC from "./ipc/currencies.ipc";
import registerCustomersIPC from "./ipc/customers.ipc";
import registerFundIPC from "./ipc/funds.ipc";
import registerProductBarcodeIPC from "./ipc/product_barcode.ipc";
import registerPurchaseInvoiceItemsIPC from "./ipc/purchase_invoice_items.ipc";
import registerPurchaseInvoicesIPC from "./ipc/purchase_invoice.ipc";
import registerSalesInvoiceItemsIPC from "./ipc/sales_invoice_item.ipc";
import registerSalesInvoiceIPC from "./ipc/sales_invoice.ipc";
import registerSuppliersIPC from "./ipc/suppliers.ipc";
import registerTaxesIPC from "./ipc/taxes.ipc";
import registerUnitIPC from "./ipc/unit.ipc";
import registerCompanySettingIPC from "./ipc/company_setting.ipc";

export default function registerAllIPC() {
  registerCompanySettingIPC();
  registerCurrenciesIPC();
  registerCustomersIPC();
  registerFundIPC();
  registerPaymentsIPC();
  registerProductBarcodeIPC();
  registerProductIPC();
  registerPurchaseInvoiceItemsIPC();
  registerPurchaseInvoicesIPC();
  registerSalesInvoiceItemsIPC();
  registerSalesInvoiceIPC();
  registerSuppliersIPC();
  registerTaxesIPC();
  registerUnitIPC();
}
