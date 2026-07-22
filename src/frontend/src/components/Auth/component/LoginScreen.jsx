import { useEffect, useState } from "react";
import { Delete, KeyRound, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../../Global/AuthContext";
import appLogo from "../../../assets/logo.png";
import AdminRecoveryModal from "./AdminRecoveryModal";

const LoginScreen = () => {
  const { t } = useTranslation();
  const { login, error, loggingIn } = useAuth();
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);

  const submitPin = async (value) => {
    const ok = await login(value);
    if (!ok) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
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
      if (loggingIn || recoveryOpen) return;

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f1729] px-4">
      <style>{`
        @keyframes tumblerFill {
          0% { transform: scaleY(0.4); opacity: 0.4; }
          60% { transform: scaleY(1.15); }
          100% { transform: scaleY(1); opacity: 1; }
        }
        @keyframes vaultShake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(7px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(3px); }
        }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(212,166,87,0.25); }
          50% { box-shadow: 0 0 0 6px rgba(212,166,87,0.05); }
        }
        .tumbler-fill { animation: tumblerFill 0.22s ease-out; }
        .vault-shake { animation: vaultShake 0.5s ease-in-out; }
        .brand-ring { animation: ringPulse 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tumbler-fill, .vault-shake, .brand-ring { animation: none; }
        }
      `}</style>

      {/* Ambient glow field — the "vault" atmosphere */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 18%, rgba(70,99,255,0.16), transparent 70%), radial-gradient(40% 35% at 82% 85%, rgba(212,166,87,0.08), transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(115deg, #fff 0px, #fff 1px, transparent 1px, transparent 64px)",
        }}
      />

      <div
        className={`relative w-full max-w-sm rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_40px_120px_rgba(70,99,255,0.18)] backdrop-blur-xl ${
          shake ? "vault-shake" : ""
        }`}
      >
        <div className="mb-7 flex flex-col items-center">
          <div className="brand-ring mb-4 rounded-[20px] border border-[#d4a657]/30 p-[3px]">
            <img
              src={appLogo}
              alt={t("app.name")}
              className="h-14 w-14 rounded-2xl shadow-sm"
            />
          </div>
          <h1 className="text-xl font-black text-[#f5f7fc]">
            {t("screens.login.title")}
          </h1>
          <p className="mt-1 text-sm text-[#8891b0]">
            {t("screens.login.subtitle")}
          </p>
        </div>

        {/* Tumbler keyway — the signature element */}
        <div className="mb-6 flex justify-center">
          <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-black/25 px-5 py-3.5">
            {Array.from({ length: 6 }).map((_, i) => {
              const filled = i < pin.length;
              return (
                <span
                  key={i}
                  className={`block h-6 w-2.5 rounded-full transition-colors duration-150 ${
                    filled ? "tumbler-fill" : ""
                  }`}
                  style={{
                    background: filled
                      ? "linear-gradient(180deg, #e8c98a, #b9873f)"
                      : "rgba(255,255,255,0.08)",
                    boxShadow: filled
                      ? "0 0 10px rgba(212,166,87,0.45)"
                      : "inset 0 1px 3px rgba(0,0,0,0.5)",
                  }}
                />
              );
            })}
          </div>
        </div>

        {error && (
          <p className="mb-4 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-[#f09595]">
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
              className="h-14 rounded-2xl border border-white/10 bg-white/[0.03] font-mono text-lg font-black tabular-nums text-[#f5f7fc] transition hover:border-[#d4a657]/40 hover:bg-white/[0.07] active:scale-95 disabled:opacity-40"
            >
              {d}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => pressDigit("0")}
            disabled={loggingIn}
            className="h-14 rounded-2xl border border-white/10 bg-white/[0.03] font-mono text-lg font-black tabular-nums text-[#f5f7fc] transition hover:border-[#d4a657]/40 hover:bg-white/[0.07] active:scale-95 disabled:opacity-40"
          >
            0
          </button>
          <button
            type="button"
            onClick={pressBackspace}
            disabled={loggingIn}
            className="flex h-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#8891b0] transition hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 active:scale-95 disabled:opacity-40"
          >
            <Delete size={20} />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-xs text-[#8891b0]">
          <ShieldCheck size={12} />
          {t("screens.login.hint")}
          <KeyRound size={12} />
        </div>
        <button
          type="button"
          onClick={() => setRecoveryOpen(true)}
          className="mt-3 w-full text-center text-sm font-bold text-[#d4a657] transition hover:text-[#e8c98a]"
        >
          {t("screens.login.forgotPin")}
        </button>
      </div>

      <AdminRecoveryModal
        open={recoveryOpen}
        onClose={() => setRecoveryOpen(false)}
      />
    </main>
  );
};

export default LoginScreen;
