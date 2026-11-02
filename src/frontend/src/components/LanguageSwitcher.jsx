import { Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { languages } from "../i18n";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  return (
    <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-gray-200">
      <Globe2 size={18} className="shrink-0 text-gray-300" />
      <span className="sr-only">{t("common.language")}</span>
      <select
        value={i18n.language}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
        className="w-full bg-transparent text-sm font-semibold outline-none"
        aria-label={t("common.language")}
      >
        {languages.map((language) => (
          <option key={language.code} value={language.code} className="text-gray-900">
            {t(language.labelKey)}
          </option>
        ))}
      </select>
    </label>
  );
}
