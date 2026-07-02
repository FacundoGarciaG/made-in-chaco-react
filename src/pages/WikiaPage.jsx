import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { SEO } from "../components/SEO";

const CATEGORIAS = [
  { value: "", label: "Todas las categorías" },
  { value: "palabra", label: "Palabras" },
  { value: "frase", label: "Frases" },
  { value: "dicho", label: "Dichos" },
  { value: "refran", label: "Refranes" },
  { value: "expresion", label: "Expresiones" },
];

const IDIOMAS = [
  { value: "", label: "Todos los orígenes" },
  { value: "guaraní", label: "Guaraní" },
  { value: "español", label: "Español" },
  { value: "wichí", label: "Wichí" },
  { value: "qom", label: "Qom" },
  { value: "mocoví", label: "Mocoví" },
  { value: "desconocido", label: "Desconocido" },
];

const BADGE_COLORS = {
  palabra: "#863819",
  frase: "#2D6A4F",
  dicho: "#5B4A9A",
  refran: "#B8860B",
  expresion: "#C75B39",
};

export function WikiaPage() {
  const [palabras, setPalabras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [idiomaOrigen, setIdiomaOrigen] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoria) params.set("categoria", categoria);
    if (idiomaOrigen) params.set("idioma_origen", idiomaOrigen);
    params.set("approved", "true");
    try {
      const res = await fetch(`/api/palabras?${params}`);
      if (res.ok) setPalabras(await res.json());
    } catch {
      setPalabras([]);
    } finally {
      setLoading(false);
    }
  }, [q, categoria, idiomaOrigen]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div style={{ minHeight: "100vh", background: "#f6f3ec" }}>
      <SEO title="La Colección" description="Explorá las palabras, frases y expresiones del Chaco" url="/wikia" />

      <div style={{ padding: "180px 32px 80px" }}>
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <h1 style={{
            fontFamily: "Cinzel, serif", fontSize: 52, fontWeight: 400, color: "#2D1A12",
            margin: "0 0 8px", letterSpacing: "-1px",
          }}>
            La Colección
          </h1>
          <div style={{
            width: 48, height: 3, background: "#863819", borderRadius: 2, marginBottom: 16,
            margin: "0 auto 16px",
          }} />
          <p style={{
            fontFamily: "Merriweather, serif", fontSize: 15, color: "#999",
            margin: "0 auto", lineHeight: 1.6, maxWidth: 480,
          }}>
            Palabras, frases, dichos y expresiones del Chaco
          </p>
        </div>

        <div style={{
          display: "flex", gap: 10, marginBottom: 32, flexWrap: "wrap", maxWidth: 800,
          alignItems: "center", justifyContent: "center", margin: "0 auto 32px",
        }}>
          <div style={{
            flex: 1, minWidth: 240, position: "relative", display: "flex", alignItems: "center",
          }}>
            <i className="ri-search-line" style={{
              position: "absolute", left: 14, color: "#bbb", fontSize: 15,
            }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar…"
              aria-label="Buscar palabra"
              style={{
                width: "100%", padding: "12px 14px 12px 40px", borderRadius: 12,
                border: "1.5px solid #e0dcd4", fontSize: 14,
                fontFamily: "Merriweather, serif", outline: "none",
                background: "white", transition: "border-color .2s",
                color: "#2D1A12",
              }}
              onFocus={(e) => { e.target.style.borderColor = "#c4b8aa"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e0dcd4"; }}
            />
          </div>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            aria-label="Filtrar por categoría"
            style={{
              padding: "12px 14px", borderRadius: 12,
              border: "1.5px solid #e0dcd4", fontSize: 13,
              fontFamily: "Merriweather, serif", background: "white",
              cursor: "pointer", color: "#555", outline: "none",
              minWidth: 140, WebkitAppearance: "none", MozAppearance: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
              paddingRight: 32,
            }}
          >
            {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={idiomaOrigen}
            onChange={(e) => setIdiomaOrigen(e.target.value)}
            aria-label="Filtrar por origen"
            style={{
              padding: "12px 14px", borderRadius: 12,
              border: "1.5px solid #e0dcd4", fontSize: 13,
              fontFamily: "Merriweather, serif", background: "white",
              cursor: "pointer", color: "#555", outline: "none",
              minWidth: 140, WebkitAppearance: "none", MozAppearance: "none",
              backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
              paddingRight: 32,
            }}
          >
            {IDIOMAS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
          </select>
        </div>

        {loading && (
          <p style={{ textAlign: "center", color: "#bbb", fontFamily: "Merriweather, serif", fontSize: 13, marginTop: 40 }}>Cargando…</p>
        )}

        {!loading && palabras.length === 0 && (
          <p style={{ textAlign: "center", color: "#bbb", fontFamily: "Merriweather, serif", fontSize: 13, marginTop: 40 }}>No se encontraron palabras</p>
        )}

        <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
          {palabras.map((p, i) => {
            const badgeColor = BADGE_COLORS[p.categoria] || "#863819";
            const corners = [
              ["24", "10", "22", "8"],
              ["10", "22", "12", "20"],
              ["18", "8", "24", "10"],
              ["8", "20", "10", "24"],
            ];
            const cr = corners[i % corners.length];
            const rot = [-0.4, 0.3, -0.2, 0.5, -0.6, 0.4][i % 6];
            return (
              <Link
                key={p.id}
                to={`/wikia/${p.slug}`}
                style={{
                  textDecoration: "none", background: "white",
                  borderRadius: `${cr[0]}px ${cr[1]}px ${cr[2]}px ${cr[3]}px`,
                  padding: "24px 24px 22px", border: "2.5px solid #d5cdc0",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  transform: `rotate(${rot}deg)`,
                  transition: "box-shadow .25s, transform .25s, border-color .25s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 6px 28px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = `rotate(${rot}deg) translateY(-3px)`;
                  e.currentTarget.style.borderColor = "#b8aa9a";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.05)";
                  e.currentTarget.style.transform = `rotate(${rot}deg)`;
                  e.currentTarget.style.borderColor = "#d5cdc0";
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  {p.categoria && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px",
                      color: badgeColor, background: `${badgeColor}0d`, padding: "2px 10px", borderRadius: 20,
                    }}>
                      {p.categoria}
                    </span>
                  )}
                  {p.idioma_origen && (
                    <span style={{
                      fontSize: 10, color: "#bbb", fontFamily: "Merriweather, serif", fontStyle: "italic",
                    }}>
                      {p.idioma_origen}
                    </span>
                  )}
                </div>
                <h2 style={{
                  fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
                  fontSize: 22, color: "#2D1A12", margin: "0 0 4px", fontWeight: 600,
                }}>
                  {p.palabra}
                </h2>
                {p.significado && (
                  <p style={{
                    fontFamily: "Merriweather, serif", fontSize: 12.5, color: "#888",
                    lineHeight: 1.5, margin: 0, fontStyle: "italic",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {p.significado}
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

