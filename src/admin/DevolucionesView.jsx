import { useState, useEffect, useCallback } from "react";
import { styles, colorMapAdmin, parseSocialList, authHeaders } from "./helpers";
import { SOCIAL_PLATFORMS } from "./constants";
import { optimizarUrlCloudinary } from "../utils/imageUrl";

export function DevolucionesView({ authFetch, authHeaders, colorMapAdmin, setPendingDevoluciones, cargarEntidades, showPopup, showConfirm }) {
  const [devoluciones, setDevoluciones] = useState(null);
  const [detalleEntity, setDetalleEntity] = useState(null);

  const cargarDevoluciones = useCallback(async () => {
    try {
      const res = await authFetch("/api/suscripciones/devoluciones", { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setDevoluciones(data); setPendingDevoluciones(data.length); }
    } catch {}
  }, [authFetch, authHeaders, setPendingDevoluciones]);

  useEffect(() => { cargarDevoluciones(); }, [cargarDevoluciones]);

  const verDetalle = async (id) => {
    try {
      const res = await authFetch(`/api/entidades/${id}`);
      if (res.ok) { setDetalleEntity(await res.json()); }
    } catch {}
  };

  const aprobar = async (id, nombre) => {
    const ok = await showConfirm(`¿Aprobar devolución de "${nombre}"? La suscripción se cancelará.`, "APROBAR");
    if (!ok) return;
    const res = await authFetch(`/api/suscripciones/aprobar-devolucion/${id}`, {
      method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
    });
    if (res.ok) {
      showPopup(`Devolución de "${nombre}" aprobada`);
      setDetalleEntity(null);
      cargarDevoluciones();
      cargarEntidades();
    } else {
      const d = await res.json().catch(() => ({}));
      showPopup(d.error || "Error al aprobar", "error");
    }
  };

  const rechazar = async (id, nombre) => {
    const ok = await showConfirm(`¿Rechazar devolución de "${nombre}"? La suscripción seguirá activa.`, "RECHAZAR");
    if (!ok) return;
    const res = await authFetch(`/api/suscripciones/rechazar-devolucion/${id}`, {
      method: "POST", headers: authHeaders({ "Content-Type": "application/json" }),
    });
    if (res.ok) {
      showPopup(`Devolución de "${nombre}" rechazada`);
      setDetalleEntity(null);
      cargarDevoluciones();
      cargarEntidades();
    } else {
      const d = await res.json().catch(() => ({}));
      showPopup(d.error || "Error al rechazar", "error");
    }
  };

  const label = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");

  const camposEntidad = (e) => {
    const campos = [
      { label: "Nombre", val: e.nombre },
      { label: "Tipo", val: e.tipo },
      { label: "Plan", val: e.plan_tipo || "\u2014" },
      { label: "Vigencia", val: e.fecha_inicio_suscripcion && e.fecha_fin_suscripcion
        ? `Del ${new Date(e.fecha_inicio_suscripcion).toLocaleDateString("es-AR")} al ${new Date(e.fecha_fin_suscripcion).toLocaleDateString("es-AR")}`
        : "\u2014" },
      { label: "Email", val: e.email || "\u2014" },
      { label: "Razón social", val: e.razon_social || "\u2014" },
      { label: "CUIT", val: e.cuit || "\u2014" },
      { label: "Resumen", val: e.resumen || "\u2014" },
      { label: "Dirección", val: e.direccion_escrita || "\u2014" },
      { label: "Sitio web", val: e.sitio_web || "\u2014" },
    ];
    if (e.tipo === "comercio") {
      campos.push({ label: "Rubro", val: e.rubro_especifico || "\u2014" });
      campos.push({ label: "Horario", val: `${e.horario_apertura || "?"} \u2013 ${e.horario_cierre || "?"}` });
    }
    if (e.tipo === "hospedaje") {
      campos.push({ label: "Categoría", val: e.categoria_hospedaje || "\u2014" });
      campos.push({ label: "Servicios", val: e.servicios || "\u2014" });
    }
    if (e.tipo === "productor") {
      campos.push({ label: "Producto", val: e.tipo_producto || "\u2014" });
    }
    if (e.tipo === "evento") {
      campos.push({ label: "Fecha evento", val: e.fecha_evento ? new Date(e.fecha_evento).toLocaleDateString("es-AR") : "\u2014" });
    }
    return campos;
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={styles.sectionTitle}>
          <img src="/icons/mail.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
          Devoluciones solicitadas
        </h2>
      </div>
      {devoluciones === null ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando...</p>
      ) : devoluciones.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No hay solicitudes de devolución pendientes.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {devoluciones.map((e) => (
            <div key={e.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", border: "1px solid #eee", borderRadius: 12,
              background: "#fff",
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: colorMapAdmin[e.tipo] || "#555", textTransform: "uppercase", letterSpacing: "1px" }}>{e.tipo}</span>
                </div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#1c1c18", margin: "0 0 4px" }}>{e.nombre}</p>
                <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                  {e.perfil_nombre || e.perfil_email} — {e.plan_tipo || "Sin plan"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => verDetalle(e.id)}
                  style={{ padding: "8px 16px", background: "transparent", color: "#555", border: "1px solid #ddd", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  VER
                </button>
                <button onClick={() => aprobar(e.id, e.nombre)}
                  style={{ padding: "8px 16px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  APROBAR
                </button>
                <button onClick={() => rechazar(e.id, e.nombre)}
                  style={{ padding: "8px 16px", background: "#c62828", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  RECHAZAR
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detalleEntity && (() => {
        const e = detalleEntity;
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
            onClick={() => setDetalleEntity(null)}
          >
            <div style={{ background: "white", borderRadius: "16px", padding: "28px", maxWidth: "560px", width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: 0, fontSize: "20px" }}>
                  Detalle de entidad
                </h3>
                <button onClick={() => setDetalleEntity(null)}
                  style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", padding: "4px 8px", borderRadius: "6px" }}>
                  ✕
                </button>
              </div>

              {e.imagen && (
                <img src={optimizarUrlCloudinary(e.imagen)} alt="" loading="lazy" style={{ width: "100%", height: "160px", borderRadius: 12, objectFit: "cover", marginBottom: 16, border: "1px solid #eee" }} />
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 16px" }}>
                {camposEntidad(e).map((c) => (
                  <div key={c.label}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.3px" }}>{c.label}</div>
                    <div style={{ fontSize: "13px", color: "#000", wordBreak: "break-word" }}>{c.val}</div>
                  </div>
                ))}
              </div>

              {e.redes_sociales && (() => {
                const items = parseSocialList(e.redes_sociales);
                if (items.length === 0) return null;
                return (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: 4 }}>Redes sociales</div>
                    {items.map((item, i) => {
                      const platform = SOCIAL_PLATFORMS.find((p) => p.value === item.type) || SOCIAL_PLATFORMS.find((p) => p.value === "otro");
                      return (
                        <div key={i} style={{ fontSize: "13px", color: "#000", marginBottom: 2 }}>
                          <span style={{ fontWeight: 600, color: "#555" }}>{platform ? platform.label : item.type}: </span>
                          <span style={{ color: "#000" }}>{item.value}</span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "center" }}>
                <button onClick={() => { setDetalleEntity(null); }} style={{ padding: "8px 18px", background: "white", color: "#555", border: "1px solid #ccc", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  CANCELAR
                </button>
                <button onClick={() => aprobar(e.id, e.nombre)} style={{ padding: "8px 18px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  APROBAR DEVOLUCIÓN
                </button>
                <button onClick={() => rechazar(e.id, e.nombre)} style={{ padding: "8px 18px", background: "#c62828", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  RECHAZAR
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
