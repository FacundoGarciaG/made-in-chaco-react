import { useState, useEffect, useCallback } from "react";
import { styles, authHeaders } from "./helpers";

export function PlanesView({ authFetch, showConfirm, showPopup }) {
  const [planes, setPlanes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editando, setEditando] = useState({});

  const cargarPlanes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/planes/admin", { headers: authHeaders() });
      if (res.ok) setPlanes(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { cargarPlanes(); }, [cargarPlanes]);

  const iniciarEdicion = (plan) => {
    setEditandoId(plan.id);
    setEditando({
      nombre: plan.nombre,
      descripcion: plan.descripcion || "",
      precio: plan.precio,
      duracion_dias: plan.duracion_dias,
      entidades_incluidas: plan.entidades_incluidas,
      activo: plan.activo,
    });
  };

  const guardar = async (id) => {
    if (!editando.nombre.trim()) return;
    try {
      const res = await authFetch(`/api/planes/${id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(editando),
      });
      if (res.ok) {
        setEditandoId(null);
        showPopup("Plan actualizado");
        cargarPlanes();
      }
    } catch {}
  };

  const eliminar = async (id, nombre) => {
    const ok = await showConfirm(`¿Eliminar el plan "${nombre}"?`, "ELIMINAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/planes/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        showPopup("Plan eliminado");
        cargarPlanes();
      }
    } catch {}
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={styles.sectionTitle}>
          Planes
        </h2>
      </div>

      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando...</p>
      ) : planes.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No hay planes todavía.</p>
      ) : (
        planes.map((plan) => (
          <div key={plan.id} style={styles.entityCard}>
            {editandoId === plan.id ? (
              <div style={{ flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4 }}>NOMBRE</label>
                    <input style={styles.input} value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4 }}>PRECIO ($)</label>
                    <input style={styles.input} type="number" step="0.01" value={editando.precio} onChange={(e) => setEditando({ ...editando, precio: e.target.value })} />
                  </div>
                  {plan.nombre !== "Personalizado" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4 }}>DURACIÓN (DÍAS)</label>
                      <input style={styles.input} type="number" value={editando.duracion_dias} onChange={(e) => setEditando({ ...editando, duracion_dias: e.target.value })} />
                    </div>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "8px" }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4 }}>DESCRIPCIÓN</label>
                    <textarea style={styles.input} rows={2} value={editando.descripcion} onChange={(e) => setEditando({ ...editando, descripcion: e.target.value })} />
                  </div>
                  {plan.nombre !== "Personalizado" && (
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4 }}>ENTIDADES INCLUIDAS</label>
                      <input style={styles.input} type="number" value={editando.entidades_incluidas} onChange={(e) => setEditando({ ...editando, entidades_incluidas: e.target.value })} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "8px" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 13, cursor: "pointer" }}>
                    <input type="checkbox" checked={editando.activo} onChange={(e) => setEditando({ ...editando, activo: e.target.checked })} />
                    Plan activo
                  </label>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => guardar(plan.id)} className="admin-btn" style={{ ...styles.btnPrimary, fontSize: 12, padding: "8px 16px" }}>
                    GUARDAR
                  </button>
                  <button onClick={() => setEditandoId(null)} className="admin-btn" style={{ ...styles.btnSecondary, fontSize: 12, padding: "8px 16px" }}>
                    CANCELAR
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "15px", color: "#1c1c18" }}>{plan.nombre}</span>
                    {!plan.activo && (
                      <span style={{ fontSize: "10px", fontWeight: 700, background: "#c62828", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>INACTIVO</span>
                    )}
                  </div>
                  <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                    {plan.descripcion ? `${plan.descripcion} · ` : ""}
                    <strong>${Number(plan.precio).toLocaleString("es-AR")}</strong> · {plan.duracion_dias} días · {plan.entidades_incluidas} entidad{plan.entidades_incluidas !== 1 ? "es" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  <button onClick={() => iniciarEdicion(plan)} className="admin-btn" style={styles.smallBtn("#863819")}>
                    EDITAR
                  </button>
                  <button onClick={() => eliminar(plan.id, plan.nombre)} className="admin-btn" style={{ ...styles.smallBtn("#c62828") }}>
                    <img src="/icons/delete.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                    ELIMINAR
                  </button>
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  );
}
