import { useState, useEffect } from "react";
import "../styles/FooterComponent.css";

function fitAll() {
  window.__hideEscHint?.();
  window.__mapInstance?.flyTo({
    center: [-60.44, -26.05],
    zoom: 7,
    speed: 0.8,
    curve: 1.5,
    essential: true,
  });
}

function resetNorth() {
  window.__mapInstance?.easeTo({ bearing: 0, pitch: 0, duration: 600 });
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
}

export const FooterComponent = ({
  onFilterChange,
  activeFilter,
  localidades,
  filtroLocalidad,
  onLocalidadChange,
  darkMode,
  onToggleDarkMode,
}) => {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      localStorage.setItem("opencode-fullscreen", fs);
    };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleMenu = () => {
    setMenuAbierto((prev) => !prev);
  };

  const categorias = [
    { id: "todos", label: "Todos", color: "#333" },
    { id: "artesano", label: "Artesanos", color: "#ff5722" },
    { id: "gastronomia", label: "Gastronomía", color: "#4caf50" },
    { id: "comercio", label: "Comercios", color: "#2196f3" },
    { id: "evento", label: "Eventos", color: "#9c27b0" },
    { id: "patrimonio", label: "Patrimonios", color: "#795548" },
    { id: "personalidad", label: "Personalidades", color: "#e91e63" },
  ];

  return (
    <div
      className={`footer-map ${menuAbierto ? "footer-map--open" : ""}`}
      onClick={(e) => {
        // Cerrar si se hace click en el overlay del footer (no en el contenido)
        if (menuAbierto && e.target === e.currentTarget) {
          setMenuAbierto(false);
        }
      }}
    >
      <div className="footer-map__content">
        <div className="footer-map__header">
          <div className="footer-map__header-left">
            <span className="footer-map__title">✦ EXPLORAR</span>
          </div>
          <div className="footer-map__header-center">
            <button
              className="footer-map__geo-btn"
              onClick={() => window.__geolocateControl?.trigger()}
              aria-label="Geolocalizar"
              title="Geolocalizar"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d1a12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="6" />
                <line x1="12" y1="18" x2="12" y2="22" />
                <line x1="2" y1="12" x2="6" y2="12" />
                <line x1="18" y1="12" x2="22" y2="12" />
              </svg>
            </button>
            <div className="footer-map__zoom">
              <button
                className="footer-map__zoom-btn"
                onClick={() => window.__mapInstance?.zoomOut()}
                aria-label="Alejar"
                title="Alejar"
                type="button"
              >
                −
              </button>
              <div className="footer-map__zoom-divider" />
              <button
                className="footer-map__zoom-btn"
                onClick={() => window.__mapInstance?.zoomIn()}
                aria-label="Acercar"
                title="Acercar"
                type="button"
              >
                +
              </button>
            </div>
            <button
              className="footer-map__ctrl-btn"
              onClick={fitAll}
              aria-label="Ver todos"
              title="Ver todos"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d1a12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
            </button>
            <button
              className="footer-map__ctrl-btn"
              onClick={toggleFullscreen}
              aria-label="Pantalla completa"
              title="Pantalla completa"
              type="button"
            >
              {isFullscreen ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d1a12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 10 14 10 20" />
                  <polyline points="20 10 14 10 14 4" />
                  <line x1="14" y1="10" x2="21" y2="3" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d1a12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 3 21 3 21 9" />
                  <polyline points="9 21 3 21 3 15" />
                  <line x1="21" y1="3" x2="14" y2="10" />
                  <line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              )}
            </button>
            <button
              className="footer-map__ctrl-btn"
              onClick={() => {
                const map = window.__mapInstance;
                if (!map) return;
                const is3D = map.getPitch() > 0;
                map.easeTo({
                  pitch: is3D ? 0 : 55,
                  bearing: is3D ? 0 : 30,
                  duration: 600,
                });
              }}
              aria-label="Vista 2D/3D"
              title="Vista 2D/3D"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2d1a12" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </button>
            <button
              className="footer-map__ctrl-btn footer-map__north-btn"
              onClick={resetNorth}
              aria-label="Norte"
              title="Norte"
              type="button"
            >
              <svg width="18" height="18" viewBox="0 0 24 24">
                <polygon points="12,2 6,14 10,12 12,22 14,12 18,14" fill="#d32f2f" />
                <polygon points="12,2 6,14 10,12" fill="#b71c1c" />
              </svg>
            </button>
          </div>
          <div className="footer-map__header-right">
            <button
              className="footer-map__darkmode-btn"
              onClick={onToggleDarkMode}
              aria-label={darkMode ? "Modo claro" : "Modo oscuro"}
              title={darkMode ? "Modo claro" : "Modo oscuro"}
              type="button"
            >
              {darkMode ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0d060" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3d2b16" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
            <button
              className={`footer-map__hamburger ${menuAbierto ? "footer-map__hamburger--active" : ""}`}
              onClick={toggleMenu}
              aria-label="Menú de categorías"
              type="button"
            >
              <span className="footer-map__hamburger-line" />
              <span className="footer-map__hamburger-line" />
              <span className="footer-map__hamburger-line" />
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL MENU DESPLEGADO */}
        {menuAbierto && (
          <div className="footer-map__menu">
            {/* SECCIÓN: CATEGORÍAS */}
            <div className="footer-map__section">
              <span className="footer-map__section-title">CATEGORÍAS</span>
              <div className="footer-map__section-grid">
                {categorias.map((cat) => (
                  <button
                    key={cat.id}
                    className={`footer-map__menu-item ${activeFilter === cat.id ? "footer-map__menu-item--active" : ""}`}
                    style={{ "--cat-color": cat.color }}
                    onClick={() => {
                      if (onFilterChange) onFilterChange(cat.id);
                      setMenuAbierto(false);
                    }}
                    type="button"
                  >
                    <img
                      src={`/src/assets/icons/${cat.id}.png`}
                      alt={cat.label}
                      className="footer-map__menu-icon"
                      style={{
                        filter:
                          activeFilter === cat.id
                            ? "brightness(0) invert(1)"
                            : "none",
                      }}
                    />
                    <span>{cat.label.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* SEPARADOR */}
            <div className="footer-map__divider" />

            {/* SECCIÓN: LOCALIDADES */}
            <div className="footer-map__section">
              <span className="footer-map__section-title">LOCALIDADES</span>
              <div className="footer-map__localidades-grid">
                <button
                  className={`footer-map__menu-item footer-map__menu-item--localidad ${!filtroLocalidad ? "footer-map__menu-item--active" : ""}`}
                  onClick={() => {
                    if (onLocalidadChange) onLocalidadChange("");
                    setMenuAbierto(false);
                  }}
                  type="button"
                >
                  <img
                    src="/src/assets/icons/map.png"
                    alt="Chaco"
                    className="footer-map__menu-icon"
                  />
                  <span>TODA LA PROVINCIA</span>
                </button>
                {localidades.map((loc) => (
                  <button
                    key={loc.id}
                    className={`footer-map__menu-item footer-map__menu-item--localidad ${filtroLocalidad === loc.id.toString() ? "footer-map__menu-item--active" : ""}`}
                    onClick={() => {
                      if (onLocalidadChange)
                        onLocalidadChange(loc.id.toString());
                      setMenuAbierto(false);
                    }}
                    type="button"
                  >
                    <img
                      src="/src/assets/icons/location.png"
                      alt={loc.nombre}
                      className="footer-map__menu-icon"
                      style={{
                        filter:
                          filtroLocalidad === loc.id.toString()
                            ? "brightness(0) invert(1)"
                            : "none",
                      }}
                    />
                    <span>{loc.nombre.toUpperCase()}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
