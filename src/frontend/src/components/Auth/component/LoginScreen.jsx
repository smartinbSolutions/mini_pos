import { useEffect, useState } from "react";
import { Delete, KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../Global/AuthContext";
import appLogo from "../../../assets/logo.png";

const LoginScreen = () => {
  const { t } = useTranslation();
  const { login, error, loggingIn } = useAuth();
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);

  const submitPin = async (value) => {
    const ok = await login(value);
    if (!ok) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
    setPin("");
  };

  const pressDigit = (d) => {
    if (loggingIn || pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 6) submitPin(next);
  };

  const pressBackspace = () => {
    if (loggingIn) return;
    setPin((p) => p.slice(0, -1));
  };

  // Keyboard support: digits, backspace, delete, enter
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (loggingIn) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        pressDigit(e.key);
        return;
      }

      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        pressBackspace();
        return;
      }

      if (e.key === "Enter" && pin.length === 6) {
        e.preventDefault();
        submitPin(pin);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin, loggingIn]);

  const digits = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#eef3ff_0%,#f8faff_50%,#eefaf6_100%)] px-4">
      <div className="w-full max-w-sm rounded-[28px] border border-white/80 bg-white/80 p-8 shadow-[0_24px_80px_rgba(70,99,255,0.14)] backdrop-blur">
        <div className="mb-6 flex flex-col items-center">
          <img
            src={appLogo}
            alt={t("app.name")}
            className="mb-3 h-14 w-14 rounded-2xl shadow-sm"
          />
          <h1 className="text-xl font-black text-slate-950">
            {t("screens.login.title")}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("screens.login.subtitle")}
          </p>
        </div>

        <div
          className={`mb-6 flex justify-center gap-3 ${
            shake ? "animate-[shake_0.4s_ease-in-out]" : ""
          }`}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border-2 transition ${
                i < pin.length
                  ? "border-[#4663ff] bg-[#4663ff]"
                  : "border-[#dbe4ff] bg-transparent"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="mb-4 text-center text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pressDigit(String(d))}
              disabled={loggingIn}
              className="h-14 rounded-2xl border border-[#e5ebff] bg-white text-lg font-black text-slate-800 transition hover:border-[#4663ff]/40 hover:bg-[#f8faff] active:scale-95 disabled:opacity-50"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => pressDigit("0")}
            disabled={loggingIn}
            className="h-14 rounded-2xl border border-[#e5ebff] bg-white text-lg font-black text-slate-800 transition hover:border-[#4663ff]/40 hover:bg-[#f8faff] active:scale-95 disabled:opacity-50"
          >
            0
          </button>
          <button
            type="button"
            onClick={pressBackspace}
            disabled={loggingIn}
            className="flex h-14 items-center justify-center rounded-2xl border border-[#e5ebff] bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500 active:scale-95 disabled:opacity-50"
          >
            <Delete size={20} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <KeyRound size={12} />
          {t("screens.login.hint")}
        </div>
      </div>
    </main>
  );
};

export default LoginScreen;
