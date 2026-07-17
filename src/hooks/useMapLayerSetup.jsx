import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useMapStore } from "../store/useMapStore";
import { track } from "../utils/tracking";
import { buildEntityPopupHtml } from "../components/map/EntityPopup";

const ICONOS = [
  "artesano", "gastronomia", "comercio", "evento", "patrimonio",
  "personalidad", "comunidad_indigena", "lugar_natural", "hospedaje",
  "productor", "experiencia", "relato", "espacio_cultural",
];

export function useMapLayerSetup({
  mapRef, geoData, departamentos, filtro, filtroLocalidad, terminoBusqueda,
  showControls, returningRef, entidadCoordsRef, entidadDataRef,
  lastClickedEntityRef, clickResetFilterRef, popupRef,
  setFiltro, setFiltroLocalidad, limpiarConexiones, dibujarConexiones,
  savedPuntosFilterRef, recorridoRouteDataRef, fitBoundsLocked, easeToLocked,
  setEntityActive, setRecorridoPopup,
}) {
  const imagenesCargadasRef = useRef(new Set());
  const filtroRef = useRef(filtro);
  const filtroLocalidadRef = useRef(filtroLocalidad);
  const showDepartamentosRef = useRef(false);

  useEffect(() => { filtroRef.current = filtro; }, [filtro]);
  useEffect(() => { filtroLocalidadRef.current = filtroLocalidad; }, [filtroLocalidad]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;

    const inicializarCapaYRecursos = async () => {
      // Load standard icons
      await Promise.all(
        ICONOS.map((nombre) => {
          return new Promise((resolve) => {
            if (imagenesCargadasRef.current.has(nombre) || map.hasImage(nombre)) return resolve();
            map.loadImage(`/icons/${nombre}.png`, (error, image) => {
              if (!error && image) {
                if (!map.hasImage(nombre)) map.addImage(nombre, image);
                imagenesCargadasRef.current.add(nombre);
              }
              resolve();
            });
          });
        }),
      );

      // Load custom entity icons
      const customIcons = geoData.features.filter((f) => f.properties.icono);
      const failedIconIds = new Set();
      await Promise.all(
        customIcons.map((f) => {
          const imageName = String(f.properties.id);
          if (imagenesCargadasRef.current.has(imageName) || map.hasImage(imageName)) return Promise.resolve();
          return new Promise((resolve) => {
            map.loadImage(f.properties.icono, (error, image) => {
              if (!error && image) {
                if (!map.hasImage(imageName)) map.addImage(imageName, image, { sdf: false, pixelRatio: 1 });
                imagenesCargadasRef.current.add(imageName);
              } else {
                failedIconIds.add(f.properties.id);
              }
              resolve();
            });
          });
        }),
      );

      let geoDataClean = geoData;
      if (failedIconIds.size > 0) {
        geoDataClean = {
          ...geoData,
          features: geoData.features.map((f) =>
            failedIconIds.has(f.properties.id)
              ? { ...f, properties: { ...f.properties, icono: undefined } }
              : f,
          ),
        };
      }

      // Department polygons layer
      if (departamentos && !map.getSource("departamentos")) {
        map.addSource("departamentos", { type: "geojson", data: departamentos });
        map.addLayer({
          id: "capa-departamentos",
          type: "fill",
          source: "departamentos",
          paint: {
            "fill-color": "#863819",
            "fill-opacity": 0.04,
            "fill-outline-color": "rgba(134, 56, 25, 0.19)",
          },
        });
        map.addLayer({
          id: "capa-departamentos-lineas",
          type: "line",
          source: "departamentos",
          layout: { visibility: "none" },
          paint: { "line-color": "#863819", "line-opacity": 0.6, "line-width": 1.5 },
        });
      }

      // Points source + layer
      if (!map.getSource("puntos-chaco")) {
        map.addSource("puntos-chaco", { type: "geojson", data: geoDataClean });
        const visibleInicial = returningRef.current ? "visible" : "none";
        const opacidadInicial = returningRef.current ? 1 : 0;

        map.addLayer({
          id: "capa-puntos",
          type: "symbol",
          source: "puntos-chaco",
          layout: {
            "icon-image": ["case", ["has", "icono"], ["to-string", ["get", "id"]], ["get", "tipo"]],
            "icon-size": 1,
            "icon-allow-overlap": true,
            visibility: visibleInicial,
          },
          paint: {
            "icon-opacity": opacidadInicial,
            "icon-opacity-transition": { duration: 1500 },
          },
        });

        if (returningRef.current) {
          setTimeout(() => { returningRef.current = false; }, 0);
        }

        const hoverPopupRef = { current: null };

        // Hover: entity tooltip
        map.on("mouseenter", "capa-puntos", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const coordinates = e.features[0].geometry.coordinates.slice();
          const { nombre } = e.features[0].properties;
          if (hoverPopupRef.current) hoverPopupRef.current.remove();
          hoverPopupRef.current = new mapboxgl.Popup({ offset: 12, closeButton: false, closeOnClick: false })
            .setLngLat(coordinates)
            .setHTML(`<div class="hover-popup-text" style="padding:6px 14px;font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:#2D1A12;white-space:nowrap;letter-spacing:0.5px;">${nombre}</div>`)
            .addTo(map);
        });

        map.on("mouseleave", "capa-puntos", () => {
          map.getCanvas().style.cursor = "";
          if (hoverPopupRef.current) { hoverPopupRef.current.remove(); hoverPopupRef.current = null; }
        });

        // Department hover label
        let hoverDeptEl = document.getElementById("dept-hover-label");
        if (!hoverDeptEl) {
          hoverDeptEl = document.createElement("div");
          hoverDeptEl.id = "dept-hover-label";
          hoverDeptEl.style.cssText = "position:absolute;top:90px;left:50%;transform:translateX(-50%);padding:8px 24px;background:linear-gradient(180deg,rgba(255,255,255,0.15) 0%,rgba(210,195,165,0.35) 40%,rgba(210,195,165,0.6) 100%);backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2);border-radius:12px;font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:#000;text-align:center;letter-spacing:1px;z-index:10;pointer-events:none;display:none;box-shadow:0 8px 32px rgba(0,0,0,0.15)";
          map.getContainer().appendChild(hoverDeptEl);
        }

        map.on("mousemove", "capa-departamentos", (e) => {
          if (!showDepartamentosRef.current) return;
          const nombre = e.features?.[0]?.properties?.nombre;
          if (nombre) { hoverDeptEl.textContent = nombre; hoverDeptEl.style.display = "block"; }
        });
        map.on("mouseleave", "capa-departamentos", () => { hoverDeptEl.style.display = "none"; });

        // Click: entity detail popup
        map.on("click", "capa-puntos", async (e) => {
          if (filtroRef.current !== "todos" || filtroLocalidadRef.current !== "") {
            clickResetFilterRef.current = true;
            setFiltro("todos");
            setFiltroLocalidad("");
          }
          const coordinates = e.features[0].geometry.coordinates.slice();
          const props = e.features[0].properties;
          track("click_mapa", props.id, props.slug);

          limpiarConexiones(map);
          if (hoverPopupRef.current) { hoverPopupRef.current.remove(); hoverPopupRef.current = null; }
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }

          const isSameEntity = lastClickedEntityRef.current === props.id;
          lastClickedEntityRef.current = props.id;
          setEntityActive(true);

          let conexionesData = [];
          try { const res = await fetch(`/api/entidades/${props.id}/conexiones`); conexionesData = await res.json(); } catch (_) {}

          if (isSameEntity) {
            easeToLocked({ center: coordinates, zoom: 14, duration: 2500 });
          } else if (conexionesData.length > 0) {
            const bounds = new mapboxgl.LngLatBounds(coordinates, coordinates);
            const lookup = entidadCoordsRef.current;
            for (const c of conexionesData) {
              const isOrigin = c.entidad_origen_id === props.id;
              const otherId = isOrigin ? c.entidad_destino_id : c.entidad_origen_id;
              const otherCoords = lookup[otherId];
              if (otherCoords) bounds.extend(otherCoords);
            }
            fitBoundsLocked(bounds, { padding: 120, maxZoom: 15, speed: 0.5 });
          } else {
            easeToLocked({ center: coordinates, zoom: 14, duration: 2500 });
          }

          const mostrarPopup = () => {
            popupRef.current = new mapboxgl.Popup({ offset: 15, closeButton: false, closeOnClick: false, maxWidth: "320px" })
              .setLngLat(coordinates)
              .setHTML(buildEntityPopupHtml(props, coordinates))
              .addTo(map);

            popupRef.current.on("close", () => {
              const m = mapRef.current;
              if (m && m.getLayer("capa-puntos")) {
                m.setFilter("capa-puntos", savedPuntosFilterRef.current);
                savedPuntosFilterRef.current = null;
              }
              limpiarConexiones(m);
            });

            if (props.id) {
              dibujarConexiones(props.id, coordinates, map, conexionesData);
              if (map.getLayer("capa-puntos")) {
                savedPuntosFilterRef.current = map.getFilter("capa-puntos");
                const ids = recorridoRouteDataRef.current ? recorridoRouteDataRef.current.entityIds : [];
                const allIds = [...ids, props.id];
                for (const c of conexionesData) {
                  const isOrigin = c.entidad_origen_id === props.id;
                  const otherId = isOrigin ? c.entidad_destino_id : c.entidad_origen_id;
                  if (!allIds.includes(otherId)) allIds.push(otherId);
                }
                map.setFilter("capa-puntos", ["in", ["get", "id"], ["literal", allIds]]);
              }
            }
          };

          if (map.isMoving()) { map.once("moveend", mostrarPopup); } else { mostrarPopup(); }
        });

        // Click on map background: close popups
        map.on("click", (e) => {
          if (!popupRef.current && !useMapStore.getState()._recorridoPopup) return;
          const underPoint = map.queryRenderedFeatures(e.point, { layers: ["capa-puntos"] });
          if (underPoint.length > 0) return;
          const styleLayers = map.getStyle()?.layers || [];
          for (const l of styleLayers) {
            if (l.id.startsWith("capa-conexiones-") && map.getLayer(l.id)) {
              const underLine = map.queryRenderedFeatures(e.point, { layers: [l.id] });
              if (underLine.length > 0) return;
            }
          }
          if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
          setRecorridoPopup(null);
          if (map.getLayer("capa-puntos")) {
            if (savedPuntosFilterRef.current !== null) {
              map.setFilter("capa-puntos", savedPuntosFilterRef.current);
              savedPuntosFilterRef.current = null;
            } else if (recorridoRouteDataRef.current) {
              map.setFilter("capa-puntos", ["in", ["get", "id"], ["literal", recorridoRouteDataRef.current.entityIds]]);
            }
          }
          limpiarConexiones(map);
          setEntityActive(false);
        });
      } else if (showControls) {
        map.getSource("puntos-chaco").setData(geoDataClean);
        map.setLayoutProperty("capa-puntos", "visibility", "visible");
        map.setPaintProperty("capa-puntos", "icon-opacity", 1);
      }

      // Apply filters
      if (map.getLayer("capa-puntos")) {
        if (recorridoRouteDataRef.current) {
          const entIds = recorridoRouteDataRef.current.entityIds;
          map.setFilter("capa-puntos", ["in", ["get", "id"], ["literal", entIds]]);
        } else {
          let filtroFinal = ["all"];
          if (filtro !== "todos") filtroFinal.push(["==", ["get", "tipo"], filtro]);
          if (filtroLocalidad) filtroFinal.push(["==", ["get", "localidad_id"], parseInt(filtroLocalidad)]);
          if (terminoBusqueda) {
            filtroFinal.push(["match", ["index-of", terminoBusqueda.toLowerCase(), ["downcase", ["get", "nombre"]]], -1, false, true]);
          }
          map.setFilter("capa-puntos", filtroFinal.length > 1 ? filtroFinal : null);
        }
      }
    };

    if (map.isStyleLoaded()) { inicializarCapaYRecursos(); } else { map.once("idle", inicializarCapaYRecursos); }
  }, [geoData, departamentos, filtro, filtroLocalidad, terminoBusqueda, showControls]);

  return { showDepartamentosRef };
}
