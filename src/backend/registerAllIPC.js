import registerProductIPC from "./ipc/product.ipc";
import registerSalesIPC from "./ipc/sales_invoice.ipc";
import registerPaymentsIPC from "./ipc/payments.ipc";

export default function registerAllIPC() {
  registerProductIPC();
  registerSalesIPC();
  registerPaymentsIPC();
}
