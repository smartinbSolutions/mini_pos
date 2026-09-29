import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

// Company data language, loaded once and shared by every component.
// undefined = not loaded yet, null = unknown / failed.
let cachedLanguage;
let pending = null;
const listeners = new Set();

const loadCompanyLanguage = () => {
  if (cachedLanguage !== undefined) return Promise.resolve(cachedLanguage);

  if (!pending) {
    pending = (window.api?.getCompanySetting?.() ?? Promise.resolve(null))
      .then((res) => {
        cachedLanguage = res?.settings?.language || null;
        return cachedLanguage;
      })
      .catch(() => {
        cachedLanguage = null;
        return null;
      })
      .finally(() => {
        pending = null;
      });
  }

  return pending;
};

// Call after company settings are saved, so every mounted screen picks up
// a changed company language without a reload.
export const refreshCompanyLanguage = async () => {
  cachedLanguage = undefined;
  const lang = await loadCompanyLanguage();
  listeners.forEach((notify) => notify(lang));
};

// Pure version for code outside React (formatters, print builders):
// the Latin value when in Latin mode and it exists, otherwise the original.
export const pickLatin = (isLatin, latinValue, originalValue) =>
  (isLatin && latinValue) || originalValue;

// Latin mode = the UI is in a different language than the one the
// company's data (product/unit names) is entered in.
export default function useLatinMode() {
  const { i18n } = useTranslation();
  const [companyLanguage, setCompanyLanguage] = useState(
    cachedLanguage ?? null,
  );

  useEffect(() => {
    let active = true;
    loadCompanyLanguage().then((lang) => {
      if (active) setCompanyLanguage(lang);
    });
    listeners.add(setCompanyLanguage);
    return () => {
      active = false;
      listeners.delete(setCompanyLanguage);
    };
  }, []);

  // "en-US" → "en"
  const uiLanguage = String(i18n.language || "").split("-")[0];
  const isLatin = Boolean(companyLanguage) && uiLanguage !== companyLanguage;

  const pick = useCallback(
    (latinValue, originalValue) =>
      pickLatin(isLatin, latinValue, originalValue),
    [isLatin],
  );

  return { isLatin, pick, companyLanguage };
}
