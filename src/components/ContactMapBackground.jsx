import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STEP_CONFIG = {
  1: { center: [0, 0], zoom: 0.5, pitch: 25, bearing: 20, grayscale: 1 },
  2: { center: [-58, -15], zoom: 1.8, pitch: 45, bearing: 30, grayscale: 0.6 },
  3: { center: [-63, -34], zoom: 2.1, pitch: 35, bearing: 5, grayscale: 0.3 },
  4: {
    center: [-60.44, -26.05],
    zoom: 6.5,
    pitch: 25,
    bearing: 0,
    grayscale: 0,
  },
  5: {
    center: [-58.9943, -27.4452],
    zoom: 18,
    pitch: 60,
    bearing: 15,
    grayscale: 0,
  },
};

const DURATION = 4000;

export const ContactMapBackground = ({ step }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const currentGrayRef = useRef(1);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      projection: "globe",
      center: STEP_CONFIG[1].center,
      zoom: STEP_CONFIG[1].zoom,
      pitch: STEP_CONFIG[1].pitch,
      bearing: STEP_CONFIG[1].bearing,
      interactive: false,
      attributionControl: false,
    });

    map.once("idle", () => {
      const canvas = map.getCanvas();
      canvas.style.filter = `grayscale(${STEP_CONFIG[1].grayscale})`;

      const addLabel = (id, text, coords, size) => {
        map.addSource(id, {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: coords },
          },
        });

        map.addLayer({
          id,
          type: "symbol",
          source: id,
          layout: {
            "text-field": text,
            "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
            "text-size": size,
            "text-offset": [0, -1.2],
            "text-anchor": "bottom",
            "visibility": "none",
          },
          paint: {
            "text-color": "#666",
            "text-halo-color": "#fff",
            "text-halo-width": 1.5,
          },
        });
      };

      addLabel("label-malvinas", "Islas Malvinas", [-59.5, -51.7], 10);
      addLabel("label-chaco", "Chaco", [-60.5, -26.5], 22);
      addLabel("label-direccion", "Made in Chaco", [-58.9943, -27.4452], 14);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const prev = STEP_CONFIG[Math.max(step - 1, 1)];
    const next = STEP_CONFIG[step] || STEP_CONFIG[4];

    map.flyTo({
      center: next.center,
      zoom: next.zoom,
      pitch: next.pitch,
      bearing: next.bearing,
      duration: DURATION,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });

    if (map.getLayer("label-malvinas")) {
      map.setLayoutProperty("label-malvinas", "visibility", step >= 3 ? "visible" : "none");
    }
    if (map.getLayer("label-chaco")) {
      map.setLayoutProperty("label-chaco", "visibility", step >= 4 ? "visible" : "none");
    }
    if (map.getLayer("label-direccion")) {
      map.setLayoutProperty("label-direccion", "visibility", step >= 5 ? "visible" : "none");
    }

    const startGray = currentGrayRef.current;
    const endGray = next.grayscale;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DURATION, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const gray = startGray + (endGray - startGray) * ease;

      const canvas = map.getCanvas();
      if (canvas) {
        canvas.style.filter = `grayscale(${gray})`;
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        currentGrayRef.current = endGray;
      }
    };

    requestAnimationFrame(animate);
  }, [step]);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
      }}
    />
  );
};
