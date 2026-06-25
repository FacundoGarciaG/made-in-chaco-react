import { useState, useCallback, useEffect } from "react";
import { styles, colorMapAdmin } from "./helpers";

export function UsuariosView({ authFetch, authHeaders, showConfirm, showPopup, onEditEntity }) {
  const [perfiles, setPerfiles] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async (q) => {
    setLoading(true);
    try {
      const url = q ? `/api/admin/perfiles?search=${encodeURIComponent(q)}` : "/api/admin/perfiles";
      const res = await authFetch(url, { headers: authHeaders() });
      if (res.ok) setPerfiles(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [authFetch, authHeaders]);

  useEffect(() => { cargar(); }, [cargar]);

  const verDetalle = async (id) => {
    try {
      const res = await authFetch(`/api/admin/perfiles/${id}`, { headers: authHeaders() });
      if (res.ok) setSelected(await res.json());
    } catch {}
  };

  const toggleBan = async (perfil, baneado) => {
    const accion = baneado ? "BANEAR" : "DESBANEAR";
    const msg = baneado
      ? `¿Banear a "${perfil.nombre || perfil.email}"? No podrá iniciar sesión ni acceder al sistema.\n\nEscribí su email para confirmar.`
      : `¿Desbanear a "${perfil.nombre || perfil.email}"? Recuperará el acceso al sistema.`;
    const ok = await showConfirm(msg, accion, baneado ? perfil.email : null);
    if (!ok) return;
    try {
      const res = await authFetch(`/api/admin/perfiles/${perfil.id}/ban`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ baneado }),
      });
      if (res.ok) {
        const updated = await res.json();
        showPopup(baneado ? "Usuario baneado" : "Usuario desbaneado");
        setPerfiles((prev) => prev.map((p) => p.id === updated.id ? { ...p, baneado: updated.baneado } : p));
        if (selected && selected.perfil.id === updated.id) {
          setSelected((prev) => ({ ...prev, perfil: { ...prev.perfil, baneado: updated.baneado } }));
        }
      }
    } catch {}
  };

  if (selected) {
    const { perfil, entidades } = selected;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <button onClick={() => setSelected(null)} style={{
            background: "none", border: "none", cursor: "pointer", fontSize: "20px", color: "#888", padding: "4px 8px",
          }}>←</button>
          <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
            <img src="/icons/user.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
            {perfil.nombre || "Sin nombre"}
          </h2>
        </div>

        <div style={{ display: "flex", gap: "24px", flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, background: "white", borderRadius: "12px", padding: "24px", border: "1px solid #eee" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
              {perfil.avatar_url ? (
                <img src={perfil.avatar_url} alt="" style={{ width: "80px", height: "80px", borderRadius: "50%", objectFit: "cover", border: "2px solid #f0ede8" }} />
              ) : (
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", color: "#999" }}>👤</div>
              )}
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "20px", fontWeight: 700, color: "#1c1c18" }}>{perfil.nombre || "Sin nombre"}</span>
                  {perfil.baneado && (
                    <span style={{ fontSize: "10px", fontWeight: 700, background: "#c62828", color: "#fff", padding: "2px 10px", borderRadius: "10px" }}>BANEADO</span>
                  )}
                  {perfil.verified ? (
                    <span style={{ fontSize: "10px", fontWeight: 700, background: "#2e7d32", color: "#fff", padding: "2px 10px", borderRadius: "10px" }}>VERIFICADO</span>
                  ) : (
                    <span style={{ fontSize: "10px", fontWeight: 700, background: "#f39c12", color: "#fff", padding: "2px 10px", borderRadius: "10px" }}>NO VERIFICADO</span>
                  )}
                </div>
                <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>{perfil.email}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 24px" }}>
              {[
                { label: "Email", val: perfil.email },
                { label: "Profesión", val: perfil.profesion || "—" },
                { label: "País", val: perfil.pais || "—" },
                { label: "Provincia", val: perfil.provincia || "—" },
                { label: "Localidad", val: perfil.localidad || "—" },
                { label: "Nacionalidad", val: perfil.nacionalidad || "—" },
                { label: "Sexo", val: perfil.sexo || "—" },
                { label: "Fecha de nacimiento", val: perfil.fecha_nacimiento ? new Date(perfil.fecha_nacimiento).toLocaleDateString("es-AR") : "—" },
                { label: "WhatsApp", val: perfil.whatsapp || "—" },
                { label: "Bio", val: perfil.bio || "—", fullWidth: true },
                { label: "Google ID", val: perfil.google_id || "—" },
                { label: "Registrado", val: perfil.created_at ? new Date(perfil.created_at).toLocaleDateString("es-AR") : "—" },
                { label: "Actualizado", val: perfil.updated_at ? new Date(perfil.updated_at).toLocaleDateString("es-AR") : "—" },
              ].map((f) => (
                <div key={f.label} style={f.fullWidth ? { gridColumn: "1 / -1" } : {}}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.3px" }}>{f.label}</div>
                  <div style={{ fontSize: "14px", color: "#000", wordBreak: "break-word" }}>{f.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: "8px", marginTop: "24px", flexWrap: "wrap" }}>
              <a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(perfil.email)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "#863819", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", textDecoration: "none", fontFamily: "inherit" }}>
                <img src="/icons/mail.png" style={{ width: "16px", height: "16px", filter: "brightness(0) invert(1)" }} alt="" />
                ENVIAR EMAIL
              </a>
              {perfil.whatsapp && (
                <a href={`https://wa.me/${perfil.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "#25D366", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", textDecoration: "none", fontFamily: "inherit" }}>
                  <img src="/icons/whatsapp.png" style={{ width: "16px", height: "16px", filter: "brightness(0) invert(1)" }} alt="" />
                  WHATSAPP
                </a>
              )}
              {perfil.baneado ? (
                <button onClick={() => toggleBan(perfil, false)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "#2e7d32", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  DESBANEAR
                </button>
              ) : (
                <button onClick={() => toggleBan(perfil, true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 20px", background: "#c62828", color: "#fff", border: "none", borderRadius: "10px", fontSize: "13px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  <img src="/icons/delete.png" style={{ width: "16px", height: "16px", filter: "brightness(0) invert(1)" }} alt="" />
                  BANEAR
                </button>
              )}
            </div>
          </div>

          <div style={{ width: "360px", minWidth: "300px", background: "white", borderRadius: "12px", padding: "20px", border: "1px solid #eee", display: "flex", flexDirection: "column" }}>
            <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: "16px" }}>
              Entidades ({entidades.length})
            </h3>
            <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {entidades.length === 0 ? (
                <p style={{ color: "#aaa", fontSize: "13px", textAlign: "center", padding: "20px 0" }}>No tiene entidades.</p>
              ) : (
                entidades.map((ent) => (
                  <a
                    key={ent.id}
                    href={`/entidad/${ent.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div style={{
                      padding: "12px", border: "1px solid #f0ede8", borderRadius: "8px", marginBottom: "8px",
                      background: ent.visible ? "#fff" : "#f9f9f9", opacity: ent.visible ? 1 : 0.6,
                      cursor: "pointer", transition: "box-shadow 0.15s",
                    }}
                      onMouseEnter={(e) => { if (ent.visible) e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "10px", fontWeight: 700, color: colorMapAdmin[ent.tipo] || "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {ent.tipo}
                        </span>
                        {!ent.visible && (
                          <span style={{ fontSize: "9px", fontWeight: 700, background: "#f39c12", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>OCULTA</span>
                        )}
                        {ent.estado_sello === "aprobado" && (
                          <span style={{ fontSize: "9px", fontWeight: 700, background: "#2e7d32", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>SELLO</span>
                        )}
                        {ent.estado_pago === "atrasado" && (
                          <span style={{ fontSize: "9px", fontWeight: 700, background: "#c62828", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>DEUDA</span>
                        )}
                        {ent.estado_pago === "reembolso_solicitado" && (
                          <span style={{ fontSize: "9px", fontWeight: 700, background: "#e65100", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>DEVOLUCIÓN</span>
                        )}
                        {ent.fecha_fin_suscripcion && (() => {
                          try {
                            const d = new Date();
                            const hoy = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                            const fin = ent.fecha_fin_suscripcion.split('T')[0];
                            if (fin < hoy) return <span style={{ fontSize: "9px", fontWeight: 700, background: "#c62828", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>VENCIDA</span>;
                          } catch {}
                          return null;
                        })()}
                        {ent.fecha_fin_suscripcion && ent.estado_pago === "al_dia" && (() => {
                          try {
                            const d = new Date();
                            const hoy = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                            const fin = ent.fecha_fin_suscripcion.split('T')[0];
                            const diff = Math.ceil((new Date(fin + 'T23:59:59') - new Date(hoy + 'T00:00:00')) / 86400000);
                            if (diff >= 0 && diff <= 30) return <span style={{ fontSize: "9px", fontWeight: 700, background: "#f39c12", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>PRÓXIMO A VENCER ({diff}d)</span>;
                          } catch {}
                          return null;
                        })()}
                        {ent.tipo === "evento" && ent.fecha_evento && (() => {
                          try {
                            const d = new Date();
                            const hoy = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                            const fe = ent.fecha_evento.split('T')[0];
                            if (fe < hoy) return <span style={{ fontSize: "9px", fontWeight: 700, background: "#e74c3c", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>VENCIDO</span>;
                            const diff = Math.ceil((new Date(fe + 'T23:59:59') - new Date(hoy + 'T00:00:00')) / 86400000);
                            if (diff <= 7) return <span style={{ fontSize: "9px", fontWeight: 700, background: "#f39c12", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>PRONTO ({diff}d)</span>;
                            return <span style={{ fontSize: "9px", fontWeight: 700, background: "#2e7d32", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>FALTAN {diff}d</span>;
                          } catch {}
                          return null;
                        })()}
                      </div>
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "#1c1c18", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                        {ent.nombre}
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEditEntity(ent.id); }}
                          style={{
                            padding: "4px 10px", background: "transparent", color: "#863819",
                            border: "1px solid #863819", borderRadius: "6px", fontSize: "10px",
                            fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                            whiteSpace: "nowrap", transition: "0.15s",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "#863819"; e.currentTarget.style.color = "white"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#863819"; }}
                        >
                          EDITAR
                        </button>
                      </div>
                      <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                        {new Date(ent.created_at).toLocaleDateString("es-AR")}
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={styles.sectionTitle}>
          <img src="/icons/user.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
          Usuarios
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") cargar(search); }}
            style={{
              padding: "8px 14px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "13px",
              outline: "none", width: "260px", fontFamily: "inherit",
            }}
          />
          <button onClick={() => cargar(search)} className="admin-btn" style={{ background: "#d4a017", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <img src="/icons/refresh.png" style={{ width: "14px", height: "14px" }} alt="" />
            BUSCAR
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando...</p>
      ) : perfiles === null ? (
        <p style={{ color: "#aaa", fontSize: 13 }}>Cargando...</p>
      ) : perfiles.length === 0 ? (
        <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No hay usuarios registrados.</p>
      ) : (
        <div style={{ background: "white", borderRadius: "12px", border: "1px solid #eee", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 1.2fr 0.8fr 0.8fr 0.6fr 80px", gap: "16px", padding: "16px 16px 9px", fontWeight: 800, fontSize: "13px", textTransform: "uppercase", borderBottom: "1px solid #d4cfc4", background: "#f0ede8", borderRadius: "8px 8px 0 0", alignItems: "center" }}>
            <div></div>
            <div style={{ color: "#1c1c18" }}>Nombre</div>
            <div style={{ color: "#1c1c18" }}>Email</div>
            <div style={{ color: "#1c1c18" }}>Localidad</div>
            <div style={{ color: "#1c1c18" }}>Registro</div>
            <div style={{ color: "#1c1c18" }}>Entidades</div>
            <div></div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "8px 16px 16px" }}>
            {perfiles.map((p) => (
              <div
                key={p.id}
                onClick={() => verDetalle(p.id)}
                style={{
                  display: "grid", gridTemplateColumns: "40px 1fr 1.2fr 0.8fr 0.8fr 0.6fr 80px", gap: "16px",
                  padding: "12px 0", fontSize: "14px", borderBottom: "1px solid #f5f2eb", alignItems: "center",
                  cursor: "pointer", transition: "background 0.1s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "#fafaf8"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div>
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }} />
                  ) : (
                    <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", color: "#999" }}>👤</div>
                  )}
                </div>
                <div style={{ fontWeight: 600, color: "#1c1c18", display: "flex", alignItems: "center", gap: "6px" }}>
                  {p.nombre || "Sin nombre"}
                  {p.baneado && <span style={{ fontSize: "9px", fontWeight: 700, background: "#c62828", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>B</span>}
                  {p.verified && <span style={{ fontSize: "9px", fontWeight: 700, background: "#2e7d32", color: "#fff", padding: "1px 6px", borderRadius: "6px" }}>V</span>}
                </div>
                <div style={{ color: "#666", fontSize: "13px" }}>{p.email}</div>
                <div style={{ color: "#888", fontSize: "13px" }}>{p.localidad || "—"}</div>
                <div style={{ color: "#888", fontSize: "13px" }}>{p.created_at ? new Date(p.created_at).toLocaleDateString("es-AR") : "—"}</div>
                <div style={{ color: "#888", fontSize: "13px", textAlign: "center" }}>{p.entidades_count}</div>
                <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  <a href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(p.email)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", background: "#f0ede8", cursor: "pointer", textDecoration: "none" }}
                    title="Enviar email por Gmail"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img src="/icons/mail.png" style={{ width: "16px", height: "16px" }} alt="email" />
                  </a>
                  {p.whatsapp && (
                    <a href={`https://wa.me/${p.whatsapp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "8px", background: "#25D366", cursor: "pointer", textDecoration: "none" }}
                      title="Enviar WhatsApp"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img src="/icons/whatsapp.png" style={{ width: "16px", height: "16px", filter: "brightness(0) invert(1)" }} alt="whatsapp" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
