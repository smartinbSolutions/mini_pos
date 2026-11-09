// src/Global/ReturnStatusBadge.jsx
import { useTranslation } from "react-i18next";
import { Undo2 } from "lucide-react";

const STYLES = {
  full: "bg-red-50 text-red-600",
  partial: "bg-amber-50 text-amber-600",
};

export default function ReturnStatusBadge({ status }) {
  const { t } = useTranslation();

  if (!status || status === "none") return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${STYLES[status]}`}
    >
      <Undo2 size={14} />
      {status === "full" ? t("ui.fully-refunded") : t("ui.partially-refunded")}
    </span>
  );
}
