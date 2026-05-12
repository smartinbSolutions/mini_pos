import { useEffect, useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  Globe,
  Save,
  Image as ImageIcon,
} from "lucide-react";
import useUpdateCompanySettings from "../hooks/useUpdateCompanySettings";

export default function CompanySettings() {
  const { handleSave, handleLogo, handleChange, form, saving, loading } =
    useUpdateCompanySettings();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-500 text-lg">
        Loading...
      </div>
    );
  }
  console.log(form);

  return (
    <div className="p-6 bg-[#f5f7fb] min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Company Settings</h1>

          <p className="text-gray-500 mt-2">
            Manage your company information and system settings
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-500 p-8 text-white">
            <div className="flex items-center gap-5">
              <div className="relative">
                <label className="cursor-pointer">
                  <div className="w-28 h-28 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center overflow-hidden backdrop-blur-sm">
                    {form.logo ? (
                      <img
                        src={`file://${form.logo}`}
                        alt="logo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={40} />
                    )}
                  </div>

                  <input type="file" className="hidden" onChange={handleLogo} />
                </label>
              </div>

              <div>
                <h2 className="text-2xl font-semibold">
                  {form.company_name || "Your Company"}
                </h2>

                <p className="text-white/80 mt-1">ERP System Configuration</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Company Name
                </label>

                <div className="relative">
                  <Building2
                    size={18}
                    className="absolute left-3 top-3.5 text-gray-400"
                  />

                  <input
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    placeholder="Company Name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Latin Name
                </label>

                <div className="relative">
                  <Globe
                    size={18}
                    className="absolute left-3 top-3.5 text-gray-400"
                  />

                  <input
                    name="company_latin_name"
                    value={form.company_latin_name}
                    onChange={handleChange}
                    placeholder="Latin Name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Phone
                </label>

                <div className="relative">
                  <Phone
                    size={18}
                    className="absolute left-3 top-3.5 text-gray-400"
                  />

                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Phone Number"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-3.5 text-gray-400"
                  />

                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Email Address"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Address
                </label>

                <div className="relative">
                  <MapPin
                    size={18}
                    className="absolute left-3 top-3.5 text-gray-400"
                  />

                  <input
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Company Address"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Language
                </label>

                <select
                  name="language"
                  value={form.language}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                  <option value="tr">Turkish</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600 mb-2 block">
                  Timezone
                </label>

                <input
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  placeholder="Timezone"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-indigo-600 hover:bg-indigo-700 transition-all text-white px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                <Save size={18} />

                {saving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
