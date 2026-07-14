import { useState, useEffect } from "react";

const CAPA_LABELS = {
  reduccion: "Reducciones Jesuíticas",
  fortin: "Fortines",
  ruta_tanino: "Rutas del Tanino",
  ruta_algodon: "Rutas del Algodón",
  territorio: "Territorios Originarios",
};

const CAPA_OPTIONS = Object.entries(CAPA_LABELS).map(([value, label]) => ({
  value,
  label,
}));

const EMPTY = {
  capa: "reduccion",
  nombre: "",
  descripcion: "",
  año_desde: 1500,
  año_hasta: 1900,
  color: "#863819",
  geometry: null,
};

function authFetch(url, opts = {}) {
  const token = localStorage.getItem("made_in_chaco_token");
  return fetch(url, {
    ...opts,
    headers: {
      ...opts.headers,
      Authorization: `Bearer ${token}`,
      ...(opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    },
  });
}

export function CapasHistoricasView() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [geoInput, setGeoInput] = useState("");

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/capas-historicas/admin");
      if (res.ok) setItems(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const abrirNuevo = () => {
    setEditingId(null);
    setForm(EMPTY);
    setGeoInput("");
    setShowForm(true);
  };

  const abrirEditar = (item) => {
    setEditingId(item.id);
    setForm({
      capa: item.capa,
      nombre: item.nombre,
      descripcion: item.descripcion || "",
      año_desde: item.año_desde,
      año_hasta: item.año_hasta,
      color: item.color,
      geometry: item.geometry,
    });
    setGeoInput(item.geometry ? JSON.stringify(item.geometry, null, 2) : "");
    setShowForm(true);
  };

  const guardar = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      const body = {
        ...form,
        geometry: geoInput.trim() ? JSON.parse(geoInput) : null,
      };
      const url = editingId
        ? `/api/capas-historicas/admin/${editingId}`
        : "/api/capas-historicas/admin";
      const res = await authFetch(url, {
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        cargar();
      } else {
        const err = await res.json();
        alert(err.error || "Error al guardar");
      }
    } catch (e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (id, nombre) => {
    if (!window.confirm(`¿Eliminar "${nombre}"?`)) return;
    try {
      const res = await authFetch(`/api/capas-historicas/admin/${id}`, {
        method: "DELETE",
      });
      if (res.ok) cargar();
    } catch (e) {
      console.error(e);
    }
  };

  const formatGeometry = (g) => {
    if (!g) return "—";
    const type = g.type;
    switch (type) {
      case "Point":
        return `📍 ${g.coordinates.join(", ")}`;
      case "LineString":
        return `📏 ${g.coordinates.length} puntos`;
      case "Polygon":
        return `🔲 ${g.coordinates[0]?.length || 0} vértices`;
      case "MultiPolygon":
        return `🔳 ${g.coordinates.length} polígonos`;
      default:
        return type;
    }
  };

  if (showForm) {
    return (
      <div style={{ padding: 24, maxWidth: 640 }}>
        <h2 style={titleStyle}>
          {editingId ? "Editar" : "Nueva"} Capa Histórica
        </h2>

        <label style={labelStyle}>Tipo</label>
        <select
          value={form.capa}
          onChange={(e) => setForm({ ...form, capa: e.target.value })}
          style={inputStyle}
        >
          {CAPA_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <label style={labelStyle}>Nombre</label>
        <input
          value={form.nombre}
          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          style={inputStyle}
          placeholder="Ej: Reducción San Javier"
        />

        <label style={labelStyle}>Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          style={{ ...inputStyle, minHeight: 80, resize: "vertical" }}
          placeholder="Descripción del lugar..."
        />

        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Año desde</label>
            <input
              type="number"
              value={form.año_desde}
              onChange={(e) => setForm({ ...form, año_desde: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Año hasta</label>
            <input
              type="number"
              value={form.año_hasta}
              onChange={(e) => setForm({ ...form, año_hasta: Number(e.target.value) })}
              style={inputStyle}
            />
          </div>
        </div>

        <label style={labelStyle}>Color</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            style={{ width: 40, height: 36, padding: 0, border: "1px solid #ddd", borderRadius: 6, cursor: "pointer" }}
          />
          <span style={{ fontSize: 12, color: "#666", fontFamily: "monospace" }}>{form.color}</span>
        </div>

        <label style={labelStyle}>Geometría (GeoJSON)</label>
        <textarea
          value={geoInput}
          onChange={(e) => setGeoInput(e.target.value)}
          style={{ ...inputStyle, minHeight: 100, resize: "vertical", fontFamily: "monospace", fontSize: 11 }}
          placeholder='{"type":"Point","coordinates":[-60.5,-26.5]}'
        />

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={guardar} disabled={saving} style={btnPrimary}>
            {saving ? "Guardando..." : editingId ? "Actualizar" : "Crear"}
          </button>
          <button onClick={() => setShowForm(false)} style={btnSecondary}>
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={titleStyle}>Capas Históricas</h2>
        <button onClick={abrirNuevo} style={btnPrimary}>+ Nueva</button>
      </div>

      {loading ? (
        <p style={{ color: "#888", fontSize: 14 }}>Cargando...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#888", fontSize: 14 }}>No hay capas históricas. Creá una nueva.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #ddd" }}>
              <th style={thStyle}>Tipo</th>
              <th style={thStyle}>Nombre</th>
              <th style={thStyle}>Años</th>
              <th style={thStyle}>Color</th>
              <th style={thStyle}>Geometría</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={tdStyle}>
                  <span style={{
                    display: "inline-block",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: "#f0ece4",
                    color: "#5c4a3a",
                  }}>
                    {CAPA_LABELS[item.capa] || item.capa}
                  </span>
                </td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{item.nombre}</td>
                <td style={tdStyle}>
                  {item.año_desde}{item.año_hasta && item.año_hasta !== item.año_desde ? ` - ${item.año_hasta}` : ""}
                </td>
                <td style={tdStyle}>
                  <span style={{
                    display: "inline-block",
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    background: item.color,
                    border: "1px solid #ddd",
                    verticalAlign: "middle",
                  }} />
                </td>
                <td style={{ ...tdStyle, fontSize: 11, color: "#888" }}>
                  {formatGeometry(item.geometry)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  <button onClick={() => abrirEditar(item)} style={actionBtn}>Editar</button>
                  <button onClick={() => eliminar(item.id, item.nombre)} style={{ ...actionBtn, color: "#d32f2f" }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const titleStyle = {
  fontFamily: "Cinzel, serif",
  fontSize: 20,
  fontWeight: 700,
  color: "#2d1a12",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  color: "#555",
  marginTop: 12,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid #ddd",
  borderRadius: 6,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  background: "#fff",
  color: "#1c1c18",
};

const btnPrimary = {
  padding: "8px 20px",
  fontSize: 13,
  fontWeight: 700,
  border: "none",
  borderRadius: 6,
  background: "#863819",
  color: "#fff",
  cursor: "pointer",
  fontFamily: "Epilogue, sans-serif",
  letterSpacing: "0.5px",
};

const btnSecondary = {
  padding: "8px 20px",
  fontSize: 13,
  fontWeight: 600,
  border: "1px solid #ddd",
  borderRadius: 6,
  background: "#fff",
  color: "#555",
  cursor: "pointer",
  fontFamily: "Epilogue, sans-serif",
};

const thStyle = {
  padding: "8px 10px",
  textAlign: "left",
  fontWeight: 700,
  color: "#888",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle = {
  padding: "10px",
  verticalAlign: "middle",
  color: "#1c1c18",
};

const actionBtn = {
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 600,
  border: "none",
  borderRadius: 4,
  background: "transparent",
  color: "#863819",
  cursor: "pointer",
  marginLeft: 4,
  fontFamily: "Epilogue, sans-serif",
};
