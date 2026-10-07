import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const isStaffRole = (role) => role === "staff" || role === "admin";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("gm:logout", onLogout);
    return () => window.removeEventListener("gm:logout", onLogout);
  }, []);

  const login = useCallback(async (email, password, audience) => {
    const { data } = await api.post("/auth/login", { email, password, audience });
    tokenStore.set(data.token); setUser(data.user); return data.user;
  }, []);

  const register = useCallback(async (form) => {
    const { data } = await api.post("/auth/register", form);
    tokenStore.set(data.token); setUser(data.user); return data.user;
  }, []);

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}
