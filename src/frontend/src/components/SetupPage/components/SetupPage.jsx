import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Upload,
  Phone,
  Mail,
  MapPin,
  Globe,
  Save,
  Camera,
  Check,
  ShieldCheck,
} from "lucide-react";
import useSetupPage from "../hooks/useSetupPage";

export default function CompanySettings() {
  const {
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
  } = useSetupPage();

  if (loading) {
    return (
      <div className="h-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-slate-300 border-t-black rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] p-8">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white shadow flex items-center justify-center">
              <Building2 size={28} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-[#111827]">
                Company Settings
              </h1>
              <p className="text-slate-500 text-sm">
                Manage ERP company configuration
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 h-12 rounded-2xl bg-black text-white flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? "Saving..." : "Save"}
          </button>
        </div>

        {/* GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-8">
          {/* LEFT */}
          <div className="space-y-6">
            {/* LOGO */}
            <div className="bg-white p-6 rounded-3xl border">
              <h2 className="font-bold text-lg mb-4">Logo</h2>

              <div
                onClick={() => fileInputRef.current.click()}
                className="w-full h-56 bg-slate-100 rounded-3xl flex items-center justify-center cursor-pointer overflow-hidden"
              >
                {form.logo ? (
                  <img src={form.logo} className="w-full h-full object-cover" />
                ) : (
                  <Camera size={40} className="text-slate-400" />
                )}
              </div>

              <input
                type="file"
                hidden
                ref={fileInputRef}
                onChange={handleLogo}
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="bg-white p-8 rounded-3xl border space-y-6">
            {/* INFO */}
            <div className="grid md:grid-cols-2 gap-6">
              <input
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                placeholder="Company Name"
                className="h-14 px-4 rounded-2xl bg-slate-50 border"
              />

              <input
                name="company_latin_name"
                value={form.company_latin_name}
                onChange={handleChange}
                placeholder="Latin Name"
                className="h-14 px-4 rounded-2xl bg-slate-50 border"
              />

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone"
                className="h-14 px-4 rounded-2xl bg-slate-50 border"
              />

              <input
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Email"
                className="h-14 px-4 rounded-2xl bg-slate-50 border"
              />

              <textarea
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Address"
                className="md:col-span-2 h-28 px-4 py-3 rounded-2xl bg-slate-50 border"
              />
            </div>

            {/* CURRENCIES */}
            <div>
              <h2 className="font-bold mb-4">Base Currency</h2>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {currencies.map((c) => {
                  const active = form.base_currency_id === c.id;

                  return (
                    <button
                      key={c.id}
                      onClick={() =>
                        setForm({
                          ...form,
                          base_currency_id: c.id,
                          currency_name: c.name,
                          code: c.code,
                          symbol: c.symbol,
                        })
                      }
                      className={`
                        p-4 rounded-2xl border transition
                        ${active ? "bg-black text-white" : "bg-slate-50"}
                      `}
                    >
                      <div className="text-2xl font-bold">{c.symbol}</div>
                      <div className="text-sm">{c.code}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
