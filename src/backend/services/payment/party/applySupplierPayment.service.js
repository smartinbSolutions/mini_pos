import createPartyHistory from "../../../utils/createPaymentHistory";
import applyPurchaseInvoicePayment from "../invoice/updatePurchaseInvoiceStatus.service";
import allocateSupplierPayment from "./allocateSupplierPayment.service";

export default function applySupplierPayment(db, data) {
  db.prepare(
    `
    UPDATE suppliers
    SET total_paid = COALESCE(total_paid, 0) + ?
    WHERE id = ?
  `,
  ).run(data.amount, data.party_id);

  if (data.invoiceId) {
    applyPurchaseInvoicePayment(db, data.invoiceId, data.amount, data.mode);
  } else {
    allocateSupplierPayment(db, {
      supplierId: data.party_id,
      paymentId: data.paymentId,
      amount: data.amount,
      mode: data.mode,
    });
  }

  createPartyHistory(db, {
    party_type: "supplier",
    party_id: data.party_id,
    record_type: "payment",
    invoice_id: data.invoiceId,
    invoice_type: data.mode,
    payment_id: data.paymentId,
    movement_type: "credit",
    fund_id: data.fund_id,
    amount: data.amount,
    note: data.note,
  });
}
