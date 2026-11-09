import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock } from "lucide-react";

// Paid / Partly paid / Not paid — an icon and a word (never colour alone),
// plus how much is still owed when something is unpaid. Shared by the sales,
// purchase, expense and return lists. Extra props passed by older callers
// (paidAmount, t) are ignored.
const STYLE = {
  paid: { key: "simple.latest.paid", classes: "bg-ok-50 text-ok-700", Icon: CheckCircle2 },
  partial: { key: "simple.latest.partial", classes: "bg-warn-50 text-warn-700", Icon: Clock },
  unpaid: { key: "simple.latest.unpaid", classes: "bg-warn-50 text-warn-700", Icon: Clock },
};

export default function PaymentStatusBadge({ status, remainingAmount, money }) {
  const { t } = useTranslation();
  const current = STYLE[status] || STYLE.unpaid;
  const owed = Number(remainingAmount || 0);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold ${current.classes}`}
      >
        <current.Icon size={14} className="shrink-0" />
        {t(current.key)}
      </span>
      {status !== "paid" && owed > 0 && money && (
        <span className="text-sm font-semibold text-ink-muted">
          {t("simple.latest.remaining")} <span dir="ltr">{money(owed)}</span>
        </span>
      )}
    </div>
  );
}
