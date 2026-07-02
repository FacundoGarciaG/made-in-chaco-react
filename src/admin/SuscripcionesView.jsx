import { useState, useEffect, useCallback } from "react";
import { styles, authHeaders, colorMapAdmin } from "./helpers";

const ESTADO_CFG = {
  al_dia: { label: "Al día", color: "#2e7d32", bg: "#e8f5e9" },
  atrasado: { label: "Atrasado", color: "#c62828", bg: "#ffebee" },
  reembolso_solicitado: { label: "Devolución solicitada", color: "#e65100", bg: "#fff3e0" },
  cancelado: { label: "Cancelado", color: "#888", bg: "#f5f5f5" },
};

export function SuscripcionesView({ authFetch, showPopup, onSelectEntity }) {
  const [suscripciones, setSuscripciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("");
  const [filtroVencimiento, setFiltroVencimiento] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/suscripciones/todas", { headers: authHeaders() });
      if (res.ok) setSuscripciones(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { cargar(); }, [cargar]);

  const tipos = [...new Set(suscripciones.map((s) => s.tipo).filter(Boolean))];
  const usuarios = [...new Map(
    suscripciones.filter((s) => s.perfil_nombre || s.perfil_email).map((s) => [
      s.perfil_email, { nombre: s.perfil_nombre || s.perfil_email, email: s.perfil_email },
    ]),
  ).values()];

  const filtradas = suscripciones.filter((s) => {
    if (filtroNombre && !s.entidad_nombre?.toLowerCase().includes(filtroNombre.toLowerCase())) return false;
    if (filtroTipo && s.tipo !== filtroTipo) return false;
    if (filtroUsuario && (s.perfil_nombre || s.perfil_email) !== filtroUsuario && s.perfil_email !== filtroUsuario) return false;
    if (filtroVencimiento) {
      const hoy = new Date();
      const fin = s.fecha_fin_suscripcion ? new Date(s.fecha_fin_suscripcion) : null;
      if (filtroVencimiento === "vencidas" && fin && fin >= hoy) return false;
      if (filtroVencimiento === "vencidas" && !fin) return false;
      if (filtroVencimiento === "vigentes" && (!fin || fin < hoy)) return false;
      if (filtroVencimiento === "proximas" && (!fin || fin < hoy || fin > new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000))) return false;
    }
    return true;
  });

  const estadoInfo = (estado) => ESTADO_CFG[estado] || { label: estado || "—", color: "#888", bg: "#f5f5f5" };

  const diasRestantes = (fin) => {
    if (!fin) return null;
    const hoy = new Date();
    const f = new Date(fin);
    const diff = Math.ceil((f - hoy) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const inputStyle = {
    padding: "8px 12px", border: "1px solid #e0ddd5", borderRadius: 8, fontSize: 13,
    fontFamily: "inherit", background: "white", outline: "none", boxSizing: "border-box",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={styles.sectionTitle}>
          Suscripciones contratadas ({filtradas.length})
        </h2>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Buscar por nombre..."
          value={filtroNombre}
          onChange={(e) => setFiltroNombre(e.target.value)}
          style={{ ...inputStyle, width: 200 }}
        />
        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ ...inputStyle, width: 150, cursor: "pointer" }}>
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} style={{ ...inputStyle, width: 200, cursor: "pointer" }}>
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => (
            <option key={u.email} value={u.nombre}>{u.nombre}</option>
          ))}
        </select>
        <select value={filtroVencimiento} onChange={(e) => setFiltroVencimiento(e.target.value)} style={{ ...inputStyle, width: 170, cursor: "pointer" }}>
          <option value="">Todas las fechas</option>
          <option value="vigentes">Vigentes</option>
          <option value="proximas">Vencen pronto (7 días)</option>
          <option value="vencidas">Vencidas</option>
        </select>
        {(filtroNombre || filtroTipo || filtroUsuario || filtroVencimiento) && (
          <button
            onClick={() => { setFiltroNombre(""); setFiltroTipo(""); setFiltroUsuario(""); setFiltroVencimiento(""); }}
            style={{ ...inputStyle, cursor: "pointer", color: "#863819", fontWeight: 600, borderColor: "#863819" }}
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando...</p>
      ) : filtradas.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No hay suscripciones contratadas.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtradas.map((s) => {
            const est = estadoInfo(s.estado_pago);
            const dias = diasRestantes(s.fecha_fin_suscripcion);
            return (
              <div
                key={s.entidad_id}
                style={{ ...styles.entityCard, cursor: "pointer" }}
                onClick={() => onSelectEntity?.(s.entidad_id)}
              >
                <div style={{ flex: 1, minWidth: 0, color: "#1c1c18" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", color: "#1c1c18" }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#1c1c18" }}>{s.entidad_nombre}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: colorMapAdmin[s.tipo] || "#1c1c18" }}>
                      {s.tipo}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: est.bg, color: est.color }}>
                      {est.label}
                    </span>
                    {dias !== null && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                        background: dias <= 0 ? "#ffebee" : dias <= 7 ? "#fff8e1" : "#e8f5e9",
                        color: dias <= 0 ? "#c62828" : dias <= 7 ? "#f9a825" : "#2e7d32",
                      }}>
                        {dias <= 0 ? "Vencido" : `${dias} día${dias !== 1 ? "s" : ""}`}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4, display: "flex", gap: "12px", flexWrap: "wrap", color: "#1c1c18" }}>
                    <span style={{ color: "#1c1c18" }}>👤 {s.perfil_nombre || s.perfil_email || "—"}</span>
                    <span style={{ color: "#1c1c18" }}>📋 {s.plan_nombre || s.plan_tipo || "—"}</span>
                    {s.ultimo_monto > 0 && (
                      <span style={{ color: "#1c1c18" }}>💰 ${Number(s.ultimo_monto).toLocaleString("es-AR")}</span>
                    )}
                    {s.fecha_inicio_suscripcion && (
                      <span style={{ color: "#1c1c18" }}>📅 {new Date(s.fecha_inicio_suscripcion).toLocaleDateString("es-AR")} → {s.fecha_fin_suscripcion ? new Date(s.fecha_fin_suscripcion).toLocaleDateString("es-AR") : "—"}</span>
                    )}
                    {s.ultimo_pago && (
                      <span style={{ color: "#1c1c18" }}>🕐 Último pago: {new Date(s.ultimo_pago).toLocaleDateString("es-AR")}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
