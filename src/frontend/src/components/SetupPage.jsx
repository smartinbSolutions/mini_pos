import { useState } from "react";

export default function SetupPage() {
  const [data, setData] = useState({
    company_name: "",
    base_currency_id: "",
  });

  const handleSave = async () => {
    try {
      const res = await window.api.createCompanySetting({
        company_name: data.company_name,
        base_currency_id: data.base_currency_id,
        company_latin_name: "",
        phone: "",
        address: "",
        email: "",
        logo: "",
        tax_id: null,
        receipt_width: "80mm",
        currency_position: "after",
        decimal_places: 2,
        language: "ar",
        timezone: "Asia/Damascus",
      });

      if (res?.success) {
        window.location.replace("/");
      } else {
        console.error("Failed to save company settings");
      }
    } catch (err) {
      console.error("Create company settings error:", err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Setup Company</h2>

      <input
        placeholder="Company Name"
        onChange={(e) => setData({ ...data, company_name: e.target.value })}
      />

      <select
        onChange={(e) => setData({ ...data, base_currency_id: e.target.value })}
      >
        <option value="">Select Currency</option>
        <option value="1">USD</option>
        <option value="2">TRY</option>
        <option value="3">SYP</option>
      </select>

      <button onClick={handleSave}>Save & Start</button>
    </div>
  );
}
