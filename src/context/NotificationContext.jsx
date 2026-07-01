import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useSocketEvent } from "../hooks/useSocket";
import { publicAuthFetch } from "../helpers/publicAuthFetch";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = localStorage.getItem("made_in_chaco_token")
        || localStorage.getItem("made_in_chaco_token_publico");
      if (!token) return;
      const res = await publicAuthFetch("/api/notificaciones/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("made_in_chaco_token")
      || localStorage.getItem("made_in_chaco_token_publico");
    if (!token) return;
    fetchUnreadCount();
    publicAuthFetch("/api/notificaciones/verificar-suscripciones", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }, [fetchUnreadCount]);

  useSocketEvent("notificacion:nueva", (data) => {
    setUnreadCount((prev) => prev + 1);
    if (data?.titulo) {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      setToast({ titulo: data.titulo, mensaje: data.mensaje, tipo: data.tipo });
      toastTimer.current = setTimeout(() => setToast(null), 5000);
    }
  });

  return (
    <NotificationContext.Provider value={{ unreadCount, fetchUnreadCount }}>
      {children}
      {toast && (
        <div
          onClick={() => { setToast(null); if (toastTimer.current) clearTimeout(toastTimer.current); }}
          style={{
            position: "fixed", top: 20, right: 20, zIndex: 9999,
            background: "#fff", border: "1px solid #e8e4da", borderRadius: 12,
            padding: "16px 20px", maxWidth: 360, cursor: "pointer",
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            animation: "slideIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18 }}>🔔</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "#2c2c28" }}>{toast.titulo}</span>
          </div>
          <div style={{ fontSize: 13, color: "#666", lineHeight: 1.4 }}>{toast.mensaje}</div>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  return useContext(NotificationContext);
}
