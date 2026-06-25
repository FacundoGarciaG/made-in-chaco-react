import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "motion/react";

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: "#f6f3ec",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    fontFamily: "Merriweather, serif",
  },
  card: {
    background: "white",
    maxWidth: 520,
    width: "100%",
    padding: "48px 40px",
    textAlign: "center",
    position: "relative",
    border: "3px solid #2D1A12",
    boxShadow: "6px 6px 0px #2D1A12, 0 8px 40px rgba(0,0,0,0.08)",
    borderRadius: "30px 18px 30px 18px / 20px 30px 18px 30px",
  },
  palabra: {
    fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
    fontSize: 42,
    fontWeight: 700,
    color: "#2D1A12",
    margin: "0 0 8px",
    lineHeight: 1.2,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: "#863819",
    textTransform: "uppercase",
    letterSpacing: "2px",
    marginBottom: 16,
  },
  significado: {
    fontSize: 16,
    color: "#444",
    lineHeight: 1.7,
    margin: "16px 0 32px",
    fontStyle: "italic",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 24px",
    background: "#2D1A12",
    color: "white",
    textDecoration: "none",
    borderRadius: 12,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: "1px",
    textTransform: "uppercase",
    boxShadow: "3px 3px 0px #863819",
  },
  loading: {
    color: "#888",
    fontSize: 14,
    fontFamily: "Merriweather, serif",
  },
  error: {
    color: "#c0392b",
    fontSize: 14,
    fontFamily: "Merriweather, serif",
  },
  header: {
    marginTop: 16,
    fontSize: 10,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "#aaa",
    fontFamily: "Merriweather, serif",
  },
};

export function PalabraDetallePage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/palabras/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={styles.wrapper}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        style={styles.card}
      >
        {loading && <div style={styles.loading}>Cargando…</div>}

        {!loading && !data && (
          <div style={styles.error}>Palabra no encontrada</div>
        )}

        {!loading && data && (
          <>
            <div style={styles.label}>Palabra chaqueña</div>
            <h1 style={styles.palabra}>{data.palabra}</h1>
            {data.significado ? (
              <p style={styles.significado}>“{data.significado}”</p>
            ) : (
              <p style={{ ...styles.significado, color: "#bbb" }}>
                Sin significado registrado
              </p>
            )}
            <Link to="/descubre" style={styles.backBtn}>
              ← Volver al mapa
            </Link>
          </>
        )}
      </motion.div>

      {data && (
        <div style={styles.header}>
          Palabras del Chaco · Hecho con amor
        </div>
      )}
    </div>
  );
}
