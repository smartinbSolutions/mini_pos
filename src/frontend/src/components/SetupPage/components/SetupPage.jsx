import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  Check,
  Phone,
  Mail,
  MapPin,
  Save,
  Camera,
  KeyRound,
  User,
} from "lucide-react";
import useSetupPage from "../hooks/useSetupPage";
import appLogo from "../../../assets/logo.png";
import { getAssetUrl } from "../../../Global/assetUrl";
import { useTranslation } from "react-i18next";

export default function CompanySettings({ onSetupComplete }) {
  const { t } = useTranslation();
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
    "h-10 w-full rounded-lg border border-[#dbe4ff] bg-white/90 px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#4663ff] focus:ring-4 focus:ring-[#4663ff]/10";
  const errorInputClass =
    "border-red-300 bg-red-50/60 focus:border-red-400 focus:ring-red-100";
  const labelClass =
    "mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600";
  const requiredMark = <span className="text-red-500">*</span>;
  const fieldClass = (name) =>
    `${inputClass} ${errors[name] ? errorInputClass : ""}`;
  const errorText = (name) =>
    errors[name] ? (
      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
        <AlertCircle size={12} />
        {errors[name]}
      </p>
    ) : null;

  const StepBadge = ({ n }) => (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#4663ff] text-xs font-black text-white">
      {n}
    </span>
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#eef3ff]">
        <div className="flex flex-col items-center gap-4">
          <img
            src={appLogo}
            alt={t("app.name")}
            className="h-16 w-16 rounded-2xl"
          />
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#cbd7ff] border-t-[#4663ff]" />
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] px-4 py-5 text-slate-900 sm:px-6">
      <div className="relative mx-auto flex min-h-[calc(100vh-40px)] max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-white/80 bg-white/75 shadow-[0_20px_60px_rgba(70,99,255,0.12)] backdrop-blur lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="flex flex-col justify-between bg-[#f8faff] p-6">
            <div>
              <div className="mb-6 flex items-center gap-2.5">
                <img
                  src={appLogo}
                  alt={t("screens.setupPage.title")}
                  className="h-10 w-10 rounded-xl shadow-sm"
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#4663ff]">
                    {t("app.name")}
                  </p>
                  <h1 className="text-lg font-black leading-tight text-slate-950">
                    {t("screens.setupPage.title")}
                  </h1>
                </div>
              </div>

              <p className="mb-5 text-xs leading-5 text-slate-500">
                {t("screens.setupPage.description")}
              </p>

              <div className="space-y-2">
                {[
                  t("screens.setupPage.profile"),
                  t("screens.setupPage.contact"),
                  t("screens.setupPage.adminAccount"),
                  t("screens.setupPage.baseCurrency"),
                ].map((item, i) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-lg border border-[#e5ebff] bg-white/80 px-2.5 py-2"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#4663ff]/10 text-[10px] font-black text-[#4663ff]">
                      {i + 1}
                    </span>
                    <span className="text-xs font-semibold text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current.click()}
              className="group mt-5 cursor-pointer rounded-2xl border border-[#dbe4ff] bg-white p-3 transition hover:border-[#4663ff]/50 hover:shadow-md hover:shadow-[#4663ff]/10"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-900">
                  {t("screens.setupPage.logo")}
                </h3>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eef3ff] text-[#4663ff]">
                  <Camera size={14} />
                </span>
              </div>
              <div className="flex h-20 items-center justify-center rounded-xl border border-dashed bg-[#f8faff]">
                {form.logo ? (
                  <img
                    src={getAssetUrl(form.logo)}
                    alt={t("screens.setupPage.logo")}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Camera size={22} className="text-[#4663ff]/50" />
                )}
              </div>
              <input
                type="file"
                hidden
                ref={fileInputRef}
                accept="image"
                onChange={handleLogo}
              />
            </div>
          </aside>

          {/* Form */}
          <section className="flex max-h-[calc(100vh-40px)] flex-col">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="space-y-4">
                {/* Company profile */}
                <div className="rounded-2xl border border-[#e5ebff] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <StepBadge n={1} />
                    <h3 className="text-sm font-black text-slate-950">
                      {t("screens.setupPage.companyProfile")}
                    </h3>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label>
                      <span className={labelClass}>
                        {t("screens.company.companyName")} {requiredMark}
                      </span>
                      <input
                        name="company_name"
                        value={form.company_name}
                        onChange={handleChange}
                        placeholder={t("screens.company.companyName")}
                        className={fieldClass("company_name")}
                        required
                      />
                      {errorText("company_name")}
                    </label>

                    <label>
                      <span className={labelClass}>{t("ui.latinName")}</span>
                      <input
                        name="company_latin_name"
                        value={form.company_latin_name}
                        onChange={handleChange}
                        placeholder={t("ui.latinName")}
                        className={inputClass}
                      />
                    </label>
                  </div>
                </div>

                {/* Contact */}
                <div className="rounded-2xl border border-[#e5ebff] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <StepBadge n={2} />
                    <h3 className="text-sm font-black text-slate-950">
                      {t("screens.setupPage.contactDetails")}
                    </h3>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label>
                      <span className={labelClass}>
                        <Phone size={12} />
                        {t("ui.phone")} {requiredMark}
                      </span>
                      <input
                        name="phone"
                        value={form.phone}
                        onChange={handleChange}
                        placeholder={t("ui.phone")}
                        className={fieldClass("phone")}
                        required
                      />
                      {errorText("phone")}
                    </label>

                    <label>
                      <span className={labelClass}>
                        <Mail size={12} />
                        {t("ui.email")}
                      </span>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder={t("ui.email")}
                        className={fieldClass("email")}
                      />
                    </label>

                    <label className="md:col-span-2">
                      <span className={labelClass}>
                        <MapPin size={12} />
                        {t("ui.address")}
                      </span>
                      <textarea
                        name="address"
                        value={form.address}
                        onChange={handleChange}
                        placeholder={t("ui.address")}
                        className={`${fieldClass("address")} h-16 resize-none py-2`}
                      />
                    </label>
                  </div>
                </div>

                {/* Admin account */}
                <div className="rounded-2xl border border-[#e5ebff] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <StepBadge n={3} />
                    <div>
                      <h3 className="text-sm font-black text-slate-950">
                        {t("screens.setupPage.adminAccount")}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {t("screens.setupPage.adminAccountHint")}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <label>
                      <span className={labelClass}>
                        <User size={12} />
                        {t("screens.setupPage.adminUsername")} {requiredMark}
                      </span>
                      <input
                        name="admin_username"
                        value={form.admin_username}
                        onChange={handleChange}
                        placeholder={t("screens.setupPage.adminUsername")}
                        className={fieldClass("admin_username")}
                        required
                      />
                      {errorText("admin_username")}
                    </label>

                    <label>
                      <span className={labelClass}>
                        <KeyRound size={12} />
                        {t("screens.setupPage.adminPin")} {requiredMark}
                      </span>
                      <input
                        name="admin_pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.admin_pin}
                        onChange={handleChange}
                        placeholder="••••••"
                        className={fieldClass("admin_pin")}
                        required
                      />
                      {errorText("admin_pin")}
                    </label>

                    <label>
                      <span className={labelClass}>
                        <KeyRound size={12} />
                        {t("screens.setupPage.adminPinConfirm")} {requiredMark}
                      </span>
                      <input
                        name="admin_pin_confirm"
                        type="password"
                        inputMode="numeric"
                        maxLength={6}
                        value={form.admin_pin_confirm}
                        onChange={handleChange}
                        placeholder="••••••"
                        className={fieldClass("admin_pin_confirm")}
                        required
                      />
                      {errorText("admin_pin_confirm")}
                    </label>
                  </div>
                </div>

                {/* Currency */}
                <div className="rounded-2xl border border-[#e5ebff] bg-white p-4">
                  <div className="mb-3 flex items-center gap-2.5">
                    <StepBadge n={4} />
                    <h3 className="text-sm font-black text-slate-950">
                      {t("screens.setupPage.baseCurrency")} {requiredMark}
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {currencies.map((c) => {
                      const active = form.base_currency_id === c.id;

                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleCurrencySelect(c)}
                          className={`relative rounded-xl border p-2.5 text-left transition ${
                            active
                              ? "border-[#4663ff] bg-[#4663ff] text-white shadow-md shadow-[#4663ff]/20"
                              : "border-[#e5ebff] bg-[#f8faff] text-slate-700 hover:border-[#b9c6ff]"
                          }`}
                        >
                          {active && (
                            <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
                              <Check size={10} />
                            </span>
                          )}
                          <div className="text-lg font-black">{c.symbol}</div>
                          <div className="mt-0.5 text-xs font-bold">
                            {c.code}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {errorText("base_currency_id")}
                </div>
              </div>
            </div>

            {/* Sticky save bar */}
            <div className="flex items-center justify-between border-t border-[#e5ebff] bg-white/90 px-5 py-3 backdrop-blur sm:px-6">
              <p className="text-xs text-slate-500">
                {t("screens.setupPage.fieldsHint")}
              </p>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#4663ff] px-5 text-sm font-bold text-white shadow-md shadow-[#4663ff]/20 transition hover:bg-[#3854e8] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Save size={16} />
                {saving ? t("common.saving") : t("screens.setupPage.saveSetup")}
                <ArrowRight size={15} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
