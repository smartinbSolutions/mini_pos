import React, { useEffect, useState } from "react";

const useUpdateCompanySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    company_latin_name: "",
    phone: "",
    address: "",
    email: "",
    language: "en",
    timezone: "UTC",
    base_currency_id: null,
    logo: "",
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await window.api.getCompanySetting();
        console.log(res);

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

      reader.onerror = (error) => reject(error);
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

  const handleSave = async () => {
    try {
      setSaving(true);

      if (form.id) {
        await window.api.updateCompanySetting(form);
      } else {
        await window.api.createCompanySetting(form);
      }
    } catch (err) {
      console.error(err);
      alert("Error while saving");
    } finally {
      setSaving(false);
    }
  };

  return {
    handleSave,
    handleLogo,
    handleChange,
    form,
    saving,
    loading,
  };
};

export default useUpdateCompanySettings;
