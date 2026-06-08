export const WelcomeOverlay = ({ onClick }) => (
  <div
    onClick={onClick}
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      zIndex: 2000,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      color: "white",
      fontFamily: "Epilogue, sans-serif",
    }}
  >
    <div
      style={{
        marginBottom: "30px",
        animation: "pulse 2s infinite",
      }}
    >
      <img src="/icons/touch.png" alt="touch" />
    </div>
    <h2
      style={{
        fontSize: "38px",
        opacity: 0.9,
        marginBottom: "15px",
        textAlign: "center",
        fontFamily: "Epilogue, sans-serif",
        color: "#fcf9f2",
      }}
    >
      Bienvenido a Made in Chaco
    </h2>
    <p
      style={{
        fontSize: "25px",
        opacity: 0.8,
        textAlign: "center",
        maxWidth: "400px",
        marginBottom: "30px",
        fontFamily: "Epilogue, sans-serif",
        color: "#fcf9f2",
      }}
    >
      Hacé click o tocá la pantalla para comenzar la experiencia
    </p>
  </div>
);
