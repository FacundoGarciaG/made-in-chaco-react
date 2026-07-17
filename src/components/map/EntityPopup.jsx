import { optimizarUrlCloudinary } from "../../utils/imageUrl";

export const COLOR_MAP = {
  artesano: "#ff5722",
  gastronomia: "#4caf50",
  comercio: "#2196f3",
  evento: "#9c27b0",
  patrimonio: "#795548",
  personalidad: "#e91e63",
  comunidad_indigena: "#8B4513",
  lugar_natural: "#2E7D32",
  hospedaje: "#FF6F00",
  productor: "#00695C",
  experiencia: "#6A1B9A",
  relato: "#D84315",
  espacio_cultural: "#37474F",
};

export const catColor = (tipo) => COLOR_MAP[tipo] || "#863819";

const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function getOpenBadge(tipo, dias_abierto, horario_apertura, horario_cierre) {
  if (tipo !== "comercio" || !dias_abierto || !horario_apertura || !horario_cierre) return "";
  const hoy = DIAS_SEMANA[new Date().getDay()];
  const dias = dias_abierto.split(",").map((d) => d.trim());
  const badgeBase = "display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;";
  if (!dias.includes(hoy)) {
    return `<span style="${badgeBase}background:#e74c3c15;color:#e74c3c;">Cerrado</span>`;
  }
  const ahora = new Date();
  const [hA, mA] = horario_apertura.split(":").map(Number);
  const [hC, mC] = horario_cierre.split(":").map(Number);
  const minActual = ahora.getHours() * 60 + ahora.getMinutes();
  if (minActual >= hA * 60 + mA && minActual < hC * 60 + mC) {
    return `<span style="${badgeBase}background:#2e7d3215;color:#2e7d32;">Abierto</span>`;
  }
  return `<span style="${badgeBase}background:#e74c3c15;color:#e74c3c;">Cerrado</span>`;
}

export function getEventBadge(tipo, fecha_evento) {
  if (tipo !== "evento" || !fecha_evento) return "";
  const diff = Math.ceil((new Date(fecha_evento) - new Date(new Date().toDateString())) / 86400000);
  const badgeBase = "display:inline-block;padding:2px 10px;border-radius:20px;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;";
  if (diff === 0) return `<span style="${badgeBase}background:#2e7d3215;color:#2e7d32;">¡Hoy!</span>`;
  if (diff <= 7) return `<span style="${badgeBase}background:#f39c1215;color:#f39c12;">¡Pronto! (${diff}d)</span>`;
  return "";
}

export function buildEntityPopupHtml(props, coordinates) {
  const { id, nombre, resumen, slug, tipo, imagen, horario_apertura, horario_cierre, dias_abierto, fecha_evento } = props;
  const color = catColor(tipo);
  const openBadge = getOpenBadge(tipo, dias_abierto, horario_apertura, horario_cierre);
  const eventBadge = getEventBadge(tipo, fecha_evento);

  return `
    <div style="padding:16px;min-width:240px;max-width:280px;font-family:'Epilogue',sans-serif;position:relative;">
      <div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${color};border-radius:3px 0 0 3px;"></div>
      <div style="margin-left:8px;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <div style="display:inline-block;padding:2px 10px;border-radius:20px;background:${color}15;color:${color};font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">${tipo}</div>${openBadge}${eventBadge}
        </div>
        <div style="display:flex;align-items:center;gap:10px;margin:4px 0 6px 0;">
          <h3 style="margin:0;flex:1;color:#2D1A12;font-family:'Cinzel',serif;font-size:16px;font-weight:700;line-height:1.3;">${nombre}</h3>
          ${imagen ? `<img src="${optimizarUrlCloudinary(imagen)}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;" />` : ""}
        </div>
        <p style="font-size:12px;color:#666;line-height:1.5;margin:0 0 12px 0;">${resumen}</p>
        <div class="conexiones-container" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;min-height:4px;"></div>
        <div>
          <a href="/entidad/${slug}"
             onclick="return window.__guardarEstadoMapa(this)"
             style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,${color},${color}dd);color:white;text-decoration:none;border-radius:25px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;transition:all 0.3s ease;box-shadow:0 4px 12px ${color}40;"
             onmouseenter="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 16px ${color}60'"
             onmouseleave="this.style.transform='none';this.style.boxShadow='0 4px 12px ${color}40'">
            Explorar <span style="font-size:14px;line-height:1;">→</span>
          </a>
          <div style="margin-top:6px;position:relative;display:inline-block;">
            <button onclick="var m=this.nextElementSibling;m.style.display=m.style.display==='flex'?'none':'flex';"
              style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;background:transparent;color:#4285F4;border:1px solid #4285F4;border-radius:25px;font-size:10px;font-weight:600;cursor:pointer;transition:all 0.2s ease;font-family:'Epilogue',sans-serif;line-height:1.4;"
              onmouseenter="this.style.background='rgba(66,133,244,0.08)'" onmouseleave="this.style.background='transparent'">
              Cómo llegar
            </button>
            <div style="display:none;position:absolute;top:100%;left:0;margin-top:6px;background:white;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:6px;gap:4px;z-index:10;flex-direction:column;min-width:140px;">
              <a href="https://www.google.com/maps/dir/?api=1&destination=${coordinates[1]},${coordinates[0]}" target="_blank" rel="noopener noreferrer"
                 style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;transition:background 0.15s;"
                 onmouseenter="this.style.background='#f5f5f5'" onmouseleave="this.style.background='transparent'">
                <img src="/icons/googlemaps.png" style="width:18px;height:18px;object-fit:contain;" alt=""/> Google Maps
              </a>
              <a href="https://waze.com/ul?ll=${coordinates[1]},${coordinates[0]}&navigate=yes" target="_blank" rel="noopener noreferrer"
                 style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;transition:background 0.15s;"
                 onmouseenter="this.style.background='#f5f5f5'" onmouseleave="this.style.background='transparent'">
                <img src="/icons/waze.png" style="width:18px;height:18px;object-fit:contain;" alt=""/> Waze
              </a>
              <a href="https://maps.apple.com/?daddr=${coordinates[1]},${coordinates[0]}" target="_blank" rel="noopener noreferrer"
                 style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;transition:background 0.15s;"
                 onmouseenter="this.style.background='#f5f5f5'" onmouseleave="this.style.background='transparent'">
                <img src="/icons/applemaps.png" style="width:18px;height:18px;object-fit:contain;" alt=""/> Apple Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}
