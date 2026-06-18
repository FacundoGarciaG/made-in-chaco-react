import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const PATH = [
  [-61.0, -26.5],
  [-58.98, -27.45],
  [-58.98, -27.27],
  [-59.10, -27.27],
  [-59.23, -27.23],
  [-59.60, -26.93],
  [-59.83, -27.00],
  [-59.87, -27.55],
  [-60.70, -27.57],
  [-60.42, -27.28],
  [-60.22, -26.87],
  [-60.05, -26.93],
  [-60.02, -26.72],
  [-60.18, -26.60],
  [-60.43, -26.38],
  [-59.33, -26.53],
  [-60.47, -25.90],
  [-61.85, -25.60],
  [-60.43, -26.87],
  [-60.70, -27.27],
  [-61.18, -27.22],
  [-61.28, -27.32],
  [-61.33, -27.60],
  [-61.08, -27.07],
  [-61.05, -26.93],
  [-61.08, -27.08],
  [-61.0, -26.5],
];

const PATH_LENGTH = PATH.length;
const TOTAL_SEGMENTS = PATH_LENGTH - 1;

function getPosition(progress) {
  const idx = Math.min(progress * TOTAL_SEGMENTS, TOTAL_SEGMENTS - 1);
  const seg = Math.floor(idx);
  const t = idx - seg;
  const a = PATH[seg];
  const b = PATH[seg + 1];
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

function getZoom(progress) {
  const centerDist = Math.abs(progress - 0.5) * 2;
  return 10 - centerDist * 3.5;
}

const LERP_SPEED = 0.04;

export const ProjectMapBackground = ({ scrollYProgress }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const currentPosRef = useRef([-61.0, -26.5]);
  const currentZoomRef = useRef(6.2);
  const targetPosRef = useRef([-61.0, -26.5]);
  const targetZoomRef = useRef(6.2);
  const rafRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: currentPosRef.current,
      zoom: currentZoomRef.current,
      interactive: false,
      attributionControl: false,
    });

    map.once("idle", () => {
      const canvas = map.getCanvas();
      canvas.style.filter = "grayscale(0.15) brightness(0.7)";
    });

    map.once("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: PATH,
          },
        },
      });

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "rgba(255,255,255,0.5)",
          "line-width": 2,
          "line-opacity": 0.6,
        },
      });

      map.addSource("dot", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: currentPosRef.current,
          },
        },
      });

      map.addLayer({
        id: "route-dot",
        type: "circle",
        source: "dot",
        paint: {
          "circle-radius": 6,
          "circle-color": "#fff",
          "circle-opacity": 1,
          "circle-stroke-width": 2,
          "circle-stroke-color": "rgba(255,255,255,0.3)",
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!scrollYProgress || !mapRef.current) return;

    const unsubscribe = scrollYProgress.on("change", (v) => {
      targetPosRef.current = getPosition(v);
      targetZoomRef.current = getZoom(v);
    });

    const tick = () => {
      const map = mapRef.current;
      if (!map) return;

      const cp = currentPosRef.current;
      const tp = targetPosRef.current;

      const dx = tp[0] - cp[0];
      const dy = tp[1] - cp[1];
      const dz = targetZoomRef.current - currentZoomRef.current;

      if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        currentPosRef.current = [cp[0] + dx * LERP_SPEED, cp[1] + dy * LERP_SPEED];
        map.setCenter(currentPosRef.current);
      }

      if (Math.abs(dz) > 0.01) {
        currentZoomRef.current += dz * LERP_SPEED;
        map.setZoom(currentZoomRef.current);
      }

      const dotSource = map.getSource("dot");
      if (dotSource) {
        dotSource.setData({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: currentPosRef.current },
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      unsubscribe();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scrollYProgress]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};
