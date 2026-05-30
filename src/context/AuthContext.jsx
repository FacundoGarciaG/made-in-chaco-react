import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("made_in_chaco_token");
    const storedUser = localStorage.getItem("made_in_chaco_user");
    if (token && storedUser && storedUser !== "undefined") {
      setUser({ username: storedUser });
    } else {
      localStorage.removeItem("made_in_chaco_token");
      localStorage.removeItem("made_in_chaco_user");
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Credenciales inválidas");
    }

    localStorage.setItem("made_in_chaco_token", data.token);
    localStorage.setItem("made_in_chaco_user", data.username);
    setUser({ username: data.username });
    return data;
  };

  const logout = () => {
    localStorage.removeItem("made_in_chaco_token");
    localStorage.removeItem("made_in_chaco_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, login, logout, loading, isAuthenticated: !!user }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
};
