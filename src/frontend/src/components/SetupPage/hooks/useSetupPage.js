import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const useSetupPage = () => {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    currency_name: "",
    company_latin_name: "",
    phone: "",
    address: "",
    email: "",
    language: "en",
    timezone: "UTC",
    base_currency_id: "1",
    logo: "",
    code: "",
    symbol: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await window.api.getCompanySetting();

        if (res?.exists) {
          setForm(res.settings);
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
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
    });

  const handleLogo = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const base64 = await toBase64(file);

    const savedPath = await window.api.saveLogo({
      base64,
      name: `logo-${Date.now()}-${file.name}`,
    });

    setForm({ ...form, logo: savedPath });
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      const res = await window.api.createCompanySetting({
        company_name: form.company_name,
        phone: form.phone,
        address: form.address,
        email: form.email,
        logo: form.logo,

        timezone: form.timezone,
        currency_name: form.currency_name,
        code: form.code,
        symbol: form.symbol,
      });

      navigate("/");
      if (res?.success) {
        window.location.replace("/");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  const currencies = [
    { id: "1", name: "Syrian Pound", code: "SYP", symbol: "£" },
    { id: "2", name: "US Dollar", code: "USD", symbol: "$" },
    { id: "3", name: "Turkish Lira", code: "TRY", symbol: "₺" },
    { id: "4", name: "Euro", code: "EUR", symbol: "€" },
    { id: "5", name: "British Pound", code: "GBP", symbol: "£" },
  ];

  return {
    handleSave,
    currencies,
    loading,
    handleLogo,
    toBase64,
    handleChange,
    fileInputRef,
    saving,
    form,
    setForm,
  };
};

export default useSetupPage;
