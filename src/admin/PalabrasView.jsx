import { useState, useEffect, useCallback } from "react";
import { styles, authHeaders } from "./helpers";

export function PalabrasView({ authFetch, showConfirm, showPopup }) {
  const [palabras, setPalabras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [nuevoSignificado, setNuevoSignificado] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [editandoPalabra, setEditandoPalabra] = useState("");
  const [editandoSignificado, setEditandoSignificado] = useState("");
  const [adding, setAdding] = useState(false);

  const cargarPalabras = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/palabras");
      if (res.ok) setPalabras(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { cargarPalabras(); }, [cargarPalabras]);

  const agregarPalabra = async () => {
    if (!nuevaPalabra.trim()) return;
    setAdding(true);
    try {
      const res = await authFetch("/api/palabras", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          palabra: nuevaPalabra.trim(),
          significado: nuevoSignificado.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNuevaPalabra("");
        setNuevoSignificado("");
        cargarPalabras();
      }
    } catch {} finally {
      setAdding(false);
    }
  };

  const actualizarPalabra = async (id) => {
    if (!editandoPalabra.trim()) return;
    try {
      const res = await authFetch(`/api/palabras/${id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          palabra: editandoPalabra.trim(),
          significado: editandoSignificado.trim() || undefined,
        }),
      });
      if (res.ok) {
        setEditandoId(null);
        setEditandoPalabra("");
        setEditandoSignificado("");
        cargarPalabras();
      }
    } catch {}
  };

  const eliminarPalabra = async (id, palabra) => {
    const ok = await showConfirm(`¿Eliminar "${palabra}"?`, "ELIMINAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/palabras/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) cargarPalabras();
    } catch {}
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
          <img src="/icons/edit.png" style={{ width: 26, height: 26, marginRight: 10, verticalAlign: "middle" }} alt="" />
          Palabras regionales
        </h2>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            style={{ ...styles.input, marginBottom: 0, flex: 1 }}
            placeholder="Palabra o frase chaqueña..."
            value={nuevaPalabra}
            onChange={(e) => setNuevaPalabra(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarPalabra()}
          />
          <button
            onClick={agregarPalabra}
            disabled={adding || !nuevaPalabra.trim()}
            className="admin-btn"
            style={{
              background: "#2e7d32", color: "white", border: "none",
              padding: "10px 20px", borderRadius: 12, fontWeight: 700,
              fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
              opacity: adding || !nuevaPalabra.trim() ? 0.5 : 1,
            }}
          >
            {adding ? "AGREGANDO…" : "+ AGREGAR"}
          </button>
        </div>
        <textarea
          style={{ ...styles.input, marginBottom: 0, width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical" }}
          placeholder="Significado (opcional)"
          value={nuevoSignificado}
          onChange={(e) => setNuevoSignificado(e.target.value)}
        />
      </div>

      {palabras.length === 0 && !loading && (
        <div style={{ color: "#888", fontSize: 14, padding: 40, textAlign: "center" }}>
          No hay palabras todavía. Agregá la primera arriba.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {palabras.map((p) => (
          <div key={p.id} style={styles.entityCard}>
            {editandoId === p.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={{ flex: 1, padding: "8px 12px", border: "1px solid #863819", borderRadius: 8, fontSize: 14, color: "#1c1c18", outline: "none" }}
                    value={editandoPalabra}
                    onChange={(e) => setEditandoPalabra(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) actualizarPalabra(p.id);
                      if (e.key === "Escape") { setEditandoId(null); setEditandoPalabra(""); setEditandoSignificado(""); }
                    }}
                    autoFocus
                  />
                  <button onClick={() => actualizarPalabra(p.id)} className="admin-btn" style={{ background: "#2e7d32", color: "white", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    GUARDAR
                  </button>
                  <button onClick={() => { setEditandoId(null); setEditandoPalabra(""); setEditandoSignificado(""); }} className="admin-btn-ghost" style={{ padding: "8px 14px", background: "white", border: "1px solid #ccc", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", color: "#555" }}>
                    CANCELAR
                  </button>
                </div>
                <textarea
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, color: "#1c1c18", outline: "none", minHeight: 50, resize: "vertical" }}
                  placeholder="Significado (opcional)"
                  value={editandoSignificado}
                  onChange={(e) => setEditandoSignificado(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#1c1c18" }}>{p.palabra}</div>
                  {p.significado && (
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.4 }}>{p.significado}</div>
                  )}
                </div>
                <button onClick={() => { setEditandoId(p.id); setEditandoPalabra(p.palabra); setEditandoSignificado(p.significado || ""); }} className="admin-btn-ghost" style={styles.smallBtn("#863819")}>
                  <img src="/icons/edit.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: 4 }} alt="" />
                  EDITAR
                </button>
                <button onClick={() => eliminarPalabra(p.id, p.palabra)} className="admin-btn-danger" style={styles.smallBtn("#c0392b")}>
                  <img src="/icons/delete.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: 4 }} alt="" />
                  ELIMINAR
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
