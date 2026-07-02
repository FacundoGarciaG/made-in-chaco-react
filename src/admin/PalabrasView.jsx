import { useState, useEffect, useCallback } from "react";
import { styles, authHeaders } from "./helpers";

const CATEGORIAS = [
  { value: "palabra", label: "Palabra" },
  { value: "frase", label: "Frase" },
  { value: "dicho", label: "Dicho" },
  { value: "refran", label: "Refrán" },
  { value: "expresion", label: "Expresión" },
];

const IDIOMAS = [
  { value: "", label: "Sin origen" },
  { value: "guaraní", label: "Guaraní" },
  { value: "español", label: "Español" },
  { value: "wichí", label: "Wichí" },
  { value: "qom", label: "Qom" },
  { value: "mocoví", label: "Mocoví" },
  { value: "desconocido", label: "Desconocido" },
];

const baseInput = {
  width: "100%", boxSizing: "border-box", padding: "8px 12px",
  border: "1px solid #ddd", borderRadius: 8, fontSize: 13,
  color: "#1c1c18", outline: "none",
};

export function PalabrasView({ authFetch, showConfirm, showPopup }) {
  const [palabras, setPalabras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [nueva, setNueva] = useState({ palabra: "", significado: "", etimologia: "", idioma_origen: "", categoria: "palabra", ejemplos: "" });
  const [adding, setAdding] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editando, setEditando] = useState({});

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

  const resetNueva = () => setNueva({ palabra: "", significado: "", etimologia: "", idioma_origen: "", categoria: "palabra", ejemplos: "" });

  const agregarPalabra = async () => {
    if (!nueva.palabra.trim()) return;
    setAdding(true);
    try {
      const body = { palabra: nueva.palabra.trim(), significado: nueva.significado.trim() || undefined, etimologia: nueva.etimologia.trim() || undefined, idioma_origen: nueva.idioma_origen || undefined, categoria: nueva.categoria };
      const ejemplosArr = nueva.ejemplos.split("\n").map((s) => s.trim()).filter(Boolean);
      if (ejemplosArr.length > 0) body.ejemplos = ejemplosArr;
      const res = await authFetch("/api/palabras", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      if (res.ok) { resetNueva(); setShowAddForm(false); cargarPalabras(); }
    } catch {} finally {
      setAdding(false);
    }
  };

  const startEdit = (p) => {
    setEditandoId(p.id);
    setEditando({
      palabra: p.palabra, significado: p.significado || "",
      etimologia: p.etimologia || "", idioma_origen: p.idioma_origen || "",
      categoria: p.categoria || "palabra",
      ejemplos: Array.isArray(p.ejemplos) ? p.ejemplos.join("\n") : "",
    });
  };

  const actualizarPalabra = async (id) => {
    if (!editando.palabra.trim()) return;
    try {
      const body = { palabra: editando.palabra.trim(), significado: editando.significado.trim() || undefined, etimologia: editando.etimologia.trim() || undefined, idioma_origen: editando.idioma_origen || undefined, categoria: editando.categoria };
      const ejemplosArr = editando.ejemplos.split("\n").map((s) => s.trim()).filter(Boolean);
      if (ejemplosArr.length > 0) body.ejemplos = ejemplosArr;
      const res = await authFetch(`/api/palabras/${id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });
      if (res.ok) { setEditandoId(null); cargarPalabras(); }
    } catch {}
  };

  const eliminarPalabra = async (id, palabra) => {
    const ok = await showConfirm(`¿Eliminar "${palabra}"?`, "ELIMINAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/palabras/${id}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) cargarPalabras();
    } catch {}
  };

  const campo = (label, key, opts = {}) => (
    <div style={{ marginBottom: 8 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 3 }}>{label}</label>
      {opts.textarea ? (
        <textarea style={{ ...baseInput, minHeight: 50, resize: "vertical" }} value={nueva[key]} onChange={(e) => setNueva({ ...nueva, [key]: e.target.value })} placeholder={opts.placeholder} />
      ) : opts.select ? (
        <select style={{ ...baseInput, cursor: "pointer" }} value={nueva[key]} onChange={(e) => setNueva({ ...nueva, [key]: e.target.value })}>
          {opts.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input style={baseInput} value={nueva[key]} onChange={(e) => setNueva({ ...nueva, [key]: e.target.value })} placeholder={opts.placeholder} />
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
          La Colección
        </h2>
        <button onClick={() => { setShowAddForm(!showAddForm); resetNueva(); }} style={styles.btnPrimary}>
          {showAddForm ? "Cancelar" : "Nueva palabra"}
        </button>
      </div>

      {showAddForm && (
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20, marginBottom: 20 }}>
          {campo("Palabra", "palabra", { placeholder: "Ej: Tereré" })}
          {campo("Significado", "significado", { placeholder: "Definición de la palabra…", textarea: true })}
          {campo("Etimología", "etimologia", { placeholder: "Origen histórico de la palabra…", textarea: true })}
          <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              {campo("Idioma de origen", "idioma_origen", { select: true, options: IDIOMAS })}
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#555", display: "block", marginBottom: 3 }}>Categoría</label>
              <select style={{ ...baseInput, cursor: "pointer" }} value={nueva.categoria} onChange={(e) => setNueva({ ...nueva, categoria: e.target.value })}>
                {CATEGORIAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          {campo("Ejemplos de uso", "ejemplos", { placeholder: "Un ejemplo por línea…", textarea: true })}
          <button onClick={agregarPalabra} disabled={adding || !nueva.palabra.trim()} className="admin-btn" style={{ background: "#2e7d32", color: "white", border: "none", padding: "10px 20px", borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: "pointer", opacity: adding || !nueva.palabra.trim() ? 0.5 : 1 }}>
            {adding ? "GUARDANDO…" : "GUARDAR"}
          </button>
        </div>
      )}

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
                <input style={{ ...baseInput, borderColor: "#863819" }} value={editando.palabra} onChange={(e) => setEditando({ ...editando, palabra: e.target.value })} />
                <textarea style={{ ...baseInput, minHeight: 50, resize: "vertical" }} placeholder="Significado" value={editando.significado} onChange={(e) => setEditando({ ...editando, significado: e.target.value })} />
                <textarea style={{ ...baseInput, minHeight: 40, resize: "vertical" }} placeholder="Etimología" value={editando.etimologia} onChange={(e) => setEditando({ ...editando, etimologia: e.target.value })} />
                <div style={{ display: "flex", gap: 8 }}>
                  <select style={{ flex: 1, ...baseInput, cursor: "pointer" }} value={editando.idioma_origen} onChange={(e) => setEditando({ ...editando, idioma_origen: e.target.value })}>
                    {IDIOMAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select style={{ flex: 1, ...baseInput, cursor: "pointer" }} value={editando.categoria} onChange={(e) => setEditando({ ...editando, categoria: e.target.value })}>
                    {CATEGORIAS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <textarea style={{ ...baseInput, minHeight: 40, resize: "vertical" }} placeholder="Ejemplos (uno por línea)" value={editando.ejemplos} onChange={(e) => setEditando({ ...editando, ejemplos: e.target.value })} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => actualizarPalabra(p.id)} className="admin-btn" style={{ background: "#2e7d32", color: "white", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>GUARDAR</button>
                  <button onClick={() => setEditandoId(null)} className="admin-btn-ghost" style={{ padding: "8px 14px", background: "white", border: "1px solid #ccc", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", color: "#555" }}>CANCELAR</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 600, fontSize: 15, color: "#1c1c18" }}>{p.palabra}</span>
                    {p.categoria && <span style={{ fontSize: 10, color: "#863819", background: "#86381915", padding: "1px 8px", borderRadius: 10, fontWeight: 600 }}>{p.categoria}</span>}
                    {p.idioma_origen && <span style={{ fontSize: 10, color: "#888", fontStyle: "italic" }}>{p.idioma_origen}</span>}
                  </div>
                  {p.significado && <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.4 }}>{p.significado}</div>}
                  {p.etimologia && <div style={{ fontSize: 11, color: "#aaa", marginTop: 3, lineHeight: 1.4 }}>📖 {p.etimologia}</div>}
                </div>
                <button onClick={() => startEdit(p)} className="admin-btn-ghost" style={styles.smallBtn("#863819")}>
                  <img src="/icons/edit.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: 4 }} alt="" />EDITAR
                </button>
                <button onClick={() => eliminarPalabra(p.id, p.palabra)} className="admin-btn-danger" style={styles.smallBtn("#c0392b")}>
                  <img src="/icons/delete.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: 4 }} alt="" />ELIMINAR
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
