import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";

export const ReestablecerContrasenaPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reestablecer-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setExito(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (exito) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-header">
            <img src="/imagenes/logo-madeinchaco.png" alt="Made in Chaco" className="login-logo" />
            <p>Contraseña actualizada</p>
          </div>
          <div className="login-form">
            <div style={{
              background: "#def7e5", color: "#0f6b3a", padding: "16px",
              borderRadius: "12px", fontSize: "14px", textAlign: "center",
              border: "1px solid #b7ebc5", marginBottom: "16px",
            }}>
              Tu contraseña fue actualizada exitosamente. Ya podés iniciar sesión con tu nueva contraseña.
            </div>
            <button onClick={() => navigate("/iniciar-sesion")} className="login-btn" style={{ width: "100%" }}>
              INICIAR SESIÓN
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
          <p>Nueva contraseña</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="login-error">{error}</div>}

          <div className="login-field">
            <label htmlFor="password">Nueva contraseña</label>
            <input
              id="password" type="password" placeholder="Mínimo 6 caracteres"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required minLength={6} autoFocus
            />
          </div>

          <div className="login-field">
            <label htmlFor="confirmPassword">Repetir contraseña</label>
            <input
              id="confirmPassword" type="password" placeholder="Repetí tu contraseña"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              required minLength={6}
            />
          </div>

          <button type="submit" disabled={loading} className="login-btn">
            {loading ? "GUARDANDO..." : "GUARDAR CONTRASEÑA"}
          </button>
        </form>

        <p className="login-footer">
          <Link to="/iniciar-sesion" style={{ color: "#863819", fontWeight: 600 }}>
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
};
