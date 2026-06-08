export const EscHint = ({ onDismiss }) => (
  <div
    style={{
      position: "absolute",
      bottom: "90px",
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
      zIndex: 1500,
      pointerEvents: "none",
    }}
  >
    <div
      className="esc-hint-overlay"
      onClick={onDismiss}
      style={{
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        color: "rgba(252,249,242,0.7)",
        padding: "10px 20px",
        borderRadius: "10px",
        fontFamily: "Manrope, sans-serif",
        fontSize: "13px",
        fontWeight: 400,
        textShadow: "none",
        cursor: "pointer",
        pointerEvents: "auto",
        boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
        maxWidth: "80%",
        textAlign: "center",
        animation: "filterPanelSlideIn 0.6s ease-out",
        lineHeight: 1.3,
        letterSpacing: "0.2px",
      }}
    >
      Presioná ESC o{" "}
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="rgba(252,249,242,0.7)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ verticalAlign: "middle", margin: "0 2px" }}
      >
        <path d="M8 3H5a2 2 0 0 0-2 2v3" />
        <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
        <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
        <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      </svg>{" "}
      para volver a la vista principal
    </div>
  </div>
);
