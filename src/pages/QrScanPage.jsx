import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuthPublico } from "../context/AuthPublicoContext";
import { optimizarUrlCloudinary } from "../utils/imageUrl";
import { publicAuthFetch } from "../helpers/publicAuthFetch";
import { SEO } from "../components/SEO";
import "../styles/QrScanPage.css";

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

const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram", icon: "ri-instagram-line", url: (v) => `https://www.instagram.com/${v}/` },
  { value: "youtube", label: "YouTube", icon: "ri-youtube-line", url: (v) => v.startsWith("http") ? v : `https://www.youtube.com/${v.startsWith("@") ? v : "@" + v}` },
  { value: "facebook", label: "Facebook", icon: "ri-facebook-circle-line", url: (v) => `https://www.facebook.com/${v}/` },
  { value: "tiktok", label: "TikTok", icon: "ri-tiktok-line", url: (v) => `https://www.tiktok.com/@${v}` },
  { value: "twitter", label: "X / Twitter", icon: "ri-twitter-x-line", url: (v) => `https://x.com/${v}` },
  { value: "whatsapp", label: "WhatsApp", icon: "ri-whatsapp-line", url: (v) => `https://wa.me/${v.replace(/[^0-9]/g, "")}` },
  { value: "telefono", label: "Teléfono", icon: "ri-phone-line", url: (v) => v },
  { value: "email", label: "Email", icon: "ri-mail-line", url: (v) => `mailto:${v}` },
];

const parseSocialList = (v) => {
  if (!v) return [];
  try { return JSON.parse(v); } catch { return v ? [{ type: "instagram", value: v }] : []; }
};

const titleVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.03, delayChildren: 0.3 } },
};

const charVariants = {
  hidden: { opacity: 0, y: 60, rotateX: -90 },
  visible: {
    opacity: 1, y: 0, rotateX: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export const QrScanPage = () => {
  const { slug } = useParams();
  const { getToken, isAuthenticated, perfil } = useAuthPublico();
  const [entidad, setEntidad] = useState(null);
  const [multimedia, setMultimedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hasSello, setHasSello] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [collected, setCollected] = useState(false);
  const [stats, setStats] = useState({ total_scans: 0, unique_users: 0 });
  const [showConfetti, setShowConfetti] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/entidad/${slug}`);
        if (!res.ok) throw new Error("No encontrada");
        const data = await res.json();
        setEntidad(data);

        // Check if current user is the owner
        if (perfil && data.perfil_id && data.perfil_id === perfil.id) {
          setIsOwner(true);
        }

        // Cargar multimedia
        if (data.id) {
          const resMulti = await fetch(`/api/entidades/${data.id}/multimedia`);
          if (resMulti.ok) {
            const mData = await resMulti.json();
            setMultimedia(mData.filter((m) => m.url_recurso));
          }

          // Stats públicas
          const resStats = await fetch(`/api/sellos/stats/${data.id}`);
          if (resStats.ok) setStats(await resStats.json());

          // Verificar si el usuario ya tiene el sello
          if (isAuthenticated && getToken()) {
            const resCheck = await publicAuthFetch(`/api/sellos/check/${data.id}`, {
              headers: { Authorization: `Bearer ${getToken()}` },
            });
            if (resCheck.ok) {
              const checkData = await resCheck.json();
              setHasSello(checkData.collected);
            }
          }
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [slug, isAuthenticated, getToken, perfil]);

  const handleCollectSello = async () => {
    if (!isAuthenticated || !getToken() || !entidad) return;
    setCollecting(true);
    try {
      const res = await publicAuthFetch("/api/sellos/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ entidad_id: entidad.id }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.collected) {
          setCollected(true);
          setHasSello(true);
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);
        } else {
          setHasSello(true);
        }
      }
    } catch { /* silent */ } finally {
      setCollecting(false);
    }
  };

  const formatearFechaSimple = (fechaIso) => {
    if (!fechaIso) return "";
    const [year, month, day] = fechaIso.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  const getFichaItems = () => {
    if (!entidad) return [];
    const t = entidad.tipo;
    if (t === "evento") {
      return [
        { label: "Fecha", value: formatearFechaSimple(entidad.fecha_evento) },
        { label: "Actividades", value: entidad.actividades_principales },
      ].filter((i) => i.value);
    }
    if (t === "artesano") {
      return [
        { label: "Técnica", value: entidad.tecnica_principal },
        { label: "Materiales", value: entidad.materiales_usados },
      ].filter((i) => i.value);
    }
    if (t === "gastronomia") {
      return [
        { label: "Ingredientes", value: entidad.ingredientes_clave },
        { label: "Historia del plato", value: entidad.historia_plato },
      ].filter((i) => i.value);
    }
    if (t === "patrimonio") {
      return [
        { label: "Época", value: entidad.año_referencia },
        { label: "Estilo", value: entidad.estilo_arquitectonico },
        { label: "Declaratoria", value: entidad.declaratoria_oficial },
      ].filter((i) => i.value);
    }
    if (t === "comunidad_indigena") {
      return [
        { label: "Etnia", value: entidad.etnia },
        { label: "Lenguas", value: entidad.lenguas },
        { label: "Territorio", value: entidad.territorio_tradicional },
      ].filter((i) => i.value);
    }
    if (t === "experiencia") {
      return [
        { label: "Tipo", value: entidad.tipo_experiencia },
        { label: "Duración", value: entidad.duracion_experiencia },
        { label: "Incluye", value: entidad.que_incluye },
      ].filter((i) => i.value);
    }
    return [];
  };

  const socials = parseSocialList(entidad?.redes_sociales);
  const catColor = entidad ? (colorMap[entidad.tipo] || "#863819") : "#863819";
  const catName = entidad ? (entidad.tipo.charAt(0).toUpperCase() + entidad.tipo.slice(1)) : "";
  const mainDescription = entidad?.biografia_larga || entidad?.resumen || entidad?.historia_plato || null;
  const fichaItems = getFichaItems();

  if (loading) {
    return (
      <div className="qr-scan-loading">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <div className="qr-scan-loading-dot" />
        </motion.div>
        <span className="qr-scan-loading-text">Cargando...</span>
      </div>
    );
  }

  if (error || !entidad) {
    return (
      <div className="qr-scan-error">
        <div className="qr-scan-error-icon">&#10022;</div>
        <p className="qr-scan-error-text">No pudimos encontrar esta entidad.</p>
        <Link to="/" className="qr-scan-error-link">Volver al inicio</Link>
      </div>
    );
  }

  return (
    <div className="qr-scan-page">
      <SEO
        title={`${entidad.nombre} — Made in Chaco`}
        description={entidad.resumen || `Conocé a ${entidad.nombre} en Made in Chaco`}
        image={entidad.imagen}
      />

      {/* Confetti overlay */}
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            className="qr-confetti-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 30 }).map((_, i) => (
              <motion.div
                key={i}
                className="qr-confetti-piece"
                initial={{
                  x: "50vw",
                  y: "50vh",
                  opacity: 1,
                  scale: 0,
                }}
                animate={{
                  x: `${Math.random() * 100}vw`,
                  y: `${Math.random() * 100}vh`,
                  opacity: [1, 1, 0],
                  scale: [0, 1.5, 0],
                  rotate: Math.random() * 720,
                }}
                transition={{
                  duration: 2 + Math.random(),
                  delay: Math.random() * 0.5,
                  ease: "easeOut",
                }}
                style={{
                  background: [catColor, "#863819", "#506441", "#f9a825", "#e91e63"][i % 5],
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero */}
      <motion.section
        className="qr-scan-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="qr-scan-hero-bg">
          {entidad.imagen && (
            <img src={optimizarUrlCloudinary(entidad.imagen)} alt={entidad.nombre} />
          )}
        </div>
        <div className="qr-scan-hero-overlay" />

        <div className="qr-scan-hero-content">
          <motion.div
            style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 20 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            <span className="qr-scan-badge" style={{ background: catColor, boxShadow: `0 2px 12px ${catColor}60` }}>
              <img
                src={entidad.icono || `/icons/${entidad.tipo}.png`}
                alt=""
                style={{ width: 16, height: 16, borderRadius: 2, objectFit: "contain" }}
              />
              {catName}
            </span>
            <span className="qr-scan-badge" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
              Made in Chaco
            </span>
          </motion.div>

          <motion.h1
            className="qr-scan-title"
            variants={titleVariants}
            initial="hidden"
            animate="visible"
          >
            {entidad.nombre.split("").map((char, i) => (
              <motion.span key={i} variants={charVariants}>
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </motion.h1>

          {entidad.resumen && (
            <motion.p
              className="qr-scan-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              {entidad.resumen}
            </motion.p>
          )}
        </div>
      </motion.section>

      {/* Content */}
      <div className="qr-scan-content">
        {/* Descripción */}
        {mainDescription && (
          <motion.section
            className="qr-scan-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="qr-scan-section-header">
              <span className="qr-scan-section-label">Sobre</span>
              <h2 className="qr-scan-section-title">{entidad.nombre}</h2>
            </div>
            <p className="qr-scan-section-text">{mainDescription}</p>
          </motion.section>
        )}

        {/* Ficha técnica */}
        {fichaItems.length > 0 && (
          <motion.section
            className="qr-scan-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="qr-scan-section-header">
              <span className="qr-scan-section-label">Información</span>
              <h2 className="qr-scan-section-title">Ficha técnica</h2>
            </div>
            <div className="qr-scan-ficha-grid">
              {fichaItems.map((item, i) => (
                <motion.div
                  key={i}
                  className="qr-scan-ficha-item"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05, duration: 0.4 }}
                >
                  <span className="qr-scan-ficha-label">{item.label}</span>
                  <span className="qr-scan-ficha-value">{item.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Galería */}
        {multimedia.length > 0 && (
          <motion.section
            className="qr-scan-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="qr-scan-section-header">
              <span className="qr-scan-section-label">Galería</span>
              <h2 className="qr-scan-section-title">Fotos</h2>
            </div>
            <div className="qr-scan-gallery">
              {multimedia.slice(0, 8).map((item, i) => (
                <motion.div
                  key={i}
                  className="qr-scan-gallery-item"
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.4 }}
                >
                  {item.tipo_recurso === "video" ? (
                    <video src={item.url_recurso} muted loop autoPlay playsInline />
                  ) : (
                    <img src={optimizarUrlCloudinary(item.url_recurso)} alt={item.titulo_alternativo || ""} loading="lazy" />
                  )}
                  {item.titulo_alternativo && (
                    <div className="qr-scan-gallery-caption">{item.titulo_alternativo}</div>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Redes sociales */}
        {socials.length > 0 && (
          <motion.section
            className="qr-scan-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
          >
            <div className="qr-scan-section-header">
              <span className="qr-scan-section-label">Contacto</span>
              <h2 className="qr-scan-section-title">Redes</h2>
            </div>
            <div className="qr-scan-socials">
              {socials.map((item, i) => {
                const platform = SOCIAL_PLATFORMS.find((p) => p.value === item.type) || SOCIAL_PLATFORMS[0];
                return (
                  <motion.a
                    key={i}
                    href={platform.url(item.value)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="qr-scan-social-link"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    style={{ borderColor: `${catColor}30` }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = catColor;
                      e.currentTarget.style.background = `${catColor}08`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = `${catColor}30`;
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <i className={platform.icon} style={{ fontSize: 20, color: catColor }} />
                    <span>{platform.label}</span>
                  </motion.a>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Sello / Gamificación */}
        <motion.section
          className="qr-scan-section qr-sello-section"
          variants={sectionVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
        >
          <div className="qr-scan-section-header">
            <span className="qr-scan-section-label">Gamificación</span>
            <h2 className="qr-scan-section-title">Coleccioná tu sello</h2>
          </div>

          <div className="qr-sello-card">
            <div className="qr-sello-icon-wrap" style={{ background: `${catColor}15` }}>
              <motion.div
                className="qr-sello-icon"
                animate={collected ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 0.6 }}
                style={{ color: catColor }}
              >
                {hasSello ? "✦" : "◇"}
              </motion.div>
            </div>

            <div className="qr-sello-info">
              {isOwner ? (
                <>
                  <p className="qr-sello-status">Esta es tu entidad</p>
                  <p className="qr-sello-sub">No podés coleccionar el sello de una entidad de tu propiedad. Escaneá entidades de otros para coleccionar.</p>
                </>
              ) : hasSello ? (
                <>
                  <p className="qr-sello-status" style={{ color: catColor }}>
                    {collected ? "¡Sello coleccionado!" : "Ya tenés este sello"}
                  </p>
                  <p className="qr-sello-sub">Forma parte de tu colección de sellos de Made in Chaco.</p>
                </>
              ) : isAuthenticated ? (
                <>
                  <p className="qr-sello-status">Escaneaste esta entidad</p>
                  <p className="qr-sello-sub">Colectá el sello para sumar a tu colección.</p>
                </>
              ) : (
                <>
                  <p className="qr-sello-status">Iniciá sesión para coleccionar</p>
                  <p className="qr-sello-sub">Creá una cuenta y coleccioná sellos escaneando entidades.</p>
                </>
              )}
            </div>

            {!hasSello && isAuthenticated && !isOwner && (
              <motion.button
                className="qr-sello-btn"
                onClick={handleCollectSello}
                disabled={collecting}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                style={{ background: catColor }}
              >
                {collecting ? "Guardando..." : "Coleccionar sello"}
              </motion.button>
            )}

            {!isAuthenticated && !isOwner && (
              <Link to="/iniciar-sesion" className="qr-sello-btn" style={{ background: catColor, textDecoration: "none" }}>
                Iniciar sesión
              </Link>
            )}
          </div>

          {stats.unique_users > 0 && (
            <p className="qr-sello-stats">
              {stats.unique_users} persona{stats.unique_users !== 1 ? "s" : ""} coleccionó este sello
            </p>
          )}
        </motion.section>

        {/* Ver en el mapa */}
        <motion.div
          className="qr-scan-map-link"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <Link to={`/entidad/${entidad.slug}`} className="qr-scan-full-link" style={{ borderColor: catColor, color: catColor }}>
            Ver ficha completa
            <i className="ri-arrow-right-line" />
          </Link>
          <Link to="/descubre" className="qr-scan-full-link qr-scan-full-secondary">
            <i className="ri-map-pin-line" />
            Explorar el mapa
          </Link>
        </motion.div>

        {/* Footer branding */}
        <div className="qr-scan-footer">
          <div className="qr-scan-footer-logo">
            <span style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: 16, color: "#863819" }}>
              Made in Chaco
            </span>
            <span style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
              Descubrí la cultura chaqueña
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrScanPage;
