import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, useSpring } from "motion/react";
import { MiniMap } from "../components/MiniMap";
import "../styles/EntidadDetallePage.css";

const colorMap = {
  artesano: "#ff5722",
  gastronomia: "#4caf50",
  comercio: "#2196f3",
  evento: "#9c27b0",
  patrimonio: "#795548",
  personalidad: "#e91e63",
};

const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram", url: (v) => `https://www.instagram.com/${v}/` },
  { value: "youtube", label: "YouTube", url: (v) => v.startsWith("http") ? v : `https://www.youtube.com/${v.startsWith("@") ? v : "@" + v}` },
  { value: "facebook", label: "Facebook", url: (v) => `https://www.facebook.com/${v}/` },
  { value: "tiktok", label: "TikTok", url: (v) => `https://www.tiktok.com/@${v}` },
  { value: "twitter", label: "X / Twitter", url: (v) => `https://x.com/${v}` },
  { value: "whatsapp", label: "WhatsApp", url: (v) => `https://wa.me/${v.replace(/[^0-9]/g, "")}` },
];

const parseSocialList = (v) => {
  if (!v) return [];
  try { return JSON.parse(v); } catch { return v ? [{ type: "instagram", value: v }] : []; }
};

const socialFichaItems = (raw) => {
  return parseSocialList(raw).map((item) => {
    const platform = SOCIAL_PLATFORMS.find((p) => p.value === item.type) || SOCIAL_PLATFORMS[0];
    return { label: platform.label, value: item.value, link: platform.url(item.value) };
  });
};

const titleVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.4 },
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

const sectionVariants = {
  hidden: { opacity: 0, y: 50 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

export const EntidadDetallePage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [entidad, setEntidad] = useState(null);
  const [conexiones, setConexiones] = useState([]);
  const [recorridosEntidad, setRecorridosEntidad] = useState([]);
  const [viewMode, setViewMode] = useState("cards");
  const [graphHoveredId, setGraphHoveredId] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [heroReady, setHeroReady] = useState(false);
  const [multimedia, setMultimedia] = useState([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [toast, setToast] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('made-in-chaco-dark-mode') === 'true');
  const [entityTags, setEntityTags] = useState({});
  const [allEntitiesMap, setAllEntitiesMap] = useState({});
  const videoRef = useRef(null);

  const formatTime = (sec) => {
    if (sec == null) return "";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleShare = async () => {
    const url = window.location.href;
    const text = `Mirá esto: ${entidad?.nombre} — ${catName} en Made in Chaco`;

    if (navigator.share) {
      try {
        await navigator.share({ title: entidad?.nombre, text, url });
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

  const handleMediaShare = async (item) => {
    const tipoTexto =
      item.tipo_recurso === "video"
        ? "este video"
        : item.tipo_recurso === "audio"
          ? "este audio"
          : "esta foto";
    const url = window.location.href;
    const text = `Mirá ${tipoTexto} de ${entidad?.nombre} en Made in Chaco`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: item.titulo_alternativo || entidad?.nombre,
          text,
          url,
        });
      } catch {}
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

  const { scrollY, scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });
  const heroScale = useTransform(scrollY, [0, 500], [1, 1.1]);
  const heroOpacity = useTransform(scrollY, [0, 350], [1, 0]);
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);

  const formatearFechaSimple = (fechaIso) => {
    if (!fechaIso) return "No disponible";
    const [year, month, day] = fechaIso.split("T")[0].split("-");
    return `${day}/${month}/${year}`;
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const prevImage = () => {
    setLightboxIndex((i) => (i === 0 ? multimedia.length - 1 : i - 1));
  };

  const nextImage = () => {
    setLightboxIndex((i) => (i === multimedia.length - 1 ? 0 : i + 1));
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchEnd = (e) => {
    if (touchStart === null) return;
    const delta = e.changedTouches[0].clientX - touchStart;
    if (delta > 50) prevImage();
    if (delta < -50) nextImage();
    setTouchStart(null);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prevImage();
      if (e.key === "ArrowRight") nextImage();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxOpen]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setHeroReady(false);
  }, [slug]);

  useEffect(() => {
    const obtenerDetalle = async () => {
      try {
        const response = await fetch(
          `/api/entidad/${slug}`,
        );
        if (!response.ok) throw new Error("No se encontró la información");
        const data = await response.json();
        setEntidad(data);

        if (data?.id) {
          const resConex = await fetch(
            `/api/entidades/${data.id}/conexiones`,
          );
          if (resConex.ok) {
            const dataConex = await resConex.json();
            const seen = new Set();
            const relacionadas = [];
            for (const c of dataConex) {
              const isOrigin = c.entidad_origen_id === data.id;
              const otherId = isOrigin
                ? c.entidad_destino_id
                : c.entidad_origen_id;
              if (seen.has(otherId)) continue;
              seen.add(otherId);
              relacionadas.push({
                id: otherId,
                nombre: isOrigin ? c.nombre_destino : c.nombre_origen,
                tipo: isOrigin ? c.tipo_destino : c.tipo_origen,
                slug: isOrigin ? c.slug_destino : c.slug_origen,
                tipoRelacion: isOrigin ? c.tipo_relacion : c.tipo_relacion_inversa,
              });
            }
            setConexiones(relacionadas);
          }
        }

        if (data?.id) {
          const resRec = await fetch(
            `/api/entidades/${data.id}/recorridos`,
          );
          if (resRec.ok) {
            const dataRec = await resRec.json();
            setRecorridosEntidad(dataRec);
          }
        }

        // Cargar multimedia
        if (data?.id) {
          const resMulti = await fetch(
            `/api/entidades/${data.id}/multimedia`,
          );
          if (resMulti.ok) {
            const dataMulti = await resMulti.json();
            const filteredMulti = dataMulti.filter((m) => m.url_recurso).slice(1);
            setMultimedia(filteredMulti);

            // Fetch entity tags for each multimedia item
            const tagsMap = {};
            const ids = filteredMulti.map((m) => m.id).filter(Boolean);
            if (ids.length > 0) {
              try {
                const resTags = await fetch(
                  `/api/multimedia/etiquetas?multimedia_ids=${ids.join(",")}`,
                );
                if (resTags.ok) {
                  const dataTags = await resTags.json();
                  for (const item of filteredMulti) {
                    if (dataTags[item.id]) {
                      tagsMap[item.id] = dataTags[item.id];
                    }
                  }
                }
              } catch {}
            }
            setEntityTags(tagsMap);
          }
        }
      } catch (error) {
        console.error("Error al cargar:", error);
      } finally {
        setLoading(false);
        setTimeout(() => setHeroReady(true), 50);
      }
    };

    obtenerDetalle();

    fetch("/api/entidades")
      .then((r) => r.ok ? r.json() : [])
      .then((list) => {
        const map = {};
        for (const e of list) {
          if (e.tipo === "comercio") map[e.nombre.toLowerCase()] = e.slug;
        }
        setAllEntitiesMap(map);
      })
      .catch(() => {});
  }, [slug]);

  const direccionStr = (d) => {
    if (!d) return null;
    const parts = d.split(",").map((s) => s.trim());
    return parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0];
  };

  const getFichaItems = () => {
    if (!entidad) return [];
    const t = entidad.tipo;
    if (t === "evento") {
      return [
        { label: "Fecha", value: formatearFechaSimple(entidad.fecha_evento) },
        { label: "Duración", value: entidad.duracion_dias ? `${entidad.duracion_dias} días` : "—" },
        { label: "Actividades", value: entidad.actividades_principales },
        { label: "Itinerante", value: entidad.es_itinerante ? "Sí" : "No" },
        ...(entidad.link_entradas ? [{ label: "Entradas", value: entidad.link_entradas, link: entidad.link_entradas }] : []),
        ...(entidad.direccion_escrita ? [{ label: "Dirección", value: direccionStr(entidad.direccion_escrita), link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entidad.direccion_escrita)}` }] : []),
        ...socialFichaItems(entidad.redes_sociales),
      ];
    }
    if (t === "artesano") {
      return [
        { label: "Técnica", value: entidad.tecnica_principal },
        { label: "Materiales", value: entidad.materiales_usados },
        { label: "Comunidad", value: entidad.comunidad_etnica || "General" },
        ...(entidad.direccion_escrita ? [{ label: "Dirección", value: direccionStr(entidad.direccion_escrita), link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entidad.direccion_escrita)}` }] : []),
        ...socialFichaItems(entidad.redes_sociales),
      ];
    }
    if (t === "comercio") {
      return [
        { label: "Rubro", value: entidad.rubro_especifico },
        { label: "Tarjetas", value: entidad.acepta_tarjetas ? "Sí" : "No" },
        ...(entidad.direccion_escrita ? [{ label: "Dirección", value: direccionStr(entidad.direccion_escrita), link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entidad.direccion_escrita)}` }] : []),
        ...socialFichaItems(entidad.redes_sociales),
        { label: "Sitio Web", value: entidad.sitio_web, link: entidad.sitio_web },
        { label: "Horario apertura", value: entidad.horario_apertura || "—" },
        { label: "Horario cierre", value: entidad.horario_cierre || "—" },
      ].filter((i) => i.value);
    }
    if (t === "gastronomia") {
      const establecimientos = entidad.establecimientos_donde_probar
        ? entidad.establecimientos_donde_probar.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      const items = [
        { label: "Ingredientes", value: entidad.ingredientes_clave },
      ];
      if (establecimientos.length > 0) {
        items.push({
          label: "Dónde probar",
          type: "establecimientos",
          value: establecimientos.map((name) => {
            const slug = allEntitiesMap[name.toLowerCase()];
            return { name, slug };
          }),
        });
      }
      items.push(...(entidad.direccion_escrita ? [{ label: "Dirección", value: direccionStr(entidad.direccion_escrita), link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entidad.direccion_escrita)}` }] : []));
      items.push(...socialFichaItems(entidad.redes_sociales));
      return items;
    }
    if (t === "patrimonio") {
      return [
        { label: "Época", value: entidad.año_referencia || "Sin fecha" },
        { label: "Estilo arquitectónico", value: entidad.estilo_arquitectonico || "No especificado" },
        { label: "Declaratoria", value: entidad.declaratoria_oficial || "No declarada" },
        { label: "Estado", value: entidad.estado_conservacion || "Bueno" },
        ...(entidad.direccion_escrita ? [{ label: "Dirección", value: direccionStr(entidad.direccion_escrita), link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entidad.direccion_escrita)}` }] : []),
        ...socialFichaItems(entidad.redes_sociales),
      ];
    }
    if (t === "personalidad") {
      return [
        { label: "Nombre completo", value: entidad.nombre_completo },
        { label: "Profesión", value: entidad.profesion },
        { label: "Comunidad", value: entidad.comunidad_etnica },
        { label: "Apodo", value: entidad.apodo },
        { label: "Contacto", value: entidad.contacto },
        ...socialFichaItems(entidad.redes_sociales),
        ...(entidad.direccion_escrita ? [{ label: "Dirección", value: direccionStr(entidad.direccion_escrita), link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entidad.direccion_escrita)}` }] : []),
      ].filter((i) => i.value);
    }
    return [];
  };

  if (loading) {
    return (
      <div className="entidad-loading">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        >
          <span className="entidad-loading-dot" />
        </motion.div>
        <span className="entidad-loading-text">Cargando territorio...</span>
      </div>
    );
  }

  if (!entidad) {
    return (
      <div className="entidad-error">
        <div className="entidad-error-icon">⟡</div>
        <p className="entidad-error-text">No pudimos encontrar esta entidad.</p>
        <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center", marginTop: 16 }}>
          <button onClick={() => { sessionStorage.setItem("return-to-map", "true"); navigate(-1); }} className="entidad-nav-btn" style={{ background: "rgba(45,26,18,0.45)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "inherit", color: "#fff" }}>
            ← Volver
          </button>
          <button onClick={() => { sessionStorage.setItem("return-to-map", "true"); navigate("/descubre"); }} className="entidad-nav-btn" style={{ background: "rgba(45,26,18,0.45)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.12)", cursor: "pointer", fontFamily: "inherit", color: "#fff" }}>
            <img src="/icons/location.png" style={{ width: 14, height: 14 }} alt="" />
            Mapa
          </button>
        </div>
      </div>
    );
  }

  const catColor = colorMap[entidad.tipo] || "#863819";
  const catName = entidad.tipo.charAt(0).toUpperCase() + entidad.tipo.slice(1);
  const mainDescription =
    entidad.biografia_larga ||
    entidad.resumen ||
    entidad.historia_plato ||
    null;
  const fichaItems = getFichaItems();

  return (
    <div className={darkMode ? "dark-mode" : ""}>
      {/* Progress bar */}
      <motion.div className="entidad-progress" style={{ scaleX, originX: 0 }} />

      {/* Back + Map buttons */}
      <nav className="entidad-nav-bar">
        <button onClick={() => { sessionStorage.setItem("return-to-map", "true"); navigate(-1); }} className="entidad-nav-btn" style={{ border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ri-arrow-left-s-line" style={{ fontSize: 18 }} />
          Volver
        </button>
        <button onClick={() => { sessionStorage.setItem("return-to-map", "true"); navigate("/descubre"); }} className="entidad-nav-btn" style={{ border: "none", cursor: "pointer", fontFamily: "inherit" }}>
          <img src="/icons/location.png" style={{ width: 14, height: 14 }} alt="" />
          Mapa
        </button>
      </nav>

      {/* === HERO === */}
      <motion.section
        className="entidad-hero"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <motion.div
          className="entidad-hero-bg"
          style={{ scale: heroScale, y: heroY }}
        >
          {entidad.imagen && (
            <img src={entidad.imagen} alt={entidad.nombre} />
          )}
        </motion.div>

        <div className="entidad-hero-overlay" />

        {/* Share button */}
        <motion.button
          className="entidad-share-btn"
          onClick={handleShare}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <i className="ri-share-line" />
        </motion.button>

        {/* Dark mode toggle */}
        <motion.button
          className="entidad-theme-btn"
          onClick={() => setDarkMode((prev) => { const next = !prev; localStorage.setItem('made-in-chaco-dark-mode', next); return next; })}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.65, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <i className={`ri-${darkMode ? "sun" : "moon"}-line`} />
        </motion.button>

        <div className="entidad-hero-content">
          <div className="entidad-hero-badges" style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <motion.span
              className="entidad-hero-badge"
              style={{
                background: catColor,
                color: "#fff",
                boxShadow: `0 2px 12px ${catColor}60`,
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              {catName}
            </motion.span>
            {(() => {
              if (entidad.tipo !== "comercio" || !entidad.dias_abierto || !entidad.horario_apertura || !entidad.horario_cierre) return null;
              const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
              const hoy = diasSemana[new Date().getDay()];
              const dias = entidad.dias_abierto.split(",").map((d) => d.trim());
              if (!dias.includes(hoy)) {
                return <span className="entidad-hero-badge" style={{ background: "#e74c3c", color: "#fff", fontSize: "12px", boxShadow: "0 2px 12px rgba(231,76,60,0.5)" }}>Cerrado hoy</span>;
              }
              const ahora = new Date();
              const [hA, mA] = entidad.horario_apertura.split(":").map(Number);
              const [hC, mC] = entidad.horario_cierre.split(":").map(Number);
              const minActual = ahora.getHours() * 60 + ahora.getMinutes();
              const minApertura = hA * 60 + mA;
              const minCierre = hC * 60 + mC;
              if (minActual >= minApertura && minActual < minCierre) {
                return <span className="entidad-hero-badge" style={{ background: "#2e7d32", color: "#fff", fontSize: "12px", boxShadow: "0 2px 12px rgba(46,125,50,0.5)" }}>Abierto ahora</span>;
              }
              return <span className="entidad-hero-badge" style={{ background: "#e74c3c", color: "#fff", fontSize: "12px", boxShadow: "0 2px 12px rgba(231,76,60,0.5)" }}>Cerrado ahora</span>;
            })()}
            {(() => {
              if (entidad.tipo !== "evento" || !entidad.fecha_evento) return null;
              const diff = Math.ceil((new Date(entidad.fecha_evento) - new Date(new Date().toDateString())) / 86400000);
              if (diff < 0) return <span className="entidad-hero-badge" style={{ background: "#555", color: "#fff", fontSize: "12px", boxShadow: "0 2px 12px rgba(0,0,0,0.3)" }}>Evento finalizado</span>;
              if (diff === 0) return <span className="entidad-hero-badge" style={{ background: "#2e7d32", color: "#fff", fontSize: "12px", boxShadow: "0 2px 12px rgba(46,125,50,0.5)" }}>¡Hoy!</span>;
              if (diff <= 7) return <span className="entidad-hero-badge" style={{ background: "#f39c12", color: "#fff", fontSize: "12px", boxShadow: "0 2px 12px rgba(243,156,18,0.5)" }}>¡Pronto! ({diff}d)</span>;
              return null;
            })()}
          </div>

          <motion.h1
            className={`entidad-hero-title${entidad.es_referente_comunidad ? " referente" : ""}`}
            variants={titleVariants}
            initial="hidden"
            animate={heroReady ? "visible" : "hidden"}
          >
            {entidad.nombre.split("").map((char, i) => (
              <motion.span key={i} className="char" variants={charVariants}>
                {char === " " ? "\u00A0" : char}
              </motion.span>
            ))}
          </motion.h1>

          {recorridosEntidad.length > 0 && (
            <motion.div
              className="entidad-hero-recorridos"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              {recorridosEntidad.map((r) => (
                <Link
                  key={r.id}
                  to={`/recorrido/${r.slug}`}
                  className="entidad-hero-recorrido-link"
                >
                  {r.imagen ? (
                    <img
                      src={r.imagen}
                      alt=""
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <span style={{ fontSize: "16px" }}>🗺️</span>
                  )}
                  {r.nombre}
                </Link>
              ))}
            </motion.div>
          )}
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="entidad-scroll-indicator"
          style={{ opacity: heroOpacity }}
        >
          <span>Scroll</span>
          <motion.div
            className="entidad-scroll-line"
            animate={{ scaleY: [1, 0.4, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.section>

      {/* === NARRATIVE CONTENT === */}
      <div className="entidad-narrative">
        {/* About section */}
        {mainDescription && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="entidad-section-header">
              <span className="entidad-section-label">Sobre</span>
              <h2 className="entidad-section-title">{entidad.nombre}</h2>
            </div>
            <p className="entidad-section-text-lg">
              {mainDescription}
            </p>
            <div className="entidad-about-divider" />
          </motion.section>
        )}

        {/* Biografía resumida */}
        {entidad.biografia_resumida && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="entidad-section-header">
              <span className="entidad-section-label">Biografía</span>
              <h2 className="entidad-section-title" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
                Resumen biográfico
              </h2>
            </div>
            <p className="entidad-section-text-lg">
              {entidad.biografia_resumida}
            </p>
          </motion.section>
        )}

        {/* Receta destacada */}
        {entidad.receta_destacada && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="entidad-section-header">
              <span className="entidad-section-label">Gastronomía</span>
              <h2 className="entidad-section-title" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
                Receta destacada
              </h2>
            </div>
            <p className="entidad-section-text-lg">
              {entidad.receta_destacada}
            </p>
          </motion.section>
        )}

        {/* Actividades principales */}
        {entidad.actividades_principales && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="entidad-section-header">
              <span className="entidad-section-label">Actividades</span>
              <h2 className="entidad-section-title" style={{ fontSize: "clamp(24px, 3vw, 36px)" }}>
                Atractivos y actividades
              </h2>
            </div>
            <p className="entidad-section-text-lg">
              {entidad.actividades_principales}
            </p>
          </motion.section>
        )}

        {/* Personalidad foto de perfil */}
        {entidad.tipo === "personalidad" && entidad.foto_perfil_url && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            style={{ paddingTop: 0, display: "flex", justifyContent: "center" }}
          >
            <img
              src={entidad.foto_perfil_url}
              alt={entidad.nombre}
              style={{
                maxWidth: 500,
                width: "100%",
                borderRadius: 20,
                boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
              }}
            />
          </motion.section>
        )}

        {/* Galería multimedia */}
        {multimedia.length > 0 && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="entidad-section-header">
              <span className="entidad-section-label">Galería</span>
              <h2 className="entidad-section-title">Multimedia</h2>
            </div>

            <div className="entidad-gallery">
              {multimedia.map((item, i) => {
                const isWide = i % 5 === 0 || i % 5 === 3;
                return (
                  <motion.button
                    key={i}
                    className={`entidad-gallery-item ${isWide ? "entidad-gallery-wide" : ""}`}
                    onClick={() => openLightbox(i)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.4 }}
                  >
                    {item.tipo_recurso === "video" ? (
                      <video src={item.url_recurso} muted />
                    ) : item.tipo_recurso === "audio" ? (
                      <div className="entidad-gallery-audio">
                        <img
                          src={item.thumbnail_url || item.url_recurso}
                          alt={item.titulo_alternativo || ""}
                          className="entidad-gallery-audio-img"
                        />
                        <div className="entidad-gallery-audio-overlay">
                          <span className="entidad-gallery-audio-play">▶</span>
                        </div>
                      </div>
                    ) : (
                      <img src={item.url_recurso} alt={item.titulo_alternativo || ""} loading="lazy" />
                    )}
                    {item.titulo_alternativo && (
                      <div className="entidad-gallery-caption">
                        <span>{item.titulo_alternativo}</span>
                      </div>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Ficha Técnica */}
        {fichaItems.length > 0 && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="entidad-section-header">
              <span className="entidad-section-label">Información</span>
              <h2 className="entidad-section-title">Ficha técnica</h2>
            </div>

            <div className="entidad-ficha">
              <div className="entidad-ficha-title">
                {catName}
              </div>
              <div className="entidad-ficha-grid">
                {fichaItems.map((item, i) => (
                  <motion.div
                    key={i}
                    className="entidad-ficha-item"
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.04, duration: 0.4 }}
                  >
                    <span className="entidad-ficha-label">{item.label}</span>
                    {item.type === "establecimientos" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                        {item.value.map(({ name, slug }) =>
                          slug ? (
                            <Link
                              key={name}
                              to={`/entidad/${slug}`}
                              style={{
                                display: "inline-block",
                                padding: "4px 14px",
                                borderRadius: "20px",
                                background: "#2196f320",
                                color: "#2196f3",
                                fontSize: "12px",
                                fontWeight: 700,
                                textDecoration: "none",
                                border: "1px solid #2196f340",
                                transition: "all 0.15s",
                                cursor: "pointer",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#2196f3";
                                e.currentTarget.style.color = "#fff";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "#2196f320";
                                e.currentTarget.style.color = "#2196f3";
                              }}
                            >
                              {name}
                            </Link>
                          ) : (
                            <span
                              key={name}
                              style={{
                                display: "inline-block",
                                padding: "4px 14px",
                                borderRadius: "20px",
                                background: "#2196f320",
                                color: "#2196f3",
                                fontSize: "12px",
                                fontWeight: 700,
                              }}
                            >
                              {name}
                            </span>
                          ),
                        )}
                      </div>
                    ) : item.link ? (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="entidad-ficha-value"
                      >
                        {item.value}
                        <i className="ri-external-link-line" style={{ fontSize: 12, marginLeft: 4 }} />
                      </a>
                    ) : item.image ? (
                      <img src={item.value} alt="" className="entidad-ficha-profile-img" />
                    ) : (
                      <span className="entidad-ficha-value">{item.value}</span>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Contacto comercial extra */}
              {entidad.contacto_comercial && (
                <div
                  style={{
                    marginTop: 24,
                    padding: 16,
                    background: "var(--surface)",
                    borderRadius: 12,
                    fontSize: 14,
                    color: "var(--on-surface)",
                    border: "1px solid rgba(0,0,0,0.04)",
                  }}
                >
                  <span className="entidad-ficha-label">Contacto comercial</span>
                  <span className="entidad-ficha-value">{entidad.contacto_comercial}</span>
                </div>
              )}

              {/* Navigation buttons */}
              {entidad.latitud && entidad.longitud && (
                <div className="entidad-nav-container">
                  <button
                    onClick={() => setNavOpen(!navOpen)}
                    className="entidad-nav-btn"
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      const dx = (x - rect.width / 2) * 0.15;
                      const dy = (y - rect.height / 2) * 0.15;
                      e.currentTarget.style.transform = `translate(${dx}px, ${dy}px)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translate(0, 0)";
                    }}
                  >
                    <i className="ri-navigation-line" style={{ fontSize: 16 }} />
                    Cómo llegar
                  </button>
                  {navOpen && (
                    <div className="entidad-nav-dropdown">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${entidad.latitud},${entidad.longitud}`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={() => setNavOpen(false)}
                      >
                        <img src="/icons/googlemaps.png" alt="" /> Google Maps
                      </a>
                      <a
                        href={`https://waze.com/ul?ll=${entidad.latitud},${entidad.longitud}&navigate=yes`}
                        target="_blank" rel="noopener noreferrer"
                        onClick={() => setNavOpen(false)}
                      >
                        <img src="/icons/waze.png" alt="" /> Waze
                      </a>
                      <a
                        href={`https://maps.apple.com/?daddr=${entidad.latitud},${entidad.longitud}`}
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
          </motion.section>
        )}

        {/* Mini mapa */}
        {entidad.latitud && entidad.longitud && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="entidad-section-header">
              <span className="entidad-section-label">Ubicación</span>
              <h2 className="entidad-section-title">Mapa</h2>
            </div>
            <MiniMap
              lat={entidad.latitud}
              lng={entidad.longitud}
              nombre={entidad.nombre}
              tipo={entidad.tipo}
            />
          </motion.section>
        )}

        {/* Conexiones */}
        {conexiones.length > 0 && (
          <motion.section
            className="entidad-section"
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            <div className="entidad-section-header">
              <span className="entidad-section-label">Red</span>
              <h2 className="entidad-section-title">Conexiones</h2>
            </div>

            <div className="entidad-conexiones-header">
              <div className="entidad-conexiones-divider" />
              <span className="entidad-conexiones-count">
                {conexiones.length} relacionada{conexiones.length !== 1 ? "s" : ""}
              </span>
              <button
                onClick={() => setViewMode(viewMode === "cards" ? "graph" : "cards")}
                className="entidad-conexiones-toggle"
              >
                {viewMode === "cards" ? (
                  <><img src="/icons/globe.png" alt="" style={{width:20,height:20,verticalAlign:"middle",marginRight:6,background:"#2d1a12",borderRadius:"50%",padding:3}}/> Ver gráfico</>
                ) : (
                  <><img src="/icons/card.png" alt="" style={{width:20,height:20,verticalAlign:"middle",marginRight:6,background:"#2d1a12",borderRadius:4,padding:3}}/> Ver tarjetas</>
                )}
              </button>
            </div>

            {/* Cards view */}
            {viewMode === "cards" && (
              <div className="entidad-conexiones-grid">
                {conexiones.map((conn, i) => {
                  const connColor = colorMap[conn.tipo] || "#863819";
                  return (
                    <motion.div
                      key={conn.id}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.05, duration: 0.4 }}
                    >
                      <Link
                        to={`/entidad/${conn.slug}`}
                        onClick={() => window.scrollTo(0, 0)}
                        className="entidad-conexion-card"
                        style={{
                          borderColor: "#eee",
                          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = connColor;
                          e.currentTarget.style.boxShadow = `0 12px 40px ${connColor}20`;
                        }}
                        onMouseMove={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const y = e.clientY - rect.top;
                          const rx = ((y - rect.height / 2) / rect.height) * -10;
                          const ry = ((x - rect.width / 2) / rect.width) * 10;
                          e.currentTarget.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#eee";
                          e.currentTarget.style.boxShadow = "none";
                          e.currentTarget.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
                        }}
                      >
                        <img
                          src={`/icons/${conn.tipo}.png`}
                          alt={conn.tipo}
                          className="entidad-conexion-icon"
                        />
                        <div className="entidad-conexion-info">
                          <div className="entidad-conexion-name">{conn.nombre}</div>
                          <div className="entidad-conexion-meta">
                            <span
                              className="entidad-conexion-tag"
                              style={{
                                color: connColor,
                                background: `${connColor}15`,
                              }}
                            >
                              {conn.tipo}
                            </span>
                            {conn.tipoRelacion && (
                              <span className="entidad-conexion-relation">
                                {conn.tipoRelacion}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="entidad-conexion-arrow" style={{ color: connColor }}>
                          →
                        </span>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Graph view */}
            {viewMode === "graph" &&
              (() => {
                const hoveredId = graphHoveredId;
                const cx = 300,
                  cy = 300,
                  radius = 180,
                  iconSize = 40,
                  nodeR = 28;
                const sorted = [...conexiones];
                const n = sorted.length;
                const shortenLine = 32;

                return (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    style={{
                      background: "var(--surface-low)",
                      borderRadius: 20,
                      border: "1px solid #eee",
                      padding: 20,
                    }}
                  >
                    <svg
                      viewBox="0 0 600 600"
                      style={{
                        width: "100%",
                        maxWidth: 600,
                        height: "auto",
                        display: "block",
                        margin: "0 auto",
                      }}
                    >
                      <g>
                        {sorted.map((conn, i) => {
                          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
                          const x = cx + radius * Math.cos(angle);
                          const y = cy + radius * Math.sin(angle);
                          const color = colorMap[conn.tipo] || "#863819";
                          const isHovered = hoveredId === conn.id;
                          const dx = x - cx,
                            dy = y - cy;
                          const len = Math.sqrt(dx * dx + dy * dy) || 1;
                          const ratio = (len - shortenLine) / len;
                          const ex = cx + dx * ratio;
                          const ey = cy + dy * ratio;
                          return (
                            <line
                              key={`line-${conn.id}`}
                              x1={cx}
                              y1={cy}
                              x2={ex}
                              y2={ey}
                              stroke={color}
                              strokeWidth={isHovered ? 4 : 2}
                              strokeOpacity={isHovered ? 0.8 : 0.25}
                              style={{ transition: "stroke-width 0.2s, stroke-opacity 0.2s" }}
                            />
                          );
                        })}

                        {sorted.map((conn, i) => {
                          const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
                          const x = cx + radius * Math.cos(angle);
                          const y = cy + radius * Math.sin(angle);
                          const color = colorMap[conn.tipo] || "#863819";
                          const isHovered = hoveredId === conn.id;
                          const dx = x - cx,
                            dy = y - cy;
                          const len = Math.sqrt(dx * dx + dy * dy) || 1;
                          const nameOff = 42;
                          return (
                            <g
                              key={`node-${conn.id}`}
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                window.scrollTo(0, 0);
                                navigate(`/entidad/${conn.slug}`);
                              }}
                              onMouseEnter={() => setGraphHoveredId(conn.id)}
                              onMouseLeave={() => setGraphHoveredId(null)}
                            >
                              <circle
                                cx={x}
                                cy={y}
                                r={nodeR}
                                fill={isHovered ? `${color}15` : "white"}
                                stroke={color}
                                strokeWidth={isHovered ? 3.5 : 2.5}
                                style={{ transition: "fill 0.2s, stroke-width 0.2s" }}
                              />
                              <image
                                href={`/icons/${conn.tipo}.png`}
                                x={x - iconSize / 2}
                                y={y - iconSize / 2}
                                width={iconSize}
                                height={iconSize}
                              />
                              <text
                                x={x + (dx / len) * nameOff}
                                y={y + (dy / len) * nameOff + 4}
                                textAnchor="middle"
                                dominantBaseline="central"
                                paintOrder="stroke fill"
                                stroke="white"
                                strokeWidth="3"
                                fontSize="13"
                                fill="#2d1a12"
                                fontFamily="Manrope, sans-serif"
                                fontWeight="700"
                              >
                                {conn.nombre.length > 16
                                  ? conn.nombre.slice(0, 14) + "…"
                                  : conn.nombre}
                              </text>
                              {conn.tipoRelacion && (
                                <text
                                  x={(cx + x) / 2}
                                  y={(cy + y) / 2 - 16}
                                  textAnchor="middle"
                                  dominantBaseline="central"
                                  paintOrder="stroke fill"
                                  stroke="white"
                                  strokeWidth="3"
                                  fontSize="11"
                                  fill="#666"
                                  fontStyle="italic"
                                  fontFamily="Manrope, sans-serif"
                                  fontWeight="600"
                                >
                                  {conn.tipoRelacion}
                                </text>
                              )}
                            </g>
                          );
                        })}

                        <circle
                          cx={cx}
                          cy={cy}
                          r="52"
                          fill="var(--surface-low)"
                          stroke={colorMap[entidad.tipo] || "#863819"}
                          strokeWidth="3"
                        />
                        <image
                          href={`/icons/${entidad.tipo}.png`}
                          x={cx - 24}
                          y={cy - 24}
                          width="48"
                          height="48"
                        />
                        <text
                          x={cx}
                          y={cy + 38}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#2d1a12"
                          fontFamily="Manrope, sans-serif"
                          fontWeight="700"
                        >
                          {entidad.nombre.length > 18
                            ? entidad.nombre.slice(0, 16) + "…"
                            : entidad.nombre}
                        </text>
                      </g>
                    </svg>
                  </motion.div>
                );
              })()}
          </motion.section>
        )}

        {/* Footer */}
        <div className="entidad-footer">
          <Link
            to="/descubre"
            className="entidad-footer-link"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const y = e.clientY - rect.top;
              const dx = (x - rect.width / 2) * 0.2;
              const dy = (y - rect.height / 2) * 0.2;
              e.currentTarget.style.transform = `translate(${dx}px, ${dy}px)`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translate(0, 0)";
            }}
          >
            Explorar en el mapa
            <div
              style={{
                width: 16,
                height: 16,
                background: "var(--primary)",
                mask: "url(/icons/globe.png) center/contain no-repeat",
                WebkitMask: "url(/icons/globe.png) center/contain no-repeat",
                flexShrink: 0,
              }}
            />
          </Link>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && multimedia.length > 0 && (
        <div
          className="entidad-lightbox"
          onClick={closeLightbox}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button className="entidad-lightbox-close" onClick={closeLightbox}>
            <i className="ri-close-line" />
          </button>

          <div className="entidad-lightbox-counter">
            {lightboxIndex + 1} / {multimedia.length}
          </div>

          <button
            className="entidad-lightbox-nav entidad-lightbox-prev"
            onClick={(e) => { e.stopPropagation(); prevImage(); }}
          >
            <i className="ri-arrow-left-s-line" />
          </button>

          <div
            className="entidad-lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              key={lightboxIndex}
              initial={{ opacity: 0, x: 60 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="entidad-lightbox-media"
            >
              {multimedia[lightboxIndex].tipo_recurso === "video" ? (
                <video
                  ref={videoRef}
                  src={multimedia[lightboxIndex].url_recurso}
                  controls
                  autoPlay
                  className="entidad-lightbox-video"
                />
              ) : multimedia[lightboxIndex].tipo_recurso === "audio" ? (
                <div className="entidad-lightbox-audio-wrapper">
                  <audio
                    src={multimedia[lightboxIndex].url_recurso}
                    controls
                    autoPlay
                    className="entidad-lightbox-audio"
                  />
                </div>
              ) : (
                <img
                  src={multimedia[lightboxIndex].url_recurso}
                  alt={multimedia[lightboxIndex].titulo_alternativo || ""}
                  className="entidad-lightbox-image"
                />
              )}
            </motion.div>

            {/* Timeline chapters for video */}
            {multimedia[lightboxIndex]?.tipo_recurso === "video" &&
              entityTags[multimedia[lightboxIndex]?.id]
                ?.filter((t) => t.timestamp_inicio != null).length > 0 && (
                <div className="entidad-lightbox-timeline">
                  <span className="entidad-lightbox-timeline-label">Capítulos</span>
                  <div className="entidad-lightbox-timeline-track">
                    {entityTags[multimedia[lightboxIndex].id]
                      .filter((t) => t.timestamp_inicio != null)
                      .sort((a, b) => a.timestamp_inicio - b.timestamp_inicio)
                      .map((tag) => (
                        <button
                          key={tag.entidad_id}
                          className="entidad-lightbox-timeline-marker"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (videoRef.current) {
                              videoRef.current.currentTime = tag.timestamp_inicio;
                            }
                          }}
                          title={`${tag.nombre} — ${formatTime(tag.timestamp_inicio)}`}
                        >
                          <span className="entidad-lightbox-timeline-marker-dot" style={{ background: colorMap[tag.tipo] || "#863819" }} />
                          <span className="entidad-lightbox-timeline-marker-name">{tag.nombre}</span>
                          <span className="entidad-lightbox-timeline-marker-time">{formatTime(tag.timestamp_inicio)}</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}

            {multimedia[lightboxIndex].titulo_alternativo && (
              <div className="entidad-lightbox-info">
                <p className="entidad-lightbox-title">
                  {multimedia[lightboxIndex].titulo_alternativo}
                </p>
                {multimedia[lightboxIndex].descripcion_recurso && (
                  <p className="entidad-lightbox-desc">
                    {multimedia[lightboxIndex].descripcion_recurso}
                  </p>
                )}
              </div>
            )}

            {/* Quienes aparecen */}
            {entityTags[multimedia[lightboxIndex]?.id]?.length > 0 && (
              <div className="entidad-lightbox-tags">
                <span className="entidad-lightbox-tags-label">
                  {multimedia[lightboxIndex].tipo_recurso === "video"
                    ? "Quienes aparecen en este video"
                    : multimedia[lightboxIndex].tipo_recurso === "audio"
                      ? "Quienes aparecen en este audio"
                      : "Quienes aparecen en esta foto"}
                </span>
                <div className="entidad-lightbox-tags-list">
                  {entityTags[multimedia[lightboxIndex].id].map((tag) => (
                    <Link
                      key={tag.entidad_id}
                      to={`/entidad/${tag.slug}`}
                      className="entidad-lightbox-tag"
                      style={{ "--tag-color": colorMap[tag.tipo] || "#863819" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="entidad-lightbox-tag-tipo">{tag.tipo}</span>
                      {tag.nombre}
                      {tag.timestamp_inicio != null && (
                        <span className="entidad-lightbox-tag-time">{formatTime(tag.timestamp_inicio)}</span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Share button in lightbox */}
            <button
              className="entidad-lightbox-share-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleMediaShare(multimedia[lightboxIndex]);
              }}
              title="Compartir"
            >
              <i className="ri-share-line" />
            </button>
          </div>

          <button
            className="entidad-lightbox-nav entidad-lightbox-next"
            onClick={(e) => { e.stopPropagation(); nextImage(); }}
          >
            <i className="ri-arrow-right-s-line" />
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <motion.div
          className="entidad-toast"
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
