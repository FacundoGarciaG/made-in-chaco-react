import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

export const FullscreenToggle = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const location = useLocation();
  const isMapPage = location.pathname === "/descubre";
  const isHome = location.pathname === "/";

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handler);
    handler();
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  useEffect(() => {
    if (isHome && !localStorage.getItem("fs-hint-dismissed")) {
      const t = setTimeout(() => setShowHint(true), 1500);
      return () => clearTimeout(t);
    }
  }, [isHome]);

  const toggle = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setShowHint(false);
  };

  const dismissHint = () => {
    setShowHint(false);
    localStorage.setItem("fs-hint-dismissed", "true");
  };

  if (isMapPage) return null;

  return (
    <>
      {showHint && (
        <div className="fs-hint">
          <div className="fs-hint-label">
            <i className="ri-sparkling-2-line fs-hint-icon" />
            Experiencia
          </div>
          <p className="fs-hint-text">
            Pantalla completa para una experiencia más inmersiva
          </p>
          <button className="fs-hint-close" onClick={dismissHint}>
            <i className="ri-close-line" />
          </button>
        </div>
      )}
      <button
        onClick={toggle}
        className="fullscreen-toggle"
        aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
      >
        <i className={isFullscreen ? "ri-fullscreen-exit-line" : "ri-fullscreen-line"} />
      </button>
    </>
  );
};
