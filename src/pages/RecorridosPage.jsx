import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useSpring } from "motion/react";
import "../styles/RecorridosPage.css";
import { useSocketEvent } from "../hooks/useSocket";
import { optimizarUrlCloudinary } from "../utils/imageUrl";

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

const titleVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.3 },
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

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  }),
};

export const RecorridosPage = () => {
  const [recorridos, setRecorridos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [heroReady, setHeroReady] = useState(false);

  const [socketRefresh, setSocketRefresh] = useState(0);
  useSocketEvent("recorrido:change", () => setSocketRefresh((t) => t + 1));

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    fetch("/api/recorridos")
      .then((r) => r.json())
      .then((data) => setRecorridos(data))
      .catch(() => {})
      .finally(() => {
        setLoading(false);
        setTimeout(() => setHeroReady(true), 50);
      });
  }, [socketRefresh]);

  if (loading) {
    return (
      <div className="recorridos-loading">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <span className="recorridos-loading-dot" />
        </motion.div>
        <span className="recorridos-loading-text">Cargando recorridos...</span>
      </div>
    );
  }

  return (
    <div className={darkMode ? "dark-mode" : ""}>
      <motion.div
        className="recorridos-progress"
        style={{ scaleX, originX: 0 }}
      />

      <nav className="recorridos-nav-bar">
        <Link to="/descubre" className="recorridos-nav-btn">
          <i className="ri-arrow-left-s-line" style={{ fontSize: 18 }} />
          Volver
        </Link>
        <Link to="/descubre" className="recorridos-nav-btn">
          <img src="/icons/location.png" style={{ width: 14, height: 14 }} alt="" />
          Mapa
        </Link>
      </nav>

      <motion.button
        className="recorridos-theme-btn"
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
        className="recorridos-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="recorridos-hero-bg" />
        <div className="recorridos-hero-pattern" />
        <div className="recorridos-hero-grid" />
        <div className="recorridos-hero-overlay" />

        <div className="recorridos-hero-content">
          <motion.span
            className="recorridos-hero-badge"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            Rutas
          </motion.span>

          <motion.h1
            className="recorridos-hero-title"
            variants={titleVariants}
            initial="hidden"
            animate={heroReady ? "visible" : "hidden"}
          >
            <span style={{ display: "block" }}>
              {"Recorridos".split("").map((char, i) => (
                <motion.span key={i} className="char" variants={charVariants}>
                  {char === " " ? "\u00A0" : char}
                </motion.span>
              ))}
            </span>
            <span style={{ display: "block" }}>
              {"Temáticos".split("").map((char, i) => (
                <motion.span key={i} className="char" variants={charVariants}>
                  {char}
                </motion.span>
              ))}
            </span>
          </motion.h1>

          <motion.p
            className="recorridos-hero-sub"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Explora secuencias curatoriales que conectan personas, lugares, sabores e historias del Chaco.
          </motion.p>

          <motion.div
            className="recorridos-hero-stats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.75, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="recorridos-hero-stat">
              <div className="recorridos-hero-stat-number">
                <AnimatedNumber value={recorridos.length} delay={1400} />
              </div>
              <div className="recorridos-hero-stat-label">Recorridos</div>
            </div>
            <div className="recorridos-hero-stat">
              <div className="recorridos-hero-stat-number">
                <AnimatedNumber value={recorridos.reduce((s, r) => s + (r.total_pasos || 0), 0)} delay={1600} />
              </div>
              <div className="recorridos-hero-stat-label">Paradas</div>
            </div>
          </motion.div>
        </div>

        <motion.div
          className="recorridos-scroll-indicator"
          initial={{ opacity: 1 }}
          whileInView={{ opacity: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span>Scroll</span>
          <motion.div
            className="recorridos-scroll-line"
            animate={{ scaleY: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.section>

      <div className="recorridos-narrative">
        <div className="recorridos-section">
          <motion.div
            className="recorridos-section-header"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="recorridos-section-label">Explorá</span>
            <h2 className="recorridos-section-title">Elegí tu ruta</h2>
          </motion.div>

          {recorridos.length === 0 ? (
            <div className="recorridos-empty">
              <div className="recorridos-empty-icon">⟡</div>
              <p className="recorridos-empty-text">No hay recorridos disponibles todavía.</p>
            </div>
          ) : (
            <div className="recorridos-grid">
              {recorridos.map((r, i) => {
                const cardColor = "#863819";
                return (
                  <motion.div
                    key={r.id}
                    custom={i}
                    variants={cardVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-40px" }}
                  >
                    <Link
                      to={`/recorrido/${r.slug}`}
                      className="recorridos-card"
                      style={{ "--card-color": cardColor }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const y = e.clientY - rect.top;
                        const rx = ((y - rect.height / 2) / rect.height) * -8;
                        const ry = ((x - rect.width / 2) / rect.width) * 8;
                        e.currentTarget.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
                      }}
                    >
                      <div className="recorridos-card-image">
                        {r.imagen ? (
                          <img src={optimizarUrlCloudinary(r.imagen)} alt={r.nombre} loading="lazy" />
                        ) : (
                          <div className="recorridos-card-image-fallback">🗺️</div>
                        )}
                        <div className="recorridos-card-overlay" />
                        <span className="recorridos-card-steps">
                          {r.total_pasos} paso{r.total_pasos !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="recorridos-card-body">
                        <h3 className="recorridos-card-title">{r.nombre}</h3>
                        <p className="recorridos-card-desc">
                          {r.descripcion || "Un recorrido por el Chaco."}
                        </p>
                        <div className="recorridos-card-footer">
                          <span className="recorridos-card-arrow">→</span>
                        </div>
                      </div>
                    </Link>
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
