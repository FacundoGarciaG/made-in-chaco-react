import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import "../styles/LoginPage.css";

export const RegisterPage = () => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuthPublico();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, nombre);
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
          <p>Crear cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label htmlFor="nombre">Nombre</label>
            <input id="nombre" type="text" placeholder="Tu nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
          </div>

          <div className="login-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="login-field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </div>

          <div className="login-field">
            <label htmlFor="confirmPassword">Repetir contraseña</label>
            <input id="confirmPassword" type="password" placeholder="Repetí tu contraseña" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "CREANDO CUENTA..." : "CREAR CUENTA"}
          </button>
        </form>

        <p className="login-footer">
          ¿Ya tenés cuenta? <Link to="/iniciar-sesion" style={{ color: "#863819", fontWeight: 600 }}>Iniciá sesión</Link>
        </p>
      </div>
    </div>
  );
};
