import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { pickLatin } from "../useLatinMode";

export default function usePrintDocument(fetchDoc, id) {
  const { i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const lang = searchParams.get("lang");

  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);
  const [langReady, setLangReady] = useState(!lang);

  // Switch the hidden window's language before anything renders
  useEffect(() => {
    if (!lang) return;
    let cancelled = false;
    Promise.resolve(i18n.changeLanguage(lang)).finally(() => {
      if (!cancelled) setLangReady(true);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchDoc(id), window.api.getCompanySetting()]).then(
      ([docData, companyRes]) => {
        if (!cancelled) {
          setDoc(docData);
          setCompany(companyRes?.settings || null);
        }
      },
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isLatin =
    Boolean(company?.language) &&
    String(i18n.language || "").split("-")[0] !== company.language;
  const pick = (latin, original) => pickLatin(isLatin, latin, original);

  // Hold the doc back until the language switch is done, so PrintDocument
  // mounts (and sets printReady) only after the right language is active.
  return { doc: langReady ? doc : null, company, pick };
}
