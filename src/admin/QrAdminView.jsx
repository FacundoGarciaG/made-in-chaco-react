import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";
import "../styles/QrPrint.css";

const TIPO_COLOR = {
  comercio: "#2196f3", gastronomia: "#863819", artesano: "#c62828",
  productor: "#2e7d32", patrimonio: "#1565c0", experiencia: "#6a1b9a",
  hospedaje: "#e65100", evento: "#ad1457", lugar_natural: "#00838f",
  espacio_cultural: "#4e342e", comunidad_indigena: "#bf360c",
  personalidad: "#4527a0", relato: "#283593",
};

const TIPOS_LABEL = {
  comercio: "Comercio", gastronomia: "Gastronomía", artesano: "Artesano",
  productor: "Productor", patrimonio: "Patrimonio", experiencia: "Experiencia",
  hospedaje: "Hospedaje", evento: "Evento", lugar_natural: "Lugar Natural",
  espacio_cultural: "Espacio Cultural", comunidad_indigena: "Comunidad Indígena",
  personalidad: "Personalidad", relato: "Relato",
};

export const QrAdminView = ({ entidades }) => {
  const [entidadSeleccionada, setEntidadSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");
  const printRef = useRef(null);

  const entidadesAprobadas = entidades.filter((e) => e.estado_sello === "aprobado");

  const entidadesFiltradas = entidadesAprobadas.filter((e) => {
    const matchBusqueda = !busqueda || e.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const matchTipo = !filtroTipo || e.tipo === filtroTipo;
    return matchBusqueda && matchTipo;
  });

  const tipos = [...new Set(entidadesAprobadas.map((e) => e.tipo))].sort();

  const handlePrint = () => {
    if (!entidadSeleccionada) return;
    window.print();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 22, fontWeight: 700, color: "#1c1c18", margin: 0 }}>
          Códigos QR ({entidadesAprobadas.length})
        </h2>
      </div>

      <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px", lineHeight: 1.5 }}>
        Seleccioná una entidad para generar y descargar su código QR. Imprimí la hoja A4 y pegala en tu local.
      </p>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input
          style={{
            padding: "8px 12px", border: "1px solid #e0ddd5", borderRadius: 8,
            fontSize: 13, fontFamily: "inherit", background: "white",
            outline: "none", boxSizing: "border-box", flex: 1, minWidth: 180,
          }}
          placeholder="Buscar por nombre..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          style={{
            padding: "8px 12px", border: "1px solid #e0ddd5", borderRadius: 8,
            fontSize: 13, fontFamily: "inherit", background: "white",
            outline: "none", boxSizing: "border-box", width: 170, cursor: "pointer",
          }}
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>{TIPOS_LABEL[t] || t}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 24, flex: 1, minHeight: 0 }}>
        {/* Entity list */}
        <div style={{
          flex: "0 0 320px", overflowY: "auto",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {entidadesFiltradas.length === 0 && (
            <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: 32 }}>
              No se encontraron entidades
            </p>
          )}
          {entidadesFiltradas.map((e) => {
            const isSelected = entidadSeleccionada?.id === e.id;
            const catColor = TIPO_COLOR[e.tipo] || "#863819";
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setEntidadSeleccionada(isSelected ? null : e)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", border: `2px solid ${isSelected ? catColor : "#e8e4da"}`,
                  borderRadius: 10, background: isSelected ? `${catColor}08` : "#fcf9f4",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  transition: "all 0.15s ease", flexShrink: 0,
                }}
              >
                <img
                  src={e.icono || `/icons/${e.tipo}.png`}
                  alt=""
                  style={{ width: 22, height: 22, borderRadius: 4, objectFit: "contain" }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: "block", fontSize: 13, fontWeight: 600, color: "#1c1c18",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {e.nombre}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: catColor,
                    letterSpacing: "0.04em", textTransform: "uppercase",
                  }}>
                    {TIPOS_LABEL[e.tipo] || e.tipo}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* QR preview + A4 */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20 }}>
          {entidadSeleccionada ? (
            <>
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                padding: "28px 24px", background: "#fcf9f4", border: "1px solid #e0dcd0",
                borderRadius: 16, gap: 16, width: "100%", maxWidth: 360,
              }}>
                <img
                  src={entidadSeleccionada.icono || `/icons/${entidadSeleccionada.tipo}.png`}
                  alt=""
                  style={{ width: 28, height: 28, borderRadius: 5, objectFit: "contain" }}
                />
                <h3 style={{
                  fontFamily: "'Cinzel', serif", fontSize: 17, fontWeight: 700,
                  color: "#1c1c18", margin: 0, textAlign: "center",
                }}>
                  {entidadSeleccionada.nombre}
                </h3>
                <div style={{
                  padding: "3px 10px", borderRadius: 20,
                  background: `${TIPO_COLOR[entidadSeleccionada.tipo] || "#863819"}15`,
                  fontSize: 10, fontWeight: 700, color: TIPO_COLOR[entidadSeleccionada.tipo] || "#863819",
                  letterSpacing: "0.04em", textTransform: "uppercase",
                }}>
                  {TIPOS_LABEL[entidadSeleccionada.tipo] || entidadSeleccionada.tipo}
                </div>

                {/* QR */}
                <div style={{
                  padding: 16, background: "#fff", borderRadius: 14,
                  border: "1px solid #e0dcd0", boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
                }}>
                  <QRCodeSVG
                    value={`${window.location.origin}/qr/${entidadSeleccionada.slug}`}
                    size={180}
                    bgColor="#ffffff"
                    fgColor="#1c1c18"
                    level="H"
                    includeMargin={false}
                  />
                </div>

                <p style={{ fontSize: 12, color: "#888", textAlign: "center", margin: 0, lineHeight: 1.5 }}>
                  /qr/{entidadSeleccionada.slug}
                </p>

                {/* Print button */}
                <button
                  onClick={handlePrint}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    width: "100%", padding: "12px 20px", border: "none", borderRadius: 10,
                    background: "#863819", color: "#fff", fontFamily: "'Cinzel', serif",
                    fontSize: 14, fontWeight: 700, cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#6b2d13"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "#863819"; }}
                >
                  Imprimir hoja A4
                </button>
              </div>

            </>
          ) : (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "60px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}>◇</div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#1c1c18", margin: "0 0 6px", fontFamily: "'Cinzel', serif" }}>
                Seleccioná una entidad
              </p>
              <p style={{ fontSize: 13, color: "#1c1c18", margin: 0, lineHeight: 1.5, maxWidth: 260 }}>
                Elegí una entidad de la lista para generar y descargar su código QR
              </p>
            </div>
          )}
        </div>
      </div>

      {/* A4 print sheet — portal to body so admin overflow doesn't break position:fixed */}
      {entidadSeleccionada && createPortal(
        <div className="qr-print-a4" ref={printRef}>
          <div className="qr-print-a4-bar" />

          <div className="qr-print-a4-hero">
            <img
              className="qr-print-a4-hero-img"
              src="/imagenes/logo-madeinchaco.png"
              alt="Made in Chaco"
            />
            <span className="qr-print-a4-brand-sub">Hecho en Chaco · Hecho con orgullo</span>
          </div>

          <div className="qr-print-a4-content">
            <img
              className="qr-print-a4-entity-icon"
              src={entidadSeleccionada.icono || `/icons/${entidadSeleccionada.tipo}.png`}
              alt=""
            />
            <h2 className="qr-print-a4-entity-name">{entidadSeleccionada.nombre}</h2>
            <span
              className="qr-print-a4-entity-type"
              style={{ background: TIPO_COLOR[entidadSeleccionada.tipo] || "#863819" }}
            >
              {TIPOS_LABEL[entidadSeleccionada.tipo] || entidadSeleccionada.tipo}
            </span>

            <div className="qr-print-a4-qr-section">
              <div className="qr-print-a4-qr-corners">
                <span /><span /><span /><span />
              </div>
              <div className="qr-print-a4-qr-frame">
                <QRCodeSVG
                  value={`${window.location.origin}/qr/${entidadSeleccionada.slug}`}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#1c1c18"
                  level="H"
                  includeMargin={false}
                />
              </div>
            </div>

            {entidadSeleccionada.resumen && (
              <p className="qr-print-a4-entity-summary">
                {entidadSeleccionada.resumen}
              </p>
            )}

            <p className="qr-print-a4-scan-text">Escaneá el código para conocer mi historia</p>
            <p className="qr-print-a4-scan-sub">Descubrí productos, sabores y experiencias únicas del Chaco</p>
          </div>

          <div className="qr-print-a4-footer">
            <span className="qr-print-a4-footer-line" />
            <span className="qr-print-a4-footer-text">Made in Chaco</span>
            <span className="qr-print-a4-footer-dot" />
            <span className="qr-print-a4-footer-text">www.madeinchaco.com.ar</span>
            <span className="qr-print-a4-footer-line" />
          </div>

          <div className="qr-print-a4-bar" />
        </div>,
        document.body
      )}
    </div>
  );
};
