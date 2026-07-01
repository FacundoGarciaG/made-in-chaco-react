import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "../styles/LoginPage.css";
import { SEO } from "../components/SEO";

const STATUS = {
  LOADING: "loading",
  SUCCESS: "success",
  ERROR: "error",
};

export const VerificarCuentaPage = () => {
  const { token } = useParams();
  const [status, setStatus] = useState(STATUS.LOADING);

  useEffect(() => {
    fetch(`/api/auth/verificar/${token}`)
      .then((res) => res.json())
      .then((data) => setStatus(data.ok ? STATUS.SUCCESS : STATUS.ERROR))
      .catch(() => setStatus(STATUS.ERROR));
  }, [token]);

  return (
    <div className="login-page">
      <SEO title="Verificar Cuenta" description="Confirmá tu correo electrónico para activar tu cuenta en Made in Chaco." />
      <div className="login-card" style={{ textAlign: "center", padding: "48px 32px" }}>
        <div className="login-header">
          <img src="/imagenes/logo-madeinchaco.png" alt="Made in Chaco" className="login-logo" />
        </div>

        {status === STATUS.LOADING && (
          <p style={{ marginTop: 24, color: "#555" }}>Verificando tu cuenta...</p>
        )}

        {status === STATUS.SUCCESS && (
          <>
            <h2 style={{ color: "#863819", marginTop: 24 }}>Cuenta verificada</h2>
            <p style={{ color: "#555", lineHeight: 1.6, marginTop: 12 }}>
              Tu cuenta fue verificada correctamente. Ya podés iniciar sesión.
            </p>
            <Link
              to="/iniciar-sesion"
              className="login-btn"
              style={{ display: "inline-block", textDecoration: "none", marginTop: 20 }}
            >
              INICIAR SESIÓN
            </Link>
          </>
        )}

        {status === STATUS.ERROR && (
          <>
            <h2 style={{ color: "#cc3333", marginTop: 24 }}>Error de verificación</h2>
            <p style={{ color: "#555", lineHeight: 1.6, marginTop: 12 }}>
              El enlace es inválido o la cuenta ya fue verificada.
            </p>
            <Link
              to="/iniciar-sesion"
              className="login-btn"
              style={{ display: "inline-block", textDecoration: "none", marginTop: 20 }}
            >
              VOLVER AL INICIO
            </Link>
          </>
        )}
      </div>
    </div>
  );
};
