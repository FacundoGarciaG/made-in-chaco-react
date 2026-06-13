import { useState, useEffect } from "react";
import { useAuthPublico } from "../context/AuthPublicoContext";

export const FavoritoButton = ({ entidadId, recorridoId, className = "", style = {} }) => {
  const { isAuthenticated, getToken } = useAuthPublico();
  const [favorited, setFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams();
    if (entidadId) params.set("entidad_id", entidadId);
    if (recorridoId) params.set("recorrido_id", recorridoId);
    fetch(`/api/favoritos/check?${params}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setFavorited(data.favorited);
        if (data.id) setFavoriteId(data.id);
      })
      .catch(() => {});
  }, [isAuthenticated, entidadId, recorridoId, getToken]);

  const handleToggle = async () => {
    if (!isAuthenticated || loading) return;
    setLoading(true);
    try {
      if (favorited && favoriteId) {
        const res = await fetch(`/api/favoritos/${favoriteId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) { setFavorited(false); setFavoriteId(null); }
      } else {
        const res = await fetch("/api/favoritos", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify(entidadId ? { entidad_id: parseInt(entidadId) } : { recorrido_id: parseInt(recorridoId) }),
        });
        if (res.ok) {
          const data = await res.json();
          setFavorited(true);
          setFavoriteId(data.id);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  const circleStyle = {
    width: 44,
    height: 44,
    borderRadius: "50%",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    background: "rgba(45, 26, 18, 0.45)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#fff",
    fontSize: 20,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
    ...style,
    opacity: loading ? 0.5 : 1,
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleToggle}
      disabled={loading}
      style={circleStyle}
      aria-label={favorited ? "Quitar de favoritos" : "Agregar a favoritos"}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--primary)";
        e.currentTarget.style.borderColor = "var(--primary)";
        e.currentTarget.style.boxShadow = "0 8px 30px rgba(134,56,25,0.35)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(45, 26, 18, 0.45)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
        e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.15)";
        e.currentTarget.style.transform = "";
      }}
    >
      {favorited ? (
        <i className="ri-heart-fill" />
      ) : (
        <i className="ri-heart-line" />
      )}
    </button>
  );
};
