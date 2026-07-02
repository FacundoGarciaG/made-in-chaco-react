import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { SEO } from "../components/SEO";

const CATEGORIA_LABELS = {
  palabra: "Palabra",
  frase: "Frase",
  dicho: "Dicho",
  refran: "Refrán",
  expresion: "Expresión",
};

const BADGE_COLORS = {
  palabra: "#863819",
  frase: "#2D6A4F",
  dicho: "#5B4A9A",
  refran: "#B8860B",
  expresion: "#C75B39",
};

export function PalabraDetallePage() {
  const params = useParams();
  const id = params.id ?? params.slug;
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const vieneDelMapa = typeof window !== "undefined" && sessionStorage.getItem("mapState");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/palabras/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  const badgeColor = BADGE_COLORS[data?.categoria] || "#863819";

  return (
    <div style={{ minHeight: "100vh", background: "#f6f3ec", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <SEO title={data?.palabra ? `"${data.palabra}"` : null} description={data?.significado} url={`/wikia/${data?.slug}`} />

      <div style={{
        maxWidth: 640, width: "100%", padding: "60px 20px 80px",
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        <div style={{ alignSelf: "flex-start", display: "flex", gap: 16, marginBottom: 20 }}>
          <Link to="/wikia" style={{
            fontFamily: "Merriweather, serif", fontSize: 13,
            color: "#863819", textDecoration: "none",
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            ← La Colección
          </Link>
          {vieneDelMapa && (
            <button
              onClick={() => {
                sessionStorage.setItem("return-to-map", "true");
                navigate("/descubre");
              }}
              style={{
                fontFamily: "Merriweather, serif", fontSize: 13,
                color: "#863819", textDecoration: "none", border: "none",
                background: "none", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: 0,
              }}
            >
              ← Volver al mapa
            </button>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          style={{
            background: "white", width: "100%", padding: "48px 40px",
            border: "3px solid #2D1A12",
            boxShadow: "6px 6px 0px #2D1A12, 0 8px 40px rgba(0,0,0,0.08)",
            borderRadius: "30px 18px 30px 18px / 20px 30px 18px 30px",
          }}
        >
          {loading && <p style={{ color: "#888", textAlign: "center", fontFamily: "Merriweather, serif" }}>Cargando…</p>}

          {!loading && !data && (
            <p style={{ color: "#c0392b", textAlign: "center", fontFamily: "Merriweather, serif" }}>
              Palabra no encontrada
            </p>
          )}

          {!loading && data && (
            <>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14, flexWrap: "wrap" }}>
                {data.categoria && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px",
                    color: badgeColor, background: `${badgeColor}15`, padding: "3px 12px", borderRadius: 20,
                  }}>
                    {CATEGORIA_LABELS[data.categoria] || data.categoria}
                  </span>
                )}
                {data.idioma_origen && (
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: "#888",
                    padding: "3px 12px", borderRadius: 20, border: "1px solid #ddd",
                  }}>
                    {data.idioma_origen}
                  </span>
                )}
              </div>

              <h1 style={{
                fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
                fontSize: 44, fontWeight: 700, color: "#2D1A12", textAlign: "center",
                margin: "0 0 6px", lineHeight: 1.2,
              }}>
                {data.palabra}
              </h1>

              {data.significado ? (
                <p style={{
                  fontFamily: "Merriweather, serif", fontSize: 17, color: "#444",
                  textAlign: "center", lineHeight: 1.7, margin: "16px 0 24px", fontStyle: "italic",
                }}>
                  “{data.significado}”
                </p>
              ) : (
                <p style={{
                  fontFamily: "Merriweather, serif", fontSize: 15, color: "#bbb",
                  textAlign: "center", fontStyle: "italic", margin: "16px 0 24px",
                }}>
                  Sin significado registrado
                </p>
              )}

              {data.etimologia && (
                <div style={{ margin: "24px 0", padding: "16px 20px", background: "#f9f7f2", borderRadius: 12, border: "1px solid #eee" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#888", marginBottom: 6 }}>
                    Etimología
                  </div>
                  <p style={{ fontFamily: "Merriweather, serif", fontSize: 14, color: "#555", lineHeight: 1.6, margin: 0 }}>
                    {data.etimologia}
                  </p>
                </div>
              )}

              {data.ejemplos?.length > 0 && (
                <div style={{ margin: "24px 0" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#888", marginBottom: 12, textAlign: "center" }}>
                    Ejemplos
                  </div>
                  {data.ejemplos.map((ej, i) => (
                    <div key={i} style={{
                      fontFamily: "Merriweather, serif", fontSize: 14, color: "#555",
                      lineHeight: 1.6, padding: "10px 16px", background: "#f9f7f2",
                      borderRadius: 10, marginBottom: 8, borderLeft: "3px solid #e0d8cc",
                    }}>
                      {ej}
                    </div>
                  ))}
                </div>
              )}

              {data.audio_url && (
                <div style={{ margin: "24px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#888", marginBottom: 10 }}>
                    Pronunciación
                  </div>
                  <audio controls src={data.audio_url} style={{ width: "100%", maxWidth: 300, borderRadius: 8 }}>
                    Tu navegador no soporta audio
                  </audio>
                </div>
              )}
            </>
          )}
        </motion.div>

        {data && (
          <div style={{ marginTop: 20, fontSize: 10, letterSpacing: "2px", textTransform: "uppercase", color: "#aaa", fontFamily: "Merriweather, serif" }}>
            La Colección
          </div>
        )}
      </div>
    </div>
  );
}
