import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Save,
  Camera,
  ShieldCheck,
} from "lucide-react";
import useSetupPage from "../hooks/useSetupPage";
import appLogo from "../../../assets/logo.png";
import { getAssetUrl } from "../../../Global/assetUrl";

export default function CompanySettings({ onSetupComplete }) {
  const {
    handleSave,
    currencies,
    loading,
    handleLogo,
    handleCurrencySelect,
    handleChange,
    fileInputRef,
    saving,
    errors,
    form,
  } = useSetupPage({ onSetupComplete });

  const inputClass =
    "h-12 w-full rounded-xl border border-[#dbe4ff] bg-white/90 px-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const errorInputClass =
    "border-red-300 bg-red-50/60 focus:border-red-400 focus:ring-red-100";
  const labelClass =
    "mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700";
  const requiredMark = <span className="text-red-500">*</span>;
  const fieldClass = (name) =>
    `${inputClass} ${errors[name] ? errorInputClass : ""}`;
  const errorText = (name) =>
    errors[name] ? (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
        <AlertCircle size={13} />
        {errors[name]}
      </p>
    ) : null;

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#eef3ff]">
        <div className="flex flex-col items-center gap-4">
          <img src={appLogo} alt="App logo" className="h-16 w-16 rounded-2xl" />
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#cbd7ff] border-t-[#4663ff]" />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] px-5 py-6 text-slate-900 sm:px-8">
      <div className="relative mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl items-center">
        <div className="grid w-full overflow-hidden rounded-[28px] border border-white/80 bg-white/75 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur xl:grid-cols-[390px_1fr]">
          <aside className="relative flex flex-col justify-between bg-[#f8faff] p-8 xl:min-h-[720px]">
            <div>
              <div className="mb-10 flex items-center gap-3">
                <img
                  src={appLogo}
                  alt="Company setup"
                  className="h-14 w-14 rounded-[18px] shadow-sm"
                />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#4663ff]">
                    POS System
                  </p>
                  <h1 className="text-2xl font-black text-slate-950">
                    Company Setup
                  </h1>
                </div>
              </div>

              <div className="mb-8">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#dbe4ff] bg-white px-3 py-1 text-xs font-semibold text-[#4663ff]">
                  <ShieldCheck size={14} />
                  First-time configuration
                </p>
                <h2 className="max-w-xs text-4xl font-black leading-tight text-slate-950">
                  Set up your workspace calmly.
                </h2>
                <p className="mt-4 max-w-sm text-sm leading-6 text-slate-500">
                  Add the company details that will appear across invoices,
                  receipts, and daily POS records.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  "Company profile",
                  "Contact information",
                  "Base currency",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-[#e5ebff] bg-white/80 p-3"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#4663ff]/10 text-[#4663ff]">
                      <Check size={15} />
                    </span>
                    <span className="text-sm font-semibold text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div
                onClick={() => fileInputRef.current.click()}
                className="group cursor-pointer rounded-3xl border border-[#dbe4ff] bg-white p-4 transition hover:border-[#4663ff]/50 hover:shadow-lg hover:shadow-[#4663ff]/10"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      Company Logo {requiredMark}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Required brand image
                    </p>
                  </div>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eef3ff] text-[#4663ff]">
                    <Camera size={18} />
                  </span>
                </div>
                <div
                  className={`flex h-32 items-center justify-center rounded-2xl border border-dashed bg-[#f8faff] p-4 ${
                    errors.logo
                      ? "border-red-300 bg-red-50/60"
                      : "border-[#cbd7ff]"
                  }`}
                >
                  {form.logo ? (
                    <img
                      src={getAssetUrl(form.logo)}
                      alt="Selected company logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Camera size={28} className="text-[#4663ff]/50" />
                  )}
                </div>
                {errorText("logo")}
              </div>

              <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image/*"
                onChange={handleLogo}
              />
            </div>
          </aside>

          <section className="p-6 sm:p-8 xl:p-10">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="mb-2 text-sm font-bold text-[#4663ff]">
                  Setup details
                </p>
                <h2 className="text-3xl font-black text-slate-950">
                  Tell us about your company
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                  All fields are required except Latin name. You can refine
                  these details later from company settings.
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#4663ff] px-5 text-sm font-bold text-white shadow-lg shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={18} />
                {saving ? "Saving..." : "Save Setup"}
                <ArrowRight size={17} />
              </button>
            </div>

            <div className="space-y-8">
              <div className="rounded-3xl border border-[#e5ebff] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ff] text-[#4663ff]">
                    <BriefcaseBusiness size={20} />
                  </span>
                  <div>
                    <h3 className="font-black text-slate-950">
                      Company Profile
                    </h3>
                    <p className="text-sm text-slate-500">
                      Your official business identity
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label>
                    <span className={labelClass}>
                      Company Name {requiredMark}
                    </span>
                    <input
                      name="company_name"
                      value={form.company_name}
                      onChange={handleChange}
                      placeholder="Company Name"
                      className={fieldClass("company_name")}
                      required
                    />
                    {errorText("company_name")}
                  </label>

                  <label>
                    <span className={labelClass}>Latin Name</span>
                    <input
                      name="company_latin_name"
                      value={form.company_latin_name}
                      onChange={handleChange}
                      placeholder="Latin Name"
                      className={inputClass}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-[#e5ebff] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ff] text-[#4663ff]">
                    <Mail size={20} />
                  </span>
                  <div>
                    <h3 className="font-black text-slate-950">
                      Contact Details
                    </h3>
                    <p className="text-sm text-slate-500">
                      Public information for invoices and receipts
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <label>
                    <span className={labelClass}>
                      <Phone size={15} />
                      Phone {requiredMark}
                    </span>
                    <input
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="Phone"
                      className={fieldClass("phone")}
                      required
                    />
                    {errorText("phone")}
                  </label>

                  <label>
                    <span className={labelClass}>
                      <Mail size={15} />
                      Email
                    </span>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Email"
                      className={fieldClass("email")}
                      required
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className={labelClass}>
                      <MapPin size={15} />
                      Address
                    </span>
                    <textarea
                      name="address"
                      value={form.address}
                      onChange={handleChange}
                      placeholder="Address"
                      className={`${fieldClass("address")} min-h-24 resize-none py-3`}
                      required
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-3xl border border-[#e5ebff] bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eef3ff] text-[#4663ff]">
                      <Banknote size={20} />
                    </span>
                    <div>
                      <h3 className="font-black text-slate-950">
                        Base Currency {requiredMark}
                      </h3>
                      <p className="text-sm text-slate-500">
                        Choose the default currency for transactions
                      </p>
                    </div>
                  </div>
                  <ChevronDown size={18} className="text-slate-400" />
                </div>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                  {currencies.map((c) => {
                    const active = form.base_currency_id === c.id;

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleCurrencySelect(c)}
                        className={`relative rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-[#4663ff] bg-[#4663ff] text-white shadow-lg shadow-[#4663ff]/20"
                            : "border-[#e5ebff] bg-[#f8faff] text-slate-700 hover:border-[#b9c6ff]"
                        }`}
                      >
                        {active && (
                          <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                            <Check size={13} />
                          </span>
                        )}
                        <div className="text-2xl font-black">{c.symbol}</div>
                        <div className="mt-2 text-sm font-bold">{c.code}</div>
                        <div
                          className={`mt-1 truncate text-xs ${
                            active ? "text-white/75" : "text-slate-400"
                          }`}
                        >
                          {c.name}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errorText("base_currency_id")}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
