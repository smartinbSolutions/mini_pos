import React from "react";
import { Truck, User } from "lucide-react";

// Shows the counterpart account of a linked customer ↔ supplier.
// `type` is the type of the LINKED party (the one the badge points to).
export default function LinkedPartyBadge({ type, id, name, onClick, t }) {
  if (!id) return null;

  const isSupplier = type === "supplier";
  const Icon = isSupplier ? Truck : User;
  const label = isSupplier
    ? t("screens.contacts.alsoSupplierBadge", {
        name,
        defaultValue: `Also supplier: ${name}`,
      })
    : t("screens.contacts.alsoCustomerBadge", {
        name,
        defaultValue: `Also customer: ${name}`,
      });

  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-0.5 inline-flex max-w-[220px] items-center gap-1 rounded-md bg-[#eef3ff] px-1.5 py-0.5 text-[11px] font-bold text-[#4663ff] transition hover:bg-[#4663ff]/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4663ff]/20"
    >
      <Icon size={11} className="shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
