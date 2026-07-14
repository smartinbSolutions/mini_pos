import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const currencies = [
  { id: "1", name: "Syrian Pound", code: "SYP", symbol: "\u00a3" },
  { id: "2", name: "US Dollar", code: "USD", symbol: "$" },
  { id: "3", name: "Turkish Lira", code: "TRY", symbol: "\u20ba" },
  { id: "4", name: "Euro", code: "EUR", symbol: "\u20ac" },
  { id: "5", name: "British Pound", code: "GBP", symbol: "\u00a3" },
];

const defaultCurrency = currencies[0];

const validateSetupForm = (form, t) => {
  const nextErrors = {};

  if (!form.company_name?.trim()) {
    nextErrors.company_name = t("errors.nameRequired", {
      field: t("screens.company.companyName"),
    });
  }

  if (!form.phone?.trim()) {
    nextErrors.phone = t("errors.valueRequired", { field: t("ui.phone") });
  }

  if (!form.base_currency_id) {
    nextErrors.base_currency_id = t("errors.valueRequired", {
      field: t("screens.company.baseCurrency"),
    });
  }

  if (!form.admin_username?.trim()) {
    nextErrors.admin_username = t("errors.valueRequired", {
      field: t("screens.setupPage.adminUsername"),
    });
  }

  if (!/^\d{6}$/.test(form.admin_pin || "")) {
    nextErrors.admin_pin = t("errors.pinInvalid");
  }

  if (form.admin_pin !== form.admin_pin_confirm) {
    nextErrors.admin_pin_confirm = t("errors.pinMismatch");
  }

  return nextErrors;
};

const useSetupPage = ({ onSetupComplete } = {}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    company_name: "",
    currency_name: defaultCurrency.name,
    company_latin_name: "",
    phone: "",
    address: "",
    email: "",
    language: "en",
    timezone: "UTC",
    base_currency_id: defaultCurrency.id,
    logo: "",
    code: defaultCurrency.code,
    symbol: defaultCurrency.symbol,
    admin_username: "",
    admin_pin: "",
    admin_pin_confirm: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await window.api.getCompanySetting();

        if (res?.exists) {
          setForm((prev) => ({ ...prev, ...res.settings }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm({ ...form, [name]: value });
    setErrors((current) => ({ ...current, [name]: "" }));
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  const handleLogo = async (e) => {
    try {
      const file = e.target.files[0];

      if (!file) return;

      const base64 = await toBase64(file);

      const savedPath = await window.api.saveLogo({
        base64,
        name: `${Date.now()}-${file.name}`,
      });

      setForm((prev) => ({
        ...prev,
        logo: savedPath,
      }));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCurrencySelect = (currency) => {
    setForm({
      ...form,
      base_currency_id: currency.id,
      currency_name: currency.name,
      code: currency.code,
      symbol: currency.symbol,
    });
    setErrors((current) => ({ ...current, base_currency_id: "" }));
  };

  const handleSave = async () => {
    const validationErrors = validateSetupForm(form, t);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);

      const res = await window.api.createCompanySetting({
        company_name: form.company_name,
        company_latin_name: form.company_latin_name,
        phone: form.phone,
        address: form.address,
        email: form.email,
        logo: form.logo,

        timezone: form.timezone,
        base_currency_id: form.base_currency_id,
        currency_name: form.currency_name,
        code: form.code,
        symbol: form.symbol,
        admin_username: form.admin_username,
        admin_pin: form.admin_pin,
      });

      if (res?.success) {
        if (res.recoveryKey) {
          setRecoveryKey(res.recoveryKey);
          return;
        }
        onSetupComplete?.();
        navigate("/", { replace: true });
      } else if (res?.error) {
        setErrors((current) => ({ ...current, admin_pin: res.error }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };
  return {
    handleSave,
    currencies,
    errors,
    loading,
    handleLogo,
    handleCurrencySelect,
    toBase64,
    handleChange,
    fileInputRef,
    saving,
    form,
    setForm,
    recoveryKey,
    completeRecoveryKeyDisplay: () => {
      setRecoveryKey("");
      onSetupComplete?.();
      navigate("/", { replace: true });
    },
  };
};

export default useSetupPage;
