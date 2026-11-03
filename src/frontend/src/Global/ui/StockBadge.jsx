import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const STYLES = {
  available: {
    icon: CheckCircle2,
    className: "bg-ok-50 text-ok-700 ring-ok-100",
    label: "simple.stock.available",
  },
  low: {
    icon: AlertTriangle,
    className: "bg-warn-50 text-warn-700 ring-warn-100",
    label: "simple.stock.low",
  },
  out: {
    icon: XCircle,
    className: "bg-danger-50 text-danger-700 ring-danger-100",
    label: "simple.stock.out",
  },
};

// Colour + icon + word, never colour alone.
export default function StockBadge({ status, size = "md", className = "" }) {
  const { t } = useTranslation();
  const style = STYLES[status];
  if (!style) return null;
  const Icon = style.icon;
  const sizing =
    size === "sm" ? "gap-1 px-2 py-0.5 text-xs" : "gap-1.5 px-2.5 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ring-1 ${sizing} ${style.className} ${className}`}
    >
      <Icon size={size === "sm" ? 13 : 15} className="shrink-0" />
      {t(style.label)}
    </span>
  );
}
