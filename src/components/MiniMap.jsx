import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const MiniMap = ({ lat, lng, icono }) => {
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
    if (icono) {
      el.className = "minimap-marker-custom";
      const img = document.createElement("img");
      img.src = icono;
      img.alt = "";
      img.style.cssText = "width:32px;height:32px;border-radius:6px;object-fit:cover;display:block;";
      el.appendChild(img);
    } else {
      el.className = "minimap-marker";
      el.innerHTML = `
        <div class="minimap-marker-pin"></div>
        <div class="minimap-marker-pulse"></div>
      `;
    }

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

  return (
    <div className="minimap-wrapper">
      <div ref={containerRef} className="minimap-container" />
    </div>
  );
};
