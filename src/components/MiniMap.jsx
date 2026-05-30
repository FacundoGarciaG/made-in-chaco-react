import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const MiniMap = ({ lat, lng, nombre, tipo }) => {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 13,
      interactive: true,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    mapRef.current = map;

    const el = document.createElement("div");
    el.className = "minimap-marker";
    el.innerHTML = `
      <div class="minimap-marker-pin"></div>
      <div class="minimap-marker-pulse"></div>
    `;

    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);

    markerRef.current = marker;

    return () => {
      marker.remove();
      map.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  const handleVerMapa = () => {
    sessionStorage.setItem(
      "flyToTarget",
      JSON.stringify({ center: [lng, lat], zoom: 14, nombre, tipo }),
    );
    window.location.href = "/descubre";
  };

  return (
    <div className="minimap-wrapper">
      <div ref={containerRef} className="minimap-container" />
      <button className="minimap-btn" onClick={handleVerMapa}>
        <i className="ri-map-pin-line" style={{ fontSize: 14 }} />
        Ver en mapa grande
      </button>
    </div>
  );
};
