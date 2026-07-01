import { NavLink, useLocation, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import "../styles/HeaderComponent.css";
import logoClaro from "../assets/imagenes/madeinchacoclaro.png";
import logoSymbol from "../assets/imagenes/logo-sintitulo.png";
import { SelloModal } from "./SelloModal";
import { useMapStore } from "../store/useMapStore";
import { useAuthPublico } from "../context/AuthPublicoContext";
import { optimizarUrlCloudinary } from "../utils/imageUrl";
export const HeaderComponent = () => {
  const location = useLocation();
  const isMapPage = location.pathname === "/descubre";
  const searchTerm = useMapStore((s) => s.searchTerm);
  const filtro = useMapStore((s) => s.filtro);
  const filtroLocalidad = useMapStore((s) => s.filtroLocalidad);
  const headerVisible = useMapStore((s) => s.headerVisible);
  const darkMode = useMapStore((s) => s.darkMode);
  const recorridoActivo = useMapStore((s) => s.recorridoActivo);
  const setSearchTerm = useMapStore((s) => s.setSearchTerm);
  const setFiltro = useMapStore((s) => s.setFiltro);
  const setFiltroLocalidad = useMapStore((s) => s.setFiltroLocalidad);
  const setPanelOpen = useMapStore((s) => s.setPanelOpen);
  const setRecorridoActivo = useMapStore((s) => s.setRecorridoActivo);
  const triggerSearchSelect = useMapStore((s) => s.triggerSearchSelect);
  const triggerRecorridoFly = useMapStore((s) => s.triggerRecorridoFly);

  const [filtroPanelOpen, setFiltroPanelOpen] = useState(false);
  const [hoveredFilter, setHoveredFilter] = useState(null);
  const [localidades, setLocalidades] = useState([]);
  const [recorridosPanelOpen, setRecorridosPanelOpen] = useState(false);
  const [recorridosList, setRecorridosList] = useState([]);
  const [entidades, setEntidades] = useState([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [symbolMenuOpen, setSymbolMenuOpen] = useState(false);
  const [localidadSearch, setLocalidadSearch] = useState("");
  const [localidadDropdownOpen, setLocalidadDropdownOpen] = useState(false);
  const [showSelloModal, setShowSelloModal] = useState(false);
  const [filterPanelClosing, setFilterPanelClosing] = useState(false);
  const [rutasPanelClosing, setRutasPanelClosing] = useState(false);
  const navigate = useNavigate();
  const logoRef = useRef(null);
  const { perfil: perfilPublico, logout: logoutPublico, isAuthenticated: isAuthPublico } = useAuthPublico();
  const searchInputRef = useRef(null);

  // Efecto 3D tilt en el logo del header
  useEffect(() => {
    const el = logoRef.current;
    if (!el) return;
    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -20;
      const rotateY = ((x - centerX) / centerX) * 20;
      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };
    const handleMouseLeave = () => {
      el.style.transform = "perspective(800px) rotateX(0deg) rotateY(0deg)";
    };
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Reset shared state when leaving the map page
  useEffect(() => {
    if (!isMapPage) {
      setFiltro("todos");
      setFiltroLocalidad("");
      setSearchTerm("");
      setRecorridoActivo(null);
    }
  }, [isMapPage, setFiltro, setFiltroLocalidad, setSearchTerm, setRecorridoActivo]);

  const categorias = [
    { id: "todos", label: "Todos", color: "#333" },
    { id: "artesano", label: "Artesanos", color: "#ff5722" },
    { id: "gastronomia", label: "Gastronomía", color: "#4caf50" },
    { id: "comercio", label: "Comercios", color: "#2196f3" },
    { id: "evento", label: "Eventos", color: "#9c27b0" },
    { id: "patrimonio", label: "Patrimonios", color: "#795548" },
    { id: "personalidad", label: "Personalidades", color: "#e91e63" },
    { id: "comunidad_indigena", label: "Comunidades", color: "#8B4513" },
    { id: "lugar_natural", label: "Naturaleza", color: "#2E7D32" },
    { id: "hospedaje", label: "Hospedajes", color: "#FF6F00" },
    { id: "productor", label: "Productores", color: "#00695C" },
    { id: "experiencia", label: "Experiencias", color: "#6A1B9A" },
    { id: "relato", label: "Relatos", color: "#D84315" },
    { id: "espacio_cultural", label: "Cultura", color: "#37474F" },
  ];

  // Resetear búsqueda al cerrar el panel
  useEffect(() => {
    if (!filtroPanelOpen) {
      setLocalidadSearch("");
      setLocalidadDropdownOpen(false);
    }
  }, [filtroPanelOpen]);

  useEffect(() => {
    setPanelOpen(!!(filtroPanelOpen || recorridosPanelOpen));
  }, [filtroPanelOpen, recorridosPanelOpen, setPanelOpen]);

  // Cargar localidades para el filtro
  useEffect(() => {
    if (!isMapPage) return;
    fetch("/api/localidades")
      .then((res) => res.json())
      .then((data) => setLocalidades(data))
      .catch((err) => console.error("Error cargando localidades:", err));
  }, [isMapPage]);



  // Cargar entidades para el autocomplete del buscador
  useEffect(() => {
    if (!isMapPage) return;
    fetch("/api/entidades")
      .then((r) => (r.ok ? r.json() : []))
      .then(setEntidades)
      .catch(() => setEntidades([]));
  }, [isMapPage]);

  // Cargar recorridos cuando se abre el panel de rutas
  useEffect(() => {
    if (recorridosPanelOpen && isMapPage) {
      fetch("/api/recorridos")
        .then((r) => r.json())
        .then(setRecorridosList)
        .catch(() => {});
    }
  }, [recorridosPanelOpen, isMapPage]);







  // Closing animation for filter and rutas panels
  useEffect(() => {
    if (!filtroPanelOpen && filterPanelClosing) {
      const t = setTimeout(() => setFilterPanelClosing(false), 250);
      return () => clearTimeout(t);
    }
  }, [filtroPanelOpen, filterPanelClosing]);

  useEffect(() => {
    if (!recorridosPanelOpen && rutasPanelClosing) {
      const t = setTimeout(() => setRutasPanelClosing(false), 250);
      return () => clearTimeout(t);
    }
  }, [recorridosPanelOpen, rutasPanelClosing]);



  const closeFilterPanel = useCallback(() => {
    setFilterPanelClosing(true);
    setFiltroPanelOpen(false);
  }, []);

  const openFilterPanel = useCallback(() => {
    setFilterPanelClosing(false);
    setFiltroPanelOpen(true);
  }, []);

  const handleFilterClick = useCallback((catId) => {
    setFiltro(catId);
    closeFilterPanel();
  }, [setFiltro, closeFilterPanel]);

  const closeRutasPanel = useCallback(() => {
    setRutasPanelClosing(true);
    setRecorridosPanelOpen(false);
  }, []);

  const openRutasPanel = useCallback(() => {
    setRutasPanelClosing(false);
    setRecorridosPanelOpen(true);
  }, []);

  return (
    <>
      <header
        className={`${isMapPage ? "header--map-view" : ""} ${isMapPage && !headerVisible ? "header--hidden" : ""} ${darkMode && isMapPage ? "dark-mode" : ""}`}
      >
        <div className="header-left">
          {/* LOGO  */}
          <span
            ref={logoRef}
            className="logo"
            style={{ cursor: "pointer" }}
            onClick={() => {
              if (isAuthPublico && !perfilPublico?.verified) {
                localStorage.removeItem("made_in_chaco_token_publico");
                localStorage.removeItem("made_in_chaco_perfil");
                location.replace("/");
              } else {
                navigate("/");
              }
            }}
          >
            <img src={logoClaro} alt="Made in Chaco" className="logo-img" />
          </span>

          {/* HAMBURGER GLASS BUTTON - filter panel toggle */}
          {isMapPage && (
            <button
              className="header-filter-toggle"
              onClick={() => {
                if (filtroPanelOpen) {
                  closeFilterPanel();
                } else {
                  openFilterPanel();
                  if (recorridosPanelOpen) closeRutasPanel();
                }
              }}
            >
              <img
                src={filtroPanelOpen ? "/icons/close.png" : "/icons/filter.png"}
                alt={filtroPanelOpen ? "close" : "filter"}
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            </button>
          )}
          {/* RUTAS BUTTON */}
          {isMapPage && (
            <button
              className="header-rutas-toggle"
              onClick={() => {
                if (recorridosPanelOpen) {
                  closeRutasPanel();
                } else {
                  openRutasPanel();
                  if (filtroPanelOpen) closeFilterPanel();
                }
              }}
            >
              <img
                src={
                  recorridosPanelOpen ? "/icons/close.png" : "/icons/route.png"
                }
                alt={recorridosPanelOpen ? "close" : "route"}
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            </button>
          )}
        </div>

        {isAuthPublico && !perfilPublico?.verified ? null : (
        <>
        {/* Search bar on map page */}
        {isMapPage && (
          <div className="header-search-wrapper">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Buscar"
              value={searchTerm}
              onFocus={() => setSearchDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setSearchDropdownOpen(true);
              }}
              className="header-search-input"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="header-search-clear"
              >
                ✕
              </button>
            )}
            {(() => {
              const d = new Date();
              const todayStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              const filtrarEntidad = (e) => {
                if (!e.nombre?.toLowerCase().includes(searchTerm.toLowerCase()))
                  return false;
                if (filtro !== "todos" && e.tipo !== filtro)
                  return false;
                if (
                  filtroLocalidad &&
                  e.localidad_id !== parseInt(filtroLocalidad)
                )
                  return false;
                if (!e.visible) return false;
                if (["comercio", "hospedaje", "productor"].includes(e.tipo)) {
                  if (e.estado_pago !== "al_dia") return false;
                  if (
                    e.fecha_fin_suscripcion &&
                    e.fecha_fin_suscripcion.split('T')[0] < todayStr
                  )
                    return false;
                  if (
                    e.fecha_inicio_suscripcion &&
                    e.fecha_inicio_suscripcion.split('T')[0] > todayStr
                  )
                    return false;
                }
                if (e.tipo === "evento") {
                  if (
                    e.fecha_evento &&
                    e.fecha_evento.split('T')[0] < todayStr
                  )
                    return false;
                  if (e.estado_pago && e.estado_pago !== "al_dia") return false;
                  if (
                    e.estado_pago &&
                    e.fecha_fin_suscripcion &&
                    e.fecha_fin_suscripcion.split('T')[0] < todayStr
                  )
                    return false;
                  if (
                    e.estado_pago &&
                    e.fecha_inicio_suscripcion &&
                    e.fecha_inicio_suscripcion.split('T')[0] > todayStr
                  )
                    return false;
                }
                return true;
              };
              const resultados = entidades.filter(filtrarEntidad);
              return searchTerm &&
                searchDropdownOpen &&
                resultados.length > 0 ? (
                <div className="header-search-dropdown">
                  {resultados.slice(0, 8).map((e) => (
                    <button
                      key={e.id}
                      className="header-search-suggestion"
                      onMouseDown={() => {
                        setSearchTerm(e.nombre);
                        setSearchDropdownOpen(false);
                        triggerSearchSelect(e.nombre);
                      }}
                    >
                      {e.nombre}
                    </button>
                  ))}
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* NAV en desktop */}
        {!isMapPage && (
          <ul className="navlist">
            <li>
              <NavLink to="/proyecto" aria-current="page">
                Proyecto
              </NavLink>
            </li>
            <li>
              <NavLink to="/quienes-somos" aria-current="page">
                Quienes somos
              </NavLink>
            </li>

            <li>
              <NavLink to="/contacto" aria-current="page">
                Contacto
              </NavLink>
            </li>
            {isAuthPublico && (
              <li>
                <NavLink
                  to="/solicitar-sello"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowSelloModal(true);
                  }}
                >
                  Solicitar sello
                </NavLink>
              </li>
            )}
            <li>
              {isAuthPublico ? (
                <NavLink to="/perfil">Perfil</NavLink>
              ) : (
                <NavLink to="/iniciar-sesion">Ingresar</NavLink>
              )}
            </li>
          </ul>
        )}

        {/* FILTER PANEL DROPDOWN on map page */}
        {isMapPage && (filtroPanelOpen || filterPanelClosing) && (
          <div
            className={`filter-panel-dropdown${filterPanelClosing && !filtroPanelOpen ? " filter-panel-dropdown--closing" : ""}`}
          >
            <div
              className="filter-title"
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#863819",
                fontFamily: "Cinzel, serif",
                textShadow: "none",
                marginBottom: "4px",
                padding: "0 16px",
              }}
            >
              FILTROS
            </div>
            {/* BUSCADOR DE LOCALIDADES */}
            <div style={{ padding: "0 16px 8px" }}>
              <input
                type="text"
                placeholder="Buscar localidad..."
                value={localidadSearch}
                onChange={(e) => setLocalidadSearch(e.target.value)}
                onFocus={() => setLocalidadDropdownOpen(true)}
                style={{
                  width: "100%",
                  padding: "6px 10px",
                  fontSize: "12px",
                  border: "1px solid rgba(0,0,0,0.15)",
                  borderRadius: "6px",
                  background: "rgba(255,255,255,0.8)",
                  color: "#000",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {/* FILTRO POR LOCALIDAD */}
            <div className="filter-panel-localidad">
              <div
                className="filter-panel-localidad-header"
                onClick={() => setLocalidadDropdownOpen(!localidadDropdownOpen)}
              >
                <img
                  src={
                    filtroLocalidad ? "/icons/location.png" : "/icons/map.png"
                  }
                  alt="location"
                  className="filter-panel-icon"
                  style={{
                    width: "16px",
                    height: "16px",
                    objectFit: "contain",
                  }}
                />
                <span className="filter-panel-localidad-label">
                  {filtroLocalidad
                    ? localidades.find(
                        (loc) => loc.id === parseInt(filtroLocalidad),
                      )?.nombre || "CHACO"
                    : "CHACO"}
                </span>
                <span className="filter-panel-arrow">
                  {localidadDropdownOpen ? "✕" : "▼"}
                </span>
              </div>
              {localidadDropdownOpen && (
                <div className="filter-panel-localidad-options">
                  <button
                    className={`filter-panel-localidad-option ${!filtroLocalidad ? "active" : ""}`}
                    onClick={() => {
                      setFiltroLocalidad("");
                      closeFilterPanel();
                      setLocalidadDropdownOpen(false);
                    }}
                  >
                    <img
                      src="/icons/map.png"
                      alt="map"
                      style={{
                        width: "16px",
                        height: "16px",
                        objectFit: "contain",
                      }}
                    />
                    CHACO
                  </button>
                  {localidades
                    .filter((loc) =>
                      loc.nombre
                        .toLowerCase()
                        .includes(localidadSearch.toLowerCase()),
                    )
                    .map((loc) => (
                      <button
                        key={loc.id}
                        className={`filter-panel-localidad-option ${filtroLocalidad === loc.id.toString() ? "active" : ""}`}
                        onClick={() => {
                          setFiltroLocalidad(loc.id.toString());
                          closeFilterPanel();
                          closeRutasPanel();
                          setLocalidadDropdownOpen(false);
                        }}
                      >
                        <img
                          src="/icons/location.png"
                          alt="location"
                          style={{
                            width: "16px",
                            height: "16px",
                            objectFit: "contain",
                          }}
                        />
                        {loc.nombre}
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="filter-panel-divider" />

            {/* CATEGORÍAS */}
            {categorias.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleFilterClick(cat.id)}
                onMouseEnter={() => setHoveredFilter(cat.id)}
                onMouseLeave={() => setHoveredFilter(null)}
                className={`filter-panel-cat-btn ${filtro === cat.id ? "cat-active" : ""}`}
                style={{
                  background:
                    hoveredFilter === cat.id
                      ? cat.color
                      : filtro === cat.id
                        ? cat.color
                        : darkMode
                          ? "rgba(50, 50, 60, 0.6)"
                          : "rgba(252, 249, 242, 0.9)",
                  color:
                    hoveredFilter === cat.id || filtro === cat.id
                      ? "white"
                      : darkMode
                        ? "#d0c8b0"
                        : "#333",
                }}
              >
                <img
                  src={`/icons/${cat.id}.png`}
                  alt={cat.label}
                  style={{
                    width: "20px",
                    height: "20px",
                    objectFit: "contain",
                    filter:
                      hoveredFilter === cat.id || filtro === cat.id
                        ? "brightness(0) invert(1)"
                        : "none",
                  }}
                />
                {cat.label.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => {
                setFiltro("todos");
                setFiltroLocalidad("");
                setSearchTerm("");
                closeFilterPanel();
              }}
              className="filter-panel-clear-btn"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* RECORRIDOS PANEL on map page */}
        {isMapPage && (recorridosPanelOpen || rutasPanelClosing) && (
          <div
            className={`rutas-panel-dropdown${rutasPanelClosing && !recorridosPanelOpen ? " rutas-panel-dropdown--closing" : ""}`}
          >
            <div
              className="rutas-title"
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#863819",
                fontFamily: "Cinzel, serif",
                textShadow: "none",
                marginBottom: "4px",
                padding: "0 16px",
              }}
            >
              RECORRIDOS
            </div>
            {recorridosList.length === 0 && (
              <div
                className="rutas-empty"
                style={{
                  padding: "12px 16px",
                  fontSize: "12px",
                  color: "#888",
                  textShadow: "none",
                }}
              >
                No hay recorridos disponibles.
              </div>
            )}
            {recorridosList.map((r) => {
              const isActive = recorridoActivo?.id === r.id;
              return (
                <div
                  key={r.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: isActive ? "#86381915" : "transparent",
                    transition: "background 0.15s",
                  }}
                  onClick={() => {
                    setRecorridoActivo(isActive ? null : r);
                    closeRutasPanel();
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#f5f0eb";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.background = "transparent";
                  }}
                >
                  {r.imagen ? (
                    <img
                      src={optimizarUrlCloudinary(r.imagen)}
                      alt=""
                      loading="lazy"
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "6px",
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "36px",
                        height: "36px",
                        borderRadius: "6px",
                        background: "#f0ebe4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: "16px",
                      }}
                    >
                      🗺️
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      className="rutas-item-text"
                      style={{
                        fontSize: "13px",
                        fontWeight: isActive ? 700 : 500,
                        color: "#2d1a12",
                        textShadow: "none",
                      }}
                    >
                      {r.nombre}
                    </div>
                  </div>
                  {isActive && (
                    <Link
                      to={`/recorrido/${r.slug}`}
                      onClick={(e) => e.stopPropagation()}
                      className="rutas-item-link"
                      style={{
                        fontSize: "11px",
                        color: "#863819",
                        textDecoration: "none",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        marginLeft: "4px",
                        textShadow: "none",
                      }}
                    >
                      Ver en detalle →
                    </Link>
                  )}
                </div>
              );
            })}
            <Link
              to="/recorridos"
              onClick={() => closeRutasPanel()}
              className="rutas-view-all"
              style={{
                display: "block",
                marginTop: "8px",
                padding: "10px 16px",
                fontSize: "12px",
                color: "#863819",
                textDecoration: "none",
                fontWeight: 600,
                textAlign: "center",
                borderRadius: "8px",
                background: "rgba(134, 56, 25, 0.08)",
                cursor: "pointer",
                textShadow: "none",
              }}
            >
              Ver todos los recorridos →
            </Link>
            {recorridoActivo && (
              <button
                onClick={() => {
                  setRecorridoActivo(null);
                  triggerRecorridoFly();
                  closeRutasPanel();
                }}
                className="rutas-clear-btn"
              >
                Limpiar recorrido
              </button>
            )}
          </div>
        )}

        {/* Logo símbolo + menú tipo tren en map page */}
        {isMapPage && (
          <div className="header-symbol-wrapper">
            <button
              className={`header-symbol-link ${symbolMenuOpen ? "active" : ""}`}
              onClick={() => setSymbolMenuOpen((prev) => !prev)}
              title="Menú"
            >
              <img
                src={logoSymbol}
                alt="Made in Chaco"
                className="header-symbol-img"
              />
            </button>
            <nav
              aria-label="Navegación de categorías"
              className={`header-symbol-train ${symbolMenuOpen ? "open" : ""}`}
            >
              <NavLink
                to="/proyecto"
                className="train-item"
                style={{ transitionDelay: "0s" }}
              >
                Proyecto
              </NavLink>
              <NavLink
                to="/quienes-somos"
                className="train-item"
                style={{ transitionDelay: "0.08s" }}
              >
                Quienes somos
              </NavLink>
              <NavLink
                to="/contacto"
                className="train-item"
                style={{ transitionDelay: "0.16s" }}
              >
                Contacto
              </NavLink>
              {isAuthPublico && (
                <NavLink
                  to="/solicitar-sello"
                  className="train-item"
                  style={{ transitionDelay: "0.24s" }}
                  onClick={(e) => {
                    e.preventDefault();
                    setShowSelloModal(true);
                  }}
                >
                  Solicitar sello
                </NavLink>
              )}
              <NavLink
                to={isAuthPublico ? "/perfil" : "/iniciar-sesion"}
                className="train-item"
                style={{ transitionDelay: "0.32s" }}
              >
                {isAuthPublico ? "Perfil" : "Ingresar"}
              </NavLink>
            </nav>
            {symbolMenuOpen && (
              <div
                className="header-symbol-overlay"
                onClick={() => setSymbolMenuOpen(false)}
              />
            )}
          </div>
        )}

        {/* Checkbox for mobile (non-map pages) */}
        {!isMapPage && (
          <>
            <input type="checkbox" name="checkbox" id="menu-toggle" />
            <label htmlFor="menu-toggle" className="menu-icon-action">
              <div className="bx bx-menu" id="menu-icon"></div>
            </label>
          </>
        )}
      </>)}
      </header>

      <SelloModal
        isOpen={showSelloModal}
        onClose={() => setShowSelloModal(false)}
      />
    </>
  );
};
