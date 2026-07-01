import { FIELD_LABELS } from "./constants";
import { colorMapAdmin } from "./helpers";

export function RevisarModal({ sol, onClose }) {
  const actual = sol.entidad_actual || {};
  const datos = sol.datos || {};
  const changes = Object.keys(datos).filter((k) => {
    if (k === "multimedia" || k.endsWith("_custom")) return false;
    const current = actual[k] ?? "";
    const proposed = datos[k] ?? "";
    return String(current) !== String(proposed);
  });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ maxWidth: 720, width: "100%", maxHeight: "90vh", overflowY: "auto", background: "#fff", borderRadius: 16, padding: 32, fontFamily: "Epilogue, sans-serif" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: colorMapAdmin[sol.tipo] || "#555", textTransform: "uppercase", letterSpacing: "1px", margin: "0 0 4px" }}>{sol.tipo}</p>
            <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 700, color: "#1c1c18", margin: 0 }}>{sol.entidad_nombre}</h2>
            <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
              Solicitado por {sol.perfil_nombre || sol.perfil_email || "\u2014"} · {new Date(sol.created_at).toLocaleDateString("es-AR")}
            </p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#999", padding: 4, lineHeight: 1 }}>✕</button>
        </div>

        {changes.length === 0 ? (
          <p style={{ color: "#999", fontSize: 14 }}>No se detectaron cambios en los campos principales.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #eee" }}>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, width: "30%" }}>Campo</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, width: "35%" }}>Valor actual</th>
                <th style={{ textAlign: "left", padding: "8px 12px", color: "#888", fontWeight: 600, width: "35%" }}>Valor propuesto</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((k) => {
                const current = actual[k];
                const proposed = datos[k];
                const label = FIELD_LABELS[k] || k;
                const displayVal = (v) => {
                  if (v === null || v === undefined || v === "") return <span style={{ color: "#ccc", fontStyle: "italic" }}>vacío</span>;
                  if (k === "redes_sociales") {
                    try {
                      const parsed = typeof v === "string" ? JSON.parse(v) : v;
                      if (Array.isArray(parsed)) return parsed.map((c) => `${c.type}: ${c.value}`).join(" · ");
                    } catch {}
                    return String(v);
                  }
                  if (k === "localidad_id") return `ID: ${v}`;
                  if (k === "multimedia") return `${Array.isArray(v) ? v.length : 0} archivo(s)`;
                  if (k === "imagen" || k === "icono") return "(imagen)";
                  return String(v);
                };
                const isNew = current === null || current === undefined || current === "";
                return (
                  <tr key={k} style={{ borderBottom: "1px solid #f5f2eb" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#1c1c18" }}>{label}</td>
                    <td style={{ padding: "10px 12px", color: isNew ? "#ccc" : "#666", fontStyle: isNew ? "italic" : "normal" }}>
                      {displayVal(current)}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#2e7d32", background: "#f1f8e9" }}>
                      {displayVal(proposed)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {datos.multimedia && Array.isArray(datos.multimedia) && datos.multimedia.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: "#1c1c18", margin: "0 0 12px" }}>Multimedia nueva</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {datos.multimedia.filter((m) => m.url_recurso).map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "#fafaf8", borderRadius: 8, border: "1px solid #eee" }}>
                  {m.tipo_recurso === "foto" ? (
                    <img src={m.url_recurso} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }} />
                  ) : m.tipo_recurso === "video" ? (
                    <video src={m.url_recurso} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 4 }} />
                  ) : (
                    <div style={{ width: 48, height: 48, background: "#f5f2eb", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎵</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#1c1c18", margin: 0 }}>{m.titulo_alternativo || `Multimedia ${i + 1}`}</p>
                    <p style={{ fontSize: 11, color: "#999", margin: 0 }}>{m.tipo_recurso} · {m.descripcion_recurso || ""}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 32 }}>
          <button onClick={onClose} style={{
            fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
            border: "1px solid #ddd", background: "transparent", padding: "8px 16px",
            borderRadius: 8, color: "#555",
          }}>CERRAR</button>
        </div>
      </div>
    </div>
  );
}
