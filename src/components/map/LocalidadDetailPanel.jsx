export const LocalidadDetailPanel = ({ localidad, panelOpen }) => {
  if (!localidad) return null;
  const fundDate = localidad.fecha_fundacion
    ? new Date(localidad.fecha_fundacion).getFullYear()
    : null;

  return (
    <div
      className="localidad-detail-panel"
      style={{
        position: "absolute",
        top: panelOpen ? "680px" : "95px",
        right: "16px",
        zIndex: 1500,
        pointerEvents: "auto",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(210,195,165,0.35) 40%, rgba(210,195,165,0.6) 100%)",
        backdropFilter: "blur(16px) saturate(1.2)",
        WebkitBackdropFilter: "blur(16px) saturate(1.2)",
        borderRadius: "12px",
        padding: "12px 16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        animation: "filterPanelSlideIn 0.3s ease-out",
        transition: "top 0.35s ease-out",
        minWidth: "180px",
      }}
    >
      <div
        className="localidad-name"
        style={{
          fontSize: "15px",
          color: "#863819",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          textShadow: "none",
          marginBottom: "6px",
        }}
      >
        {localidad.nombre}
      </div>
      {(localidad.departamento_nombre || localidad.departamento) && (
        <div
          className="localidad-value"
          style={{
            fontSize: "13px",
            color: "#000",
            textShadow: "none",
            marginBottom: "3px",
          }}
        >
          <span
            className="localidad-label"
            style={{ opacity: 0.6, color: "#000" }}
          >
            Departamento:
          </span>{" "}
          {localidad.departamento_nombre || localidad.departamento}
        </div>
      )}
      {localidad.habitantes != null && (
        <div
          className="localidad-value"
          style={{
            fontSize: "13px",
            color: "#000",
            textShadow: "none",
            marginBottom: "3px",
          }}
        >
          <span
            className="localidad-label"
            style={{ opacity: 0.6, color: "#000" }}
          >
            Población:
          </span>{" "}
          {localidad.habitantes.toLocaleString()}
        </div>
      )}
      {fundDate && (
        <div
          className="localidad-value"
          style={{
            fontSize: "13px",
            color: "#000",
            textShadow: "none",
            marginBottom: "3px",
          }}
        >
          <span
            className="localidad-label"
            style={{ opacity: 0.6, color: "#000" }}
          >
            Fundación:
          </span>{" "}
          {fundDate}
        </div>
      )}
      {localidad.gentilicio && (
        <div
          className="localidad-value"
          style={{
            fontSize: "13px",
            color: "#000",
            textShadow: "none",
          }}
        >
          <span
            className="localidad-label"
            style={{ opacity: 0.6, color: "#000" }}
          >
            Gentilicio:
          </span>{" "}
          {localidad.gentilicio}
        </div>
      )}
    </div>
  );
};
