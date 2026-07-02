import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const HomeMapBlob = () => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const spinRef = useRef(null);
  const resumeTimerRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [-60, -25],
      zoom: 1.2,
      pitch: 30,
      bearing: 0,
      interactive: true,
      attributionControl: false,
      projection: "globe",
      dragPan: true,
      dragRotate: true,
      scrollZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      boxZoom: false,
      keyboard: false,
      cooperativeGestures: false,
    });

    map.on("load", () => {
      map.setFog({
        color: "rgb(26, 20, 16)",
        "high-color": "rgb(36, 28, 22)",
        "horizon-blend": 0.1,
        "space-color": "rgb(20, 15, 12)",
        "star-intensity": 0.6,
      });

      const startSpin = () => {
        spinRef.current = true;
        const spin = () => {
          if (!spinRef.current) return;
          const center = map.getCenter();
          center.lng -= 0.04;
          map.setCenter(center);
          requestAnimationFrame(spin);
        };
        requestAnimationFrame(spin);
      };

      const stopSpin = () => {
        spinRef.current = false;
      };

      const handleInteraction = () => {
        stopSpin();
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(startSpin, 4000);
      };

      map.on("dragstart", handleInteraction);
      map.on("zoomstart", handleInteraction);

      startSpin();
    });

    mapRef.current = map;

    return () => {
      spinRef.current = false;
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="blob__map" />;
};
