import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export function PalabraDelDia() {
  const [data, setData] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/palabras/del-dia")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!data) return;
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [data]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          style={{
            position: "fixed", zIndex: 999, top: "50%", right: 0,
            transform: "translateY(-50%)",
          }}
        >
          <Link
            to={`/wikia/${data.slug}`}
            style={{
              display: "block", textDecoration: "none", background: "white",
              border: "2px solid #e0d8cc", borderRadius: "16px 0 0 16px",
              padding: "20px 24px", maxWidth: 300,
              boxShadow: "-4px 4px 20px rgba(0,0,0,0.1)",
              borderRight: "none",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "-4px 6px 28px rgba(0,0,0,0.15)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "-4px 4px 20px rgba(0,0,0,0.1)"; }}
          >
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "2px", color: "#863819", marginBottom: 4 }}>
              Palabra del día
            </div>
            <div style={{
              fontFamily: "'Patrick Hand', 'Comic Sans MS', cursive, sans-serif",
              fontSize: 26, color: "#2D1A12", margin: "0 0 2px",
            }}>
              {data.palabra}
            </div>
            {data.significado && (
              <p style={{
                fontFamily: "Merriweather, serif", fontSize: 12, color: "#666",
                fontStyle: "italic", margin: 0, lineHeight: 1.4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {data.significado}
              </p>
            )}
            <div style={{ fontSize: 10, color: "#aaa", marginTop: 8, fontFamily: "Merriweather, serif" }}>
              Ver en Wikia →
            </div>
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
