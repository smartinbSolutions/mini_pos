import { Link } from "react-router-dom";
import {
  User,
  Truck,
  Handshake,
  Wallet,
  ShoppingCart,
  CreditCard,
  BanknoteArrowDown,
  ArrowUpRight,
  ArrowRightLeft,
  Receipt,
  Package,
  Layers,
} from "lucide-react";

const ROUTES = {
  customer: (id) => `/contact/${id}`,
  supplier: (id) => `/contact/${id}`,
  partner: (id) => `/payment/partner/${id}`,
  fund: (id) => `/fund/${id}`,
  sales: (id) => `/view-sales/${id}`,
  sale: (id) => `/view-sales/${id}`,
  sales_return: (id) => `/view-sales-return/${id}`,
  purchase: (id) => `/view-purchase/${id}`,
  purchase_return: (id) => `/view-purchase-return/${id}`,
  expense: (id) => `/view-expense/${id}`,
  expense_category: (id) => `/expense-category/${id}`,
  payment: (id) => `/payments/${id}`,
  transfer: (id) => `/funds/transfers/${id}`,
  settlement: (id) => `/settlements/${id}`,
  contact: (id) => `/contact/${id}`,

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
  expense_category: Layers,
  payment: Receipt,
  transfer: ArrowRightLeft,

  products: Package,
  purchase_invoice: CreditCard,
  sales_invoice: ShoppingCart,
};

const VARIANT_STYLES = {
  solid: {
    active: "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70",
    disabled: "bg-slate-50 text-slate-400",
  },
  light: {
    active: "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70",
    disabled: "bg-slate-50 text-slate-400",
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
        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${styles.disabled} ${className}`}
      >
        {Icon && <Icon size={11} />}
        {children}
      </span>
    );
  }

  return (
    <Link
      to={routeFn(id)}
      className={`group inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold transition-colors ${styles.active} ${className}`}
    >
      {Icon && <Icon size={11} className="shrink-0" />}
      <span className="truncate">{children}</span>
      <ArrowUpRight
        size={10}
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
      />
    </Link>
  );
}
