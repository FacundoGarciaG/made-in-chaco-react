import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { SEO } from "../components/SEO";
import "../styles/RankingPage.css";

const rowVariants = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

export const RankingPage = () => {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = periodo ? `?periodo=${periodo}` : "";
        const res = await fetch(`/api/sellos/ranking${params}`);
        if (res.ok) setRanking(await res.json());
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [periodo]);

  const medalInfo = (i) => {
    if (i === 0) return { emoji: "🥇", className: "gold", top: "top-1" };
    if (i === 1) return { emoji: "🥈", className: "silver", top: "top-2" };
    if (i === 2) return { emoji: "🥉", className: "bronze", top: "top-3" };
    return { emoji: null, className: "", top: "" };
  };

  return (
    <div className="ranking-page">
      <SEO
        title="Ranking de Exploradores — Made in Chaco"
        description="Los exploradores que más sellos coleccionaron en el directorio de Made in Chaco."
      />

      <div className="ranking-spacer" />

      <div className="ranking-content">
      <div className="ranking-header">
        <Link to="/" className="ranking-back">← Volver</Link>
        <h1 className="ranking-title">
          Ranking de{" "}
          <span className="ranking-title-accent">Exploradores</span>
        </h1>
        <p className="ranking-subtitle">
          Los que más recorrieron el Chaco escaneando entidades
        </p>

        <div className="ranking-filters">
          {[
            { key: null, label: "Todos" },
            { key: "mes", label: "Este mes" },
            { key: "anio", label: "Este año" },
          ].map((f) => (
            <button
              key={f.key || "all"}
              className={`ranking-filter-btn${periodo === f.key ? " active" : ""}`}
              onClick={() => setPeriodo(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        {loading ? (
          <div className="ranking-loading">Cargando ranking...</div>
        ) : ranking.length === 0 ? (
          <div className="ranking-empty">
            <div className="ranking-empty-icon">🏆</div>
            <p>Todavía no hay exploradores en el ranking.</p>
            <p>Escaneá códigos QR para empezar a coleccionar sellos.</p>
          </div>
        ) : (
          <div className="ranking-list">
          {ranking.map((r, i) => {
            const medal = medalInfo(i);
            return (
              <motion.div
                key={r.perfil_id}
                className={`ranking-row${medal.top ? ` ${medal.top}` : ""}`}
                custom={i}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                style={{ position: "relative" }}
              >
                <div className={`ranking-pos${medal.emoji ? ` medal ${medal.className}` : ""}`}>
                  {medal.emoji || i + 1}
                </div>

                <div className="ranking-avatar">
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt={r.nombre} />
                  ) : (
                    <span>{(r.nombre || "?")[0].toUpperCase()}</span>
                  )}
                </div>

                <div className="ranking-info">
                  <span className="ranking-name">{r.nombre}</span>
                  <span className="ranking-meta">
                    {r.total_sellos} sello{r.total_sellos !== 1 ? "s" : ""} · {r.total_logros} logro{r.total_logros !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="ranking-points">
                  <span className="ranking-points-num">{r.total_puntos}</span>
                  <span className="ranking-points-label">pts</span>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default RankingPage;
