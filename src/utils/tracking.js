const API = import.meta.env.VITE_API_URL || "";

export function track(tipo, entidad_id = null, slug = null) {
  try {
    navigator.sendBeacon(
      `${API}/api/analytics/track`,
      new Blob([JSON.stringify({ tipo, entidad_id, slug })], { type: "application/json" }),
    );
  } catch {
    // silently fail
  }
}
