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
  Receipt,
  Package,
} from "lucide-react";

const ROUTES = {
  customer: (id) => `/payment/customer/${id}`,
  supplier: (id) => `/payment/supplier/${id}`,
  partner: (id) => `/payment/partner/${id}`,
  fund: (id) => `/fund/${id}`,
  sales: (id) => `/view-sales/${id}`,
  sales_return: (id) => `/view-sales-return/${id}`,
  purchase: (id) => `/view-purchase/${id}`,
  purchase_return: (id) => `/view-purchase-return/${id}`,
  expense: (id) => `/view-expense/${id}`,
  payment: (id) => `/payments/${id}`,
  transfer: (id) => `/funds/transfers/${id}`,

  // product_movements.reference_type actual values
  products: (id) => `/products/${id}`,
  purchase_invoice: (id) => `/view-purchase/${id}`,
  sales_invoice: (id) => `/view-sales/${id}`,
};

const ICONS = {
  customer: User,
  supplier: Truck,
  partner: Handshake,
  fund: Wallet,
  sales: ShoppingCart,
  purchase: CreditCard,
  expense: BanknoteArrowDown,
  payment: Receipt,
  transfer: ArrowRightLeft,

  products: Package,
  purchase_invoice: CreditCard,
  sales_invoice: ShoppingCart,
};

// Two visual treatments:
// - "solid" (default): filled tint background, bold saturated color —
//   the original look, good for standalone chips/badges in dense tables.
// - "light": no fill, hairline border, muted text that only brightens
//   to the accent color on hover — quieter, reads as inline text with a
//   hint of affordance rather than a loud pill. Better suited for rows
//   where several GoTo links sit side by side (e.g. payment flow, fund
//   transfer cards) and shouldn't compete visually with each other.
const VARIANT_STYLES = {
  solid: {
    active: "bg-[#eef3ff] text-[#4663ff] hover:bg-[#4663ff]/15",
    disabled: "bg-slate-100 text-slate-500",
  },
  light: {
    active:
      "border border-slate-200 bg-transparent text-slate-600 hover:border-[#4663ff]/40 hover:bg-[#f6f8fd] hover:text-[#4663ff]",
    disabled: "border border-slate-100 bg-transparent text-slate-400",
  },
};

export default function GoTo({
  type,
  id,
  children,
  className = "",
  variant = "solid",
}) {
  const routeFn = ROUTES[type];
  const Icon = ICONS[type];
  const styles = VARIANT_STYLES[variant] || VARIANT_STYLES.solid;

  if (!routeFn || !id) {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${styles.disabled} ${className}`}
      >
        {Icon && <Icon size={11} />}
        {children}
      </span>
    );
  }

  return (
    <Link
      to={routeFn(id)}
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold transition ${styles.active} ${className}`}
    >
      {Icon && <Icon size={11} />}
      {children}
    </Link>
  );
}
