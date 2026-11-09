import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronUp } from "lucide-react";

// A big, obvious "More options" button that folds away rarely-used parts of a
// form. Nothing is removed: the content is just one tap away. `forceOpen`
// opens it automatically (for example when something inside is already filled).
export default function MoreOptions({ children, hint, forceOpen = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-slate-300 bg-white/70 px-5 py-3 text-start transition hover:border-brand"
      >
        <span>
          <span className="block text-base font-black text-ink">
            {open ? t("simple.product.lessOptions") : t("simple.product.moreOptions")}
          </span>
          {hint && (
            <span className="block text-sm font-semibold text-ink-muted">{hint}</span>
          )}
        </span>
        {open ? <ChevronUp size={22} /> : <ChevronDown size={22} />}
      </button>
      {open && children}
    </div>
  );
}
