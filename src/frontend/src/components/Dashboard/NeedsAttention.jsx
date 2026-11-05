import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  CheckCircle2,
  DatabaseBackup,
  PackageX,
  PackageMinus,
} from "lucide-react";
import { getStockStatus } from "../../Global/stockStatus";

const BACKUP_MAX_AGE_DAYS = 7;
const NAMES_SHOWN = 3;

const TONES = {
  danger: { tile: "bg-danger-50 text-danger-700", badge: "bg-danger-100 text-danger-700" },
  warn: { tile: "bg-warn-50 text-warn-700", badge: "bg-warn-100 text-warn-700" },
};

// backup_settings.last_backup_at is written with datetime('now') = UTC
function parseUtc(value) {
  if (!value) return null;
  const date = new Date(`${String(value).replace(" ", "T")}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

// What needs the owner's action today. Nothing listed = everything is fine.
//   products: array | null (null = still loading)
//   backup:   backup_settings row | null (unknown) | undefined (loading)
export default function NeedsAttention({ products, backup, lowStockLevel }) {
  const { t, i18n } = useTranslation();

  if (products === null || backup === undefined) {
    return (
      <section className="ui-card space-y-3 p-5">
        <div className="h-7 w-48 animate-pulse rounded-xl bg-slate-100" />
        {[0, 1].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ))}
      </section>
    );
  }

  const namesOf = (list) => {
    const shown = list.slice(0, NAMES_SHOWN).map((p) => p.name);
    const more = list.length - shown.length;
    return shown.join(t("simple.daily.listSep")) + (more > 0 ? ` +${more}` : "");
  };

  const withStatus = products.map((p) => ({
    ...p,
    status: getStockStatus(p, lowStockLevel),
  }));
  const out = withStatus.filter((p) => p.status === "out");
  const low = withStatus.filter((p) => p.status === "low");

  const items = [];

  if (out.length) {
    items.push({
      key: "out",
      tone: "danger",
      Icon: PackageX,
      title: t("simple.attention.outOfStock"),
      detail: namesOf(out),
      count: out.length,
      to: "/products",
      action: t("simple.attention.seeProducts"),
    });
  }
  if (low.length) {
    items.push({
      key: "low",
      tone: "warn",
      Icon: PackageMinus,
      title: t("simple.attention.lowStock"),
      detail: namesOf(low),
      count: low.length,
      to: "/products",
      action: t("simple.attention.seeProducts"),
    });
  }

  // backup: unknown (null) is not shown as a problem
  if (backup) {
    const last = parseUtc(backup.last_backup_at);
    const ageDays = last ? (Date.now() - last.getTime()) / 86400000 : null;
    const lastLabel = last
      ? last
          .toLocaleDateString(i18n.language, { day: "numeric", month: "short" })
          .replace(/ /g, " ") // keep "22 Oct" together
      : "";

    let message = null;
    let tone = "warn";
    if (backup.last_backup_status === "failed") {
      message = t("simple.attention.backupFailed");
      tone = "danger";
    } else if (!last) {
      message = t("simple.attention.backupNever");
    } else if (ageDays > BACKUP_MAX_AGE_DAYS) {
      message = t("simple.attention.backupOld", { date: lastLabel });
    }

    if (message) {
      items.push({
        key: "backup",
        tone,
        Icon: DatabaseBackup,
        title: message,
        to: "/company-settings",
        action: t("simple.attention.backupOpen"),
      });
    }
  }

  if (!items.length) {
    return (
      <section className="ui-card flex items-center gap-4 border-ok-100 bg-ok-50 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-ok">
          <CheckCircle2 size={32} />
        </span>
        <div>
          <h2 className="text-xl font-black text-ok-700">
            {t("simple.attention.allGood")}
          </h2>
          <p className="mt-0.5 text-base font-semibold text-ink-soft">
            {t("simple.attention.allGoodHint")}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ui-card p-5">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-black">
        <AlertTriangle size={24} className="text-warn" />
        {t("simple.attention.title")}
      </h2>

      <ul className="space-y-2.5">
        {items.map(({ key, tone, Icon, title, detail, count, to, action }) => (
          <li key={key}>
            <Link
              to={to}
              className="flex items-center gap-3 rounded-2xl border-2 border-slate-100 p-3 transition hover:border-brand focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${TONES[tone].tile}`}
              >
                <Icon size={26} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-base font-black text-ink">
                  {title}
                  {count !== undefined && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-sm font-black ${TONES[tone].badge}`}
                    >
                      {count}
                    </span>
                  )}
                </span>
                {detail && (
                  <span className="mt-0.5 block truncate text-sm font-semibold text-ink-muted">
                    {detail}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-base font-bold text-brand-700">
                {action}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
