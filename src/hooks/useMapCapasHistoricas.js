import { useCallback, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useMapStore, HISTORICAL_KEYS } from "../store/useMapStore";

const CAPA_CONFIG = {
  reduccion: {
    type: "circle",
    source: "fuente-reducciones",
    layers: [
      { id: "capa-reducciones" },
    ],
  },
  fortin: {
    type: "circle",
    source: "fuente-fortines",
    layers: [
      { id: "capa-fortines" },
    ],
  },
  ruta_tanino: {
    type: "line",
    source: "fuente-rutas-tanino",
    layers: [
      { id: "capa-rutas-tanino-lineas" },
      { id: "capa-rutas-tanino-glow" },
    ],
  },
  ruta_algodon: {
    type: "line",
    source: "fuente-rutas-algodon",
    layers: [
      { id: "capa-rutas-algodon-lineas" },
      { id: "capa-rutas-algodon-glow" },
    ],
  },
  territorio: {
    type: "fill",
    source: "fuente-territorios",
    layers: [
      { id: "capa-territorios-fill", type: "fill" },
      { id: "capa-territorios-lineas", type: "line" },
    ],
  },
};

// Muestra features que ya existían para el año seleccionado (acumulativo)
function buildFilter(año) {
  return ["<=", ["get", "año_desde"], año];
}

export function useMapCapasHistoricas() {
  const sourcesAddedRef = useRef(false);
  const capasRef = useRef({});
  const clickPopupRef = useRef(null);
  const listenersRef = useRef([]);
  const mapClickHandlerRef = useRef(null);

  const limpiar = useCallback((map) => {
    if (!map) return;

    if (clickPopupRef.current) {
      clickPopupRef.current.remove();
      clickPopupRef.current = null;
    }

    for (const [layerId, type] of listenersRef.current) {
      map.off(type, layerId);
    }
    listenersRef.current = [];

    if (mapClickHandlerRef.current) {
      map.off("click", mapClickHandlerRef.current);
      mapClickHandlerRef.current = null;
    }
    for (const key of HISTORICAL_KEYS) {
      const cfg = CAPA_CONFIG[key];
      for (const layer of cfg.layers) {
        if (map.getLayer(layer.id)) {
          map.removeLayer(layer.id);
        }
      }
      if (map.getSource(cfg.source)) {
        map.removeSource(cfg.source);
      }
    }
    sourcesAddedRef.current = false;
  }, []);

  const inicializar = useCallback((map, capasGeoJSON) => {
    if (!map || !capasGeoJSON || sourcesAddedRef.current) return;

    const pointPaint = (color) => ({
      "circle-radius": 7,
      "circle-color": color,
      "circle-opacity": 0.85,
      "circle-stroke-width": 2,
      "circle-stroke-color": "#fff",
      "circle-stroke-opacity": 0.9,
    });

    const linePaint = (color, glow = false) => ({
      "line-color": color,
      "line-width": glow ? 8 : 2.5,
      "line-opacity": glow ? 0.2 : 0.85,
      "line-blur": glow ? 3 : 0,
      ...(glow ? {} : { "line-dasharray": [3, 2] }),
    });

    const fillPaint = () => ({
      "fill-color": ["get", "color"],
      "fill-opacity": 0,
    });

    const lineBorderPaint = () => ({
      "line-color": ["get", "color"],
      "line-opacity": 0.6,
      "line-width": 2,
      "line-dasharray": [4, 3],
    });

    const featuresByCapa = {};
    for (const key of HISTORICAL_KEYS) {
      featuresByCapa[key] = [];
    }

    for (const f of capasGeoJSON.features) {
      const capa = f.properties?.capa;
      if (featuresByCapa[capa]) {
        featuresByCapa[capa].push(f);
      }
    }

    const totalFeatures = HISTORICAL_KEYS.reduce((s, k) => s + featuresByCapa[k].length, 0);
    if (totalFeatures === 0) {
      console.warn("⚠️ Capas históricas: no hay datos. ¿Corriste migrate19.sql en Supabase?");
      return;
    }

    for (const key of HISTORICAL_KEYS) {
      if (featuresByCapa[key].length === 0) continue;

      const sourceId = CAPA_CONFIG[key].source;
      const data = {
        type: "FeatureCollection",
        features: featuresByCapa[key],
      };

      map.addSource(sourceId, { type: "geojson", data });

      const color = featuresByCapa[key][0]?.properties?.color || "#666";
      const cfg = CAPA_CONFIG[key];
      const layerDefs = cfg.layers.map((l) => ({
        id: l.id,
        type: l.type || cfg.type,
        source: sourceId,
        paint: {},
        layout: { visibility: "none" },
      }));

      switch (cfg.type) {
        case "circle":
          layerDefs[0].paint = pointPaint(color);
          break;
        case "line":
          layerDefs[0].paint = linePaint(color, false);
          layerDefs[0].layout = { visibility: "none", "line-join": "round", "line-cap": "round" };
          if (layerDefs.length > 1) {
            layerDefs[1].paint = linePaint(color, true);
          }
          break;
        case "fill":
          layerDefs[0].paint = fillPaint();
          if (layerDefs.length > 1) {
            layerDefs[1].paint = lineBorderPaint();
          }
          break;
      }

      for (const def of layerDefs) {
        map.addLayer(def);
      }

      capasRef.current[key] = {
        baseColor: featuresByCapa[key][0]?.properties?.color || "#666",
      };

      const interactiveId = layerDefs[0].id;

      map.on("click", interactiveId, (e) => {
        e.originalEvent?.stopPropagation?.();
        const feature = e.features?.[0];
        if (!feature) return;

        const props = feature.properties;
        const coords =
          feature.geometry.type === "Point"
            ? feature.geometry.coordinates.slice()
            : [e.lngLat.lng, e.lngLat.lat];

        if (clickPopupRef.current) {
          clickPopupRef.current.remove();
          clickPopupRef.current = null;
        }

        const html = `
          <div class="historical-popup-content">
            <strong class="historical-popup-name">${props.nombre}</strong>
            ${
              props.descripcion
                ? `<p class="historical-popup-desc">${props.descripcion}</p>`
                : ""
            }
            <span class="historical-popup-year">${props.año_desde}${
          props.año_hasta && props.año_hasta !== props.año_desde
            ? " - " + props.año_hasta
            : ""
        }</span>
          </div>`;

        clickPopupRef.current = new mapboxgl.Popup({
          offset: 15,
          closeButton: false,
          closeOnClick: false,
          maxWidth: "280px",
        })
          .setLngLat(coords)
          .setHTML(html)
          .addTo(map);
      });

      map.on("mouseenter", interactiveId, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", interactiveId, () => {
        map.getCanvas().style.cursor = "";
      });

      listenersRef.current.push(
        [interactiveId, "click"],
        [interactiveId, "mouseenter"],
        [interactiveId, "mouseleave"],
      );
    }

    mapClickHandlerRef.current = (e) => {
      if (!clickPopupRef.current) return;
      const layers = Object.values(CAPA_CONFIG).flatMap((c) =>
        c.layers.map((l) => l.id),
      );
      const hit = map.queryRenderedFeatures(e.point, { layers });
      if (hit.length === 0) {
        clickPopupRef.current.remove();
        clickPopupRef.current = null;
      }
    };

    map.on("click", mapClickHandlerRef.current);

    sourcesAddedRef.current = true;
    console.log(`🗺️ Capas históricas: ${totalFeatures} features inicializadas`);
  }, []);

  const actualizar = useCallback((map) => {
    if (!map || !sourcesAddedRef.current) return;
    const state = useMapStore.getState();
    const { capasHistoricas, añoHistorico } = state;

    for (const key of HISTORICAL_KEYS) {
      const active = capasHistoricas[key];
      const sourceId = CAPA_CONFIG[key].source;

      if (!map.getSource(sourceId)) continue;

      const layers = CAPA_CONFIG[key].layers.map((l) => l.id);
      const visibles = [];

      for (const layerId of layers) {
        if (!map.getLayer(layerId)) continue;

        if (active) {
          map.setLayoutProperty(layerId, "visibility", "visible");
          map.setFilter(layerId, buildFilter(añoHistorico));
          visibles.push(layerId);
        } else {
          map.setLayoutProperty(layerId, "visibility", "none");
        }
      }

      // Cache for hover effects
      capasRef.current[key] = {
        ...capasRef.current[key],
        layers: visibles,
      };
    }
  }, []);

  const refreshFilter = useCallback((map) => {
    if (!map || !sourcesAddedRef.current) return;
    const año = useMapStore.getState().añoHistorico;

    for (const key of HISTORICAL_KEYS) {
      const layers = CAPA_CONFIG[key].layers.map((l) => l.id);
      for (const layerId of layers) {
        if (!map.getLayer(layerId)) continue;
        const vis = map.getLayoutProperty(layerId, "visibility");
        if (vis === "visible") {
          map.setFilter(layerId, buildFilter(año));
        }
      }
    }
  }, []);

  return { inicializar, actualizar, refreshFilter, limpiar };
}
