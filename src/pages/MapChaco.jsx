import { useRef, useEffect, useState, useCallback } from "react";
import { track } from "../utils/tracking";
import { optimizarUrlCloudinary } from "../utils/imageUrl";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/MapPage.css";
import "../styles/MapChaco.css";
import { FooterComponent } from "../components/FooterComponent";
import { guardarEstadoMapa } from "../utils/mapUtils";
import { WelcomeOverlay } from "../components/map/WelcomeOverlay";
import { EscHint } from "../components/map/EscHint";
import { RecorridoPopup } from "../components/map/RecorridoPopup";
import { SpeechBubble } from "../components/map/SpeechBubble";
import { LocalidadDetailPanel } from "../components/map/LocalidadDetailPanel";
import { HistoricalPanel } from "../components/map/HistoricalPanel";
import { buildEntityPopupHtml } from "../components/map/EntityPopup";
import { useMapConexiones } from "../hooks/useMapConexiones";
import { useMapRecorridos } from "../hooks/useMapRecorridos";
import { useMapCapasHistoricas } from "../hooks/useMapCapasHistoricas";
import { useMapIntro } from "../hooks/useMapIntro";
import { useMapLayerSetup } from "../hooks/useMapLayerSetup";
import { useMapStore } from "../store/useMapStore";
import { useSocketEvent } from "../hooks/useSocket";
import { SEO } from "../components/SEO";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;
window.__guardarEstadoMapa = guardarEstadoMapa;

export const MapChaco = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const darkMode = useMapStore((s) => s.darkMode);
  const filtro = useMapStore((s) => s.filtro);
  const setFiltro = useMapStore((s) => s.setFiltro);
  const terminoBusqueda = useMapStore((s) => s.searchTerm);
  const setTerminoBusqueda = useMapStore((s) => s.setSearchTerm);
  const filtroLocalidad = useMapStore((s) => s.filtroLocalidad);
  const setFiltroLocalidad = useMapStore((s) => s.setFiltroLocalidad);
  const recorridoActivo = useMapStore((s) => s.recorridoActivo);
  const setRecorridoActivo = useMapStore((s) => s.setRecorridoActivo);
  const panelOpen = useMapStore((s) => s.panelOpen);
  const setHeaderVisible = useMapStore((s) => s.setHeaderVisible);
  const setGeolocateControl = useMapStore((s) => s.setGeolocateControl);
  const setMapInstance = useMapStore((s) => s.setMapInstance);
  const searchSelectToken = useMapStore((s) => s._searchSelectToken);
  const resetMapToken = useMapStore((s) => s._resetMapToken);
  const recorridoFlyToken = useMapStore((s) => s._recorridoFlyToken);
  const histCapas = useMapStore((s) => s.capasHistoricas);
  const histAño = useMapStore((s) => s.añoHistorico);
  const anyHistoricalActive = useMapStore((s) => Object.values(s.capasHistoricas).some(Boolean));

  const [localidades, setLocalidades] = useState([]);
  const [departamentos, setDepartamentos] = useState(null);
  const [provincia, setProvincia] = useState(null);
  const [showDepartamentos, setShowDepartamentos] = useState(false);
  const [capasGeoData, setCapasGeoData] = useState(null);
  const [historicalLayersReady, setHistoricalLayersReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [showEscHint, setShowEscHint] = useState(false);
  const [entityActive, setEntityActive] = useState(false);
  const [recorridoPopup, setRecorridoPopup] = useState(null);
  const popupRef = useRef(null);
  const escHintTimerRef = useRef(null);
  const returningRef = useRef(false);
  const entidadCoordsRef = useRef({});
  const entidadDataRef = useRef({});
  const lastClickedEntityRef = useRef(null);
  const clickResetFilterRef = useRef(false);
  const filtroRef = useRef(filtro);
  const filtroLocalidadRef = useRef(filtroLocalidad);

  const { limpiarConexiones, dibujarConexiones } = useMapConexiones(entidadCoordsRef, entidadDataRef, popupRef);
  const { limpiarRutaRecorrido, recorridoRouteDataRef, savedPuntosFilterRef, prevRecorridoRef, recorridoLayerRef, recorridoGlowLayerRef, recorridoSourceRef, routeAnimRef } = useMapRecorridos();
  const { inicializar: initCapas, actualizar: updateCapas, limpiar: limpiarCapas } = useMapCapasHistoricas();

  const [socketRefresh, setSocketRefresh] = useState(0);
  useSocketEvent("entidad:change", () => setSocketRefresh((t) => t + 1));
  useSocketEvent("recorrido:change", () => setSocketRefresh((t) => t + 1));
  useSocketEvent("localidad:change", () => setSocketRefresh((t) => t + 1));

  // ── Map interaction helpers ──────────────────────────────────
  const disableMapInteractions = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.dragPan.disable(); map.scrollZoom.disable(); map.boxZoom.disable();
    map.doubleClickZoom.disable(); map.touchZoomRotate.disable();
  }, []);

  const enableMapInteractions = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    map.dragPan.enable(); map.scrollZoom.enable(); map.boxZoom.enable();
    map.doubleClickZoom.enable(); map.touchZoomRotate.enable();
  }, []);

  const animLockRef = useRef(null);
  const flyToLocked = useCallback((opts) => {
    const map = mapRef.current;
    if (!map) return;
    disableMapInteractions();
    if (animLockRef.current) clearTimeout(animLockRef.current);
    map.flyTo(opts);
    animLockRef.current = setTimeout(() => enableMapInteractions(), (opts.duration || 1000) + 200);
  }, [disableMapInteractions, enableMapInteractions]);

  const easeToLocked = useCallback((opts) => {
    const map = mapRef.current;
    if (!map) return;
    disableMapInteractions();
    if (animLockRef.current) clearTimeout(animLockRef.current);
    map.easeTo(opts);
    animLockRef.current = setTimeout(() => enableMapInteractions(), (opts.duration || 1000) + 200);
  }, [disableMapInteractions, enableMapInteractions]);

  const fitBoundsLocked = useCallback((bounds, opts) => {
    const map = mapRef.current;
    if (!map) return;
    disableMapInteractions();
    if (animLockRef.current) clearTimeout(animLockRef.current);
    map.fitBounds(bounds, opts);
    animLockRef.current = setTimeout(() => enableMapInteractions(), ((opts && opts.duration) || 1000) + 200);
  }, [disableMapInteractions, enableMapInteractions]);

  // ── Intro ────────────────────────────────────────────────────
  const onIntroComplete = useCallback(() => { setShowControls(true); setHeaderVisible(true); }, [setHeaderVisible]);
  const { introStartedRef, triggerIntro, cleanupAudio } = useMapIntro({ mapRef, disableMapInteractions, enableMapInteractions, onIntroComplete });
  const handleStartExperience = () => { setShowStartOverlay(false); triggerIntro(); };

  // ── Map initialization ───────────────────────────────────────
  const savedState = sessionStorage.getItem("mapState");
  const parsedState = savedState ? JSON.parse(savedState) : null;
  const returningToMap = sessionStorage.getItem("return-to-map") === "true";
  const initialCenter = parsedState ? parsedState.center : returningToMap ? [-60.44, -26.05] : [60.44, 25.4];
  const initialZoom = parsedState ? parsedState.zoom : returningToMap ? 7 : 0;

  useEffect(() => {
    const map = new mapboxgl.Map({ container: mapContainer.current, style: "mapbox://styles/mapbox/streets-v12", center: initialCenter, zoom: initialZoom });
    const geolocateControl = new mapboxgl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserLocation: true, showUserHeading: true });
    map.addControl(geolocateControl, "bottom-left");
    window.__geolocateControl = geolocateControl;
    setGeolocateControl(geolocateControl);
    mapRef.current = map;
    window.__mapInstance = map;
    setMapInstance(map);
    window.__hideEscHint = () => setShowEscHint(false);

    if (parsedState) {
      returningRef.current = true; introStartedRef.current = true;
      setIsLoading(false); setShowStartOverlay(false); setShowControls(true);
      setFiltro(parsedState.filtro || "todos"); setFiltroLocalidad(parsedState.filtroLocalidad || "");
      sessionStorage.removeItem("mapState"); setHeaderVisible(true);
    } else if (returningToMap) {
      sessionStorage.removeItem("return-to-map");
      returningRef.current = true; introStartedRef.current = true;
      setIsLoading(false); setShowStartOverlay(false); setShowControls(true); setHeaderVisible(true);
    } else {
      const applyGrayscale = () => { try { map.getCanvas().classList.add("grayscale-canvas"); } catch (_) {} };
      if (map.isStyleLoaded()) applyGrayscale(); else map.once("style.load", applyGrayscale);
    }

    const flyTarget = sessionStorage.getItem("flyToTarget");
    if (flyTarget) {
      const target = JSON.parse(flyTarget);
      sessionStorage.removeItem("flyToTarget");
      map.once("style.load", () => { flyToLocked({ center: target.center, zoom: target.zoom || 14, speed: 0.3, pitch: 30, essential: true }); });
    }

    return () => {
      sessionStorage.setItem("return-to-map", "true");
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      limpiarCapas(map); map.remove();
      window.__mapInstance = null; setMapInstance(null); setGeolocateControl(null);
      delete window.__geolocateControl; delete window.__hideEscHint;
      cleanupAudio();
    };
  }, []);

  useEffect(() => { filtroRef.current = filtro; filtroLocalidadRef.current = filtroLocalidad; }, [filtro, filtroLocalidad]);

  // ── Data fetching ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    fetch("/api/localidades").then((r) => r.json()).then((d) => { if (!cancelled) setLocalidades(d); }).catch(() => {});
    fetch("/api/departamentos").then((r) => r.json()).then((d) => { if (!cancelled) setDepartamentos(d); }).catch(() => {});
    fetch("/api/provincia").then((r) => r.json()).then((d) => { if (!cancelled) setProvincia(d); }).catch(() => {});
    fetch("/api/mapa-puntos").then((r) => r.json()).then((data) => {
      if (cancelled) return;
      const geojson = { type: "FeatureCollection", features: data.map((punto) => { const { icono: iconoVal, ...resto } = punto; return { type: "Feature", geometry: { type: "Point", coordinates: [parseFloat(punto.longitud), parseFloat(punto.latitud)] }, properties: iconoVal ? { ...resto, icono: iconoVal } : resto }; }) };
      setGeoData(geojson); window.__geoData = geojson;
    }).catch(() => {});
    fetch("/api/capas-historicas").then((r) => r.json()).then((d) => { if (!cancelled) setCapasGeoData(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [socketRefresh]);

  // ── Entity lookups ───────────────────────────────────────────
  useEffect(() => {
    if (!geoData) return;
    const coords = {}; const data = {};
    geoData.features.forEach((f) => { coords[f.properties.id] = f.geometry.coordinates; data[f.properties.id] = f.properties; });
    entidadCoordsRef.current = coords; entidadDataRef.current = data;
  }, [geoData]);

  // ── Historical layers ────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !capasGeoData || !showControls) return;
    const init = () => { initCapas(map, capasGeoData); setHistoricalLayersReady(true); updateCapas(map); };
    if (map.isStyleLoaded()) init(); else map.once("idle", init);
  }, [capasGeoData, showControls]);

  useEffect(() => { const map = mapRef.current; if (!map || !historicalLayersReady) return; updateCapas(map); }, [histCapas, histAño, historicalLayersReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    if (anyHistoricalActive) {
      if (map.getLayer("capa-puntos")) map.setLayoutProperty("capa-puntos", "visibility", "none");
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      limpiarConexiones(map); setEntityActive(false);
      canvas.style.filter = "sepia(0.5) saturate(0.7) brightness(0.85) contrast(1.15)";
      canvas.style.transition = "filter 0.8s ease";
    } else {
      if (map.getLayer("capa-puntos")) map.setLayoutProperty("capa-puntos", "visibility", "visible");
      canvas.style.filter = ""; canvas.style.transition = "";
    }
  }, [anyHistoricalActive, limpiarConexiones]);

  // ── Localidad flyTo ──────────────────────────────────────────
  useEffect(() => {
    if (clickResetFilterRef.current) return;
    const map = mapRef.current;
    if (!map || localidades.length === 0) return;
    if (filtroLocalidad) {
      if (returningRef.current) return;
      const localidad = localidades.find((loc) => loc.id === parseInt(filtroLocalidad));
      if (localidad) flyToLocked({ center: [localidad.longitud, localidad.latitud], zoom: 12, essential: true, speed: 0.8 });
    } else {
      flyToLocked({ center: [-60.44, -26], zoom: 7, essential: true, speed: 0.8 });
    }
  }, [filtroLocalidad]);

  // ── Layer setup (icons, popups, click handlers, filters) ─────
  const { showDepartamentosRef } = useMapLayerSetup({
    mapRef, geoData, departamentos, filtro, filtroLocalidad, terminoBusqueda, showControls,
    returningRef, entidadCoordsRef, entidadDataRef, lastClickedEntityRef, clickResetFilterRef,
    popupRef, setFiltro, setFiltroLocalidad, limpiarConexiones, dibujarConexiones,
    savedPuntosFilterRef, recorridoRouteDataRef, fitBoundsLocked, easeToLocked,
    setEntityActive, setRecorridoPopup,
  });

  // ── Search select ────────────────────────────────────────────
  const handleSearchSelect = useCallback(async (nombre) => {
    if (!nombre || !geoData || !mapRef.current) return;
    const map = mapRef.current;
    const coincidencia = geoData.features.find((f) => f.properties.nombre?.toLowerCase() === nombre.toLowerCase());
    if (!coincidencia) return;
    const coords = coincidencia.geometry.coordinates;
    track("busqueda", coincidencia.properties.id, coincidencia.properties.slug);
    if (popupRef.current) popupRef.current.remove();
    limpiarConexiones(map);

    let conexData = [];
    try { const r = await fetch(`/api/entidades/${coincidencia.properties.id}/conexiones`); conexData = await r.json(); } catch (_) {}
    lastClickedEntityRef.current = coincidencia.properties.id;
    setEntityActive(true);

    const bounds = new mapboxgl.LngLatBounds(coords, coords);
    const lookup = entidadCoordsRef.current;
    for (const c of conexData) {
      const otherId = c.entidad_origen_id === coincidencia.properties.id ? c.entidad_destino_id : c.entidad_origen_id;
      const otherCoords = lookup[otherId];
      if (otherCoords) bounds.extend(otherCoords);
    }
    fitBoundsLocked(bounds, { padding: 120, maxZoom: 15, speed: 0.5 });

    popupRef.current = new mapboxgl.Popup({ offset: 15, closeButton: false, closeOnClick: false, maxWidth: "320px" })
      .setLngLat(coords)
      .setHTML(buildEntityPopupHtml(coincidencia.properties, coords))
      .addTo(map);
    popupRef.current.on("close", () => {
      const m = mapRef.current;
      if (m && m.getLayer("capa-puntos")) {
        if (savedPuntosFilterRef.current !== null) { m.setFilter("capa-puntos", savedPuntosFilterRef.current); savedPuntosFilterRef.current = null; }
        else if (recorridoRouteDataRef.current) m.setFilter("capa-puntos", ["in", ["get", "id"], ["literal", recorridoRouteDataRef.current.entityIds]]);
      }
      limpiarConexiones(m);
    });

    dibujarConexiones(coincidencia.properties.id, coords, map, conexData);
    if (map.getLayer("capa-puntos")) {
      savedPuntosFilterRef.current = map.getFilter("capa-puntos");
      const ids = recorridoRouteDataRef.current ? recorridoRouteDataRef.current.entityIds : [];
      const allIds = [...ids, coincidencia.properties.id];
      for (const c of conexData) {
        const otherId = c.entidad_origen_id === coincidencia.properties.id ? c.entidad_destino_id : c.entidad_origen_id;
        if (!allIds.includes(otherId)) allIds.push(otherId);
      }
      map.setFilter("capa-puntos", ["in", ["get", "id"], ["literal", allIds]]);
    }
    setTerminoBusqueda(nombre);
  }, [geoData, limpiarConexiones, dibujarConexiones, setTerminoBusqueda]);

  // ── Recorrido route drawing ──────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;
    const coords = entidadCoordsRef.current;

    const dibujarRuta = async () => {
      limpiarRutaRecorrido(map); limpiarConexiones(map);
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      if (!recorridoActivo) {
        if (prevRecorridoRef.current) { if (map.getLayer("capa-puntos")) map.setFilter("capa-puntos", null); }
        if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
        setRecorridoPopup(null); prevRecorridoRef.current = null; return;
      }

      let recorridoData;
      try { const res = await fetch(`/api/recorridos/${recorridoActivo.slug}`); if (!res.ok) throw new Error(); recorridoData = await res.json(); } catch { return; }
      const pasos = recorridoData.pasos || [];
      if (pasos.length < 2) return;

      const routeCoords = []; const entityIds = [];
      for (const p of pasos) { const c = coords[p.entidad_id]; if (c) { routeCoords.push(c); entityIds.push(p.entidad_id); } }
      if (routeCoords.length < 2) return;

      const generarCurvaRuta = (from, to) => {
        const [lng1, lat1] = from; const [lng2, lat2] = to;
        const dlng = lng2 - lng1; const dlat = lat2 - lat1;
        const dist = Math.sqrt(dlng * dlng + dlat * dlat) || 0.001;
        const gap = Math.min(0.003, dist * 0.3); const ratio = gap / dist;
        const f1 = [lng1 + dlng * ratio, lat1 + dlat * ratio]; const f2 = [lng2 - dlng * ratio, lat2 - dlat * ratio];
        const steps = 30; const points = [];
        const midLng = (f1[0] + f2[0]) / 2; const midLat = (f1[1] + f2[1]) / 2;
        const d = Math.sqrt((f2[0] - f1[0]) ** 2 + (f2[1] - f1[1]) ** 2) || 0.001;
        const offsetAmt = d * 0.12;
        const cpLng = midLng + (-(f2[1] - f1[1]) / d) * offsetAmt; const cpLat = midLat + ((f2[0] - f1[0]) / d) * offsetAmt;
        for (let i = 0; i <= steps; i++) { const t = i / steps; const t1 = 1 - t; points.push([t1 * t1 * f1[0] + 2 * t1 * t * cpLng + t * t * f2[0], t1 * t1 * f1[1] + 2 * t1 * t * cpLat + t * t * f2[1]]); }
        return points;
      };

      let allRoutePoints = [];
      for (let i = 0; i < routeCoords.length - 1; i++) { allRoutePoints = allRoutePoints.concat(generarCurvaRuta(routeCoords[i], routeCoords[i + 1])); }
      if (allRoutePoints.length < 2) return;

      const sourceId = `ruta-recorrido-${recorridoActivo.id}`; const layerId = `capa-ruta-recorrido-${recorridoActivo.id}`; const glowLayerId = `capa-ruta-glow-${recorridoActivo.id}`;
      recorridoRouteDataRef.current = { sourceId, layerId, entityIds };
      if (routeAnimRef.current) { cancelAnimationFrame(routeAnimRef.current); routeAnimRef.current = null; }

      map.addSource(sourceId, { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: allRoutePoints.slice(0, Math.min(4, allRoutePoints.length)) } } });
      map.addLayer({ id: glowLayerId, type: "line", source: sourceId, paint: { "line-color": "#42A5F5", "line-width": 10, "line-opacity": 0.2, "line-blur": 3 }, layout: { "line-join": "round", "line-cap": "round" } });
      map.addLayer({ id: layerId, type: "line", source: sourceId, paint: { "line-color": "#42A5F5", "line-width": 3, "line-opacity": 1 }, layout: { "line-join": "round", "line-cap": "round" } });

      recorridoSourceRef.current = sourceId; recorridoLayerRef.current = layerId; recorridoGlowLayerRef.current = glowLayerId;

      const duracionMs = 2000; const fpsRuta = 30; const totalFrames = Math.ceil(duracionMs / (1000 / fpsRuta)); let frame = 0;
      const anim = setInterval(() => {
        frame++; const progress = Math.min(frame / totalFrames, 1);
        if (!map || !map.getSource(sourceId)) { clearInterval(anim); return; }
        map.getSource(sourceId).setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: allRoutePoints.slice(0, Math.max(2, Math.ceil(allRoutePoints.length * progress))) } });
        if (frame >= totalFrames) clearInterval(anim);
      }, 1000 / fpsRuta);
      routeAnimRef.current = anim;

      if (map.getLayer("capa-puntos")) map.setFilter("capa-puntos", ["in", ["get", "id"], ["literal", entityIds]]);
      const bounds = new mapboxgl.LngLatBounds(); routeCoords.forEach((c) => bounds.extend(c));
      fitBoundsLocked(bounds, { padding: 120, maxZoom: 14, speed: 0.8 });
      map.once("moveend", () => { if (!recorridoActivo) return; setRecorridoPopup({ nombre: recorridoActivo.nombre || "Recorrido", slug: recorridoActivo.slug || "" }); });
      prevRecorridoRef.current = recorridoActivo;
    };

    dibujarRuta();
  }, [recorridoActivo, geoData]);

  // ── Escape key ───────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== "Escape") return;
      const map = mapRef.current;
      setShowEscHint(false); setEntityActive(false); setRecorridoPopup(null);
      if (map) limpiarConexiones(map);
      lastClickedEntityRef.current = null;
      if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
      setFiltro("todos"); setFiltroLocalidad(""); setTerminoBusqueda(""); setRecorridoActivo(null);
      if (map) { limpiarRutaRecorrido(map); flyToLocked({ center: [-60.44, -26.05], zoom: 7, speed: 0.8, essential: true }); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleResetMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    setEntityActive(false); setRecorridoPopup(null); limpiarConexiones(map);
    lastClickedEntityRef.current = null;
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
    setFiltro("todos"); setFiltroLocalidad(""); setTerminoBusqueda(""); setRecorridoActivo(null);
    limpiarRutaRecorrido(map);
    flyToLocked({ center: [-60.44, -26.05], zoom: 7, speed: 0.8, essential: true });
  }, []);

  const handleRecorridoFly = useCallback(() => {
    const map = mapRef.current;
    if (map) flyToLocked({ center: [-60.44, -26.05], zoom: 7, speed: 0.8, essential: true });
  }, []);

  // ── Store watchers ───────────────────────────────────────────
  useEffect(() => { if (searchSelectToken === 0) return; handleSearchSelect(useMapStore.getState().searchTerm); }, [searchSelectToken, handleSearchSelect]);
  useEffect(() => { if (resetMapToken === 0) return; handleResetMap(); }, [resetMapToken, handleResetMap]);
  useEffect(() => { if (recorridoFlyToken === 0) return; handleRecorridoFly(); }, [recorridoFlyToken, handleRecorridoFly]);

  // ── Dark mode ────────────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem("made-in-chaco-dark-mode", darkMode);
    const map = mapRef.current;
    if (!map) return;
    const canvas = map.getCanvas();
    canvas.style.filter = darkMode ? "brightness(0.7) saturate(0.6) invert(0.92) hue-rotate(180deg)" : "";
    canvas.style.transition = "filter 0.5s ease";
    canvas.classList.remove("grayscale-canvas");
  }, [darkMode]);

  // ── Filter clearing ──────────────────────────────────────────
  useEffect(() => {
    if (clickResetFilterRef.current) { clickResetFilterRef.current = false; return; }
    const map = mapRef.current;
    if (map) limpiarConexiones(map);
    if (map) limpiarRutaRecorrido(map);
    if (popupRef.current) { popupRef.current.remove(); popupRef.current = null; }
    setRecorridoActivo(null);
  }, [filtro, filtroLocalidad, terminoBusqueda, limpiarConexiones, limpiarRutaRecorrido]);

  // ── ESC hint timer ───────────────────────────────────────────
  useEffect(() => {
    const anyActive = filtro !== "todos" || filtroLocalidad !== "" || recorridoActivo !== null || entityActive;
    if (escHintTimerRef.current) { clearTimeout(escHintTimerRef.current); escHintTimerRef.current = null; }
    if (anyActive) { escHintTimerRef.current = setTimeout(() => setShowEscHint(true), 10000); } else { setShowEscHint(false); }
    return () => { if (escHintTimerRef.current) { clearTimeout(escHintTimerRef.current); escHintTimerRef.current = null; } };
  }, [filtro, filtroLocalidad, recorridoActivo, entityActive]);

  // ── Fallback: triggerIntro when geoData arrives late ─────────
  useEffect(() => {
    if (geoData && !showStartOverlay && isLoading && !introStartedRef.current) triggerIntro();
  }, [geoData, showStartOverlay, isLoading, triggerIntro]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className={darkMode ? "dark-mode" : ""} style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden" }}>
      <SEO title="Mapa Interactivo" description="Explorá el mapa interactivo de Made in Chaco y descubrí emprendedores, cultura, turismo y tradiciones de toda la provincia." />
      {showStartOverlay && <WelcomeOverlay onClick={handleStartExperience} />}
      {showEscHint && <EscHint onDismiss={() => setShowEscHint(false)} />}
      {recorridoPopup && <RecorridoPopup nombre={recorridoPopup.nombre} slug={recorridoPopup.slug} onDismiss={() => setRecorridoPopup(null)} />}
      {filtroLocalidad && (() => { const loc = localidades.find((l) => l.id === parseInt(filtroLocalidad)); if (!loc) return null; return <LocalidadDetailPanel localidad={loc} panelOpen={panelOpen} />; })()}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 500, opacity: showControls ? 1 : 0, transform: showControls ? "translateY(0)" : "translateY(10px)", transition: "opacity 0.8s ease, transform 0.8s ease", pointerEvents: showControls ? "auto" : "none" }}>
        <FooterComponent localidades={localidades} showDepartamentos={showDepartamentos} onToggleDepartamentos={(val) => {
          setShowDepartamentos(val);
          const map = window.__mapInstance;
          if (map?.getLayer("capa-departamentos-lineas")) map.setLayoutProperty("capa-departamentos-lineas", "visibility", val ? "visible" : "none");
        }} />
      </div>
      <div ref={mapContainer} className="map-container" style={{ width: "100%", height: "100vh" }} />
      {showControls && provincia && <SpeechBubble mapRef={mapRef} provincia={provincia} />}
      {showControls && capasGeoData && <HistoricalPanel />}
    </div>
  );
};
