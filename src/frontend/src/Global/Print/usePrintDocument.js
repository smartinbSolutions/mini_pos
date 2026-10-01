import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { pickLatin } from "../useLatinMode";

export default function usePrintDocument(fetchDoc, id) {
  const { i18n } = useTranslation();
  const [doc, setDoc] = useState(null);
  const [company, setCompany] = useState(null);

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

  return { doc, company, pick };
}
