const siteLive = import.meta.env.VITE_SITE_LIVE !== "false";

export function UnderConstruction({ children }) {
  if (siteLive) return children;

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      minHeight: "100vh", background: "#f6f3ec", color: "#863819", fontFamily: "Cinzel, serif",
      textAlign: "center", padding: "40px",
    }}>
      <h1 style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>Made in Chaco</h1>
      <p style={{ fontSize: "1.2rem", color: "#666", fontFamily: "Epilogue, sans-serif" }}>
        Sitio en construcción. Pronto estaremos online.
      </p>
    </div>
  );
}
