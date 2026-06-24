import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { connectSocket } from "../services/socket";

const AuthPublicoContext = createContext(null);

const STORAGE_KEY_TOKEN = "made_in_chaco_token_publico";
const STORAGE_KEY_PERFIL = "made_in_chaco_perfil";

export const AuthPublicoProvider = ({ children }) => {
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const stored = localStorage.getItem(STORAGE_KEY_PERFIL);
    if (token && stored) {
      try {
        setPerfil(JSON.parse(stored));
        connectSocket(token);
      } catch {
        localStorage.removeItem(STORAGE_KEY_TOKEN);
        localStorage.removeItem(STORAGE_KEY_PERFIL);
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch("/api/auth/login-publico", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");
    localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEY_PERFIL, JSON.stringify(data.perfil));
    connectSocket(data.token);
    setPerfil(data.perfil);
    return data;
  }, []);

  const register = useCallback(async (email, password, nombre) => {
    const res = await fetch("/api/auth/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, nombre }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Error al registrarse");
    localStorage.setItem(STORAGE_KEY_TOKEN, data.token);
    localStorage.setItem(STORAGE_KEY_PERFIL, JSON.stringify(data.perfil));
    connectSocket(data.token);
    setPerfil(data.perfil);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_PERFIL);
    setPerfil(null);
  }, []);

  const getToken = useCallback(() => {
    return localStorage.getItem(STORAGE_KEY_TOKEN);
  }, []);

  return (
    <AuthPublicoContext.Provider
      value={{ perfil, login, register, logout, getToken, loading, isAuthenticated: !!perfil }}
    >
      {children}
    </AuthPublicoContext.Provider>
  );
};

export const useAuthPublico = () => {
  const context = useContext(AuthPublicoContext);
  if (!context) throw new Error("useAuthPublico debe usarse dentro de un AuthPublicoProvider");
  return context;
};
