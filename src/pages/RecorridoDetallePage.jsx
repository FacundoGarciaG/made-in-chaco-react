import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, useScroll, useSpring } from "motion/react";
import { FavoritoButton } from "../components/FavoritoButton";
import "../styles/RecorridoDetallePage.css";
import { optimizarUrlCloudinary } from "../utils/imageUrl";
import { SEO } from "../components/SEO";

const AnimatedNumber = ({ value, delay = 0 }) => {
  const [display, setDisplay] = useState(0);
  const raf = useRef();

  useEffect(() => {
    const timeout = setTimeout(() => {
      const duration = 1500;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) raf.current = requestAnimationFrame(tick);
      };

      raf.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(raf.current);
    };
  }, [value, delay]);

  return <span>{display}</span>;
};

const colorMap = {
  artesano: "#ff5722",
  gastronomia: "#4caf50",
  comercio: "#2196f3",
  evento: "#9c27b0",
  patrimonio: "#795548",
  personalidad: "#e91e63",
  comunidad_indigena: "#8B4513",
  lugar_natural: "#2E7D32",
  hospedaje: "#FF6F00",
  productor: "#00695C",
  experiencia: "#6A1B9A",
  relato: "#D84315",
  espacio_cultural: "#37474F",
};

const titleVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.035, delayChildren: 0.3 },
  },
};

const charVariants = {
  hidden: { opacity: 0, y: 80, rotateX: -90 },
  visible: {
    opacity: 1,
    y: 0,
    rotateX: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

export const RecorridoDetallePage = () => {
  const { slug } = useParams();
  const [recorrido, setRecorrido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pasoActual, setPasoActual] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [toast, setToast] = useState(null);

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Mirá esto: ${recorrido?.nombre} — Recorrido en Made in Chaco`;

    if (navigator.share) {
      try {
        await navigator.share({ title: recorrido?.nombre, text, url });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setToast("Link copiado ✦");
      } catch {
        setToast("No se pudo copiar");
      }
      setTimeout(() => setToast(null), 2000);
    }
  };

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    setPasoActual(0);
    setHeroReady(false);
    fetch(`/api/recorridos/${slug}`)
      .then((r) => r.json())
      .then((data) => setRecorrido(data))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setTimeout(() => setHeroReady(true), 50);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="rd-loading">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <span className="rd-loading-dot" />
        </motion.div>
        <span className="rd-loading-text">Cargando recorrido...</span>
      </div>
    );
  }

  if (!recorrido) {
    return (
      <div className="rd-error">
        <div className="rd-error-icon">⟡</div>
        <p className="rd-error-text">No pudimos encontrar este recorrido.</p>
        <Link
          to="/recorridos"
          className="rd-top-nav-btn"
          style={{ position: "static", background: "rgba(45,26,18,0.45)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "100px", padding: "8px 16px" }}
        >
          ← Todos los recorridos
        </Link>
      </div>
    );
  }

  const total = recorrido.pasos?.length || 0;
  const paso = recorrido.pasos?.[pasoActual];
  if (!paso) return null;

  const catColor = colorMap[paso.tipo] || "#863819";
  const progress = total > 1 ? ((pasoActual + 1) / total) * 100 : 100;

  const irAlSiguiente = () => {
    if (pasoActual < total - 1) {
      setPasoActual(pasoActual + 1);
      setNavOpen(false);
    }
  };

  const irAlAnterior = () => {
    if (pasoActual > 0) {
      setPasoActual(pasoActual - 1);
      setNavOpen(false);
    }
  };

  return (
    <div className={darkMode ? "dark-mode" : ""}>
      <SEO title={recorrido?.nombre} description={recorrido?.resumen} image={recorrido?.imagen} url={`/recorrido/${recorrido?.slug}`} />
      <motion.div
        className="rd-progress"
        style={{ scaleX, originX: 0 }}
      />

      <nav className="rd-top-nav-bar" aria-label="Navegación de recorrido">
        <Link to="/recorridos" className="rd-top-nav-btn">
          <i className="ri-arrow-left-s-line" style={{ fontSize: 18 }} />
          Recorridos
        </Link>
        <Link to="/descubre" className="rd-top-nav-btn">
          <img src="/icons/location.png" style={{ width: 14, height: 14 }} alt="" />
          Mapa
        </Link>
      </nav>

      <motion.button
        className="rd-share-btn"
        onClick={handleShare}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        <i className="ri-share-line" />
      </motion.button>

      {recorrido && (
        <motion.div
          className="rd-fav-btn"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.475, ease: [0.16, 1, 0.3, 1] }}
        >
          <FavoritoButton recorridoId={recorrido.id} />
        </motion.div>
      )}

      <motion.button
        className="rd-theme-btn"
        onClick={() => setDarkMode(!darkMode)}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
      >
        <i className={`ri-${darkMode ? "sun" : "moon"}-line`} />
      </motion.button>

      <motion.section
        className="rd-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="rd-hero-bg" />
        {recorrido.imagen && (
          <div className="rd-hero-bg-img">
            <img src={optimizarUrlCloudinary(recorrido.imagen)} alt={recorrido.nombre || ""} />
          </div>
        )}
        <div className="rd-hero-pattern" />
        <div className="rd-hero-grid" />
        <div className="rd-hero-overlay" />

        <div className="rd-hero-content">
          <motion.span
            className="rd-hero-badge"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            Recorrido
          </motion.span>

          <motion.h1
            className="rd-hero-title"
            variants={titleVariants}
            initial="hidden"
            animate={heroReady ? "visible" : "hidden"}
          >
            <span style={{ display: "block" }}>
              {recorrido.nombre.split(" ").map((word, i) => (
                <span key={i} style={{ display: "inline-block", marginRight: "0.15em" }}>
                  {word.split("").map((char, j) => (
                    <motion.span
                      key={j}
                      className="char"
                      variants={charVariants}
                    >
                      {char}
                    </motion.span>
                  ))}
                </span>
              ))}
            </span>
          </motion.h1>

          <motion.p
            className="rd-hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {recorrido.descripcion}
          </motion.p>

          <motion.div
            className="rd-hero-meta"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="rd-hero-stat">
              <div className="rd-hero-stat-number">
                <AnimatedNumber value={total} delay={1400} />
              </div>
              <div className="rd-hero-stat-label">Parada{total !== 1 ? "s" : ""}</div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="rd-scroll-indicator"
          initial={{ opacity: 1 }}
          whileInView={{ opacity: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span>Scroll</span>
          <motion.div
            className="rd-scroll-line"
            animate={{ scaleY: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.section>

      <div className="rd-narrative">
        <div className="rd-section">
            <div className="rd-section-header">
              <div className="rd-section-header-left">
                <span className="rd-section-label">Parada {pasoActual + 1}</span>
                <span className="rd-step-counter">/ {total}</span>
              </div>
            </div>

          <div className="rd-progress-bar-track">
            <motion.div
              className="rd-progress-bar-fill"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(to right, ${catColor}, ${catColor}dd)`,
              }}
              layout
            />
          </div>

          <div className="rd-thumbnails">
            {recorrido.pasos.map((p, i) => {
              const pColor = colorMap[p.tipo] || "#863819";
              const esActual = i === pasoActual;
              const isDone = i < pasoActual;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPasoActual(i);
                    setNavOpen(false);
                  }}
                  className={`rd-thumb ${esActual ? "rd-thumb-active" : ""} ${isDone ? "rd-thumb-done" : ""}`}
                  style={{
                    borderColor: esActual ? pColor : isDone ? `${pColor}40` : "rgba(0,0,0,0.06)",
                    background: isDone ? `${pColor}10` : "var(--surface-low)",
                  }}
                >
                  {isDone && (
                    <span className="rd-thumb-check" style={{ color: pColor }}>✓</span>
                  )}
                  <img
                    src={`/icons/${p.tipo}.png`}
                    alt={p.tipo}
                  />
                  <span>
                    {p.nombre.length > 10 ? p.nombre.slice(0, 8) + "…" : p.nombre}
                  </span>
                </button>
              );
            })}
          </div>

          <motion.div
            key={pasoActual}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="rd-step-card"
          >
            {paso.imagen && (
              <div className="rd-step-card-image">
                <img src={optimizarUrlCloudinary(paso.imagen)} alt={paso.nombre} loading="lazy" />
                <div className="rd-step-card-image-overlay" />
                <div className="rd-step-card-image-badge">
                  <img
                    src={`/icons/${paso.tipo}.png`}
                    alt={paso.tipo}
                  />
                  <span style={{ color: "#fff" }}>{paso.tipo}</span>
                </div>
              </div>
            )}

            <div className="rd-step-card-body">
              <h2 className="rd-step-card-title">{paso.nombre}</h2>

              <p className="rd-step-card-desc">
                {paso.resumen || "Sin descripción disponible."}
              </p>

              {paso.descripcion_paso && (
                <div className="rd-step-card-quote">
                  <p>{paso.descripcion_paso}</p>
                </div>
              )}

              <div className="rd-step-card-actions">
                <Link
                  to={`/entidad/${paso.slug}`}
                  className="rd-detail-link"
                  style={{
                    background: `linear-gradient(135deg, ${catColor}, ${catColor}dd)`,
                    color: "#fff",
                    boxShadow: `0 4px 16px ${catColor}40`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = `0 6px 24px ${catColor}60`;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = `0 4px 16px ${catColor}40`;
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  Ver detalle completo →
                </Link>

                {paso.latitud && paso.longitud && (
                  <div style={{ position: "relative" }}>
                    <button
                      onClick={() => setNavOpen(!navOpen)}
                      className="rd-nav-btn-geo"
                    >
                      Cómo llegar
                    </button>
                    {navOpen && (
                      <div className="rd-nav-dropdown">
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${paso.latitud},${paso.longitud}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => setNavOpen(false)}
                        >
                          <img src="/icons/googlemaps.png" alt="" /> Google Maps
                        </a>
                        <a
                          href={`https://waze.com/ul?ll=${paso.latitud},${paso.longitud}&navigate=yes`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => setNavOpen(false)}
                        >
                          <img src="/icons/waze.png" alt="" /> Waze
                        </a>
                        <a
                          href={`https://maps.apple.com/?daddr=${paso.latitud},${paso.longitud}`}
                          target="_blank" rel="noopener noreferrer"
                          onClick={() => setNavOpen(false)}
                        >
                          <img src="/icons/applemaps.png" alt="" /> Apple Maps
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <div className="rd-nav-buttons" style={{ marginTop: 24, display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              onClick={irAlAnterior}
              disabled={pasoActual === 0}
              className="rd-nav-btn"
            >
              ← Anterior
            </button>
            <button
              onClick={irAlSiguiente}
              disabled={pasoActual === total - 1}
              className={`rd-nav-btn ${pasoActual < total - 1 ? "rd-nav-btn-primary" : ""}`}
            >
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <motion.div
          className="rd-toast"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          {toast}
        </motion.div>
      )}
    </div>
  );
};
