import { useRef, useCallback } from "react";
import { generarCurva } from "../utils/mapUtils";

export function useMapConexiones(entidadCoordsRef, entidadDataRef, popupRef) {
  const conexionesLayerRef = useRef(null);
  const conexionesSourceRef = useRef(null);
  const hoveredLineIdRef = useRef(null);

  const limpiarConexiones = useCallback((map) => {
    hoveredLineIdRef.current = null;
    try {
      if (
        conexionesLayerRef.current &&
        map?.getLayer(conexionesLayerRef.current)
      ) {
        map.removeLayer(conexionesLayerRef.current);
        conexionesLayerRef.current = null;
      }
      if (
        conexionesSourceRef.current &&
        map?.getSource(conexionesSourceRef.current)
      ) {
        map.removeSource(conexionesSourceRef.current);
        conexionesSourceRef.current = null;
      }
    } catch (_) {}
  }, []);

  const dibujarConexiones = useCallback(
    async (entityId, clickedCoords, map, existingData) => {
      limpiarConexiones(map);
      try {
        let data;
        if (existingData) {
          data = existingData;
        } else {
          try {
            const res = await fetch(`/api/entidades/${entityId}/conexiones`);
            if (!res.ok) return;
            data = await res.json();
          } catch (_) {
            return;
          }
        }
        const lookup = entidadCoordsRef.current;
        const fullCurves = [];
        const conectados = [];
        const seenIds = new Set();
        let featIndex = 0;
        for (const c of data) {
          const isOrigin = c.entidad_origen_id === entityId;
          const otherId = isOrigin ? c.entidad_destino_id : c.entidad_origen_id;
          if (seenIds.has(otherId)) continue;
          seenIds.add(otherId);
          const otherCoords = lookup[otherId];
          if (!otherCoords) continue;
          const tipo = isOrigin ? c.tipo_destino : c.tipo_origen;
          const nombre = isOrigin ? c.nombre_destino : c.nombre_origen;
          const slug = isOrigin ? c.slug_destino : c.slug_origen;
          const entData = entidadDataRef.current[otherId];
          const resumen = entData?.resumen || "";
          featIndex++;
          fullCurves.push({
            curve: generarCurva(clickedCoords, otherCoords),
            id: featIndex,
            properties: { id: otherId, nombre, slug, tipo, resumen },
          });
          conectados.push({ nombre, slug, tipo });
        }
        if (fullCurves.length === 0) return;

        const sourceId = `conexiones-${entityId}`;
        const layerId = `capa-conexiones-${entityId}`;

        map.addSource(sourceId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        map.addLayer({
          id: layerId,
          type: "line",
          source: sourceId,
          layout: { "line-join": "round", "line-cap": "round" },
          paint: {
            "line-color": [
              "match",
              ["get", "tipo"],
              "artesano",
              "#ff5722",
              "gastronomia",
              "#4caf50",
              "comercio",
              "#2196f3",
              "evento",
              "#9c27b0",
              "patrimonio",
              "#795548",
              "personalidad",
              "#e91e63",
              "comunidad_indigena",
              "#8B4513",
              "lugar_natural",
              "#2E7D32",
              "hospedaje",
              "#FF6F00",
              "productor",
              "#00695C",
              "experiencia",
              "#6A1B9A",
              "relato",
              "#D84315",
              "espacio_cultural",
              "#37474F",
              "#863819",
            ],
            "line-width": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              5,
              2.5,
            ],
            "line-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              1,
              0.6,
            ],
          },
        });

        map.on("mouseenter", layerId, (e) => {
          map.getCanvas().style.cursor = "";
          const fid = e.features?.[0]?.id;
          if (fid != null) {
            if (hoveredLineIdRef.current != null) {
              map.setFeatureState(
                { source: sourceId, id: hoveredLineIdRef.current },
                { hover: false },
              );
            }
            hoveredLineIdRef.current = fid;
            map.setFeatureState({ source: sourceId, id: fid }, { hover: true });
          }
        });
        map.on("mouseleave", layerId, () => {
          map.getCanvas().style.cursor = "";
          if (hoveredLineIdRef.current != null) {
            try {
              map.setFeatureState(
                { source: sourceId, id: hoveredLineIdRef.current },
                { hover: false },
              );
            } catch (_) {}
            hoveredLineIdRef.current = null;
          }
        });

        conexionesSourceRef.current = sourceId;
        conexionesLayerRef.current = layerId;

        const duracionMs = 1500;
        const fps = 30;
        const totalFrames = Math.ceil(duracionMs / (1000 / fps));
        let frame = 0;

        const anim = setInterval(() => {
          frame++;
          const progress = Math.min(frame / totalFrames, 1);
          const partialFeatures = fullCurves.map((fc) => ({
            type: "Feature",
            id: fc.id,
            geometry: {
              type: "LineString",
              coordinates: fc.curve.slice(
                0,
                Math.max(2, Math.ceil(fc.curve.length * progress)),
              ),
            },
            properties: fc.properties,
          }));
          try {
            map.getSource(sourceId)?.setData({
              type: "FeatureCollection",
              features: partialFeatures,
            });
          } catch (e) {
            clearInterval(anim);
          }
          if (frame >= totalFrames) clearInterval(anim);
        }, 1000 / fps);

        if (conectados.length > 0 && popupRef.current) {
          const popupEl = popupRef.current.getElement();
          const container = popupEl?.querySelector(".conexiones-container");
          if (container) {
            container.innerHTML = conectados
              .map((c) => {
                const chipColor =
                  {
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
                  }[c.tipo] || "#863819";
                return `<a href="/entidad/${c.slug}" onclick="return window.__guardarEstadoMapa(this)" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;background:${chipColor}15;color:${chipColor};font-size:10px;font-weight:800;letter-spacing:0.5px;text-decoration:none;text-transform:uppercase;white-space:nowrap">${c.nombre}</a>`;
              })
              .join("");
          }
        }
      } catch (err) {
        console.error("Error al cargar conexiones:", err);
      }
    },
    [limpiarConexiones, entidadCoordsRef, entidadDataRef, popupRef],
  );

  return {
    limpiarConexiones,
    dibujarConexiones,
    conexionesLayerRef,
    conexionesSourceRef,
    hoveredLineIdRef,
  };
}
