import { useState, useEffect, useCallback } from "react";
import { styles, colorMapAdmin, authHeaders } from "./helpers";

export function DashboardView({ authFetch }) {
  const [resumen, setResumen] = useState(null);
  const [diario, setDiario] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const cargarDatos = useCallback(async () => {
    try {
      const [r, d] = await Promise.all([
        authFetch("/api/analytics/resumen", { headers: authHeaders() }),
        authFetch("/api/analytics/diario?dias=30", { headers: authHeaders() }),
      ]);
      if (r.ok) setResumen(await r.json());
      if (d.ok) setDiario(await d.json());
    } catch { /* ignore */ }
  }, [authFetch]);

  useEffect(() => {
    cargarDatos();
    const timeout = setTimeout(() => {
      setResumen((prev) => prev ?? { totales: 0, hoy: 0, semana: 0, mes: 0, porTipo: [], top10: [] });
      setDiario((prev) => prev ?? []);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [cargarDatos]);

  if (!resumen) {
    return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Cargando dashboard…</div>;
  }

  const maxVisitas = Math.max(...(resumen.top10?.map((e) => e.visitas) || [1]));
  const maxDiario = Math.max(...(diario?.map((d) => d.total) || [1]));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
          Dashboard
        </h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Visitas totales", value: resumen.totales },
          { label: "Hoy", value: resumen.hoy },
          { label: "Última semana", value: resumen.semana },
          { label: "Último mes", value: resumen.mes },
        ].map((s) => (
          <div key={s.label} style={{
            background: "white", borderRadius: 12, border: "1px solid #eee",
            padding: "20px 24px",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#863819", marginBottom: 8, letterSpacing: "0.5px" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#1c1c18" }}>
              {s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#863819", margin: "0 0 16px", letterSpacing: "0.5px" }}>
            Top 10 entidades más visitadas
          </h3>
          {resumen.top10?.length === 0 ? (
            <div style={{ color: "#888", fontSize: 13 }}>Sin datos aún</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {resumen.top10?.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 700,
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    background: colorMapAdmin[e.tipo] || "#888",
                  }}>
                    {e.visitas}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.nombre}
                  </div>
                  <div style={{ width: "60%", background: "#f0ede8", borderRadius: 6, height: 10, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 6,
                      background: colorMapAdmin[e.tipo] || "#888",
                      width: `${(e.visitas / maxVisitas) * 100}%`,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#863819", margin: "0 0 16px", letterSpacing: "0.5px" }}>
            Eventos por tipo
          </h3>
          {resumen.porTipo?.length === 0 ? (
            <div style={{ color: "#888", fontSize: 13 }}>Sin datos aún</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {resumen.porTipo?.map((t, i) => {
                const colors = ["#863819", "#d4a017", "#4caf50", "#2196f3", "#9c27b0", "#e91e63", "#ff5722", "#795548"];
                const max = Math.max(...resumen.porTipo.map((x) => x.cantidad));
                return (
                  <div key={t.tipo} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: "#333" }}>{t.tipo.replace(/_/g, " ")}</div>
                    <div style={{ width: "50%", background: "#f0ede8", borderRadius: 6, height: 10, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 6,
                        background: colors[i % colors.length],
                        width: `${(t.cantidad / max) * 100}%`,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#555", minWidth: 32, textAlign: "right" }}>
                      {t.cantidad}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20, marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#863819", margin: "0 0 16px", letterSpacing: "0.5px" }}>
          Visitas diarias (últimos 30 días)
        </h3>
        {!diario || diario.length === 0 ? (
          <div style={{ color: "#888", fontSize: 13 }}>Sin datos aún</div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140, paddingTop: 8 }}>
            {diario.map((d, i) => (
              <div
                key={d.fecha}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {hoverIdx === i && d.total > 0 && (
                  <div style={{
                    position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                    background: "#1c1c18", color: "white", fontSize: 11, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 10,
                    pointerEvents: "none", marginBottom: 4,
                  }}>
                    {d.total} visita{d.total !== 1 ? "s" : ""}
                  </div>
                )}
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0",
                  background: "#863819",
                  height: `${(d.total / maxDiario) * 100}%`,
                  minHeight: d.total > 0 ? 4 : 0,
                  transition: "height 0.3s ease",
                  opacity: hoverIdx === i ? 1 : 0.8,
                }} />
                <div style={{ fontSize: 9, color: "#888", transform: "rotate(-45deg)", whiteSpace: "nowrap", marginTop: 4 }}>
                  {new Date(d.fecha).toLocaleDateString("es", { day: "2-digit", month: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
