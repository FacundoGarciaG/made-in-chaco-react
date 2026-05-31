const siteLive = import.meta.env.VITE_SITE_LIVE !== "false";

export function UnderConstruction({ children }) {
  if (siteLive) return children;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#f6f3ec", color: "#863819", fontFamily: "Cinzel, serif",
      textAlign: "center", padding: "40px",
    }}>
      <img src="/imagenes/logo-madeinchaco.png" alt="Made in Chaco"
        style={{ maxWidth: "300px", marginBottom: "2rem" }} />
      <p style={{ fontSize: "1.2rem", color: "#666", fontFamily: "Epilogue, sans-serif" }}>
        Sitio en construcción. Pronto estaremos online.
      </p>
    </div>
  );
}
