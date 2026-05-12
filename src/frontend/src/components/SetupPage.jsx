import { useState } from "react";
import {
  Building2,
  ChevronRight,
  Sparkles,
  Globe,
  ShieldCheck,
} from "lucide-react";

export default function SetupPage() {
  const [loading, setLoading] = useState(false);

  const [data, setData] = useState({
    company_name: "",
    currency_name: "",
  });

  const currencies = [
    {
      id: "1",
      code: "USD",
      name: "US Dollar",
      symbol: "$",
    },
    {
      id: "2",
      code: "TRY",
      name: "Turkish Lira",
      symbol: "₺",
    },
    {
      id: "3",
      code: "SYP",
      name: "Syrian Pound",
      symbol: "£",
    },
  ];

  const handleSave = async () => {
    try {
      setLoading(true);

      const res = await window.api.createCompanySetting({
        company_name: data.company_name,
        phone: "",
        address: "",
        email: "",
        logo: "",
        language: "ar",
        timezone: "Asia/Damascus",
        currency_name: data.currency_name,
        code: data.code,
        symbol: data.symbol,
      });

      if (res?.success) {
        window.location.replace("/");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0B] overflow-hidden relative flex items-center justify-center p-6 ">
      {/* background */}
      <div className="absolute inset-0">
        <div className="absolute top-[-250px] left-[-150px] w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-3xl" />

        <div className="absolute bottom-[-250px] right-[-150px] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-3xl" />

        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      {/* card */}
      <div className="relative z-10 w-full max-w-6xl grid lg:grid-cols-2 rounded-[38px] overflow-hidden border border-white/10 bg-white/[0.03] backdrop-blur-2xl shadow-[0_0_80px_rgba(0,0,0,0.5)]">
        {/* left side */}
        <div className="hidden lg:flex flex-col justify-between p-14 bg-gradient-to-br from-white/[0.04] to-transparent border-r border-white/10">
          <div>
            <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-xl">
              <Building2 size={34} className="text-white" />
            </div>

            <div className="mt-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-sm">
                <Sparkles size={15} />
                Modern POS & ERP Platform
              </div>

              <h1 className="mt-7 text-6xl font-black text-white leading-[1.1] tracking-tight">
                Build your
                <br />
                business system
              </h1>

              <p className="mt-7 text-slate-400 text-lg leading-8 max-w-xl">
                Powerful inventory management, sales tracking, customers,
                accounting and analytics in one modern desktop experience.
              </p>
            </div>
          </div>

          {/* bottom stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-3xl font-bold text-white">POS</div>

              <div className="text-slate-400 text-sm mt-2">Smart Checkout</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-3xl font-bold text-white">ERP</div>

              <div className="text-slate-400 text-sm mt-2">Full Management</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-3xl font-bold text-white">24/7</div>

              <div className="text-slate-400 text-sm mt-2">Your Business</div>
            </div>
          </div>
        </div>

        {/* right side */}
        <div className="p-8 md:p-14">
          {/* mobile logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/10 flex items-center justify-center">
              <Building2 className="text-white" size={34} />
            </div>
          </div>

          {/* top */}
          <div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Globe size={15} />
              Initial Configuration
            </div>

            <h2 className="mt-4 text-5xl font-black text-white tracking-tight">
              Setup Company
            </h2>

            <p className="mt-4 text-slate-400 text-lg">
              Configure your company information to start using the system.
            </p>
          </div>

          {/* form */}
          <div className="mt-12 space-y-8">
            {/* company name */}
            <div>
              <label className="block text-sm text-slate-300 mb-3">
                Company Name
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={data.company_name}
                  onChange={(e) =>
                    setData({
                      ...data,
                      company_name: e.target.value,
                    })
                  }
                  placeholder="Enter your company name"
                  className="
                    w-full
                    h-16
                    rounded-2xl
                    border
                    border-white/10
                    bg-white/[0.03]
                    px-6
                    text-white
                    placeholder:text-slate-500
                    outline-none
                    transition-all
                    focus:border-blue-500/50
                    focus:bg-white/[0.05]
                  "
                />
              </div>
            </div>

            {/* currencies */}
            <div>
              <label className="block text-sm text-slate-300 mb-4">
                Base Currency
              </label>

              <div className="grid gap-4">
                {currencies.map((currency) => {
                  const active = data.base_currency_id === currency.id;

                  return (
                    <button
                      key={currency.id}
                      type="button"
                      onClick={() =>
                        setData({
                          ...data,
                          base_currency_id: currency.id,
                          currency_name: currency.name,
                          code: currency.code,
                          symbol: currency.symbol,
                        })
                      }
                      className={`
                        group
                        relative
                        overflow-hidden
                        rounded-3xl
                        border
                        transition-all
                        duration-300
                        p-5
                        text-left
                        ${
                          active
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/10 bg-white/[0.03] hover:bg-white/[0.05]"
                        }
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div
                            className={`
                              w-16
                              h-16
                              rounded-2xl
                              flex
                              items-center
                              justify-center
                              text-2xl
                              font-bold
                              border
                              ${
                                active
                                  ? "bg-blue-500 text-white border-blue-400"
                                  : "bg-white/[0.04] text-white border-white/10"
                              }
                            `}
                          >
                            {currency.symbol}
                          </div>

                          <div>
                            <div className="text-white text-lg font-semibold">
                              {currency.code}
                            </div>

                            <div className="text-slate-400 text-sm mt-1">
                              {currency.name}
                            </div>
                          </div>
                        </div>

                        <ChevronRight
                          className={`
                            transition-all
                            ${
                              active
                                ? "text-blue-400 translate-x-1"
                                : "text-slate-600 group-hover:text-slate-300"
                            }
                          `}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* button */}
            <button
              onClick={handleSave}
              disabled={loading || !data.company_name || !data.base_currency_id}
              className="
                mt-6
                w-full
                h-16
                rounded-2xl
                bg-white
                text-black
                font-bold
                text-lg
                transition-all
                hover:scale-[1.01]
                active:scale-[0.99]
                disabled:opacity-50
                disabled:cursor-not-allowed
              "
            >
              {loading ? (
                "Saving..."
              ) : (
                <div className="flex items-center justify-center gap-3">
                  Continue
                  <ChevronRight size={22} />
                </div>
              )}
            </button>

            {/* footer */}
            <div className="pt-6 flex items-center justify-center gap-2 text-slate-500 text-sm">
              <ShieldCheck size={16} />
              Secure local desktop system
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
