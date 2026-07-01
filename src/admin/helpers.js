export const getToken = () => localStorage.getItem("made_in_chaco_token");

export const authHeaders = (extra = {}) => {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
};

export const authFetch = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    localStorage.removeItem("made_in_chaco_token");
    localStorage.removeItem("made_in_chaco_user");
    window.location.href = "/admin/login";
    throw new Error("Sesión expirada");
  }
  return res;
};

export const colorMapAdmin = {
  artesano: "#ff5722",
  gastronomia: "#4caf50",
  comercio: "#2196f3",
  evento: "#9c27b0",
  patrimonio: "#795548",
  personalidad: "#e91e63",
  comunidad_indigena: "#8B4513",
  lugar_natural: "#2E7D32",
  hospedaje: "#FF6F00",
  productor: "#00695C",
  experiencia: "#6A1B9A",
  relato: "#D84315",
  espacio_cultural: "#37474F",
};

export const parseSocialList = (v) => {
  if (!v) return [];
  try { return JSON.parse(v); } catch { return v ? [{ type: "instagram", value: v }] : []; }
};

export const styles = {
  mainLayout: {
    width: "100%",
    minHeight: "100vh",
    background: "#f5f2eb",
    display: "flex",
    fontFamily: "Merriweather, serif",
    padding: "10px",
    boxSizing: "border-box",
    gap: "10px",
  },
  sidebar: {
    width: "220px",
    minWidth: "220px",
    height: "calc(100vh - 40px)",
    background: "white",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #eee",
    position: "sticky",
    top: "20px",
    boxSizing: "border-box",
    borderRadius: "12px",
  },
  sidebarHeader: {
    padding: "20px 16px 12px",
    borderBottom: "1px solid #f0ede8",
  },
  sidebarNav: {
    padding: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    flex: 1,
  },
  navBtn: {
    width: "100%",
    padding: "10px 14px",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    textAlign: "left",
    transition: "all 0.15s",
    color: "#1c1c18",
  },
  logoutBtn: {
    width: "100%",
    padding: "14px 20px",
    border: "none",
    borderTop: "1px solid #f0ede8",
    background: "transparent",
    color: "#863819",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "center",
  },
  contentArea: { flex: 1, padding: "20px 0 20px 20px", display: "flex", flexDirection: "column" },
  viewContainer: { width: "100%", flex: 1, display: "flex", flexDirection: "column", overflow: "auto", paddingRight: "20px" },
  sectionTitle: {
    fontFamily: "Cinzel, serif",
    color: "#1c1c18",
    marginBottom: "10px",
    fontSize: "24px",
    fontWeight: 400,
    letterSpacing: "0.5px",
  },
  entityCard: {
    background: "white",
    borderRadius: "12px",
    padding: "14px 18px",
    marginBottom: "8px",
    border: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  },
  smallBtn: (color) => ({
    padding: "6px 12px",
    background: "white",
    border: `1px solid ${color}`,
    color,
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "11px",
    whiteSpace: "nowrap",
    transition: "0.15s",
  }),
  stepperNav: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "24px",
    alignItems: "center",
  },
  dot: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    marginBottom: "12px",
    border: "1px solid #e0ddd5",
    borderRadius: "8px",
    outline: "none",
    fontSize: "14px",
    boxSizing: "border-box",
    background: "white",
  },
  btnNext: {
    padding: "14px 20px",
    background: "#863819",
    color: "white",
    border: "none",
    borderRadius: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  btnPrimary: {
    padding: "8px 18px",
    background: "#863819",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "13px",
    transition: "all 0.15s",
  },
  btnSecondary: {
    padding: "8px 18px",
    background: "transparent",
    color: "#555",
    border: "1px solid #ccc",
    borderRadius: "6px",
    fontWeight: 500,
    cursor: "pointer",
    fontSize: "13px",
    whiteSpace: "nowrap",
    transition: "all 0.15s",
  },
  principalBadge: {
    position: "absolute",
    top: "8px",
    right: "8px",
    fontSize: "10px",
    background: "#863819",
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    fontWeight: "bold",
    zIndex: 1,
  },
};
