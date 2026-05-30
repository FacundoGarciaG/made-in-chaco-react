import { NavLink, useLocation, Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import "../styles/HeaderComponent.css";
import logoClaro from "../assets/imagenes/madeinchacoclaro.png";
import logoSymbol from "../assets/imagenes/logo-sintitulo.png";
export const HeaderComponent = () => {
  const location = useLocation();
  const isMapPage = location.pathname === "/descubre";
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('made-in-chaco-dark-mode') === 'true');
  const [searchTerm, setSearchTerm] = useState("");
  const [filtroPanelOpen, setFiltroPanelOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("todos");
  const [hoveredFilter, setHoveredFilter] = useState(null);
  const [filtroLocalidad, setFiltroLocalidad] = useState("");
  const [localidades, setLocalidades] = useState([]);
  const [showHeader, setShowHeader] = useState(false);
  const [recorridosPanelOpen, setRecorridosPanelOpen] = useState(false);
  const [recorridosList, setRecorridosList] = useState([]);
  const [selectedRecorrido, setSelectedRecorrido] = useState(null);
  const [entidades, setEntidades] = useState([]);
  const [searchDropdownOpen, setSearchDropdownOpen] = useState(false);
  const [symbolMenuOpen, setSymbolMenuOpen] = useState(false);
  const [localidadSearch, setLocalidadSearch] = useState("");
  const [localidadDropdownOpen, setLocalidadDropdownOpen] = useState(false);
  const logoRef = useRef(null);
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
      el.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
    };
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  // Resetear visibilidad al entrar al mapa y escuchar evento desde MapChaco
  useEffect(() => {
    if (!isMapPage) {
      setShowHeader(false);
      return;
    }
    setShowHeader(false);
    const handler = () => setShowHeader(true);
    window.addEventListener("header-show", handler);
    return () => window.removeEventListener("header-show", handler);
  }, [isMapPage]);

  const categorias = [
    { id: "todos", label: "Todos", color: "#333" },
    { id: "artesano", label: "Artesanos", color: "#ff5722" },
    { id: "gastronomia", label: "Gastronomía", color: "#4caf50" },
    { id: "comercio", label: "Comercios", color: "#2196f3" },
    { id: "evento", label: "Eventos", color: "#9c27b0" },
    { id: "patrimonio", label: "Patrimonios", color: "#795548" },
    { id: "personalidad", label: "Personalidades", color: "#e91e63" },
  ];

  // Resetear búsqueda al cerrar el panel
  useEffect(() => {
    if (!filtroPanelOpen) {
      setLocalidadSearch("");
      setLocalidadDropdownOpen(false);
    }
  }, [filtroPanelOpen]);

  useEffect(() => {
    const open = !!(filtroPanelOpen || recorridosPanelOpen);
    window.dispatchEvent(new CustomEvent("header-panel", { detail: { open } }));
  }, [filtroPanelOpen, recorridosPanelOpen]);

  // Cargar localidades para el filtro
  useEffect(() => {
    if (!isMapPage) return;
    fetch("/api/localidades")
      .then((res) => res.json())
      .then((data) => setLocalidades(data))
      .catch((err) => console.error("Error cargando localidades:", err));
  }, [isMapPage]);

  // Escuchar cuando MapChaco confirma la selección de búsqueda
  useEffect(() => {
    if (!isMapPage) return;
    const handler = (e) => setSearchTerm(e.detail);
    window.addEventListener("header-search-set", handler);
    return () => window.removeEventListener("header-search-set", handler);
  }, [isMapPage]);

  // Cargar entidades para el autocomplete del buscador
  useEffect(() => {
    if (!isMapPage) return;
    fetch("/api/entidades")
      .then((r) => r.ok ? r.json() : [])
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

  // Notificar a MapChaco cuando se selecciona un recorrido
  useEffect(() => {
    if (!isMapPage) return;
    window.dispatchEvent(
      new CustomEvent("header-recorrido", { detail: selectedRecorrido }),
    );
  }, [selectedRecorrido, isMapPage]);

  // Sincronizar selectedRecorrido cuando MapChaco lo resetea (ej. Escape)
  useEffect(() => {
    if (!isMapPage) return;
    const handler = (e) => setSelectedRecorrido(e.detail);
    window.addEventListener("header-recorrido", handler);
    return () => window.removeEventListener("header-recorrido", handler);
  }, [isMapPage]);

  // Notify MapChaco when search term changes
  useEffect(() => {
    if (!isMapPage) return;
    window.dispatchEvent(
      new CustomEvent("header-search", { detail: searchTerm }),
    );
  }, [searchTerm, isMapPage]);

  // Notify MapChaco when filter changes
  useEffect(() => {
    if (!isMapPage) return;
    window.dispatchEvent(
      new CustomEvent("header-filter", { detail: activeFilter }),
    );
  }, [activeFilter, isMapPage]);

  // Notify MapChaco when localidad filter changes
  useEffect(() => {
    if (!isMapPage) return;
    window.dispatchEvent(
      new CustomEvent("header-localidad", { detail: filtroLocalidad }),
    );
  }, [filtroLocalidad, isMapPage]);

  // Reset search when leaving map page
  useEffect(() => {
    if (!isMapPage) {
      setSearchTerm("");
      setActiveFilter("todos");
      setFiltroLocalidad("");
      setFiltroPanelOpen(false);
    }
  }, [isMapPage]);

  // Listen for external reset (e.g. from FooterComponent filter change)
  useEffect(() => {
    if (!isMapPage) return;
    const handler = (e) => setActiveFilter(e.detail);
    window.addEventListener("header-filter-reset", handler);
    return () => window.removeEventListener("header-filter-reset", handler);
  }, [isMapPage]);

  // Listen for external localidad reset (e.g. from MapChaco restoring state)
  useEffect(() => {
    if (!isMapPage) return;
    const handler = (e) => setFiltroLocalidad(e.detail);
    window.addEventListener("header-localidad-reset", handler);
    return () => window.removeEventListener("header-localidad-reset", handler);
  }, [isMapPage]);

  // Listen for dark mode toggle from map
  useEffect(() => {
    if (!isMapPage) return;
    const handler = (e) => setDarkMode(e.detail);
    window.addEventListener("darkmode-toggle", handler);
    return () => window.removeEventListener("darkmode-toggle", handler);
  }, [isMapPage]);

  const handleFilterClick = useCallback((catId) => {
    setActiveFilter(catId);
    setFiltroPanelOpen(false);
  }, []);

  return (
    <>
      <header
        className={`${isMapPage ? "header--map-view" : ""} ${isMapPage && !showHeader ? "header--hidden" : ""} ${darkMode && isMapPage ? "dark-mode" : ""}`}
      >
        <div className="header-left">
          {/* LOGO  */}
          <NavLink ref={logoRef} className="logo" to="/" aria-current="page">
            <img src={logoClaro} alt="Made in Chaco" className="logo-img" />
          </NavLink>

          {/* HAMBURGER GLASS BUTTON - filter panel toggle */}
          {isMapPage && (
            <button
              className="header-filter-toggle"
              onClick={() => {
                setFiltroPanelOpen(!filtroPanelOpen);
                if (!filtroPanelOpen) setRecorridosPanelOpen(false);
              }}
            >
              <img
                src={filtroPanelOpen ? "/src/assets/icons/close.png" : "/src/assets/icons/filter.png"}
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
                setRecorridosPanelOpen(!recorridosPanelOpen);
                if (!recorridosPanelOpen) setFiltroPanelOpen(false);
              }}
            >
              <img
                src={recorridosPanelOpen ? "/src/assets/icons/close.png" : "/src/assets/icons/route.png"}
                alt={recorridosPanelOpen ? "close" : "route"}
                style={{ width: "24px", height: "24px", objectFit: "contain" }}
              />
            </button>
          )}
        </div>

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
            {searchTerm && searchDropdownOpen && entidades.filter(e => {
              if (!e.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
              if (activeFilter !== "todos" && e.tipo !== activeFilter) return false;
              if (filtroLocalidad && e.localidad_id !== parseInt(filtroLocalidad)) return false;
              return true;
            }).length > 0 && (
              <div className="header-search-dropdown">
                {entidades
                  .filter(e => {
                    if (!e.nombre?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                    if (activeFilter !== "todos" && e.tipo !== activeFilter) return false;
                    if (filtroLocalidad && e.localidad_id !== parseInt(filtroLocalidad)) return false;
                    return true;
                  })
                  .slice(0, 8)
                  .map(e => (
                    <button
                      key={e.id}
                      className="header-search-suggestion"
                      onMouseDown={() => {
                        setSearchTerm(e.nombre);
                        setSearchDropdownOpen(false);
                        window.dispatchEvent(new CustomEvent("header-search-select", { detail: e.nombre }));
                      }}
                    >
                      {e.nombre}
                    </button>
                  ))}
              </div>
            )}
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
            <NavLink to="/" aria-current="page">
              Quienes somos
            </NavLink>
          </li>
          <li>
            <NavLink to="/contacto" aria-current="page">
              Contacto
            </NavLink>
          </li>
        </ul>
        )}

        {/* FILTER PANEL DROPDOWN on map page */}
        {isMapPage && filtroPanelOpen && (
          <div className="filter-panel-dropdown">
            <div className="filter-title" style={{ fontSize: "13px", fontWeight: 700, color: "#863819", fontFamily: "Cinzel, serif", textShadow: "none", marginBottom: "4px", padding: "0 16px" }}>
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
                    filtroLocalidad
                      ? "/src/assets/icons/location.png"
                      : "/src/assets/icons/map.png"
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
                    setFiltroPanelOpen(false);
                    setLocalidadDropdownOpen(false);
                  }}
                >
                  <img
                    src="/src/assets/icons/map.png"
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
                    loc.nombre.toLowerCase().includes(localidadSearch.toLowerCase())
                  )
                  .map((loc) => (
                  <button
                    key={loc.id}
                    className={`filter-panel-localidad-option ${filtroLocalidad === loc.id.toString() ? "active" : ""}`}
                    onClick={() => {
                      setFiltroLocalidad(loc.id.toString());
      setFiltroPanelOpen(false);
      setRecorridosPanelOpen(false);
                      setLocalidadDropdownOpen(false);
                    }}
                  >
                    <img
                      src="/src/assets/icons/location.png"
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
                className={`filter-panel-cat-btn ${activeFilter === cat.id ? "cat-active" : ""}`}
                style={{
                  background:
                    hoveredFilter === cat.id
                      ? cat.color
                      : activeFilter === cat.id
                        ? cat.color
                        : darkMode ? "rgba(50, 50, 60, 0.6)" : "rgba(252, 249, 242, 0.9)",
                  color:
                    hoveredFilter === cat.id || activeFilter === cat.id
                      ? "white"
                      : darkMode ? "#d0c8b0" : "#333",
                }}
              >
                <img
                  src={`/src/assets/icons/${cat.id}.png`}
                  alt={cat.label}
                  style={{
                    width: "20px",
                    height: "20px",
                    objectFit: "contain",
                    filter:
                      hoveredFilter === cat.id || activeFilter === cat.id
                        ? "brightness(0) invert(1)"
                        : "none",
                  }}
                />
                {cat.label.toUpperCase()}
              </button>
            ))}
            <button
              onClick={() => {
                setActiveFilter("todos");
                setFiltroLocalidad("");
                setSearchTerm("");
                setFiltroPanelOpen(false);
              }}
              className="filter-panel-clear-btn"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* RECORRIDOS PANEL on map page */}
        {isMapPage && recorridosPanelOpen && (
          <div className="rutas-panel-dropdown">
            <div className="rutas-title" style={{ fontSize: "13px", fontWeight: 700, color: "#863819", fontFamily: "Cinzel, serif", textShadow: "none", marginBottom: "4px", padding: "0 16px" }}>
              RECORRIDOS
            </div>
            {recorridosList.length === 0 && (
              <div className="rutas-empty" style={{ padding: "12px 16px", fontSize: "12px", color: "#888", textShadow: "none" }}>
                No hay recorridos disponibles.
              </div>
            )}
            {recorridosList.map((r) => {
              const isActive = selectedRecorrido?.id === r.id;
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
                    setSelectedRecorrido(isActive ? null : r);
                    setRecorridosPanelOpen(false);
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = "#f5f0eb";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = "transparent";
                  }}
                >
                  {r.imagen ? (
                    <img
                      src={r.imagen}
                      alt=""
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
                    <div className="rutas-item-text" style={{ fontSize: "13px", fontWeight: isActive ? 700 : 500, color: "#2d1a12", textShadow: "none" }}>
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
              onClick={() => setRecorridosPanelOpen(false)}
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
            {selectedRecorrido && (
              <button
                onClick={() => {
                  setSelectedRecorrido(null);
                  window.dispatchEvent(new CustomEvent("header-recorrido-fly"));
                  setRecorridosPanelOpen(false);
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
            {symbolMenuOpen && (
              <div className="header-symbol-overlay" onClick={() => setSymbolMenuOpen(false)} />
            )}
            <button
              className={`header-symbol-link ${symbolMenuOpen ? "active" : ""}`}
              onClick={() => setSymbolMenuOpen((prev) => !prev)}
              title="Menú"
            >
              <img src={logoSymbol} alt="Made in Chaco" className="header-symbol-img" />
            </button>
            <nav className={`header-symbol-train ${symbolMenuOpen ? "open" : ""}`}>
              <NavLink
                to="/proyecto"
                className="train-item"
                style={{ transitionDelay: "0s" }}
                onClick={() => setSymbolMenuOpen(false)}
              >
                Proyecto
              </NavLink>
              <NavLink
                to="/"
                className="train-item"
                style={{ transitionDelay: "0.08s" }}
                onClick={() => setSymbolMenuOpen(false)}
              >
                Quienes somos
              </NavLink>
              <NavLink
                to="/contacto"
                className="train-item"
                style={{ transitionDelay: "0.16s" }}
                onClick={() => setSymbolMenuOpen(false)}
              >
                Contacto
              </NavLink>
            </nav>
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
      </header>
    </>
  );
};
