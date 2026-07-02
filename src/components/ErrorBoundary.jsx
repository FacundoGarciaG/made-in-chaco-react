import { Component } from "react";

const containerStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  height: "100vh",
  padding: "2rem",
  textAlign: "center",
  color: "#1c1c18",
  fontFamily: "Cinzel, serif",
};

const titleStyle = {
  fontSize: "1.5rem",
  marginBottom: "0.5rem",
  color: "#1c1c18",
};

const messageStyle = {
  fontSize: "1rem",
  color: "#666",
  marginBottom: "1.5rem",
  lineHeight: 1.5,
};

const buttonRowStyle = {
  display: "flex",
  gap: "1rem",
  flexWrap: "wrap",
  justifyContent: "center",
};

const buttonBase = {
  padding: "0.6rem 1.5rem",
  borderRadius: "8px",
  border: "2px solid #863819",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: 600,
  textDecoration: "none",
  transition: "all 0.2s",
};

const retryButton = {
  ...buttonBase,
  background: "#863819",
  color: "#fff",
};

const homeButton = {
  ...buttonBase,
  background: "transparent",
  color: "#863819",
};

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, retryKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState(prev => ({ hasError: false, error: null, retryKey: prev.retryKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={containerStyle}>
          <div style={titleStyle}>Algo salió mal</div>
          <div style={messageStyle}>
            No se pudo cargar esta sección. Puede ser un problema de conexión o
            un error temporal.
          </div>
          <div style={buttonRowStyle}>
            <button style={retryButton} onClick={this.handleRetry}>
              Reintentar
            </button>
            <a href="/" style={homeButton}>
              Volver al inicio
            </a>
          </div>
        </div>
      );
    }

    return <div key={this.state.retryKey}>{this.props.children}</div>;
  }
}
