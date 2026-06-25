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
    width: "240px",
    minWidth: "240px",
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
    padding: "24px 20px 16px",
    borderBottom: "1px solid #f0ede8",
  },
  sidebarNav: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },
  navBtn: {
    width: "100%",
    padding: "12px 16px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    textAlign: "left",
    transition: "all 0.15s",
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
    fontSize: "28px",
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
    padding: "14px",
    marginBottom: "12px",
    border: "1px solid #eee",
    borderRadius: "12px",
    outline: "none",
    fontSize: "15px",
    boxSizing: "border-box",
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
    padding: "12px 24px",
    background: "#863819",
    color: "white",
    border: "none",
    borderRadius: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
  btnSecondary: {
    padding: "14px 20px",
    background: "white",
    color: "#863819",
    border: "1px solid #863819",
    borderRadius: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
    whiteSpace: "nowrap",
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
