import { useState, useEffect, useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";

const INTERVAL_MS = 20000;
const DURATION_MS = 3000;
const MAX_TRIES = 50;

function pointInPolygon(px, py, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function isInsideGeometry(lng, lat, geometry) {
  if (geometry.type === "Polygon") {
    const exterior = geometry.coordinates[0];
    if (!pointInPolygon(lng, lat, exterior)) return false;
    for (let i = 1; i < geometry.coordinates.length; i++) {
      if (pointInPolygon(lng, lat, geometry.coordinates[i])) return false;
    }
    return true;
  }
  if (geometry.type === "MultiPolygon") {
    for (const poly of geometry.coordinates) {
      const exterior = poly[0];
      if (!pointInPolygon(lng, lat, exterior)) continue;
      let inHole = false;
      for (let i = 1; i < poly.length; i++) {
        if (pointInPolygon(lng, lat, poly[i])) { inHole = true; break; }
      }
      if (!inHole) return true;
    }
    return false;
  }
  return false;
}

function getBbox(geometry) {
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  const polys = geometry.type === "MultiPolygon" ? geometry.coordinates : (geometry.type === "Polygon" ? [geometry.coordinates] : []);
  for (const poly of polys) {
    for (const ring of poly) {
      for (const [lng, lat] of ring) {
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return { minLng, maxLng, minLat, maxLat };
}

function randomPointInGeometry(geometry) {
  const bbox = getBbox(geometry);
  for (let i = 0; i < MAX_TRIES; i++) {
    const lng = bbox.minLng + Math.random() * (bbox.maxLng - bbox.minLng);
    const lat = bbox.minLat + Math.random() * (bbox.maxLat - bbox.minLat);
    if (isInsideGeometry(lng, lat, geometry)) {
      return [lng, lat];
    }
  }
  return null;
}

export function SpeechBubble({ mapRef, provincia }) {
  const popupRef = useRef(null);
  const timerRef = useRef(null);

  const fetchRandomPalabra = useCallback(async () => {
    try {
      const res = await fetch("/api/palabras/random");
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    } catch {
      return null;
    }
  }, []);

  const spawnBubble = useCallback(async () => {
    const map = mapRef?.current;
    const geo = provincia?.geometry;
    if (!map || !geo) return;

    const data = await fetchRandomPalabra();
    if (!data || !data.palabra) return;

    const point = randomPointInGeometry(geo);
    if (!point) return;

    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }

    const rotation = (Math.random() - 0.5) * 8;

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "300px",
      offset: 0,
      className: "speech-bubble-popup",
    })
      .setLngLat(point)
      .setHTML(`
        <span class="speech-bubble-popup-content" onclick="
          var m = window.__mapInstance;
          if (m) {
            var c = m.getCenter();
            sessionStorage.setItem('mapState', JSON.stringify({
              center: [c.lng, c.lat],
              zoom: m.getZoom(),
              bearing: m.getBearing(),
              pitch: m.getPitch(),
              filtro: 'todos',
              filtroLocalidad: ''
            }));
          }
          history.pushState(null, '', '/palabra/${data.id}');
          window.dispatchEvent(new PopStateEvent('popstate'));
        ">
          ${data.palabra}
        </span>
      `)
      .addTo(map);

    const popupEl = popup.getElement();
    if (popupEl) {
      const contentEl = popupEl.querySelector(".mapboxgl-popup-content");
      if (contentEl) {
        contentEl.style.setProperty("--bubble-rotate", `${rotation.toFixed(1)}deg`);
      }
    }

    popupRef.current = popup;

    sessionStorage.setItem("speech-bubble-last-seen", String(Date.now()));

    setTimeout(() => {
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    }, DURATION_MS);
  }, [fetchRandomPalabra, mapRef, provincia]);

  useEffect(() => {
    if (!provincia) return;

    const STORAGE_KEY = "speech-bubble-last-seen";

    const lastSeen = sessionStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    const elapsed = lastSeen ? now - Number(lastSeen) : Infinity;

    if (elapsed < INTERVAL_MS) {
      const wait = INTERVAL_MS - elapsed;
      timerRef.current = setTimeout(() => {
        spawnBubble();
        timerRef.current = setInterval(spawnBubble, INTERVAL_MS);
      }, wait);
    } else {
      timerRef.current = setInterval(spawnBubble, INTERVAL_MS);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [spawnBubble, provincia]);

  return null;
}
