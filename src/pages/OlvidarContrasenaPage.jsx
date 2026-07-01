import { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/LoginPage.css";
import { SEO } from "../components/SEO";

export const OlvidarContrasenaPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/olvide-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <SEO title="Olvidé mi Contraseña" description="Recuperá el acceso a tu cuenta de Made in Chaco." />
      <div className="login-card">
        <div className="login-header">
          <img src="/imagenes/logo-madeinchaco.png" alt="Made in Chaco" className="login-logo" />
          <p>Restablecer contraseña</p>
        </div>

        {enviado ? (
          <div className="login-form">
            <div style={{
              background: "#def7e5", color: "#0f6b3a", padding: "16px",
              borderRadius: "12px", fontSize: "14px", textAlign: "center",
              border: "1px solid #b7ebc5", marginBottom: "16px",
            }}>
              Si el email está registrado, vas a recibir un link para restablecer tu contraseña.
            </div>
            <Link to="/iniciar-sesion" className="login-btn" style={{
              display: "block", textAlign: "center", textDecoration: "none",
            }}>
              VOLVER AL INICIO DE SESIÓN
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="login-error">{error}</div>}

            <p style={{ color: "#666", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
              Ingresá el email de tu cuenta y te enviaremos un link para restablecer tu contraseña.
            </p>

            <div className="login-field">
              <label htmlFor="email">Email</label>
              <input
                id="email" type="email" placeholder="tu@email.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required autoFocus
              />
            </div>

            <button type="submit" disabled={loading || !email} className="login-btn">
              {loading ? "ENVIANDO..." : "ENVIAR LINK"}
            </button>
          </form>
        )}

        <p className="login-footer">
          <Link to="/iniciar-sesion" style={{ color: "#863819", fontWeight: 600 }}>
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
};
