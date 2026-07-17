import { useState, useEffect, useCallback } from "react";
import { styles } from "./helpers";
import { RevisarModal } from "./RevisarModal";
import { useSocketEvent } from "../hooks/useSocket";

export function EdicionesView({ authFetch, authHeaders, colorMapAdmin, setPendingEdiciones, showConfirm, showPopup }) {
  const [ediciones, setEdiciones] = useState(null);
  const [revisando, setRevisando] = useState(null);
  const setEdicionesCount = useCallback((data) => {
    setEdiciones(data);
    if (setPendingEdiciones) setPendingEdiciones(data ? data.length : 0);
  }, [setPendingEdiciones]);

  const cargarEdiciones = useCallback(async () => {
    try {
      const res = await authFetch("/api/solicitudes-edicion", { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setEdicionesCount(data); }
    } catch {}
  }, [authFetch, authHeaders, setEdicionesCount]);

  useEffect(() => { cargarEdiciones(); }, [cargarEdiciones]);

  useSocketEvent("solicitud-edicion:change", () => { cargarEdiciones(); });
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={styles.sectionTitle}>
          Ediciones
        </h2>
      </div>
      {ediciones === null ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando...</p>
      ) : ediciones.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No hay ediciones pendientes.</p>
      ) : (
        <>
        {(() => {
          const grouped = ediciones.reduce((acc, sol) => {
            const key = sol.owner_email || "desconocido";
            if (!acc[key]) acc[key] = [];
            acc[key].push(sol);
            return acc;
          }, {});
          return Object.entries(grouped).map(([email, sols]) => (
            <div key={email} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#555", marginBottom: 8, padding: "4px 0", borderBottom: "1px solid #eee", display: "flex", alignItems: "center", gap: 6 }}>
                <img src="/icons/user.png" style={{ width: 16, height: 16 }} alt="" />
                {sols[0].owner_nombre || email}
              </div>
              {sols.map((sol) => (
                <div key={sol.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", border: "1px solid #eee", borderRadius: 12, background: "#fff", marginBottom: 8 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: colorMapAdmin[sol.tipo] || "#555", textTransform: "uppercase", letterSpacing: "1px" }}>{sol.tipo}</span>
                      <span style={{ fontSize: 11, color: "#f39c12", background: "#fff8e1", padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>PENDIENTE</span>
                    </div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#1c1c18", margin: 0 }}>{sol.entidad_nombre}</p>
                    <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      {new Date(sol.created_at).toLocaleDateString("es-AR")}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setRevisando(sol)} style={{
                      padding: "8px 16px", background: "transparent", color: "#555",
                      border: "1px solid #ddd", borderRadius: 8, fontSize: 12, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit",
                    }}>REVISAR</button>
                    <button onClick={async () => {
                      const ok = await showConfirm("¿Aprobar esta edición? Los datos se aplicarán a la entidad.", "APROBAR");
                      if (!ok) return;
                      await authFetch(`/api/solicitudes-edicion/${sol.id}/aprobar`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }) });
                      const res = await authFetch("/api/solicitudes-edicion", { headers: authHeaders() });
                      if (res.ok) { const data = await res.json(); setEdicionesCount(data); }
                    }} style={{ padding: "8px 16px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      APROBAR
                    </button>
                    <button onClick={async () => {
                      const ok = await showConfirm("¿Rechazar esta edición?", "RECHAZAR");
                      if (!ok) return;
                      await authFetch(`/api/solicitudes-edicion/${sol.id}/rechazar`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }) });
                      const res = await authFetch("/api/solicitudes-edicion", { headers: authHeaders() });
                      if (res.ok) { const data = await res.json(); setEdicionesCount(data); }
                    }} style={{ padding: "8px 16px", background: "#c62828", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                      RECHAZAR
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ));
        })()}
        </>
      )}
      {revisando && <RevisarModal sol={revisando} onClose={() => setRevisando(null)} />}
    </div>
  );
}
