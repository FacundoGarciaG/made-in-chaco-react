import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import "../styles/LoginPage.css";

export const UserLoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthPublico();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/perfil", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
