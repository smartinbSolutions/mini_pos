import { Link } from "react-router-dom";
import {
  User,
  Truck,
  Handshake,
  Wallet,
  ShoppingCart,
  CreditCard,
  BanknoteArrowDown,
  ArrowRightLeft,
} from "lucide-react";

// Central place for "given a type + id, where does it lead" — add new types here
// once, and every consumer (fund history, party ledger, payment list, etc.) benefits.
const ROUTES = {
  customer: (id) => `/payment/customer/${id}`,
  supplier: (id) => `/payment/supplier/${id}`,
  partner: (id) => `/payment/partner/${id}`,
  fund: (id) => `/fund/${id}`,
  sales: (id) => `/view-sales/${id}`,
  purchase: (id) => `/view-purchase/${id}`,
  expense: (id) => `/view-expense/${id}`,
  transfer: () => `/fundTransfer`, // no single-transfer view page yet — goes to the list
};

const ICONS = {
  customer: User,
  supplier: Truck,
  partner: Handshake,
  fund: Wallet,
  sales: ShoppingCart,
  purchase: CreditCard,
  expense: BanknoteArrowDown,
  transfer: ArrowRightLeft,
};

export default function GoTo({ type, id, children, className = "" }) {
  const routeFn = ROUTES[type];
  const Icon = ICONS[type];

  // No known route for this type, or no id to link to — render as a plain
  // muted badge, not a broken/dead link.
  if (!routeFn || !id) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 ${className}`}
      >
        {Icon && <Icon size={11} />}
        {children}
      </span>
    );
  }

  return (
    <Link
      to={routeFn(id)}
      className={`inline-flex items-center gap-1 rounded-lg bg-[#eef3ff] px-2 py-1 text-xs font-bold text-[#4663ff] transition hover:bg-[#4663ff]/15 ${className}`}
    >
      {Icon && <Icon size={11} />}
      {children}
    </Link>
  );
}
