import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const STEP_CONFIG = {
  1: { center: [30, 0], zoom: 1, pitch: 55, bearing: 20, grayscale: 1 },
  2: { center: [-55, -15], zoom: 3, pitch: 45, bearing: 10, grayscale: 0.6 },
  3: { center: [-58, -20], zoom: 3.5, pitch: 35, bearing: 5, grayscale: 0.3 },
  4: { center: [-60, -26], zoom: 4, pitch: 25, bearing: 0, grayscale: 0 },
};

export const ContactMapBackground = ({ step }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: STEP_CONFIG[1].center,
      zoom: STEP_CONFIG[1].zoom,
      pitch: STEP_CONFIG[1].pitch,
      bearing: STEP_CONFIG[1].bearing,
      interactive: false,
      attributionControl: false,
    });

    map.on("idle", () => {
      canvasRef.current = map.getCanvas();
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

    const cfg = STEP_CONFIG[step] || STEP_CONFIG[4];

    map.flyTo({
      center: cfg.center,
      zoom: cfg.zoom,
      pitch: cfg.pitch,
      bearing: cfg.bearing,
      duration: 1800,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  }, [step]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const canvas = map.getCanvas();
    if (!canvas) return;

    const cfg = STEP_CONFIG[step] || STEP_CONFIG[4];
    const target = cfg.grayscale;

    const start = performance.now();
    const duration = 1800;

    const animate = (now) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const current = target * ease;

      canvas.style.filter = `grayscale(${current})`;
      canvas.style.transition = "none";

      if (t < 1) requestAnimationFrame(animate);
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
