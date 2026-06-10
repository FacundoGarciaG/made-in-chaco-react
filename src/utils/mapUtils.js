import { useMapStore } from "../store/useMapStore";

export const generarCurva = (from, to) => {
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const dlng = lng2 - lng1;
  const dlat = lat2 - lat1;
  const dist = Math.sqrt(dlng * dlng + dlat * dlat) || 0.001;
  const gap = Math.min(0.001, dist * 0.15);
  const ratio = gap / dist;
  const f1 = [lng1 + dlng * ratio, lat1 + dlat * ratio];
  const f2 = [lng2 - dlng * ratio, lat2 - dlat * ratio];
  const steps = 30;
  const points = [];
  const midLng = (f1[0] + f2[0]) / 2;
  const midLat = (f1[1] + f2[1]) / 2;
  const d2 = Math.sqrt((f2[0] - f1[0]) ** 2 + (f2[1] - f1[1]) ** 2) || 0.001;
  const offsetAmt = d2 * 0.12;
  const cpLng = midLng + (-(f2[1] - f1[1]) / d2) * offsetAmt;
  const cpLat = midLat + ((f2[0] - f1[0]) / d2) * offsetAmt;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const t1 = 1 - t;
    points.push([
      t1 * t1 * f1[0] + 2 * t1 * t * cpLng + t * t * f2[0],
      t1 * t1 * f1[1] + 2 * t1 * t * cpLat + t * t * f2[1],
    ]);
  }
  return points;
};

export const guardarEstadoMapa = function (linkEl) {
  const state = useMapStore.getState();
  const map = state._mapInstance;
  if (map) {
    const center = map.getCenter();
    sessionStorage.setItem(
      "mapState",
      JSON.stringify({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        filtro: state.filtro || "todos",
        filtroLocalidad: state.filtroLocalidad || "",
      }),
    );
  }
  if (linkEl) {
    const href = linkEl.getAttribute?.("href") || linkEl.href;
    history.pushState(null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  return false;
};

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
