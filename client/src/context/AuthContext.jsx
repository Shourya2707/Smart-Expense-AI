import { createContext, useContext, useState, useEffect, useCallback } from "react";
import API from "../services/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const s = localStorage.getItem("user");
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    API.get("/api/auth/me")
      .then(({ data }) => {
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          setToken(null); setUser(null);
          localStorage.removeItem("token");
          localStorage.removeItem("user");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  const login = useCallback((newToken, newUser) => {
    setToken(newToken); setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null); setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const merged = { ...prev, ...updates };
      localStorage.setItem("user", JSON.stringify(merged));
      return merged;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};
