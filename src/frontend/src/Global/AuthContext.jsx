import { createContext, useContext, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { t } = useTranslation();
  const [user, setUser] = useState(null); // null = not logged in
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // No navigation here: AuthGate swaps login ↔ app, RouteMemory restores
  // the user's last route, and PosGate keeps POS users on /pos.
  const login = useCallback(
    async (pin) => {
      setLoggingIn(true);
      setError("");
      try {
        const res = await window.api.login(pin);
        if (res?.success) {
          setUser(res.user);
          return true;
        }
        setError(t("errors.invalidPin") || res?.error);
        return false;
      } catch (err) {
        setError(err?.message || String(err));
        return false;
      } finally {
        setLoggingIn(false);
      }
    },
    [t],
  );

  const logout = useCallback(() => {
    setUser(null);
    setError("");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === "admin",
        login,
        logout,
        error,
        loggingIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
