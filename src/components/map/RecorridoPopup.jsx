export const RecorridoPopup = ({ nombre, slug, onDismiss }) => (
  <div
    style={{
      position: "absolute",
      top: "95px",
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      zIndex: 1500,
      pointerEvents: "none",
    }}
  >
    <div
      className="recorrido-popup-overlay"
      onClick={onDismiss}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(210,195,165,0.35) 40%, rgba(210,195,165,0.6) 100%)",
        backdropFilter: "blur(16px) saturate(1.2)",
        WebkitBackdropFilter: "blur(16px) saturate(1.2)",
        borderRadius: "12px",
        padding: "10px 16px",
        pointerEvents: "auto",
        cursor: "pointer",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        maxHeight: "500px",
        overflowY: "auto",
        animation: "filterPanelSlideIn 0.3s ease-out",
      }}
    >
      <div>
        <div
          className="recorrido-label"
          style={{
            fontSize: "10px",
            color: "#863819",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textShadow: "none",
          }}
        >
          Recorrido
        </div>
        <div
          className="recorrido-name"
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#2d1a12",
            textShadow: "none",
          }}
        >
          {nombre}
        </div>
      </div>
      <a
        href={`/recorrido/${slug}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "inline-block",
          padding: "6px 12px",
          background: "#863819",
          color: "white",
          borderRadius: "8px",
          textDecoration: "none",
          fontSize: "11px",
          fontWeight: 600,
          textShadow: "none",
          whiteSpace: "nowrap",
        }}
      >
        Ver en detalle →
      </a>
    </div>
  </div>
);
