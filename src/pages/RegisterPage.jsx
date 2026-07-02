import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import "../styles/LoginPage.css";
import { SEO } from "../components/SEO";

export const RegisterPage = () => {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [mostrarConfirmPassword, setMostrarConfirmPassword] = useState(false);
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
      <SEO title="Registrarse" description="Creá tu cuenta en Made in Chaco y formá parte de la comunidad chaqueña." />
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
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={mostrarPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required minLength={6}
                style={{ width: "100%", paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: 18,
                  padding: 4, lineHeight: 1, color: "#1c1c18",
                }}
                tabIndex={-1}
              >
                <i className={`ri-${mostrarPassword ? "eye-off" : "eye"}-line`} style={{ fontSize: 20, color: "#1c1c18" }}></i>
              </button>
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="confirmPassword">Repetir contraseña</label>
            <div style={{ position: "relative" }}>
              <input
                id="confirmPassword"
                type={mostrarConfirmPassword ? "text" : "password"}
                placeholder="Repetí tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required minLength={6}
                style={{ width: "100%", paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setMostrarConfirmPassword(!mostrarConfirmPassword)}
                style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer", fontSize: 18,
                  padding: 4, lineHeight: 1, color: "#1c1c18",
                }}
                tabIndex={-1}
              >
                <i className={`ri-${mostrarConfirmPassword ? "eye-off" : "eye"}-line`} style={{ fontSize: 20, color: "#1c1c18" }}></i>
              </button>
            </div>
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
