import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import "../styles/LoginPage.css";

export const UserLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [eliminada, setEliminada] = useState(null);
  const [restaurando, setRestaurando] = useState(false);
  const [restaurada, setRestaurada] = useState(false);
  const { login } = useAuthPublico();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setEliminada(null);
    setRestaurada(false);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/perfil", { replace: true });
    } catch (err) {
      if (err.data?.codigo === "cuenta_eliminada") {
        setEliminada(err.data);
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRestaurar = async () => {
    setRestaurando(true);
    try {
      const res = await fetch("/api/auth/restaurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRestaurada(true);
      setEliminada(null);
    } catch (err) {
      setError(err.message);
      setEliminada(null);
    } finally {
      setRestaurando(false);
    }
  };

  if (restaurada) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <img src="/imagenes/logo-madeinchaco.png" alt="Made in Chaco" className="login-logo" />
            <p>Cuenta restaurada</p>
          </div>
          <div className="login-form">
            <div className="login-success" style={{ background: "#def7e5", color: "#0f6b3a", padding: "12px 16px", borderRadius: "12px", fontSize: "14px", textAlign: "center", border: "1px solid #b7ebc5", marginBottom: "16px" }}>
              Tu cuenta fue restaurada exitosamente. Ya podés iniciar sesión.
            </div>
            <button onClick={() => { setRestaurada(false); setEmail(""); setPassword(""); }} className="login-btn" style={{ width: "100%" }}>
              VOLVER A INGRESAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (eliminada) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <img src="/imagenes/logo-madeinchaco.png" alt="Made in Chaco" className="login-logo" />
            <p>Cuenta eliminada</p>
          </div>
          <div className="login-form">
            <div className="login-error">
              Esta cuenta fue eliminada el {new Date(eliminada.deleted_at).toLocaleDateString("es-AR")}.
              Todavía podés restaurarla dentro de los próximos 30 días.
            </div>
            <button onClick={handleRestaurar} disabled={restaurando} className="login-btn" style={{ width: "100%", marginBottom: "12px" }}>
              {restaurando ? "RESTAURANDO..." : "RESTAURAR CUENTA"}
            </button>
            <button onClick={() => setEliminada(null)} className="login-btn" style={{ width: "100%", background: "#6b7280" }}>
              CANCELAR
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <img src="/imagenes/logo-madeinchaco.png" alt="Made in Chaco" className="login-logo" />
          <p>Iniciar sesión</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" placeholder="Ingresá tu contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "INGRESANDO..." : "INGRESAR"}
          </button>
        </form>

        <p className="login-footer">
          ¿No tenés cuenta? <Link to="/registrarse" style={{ color: "#863819", fontWeight: 600 }}>Crear cuenta</Link>
        </p>
      </div>
    </div>
  );
};
