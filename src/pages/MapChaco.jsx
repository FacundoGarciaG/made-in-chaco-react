import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { FooterComponent } from "../components/FooterComponent";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Estilos para la animación del overlay de bienvenida
const welcomeOverlayStyles = `
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 1;
    }
    50% {
      transform: scale(1.1);
      opacity: 0.8;
    }
  }
`;

// Guarda el estado del mapa en sessionStorage y navega sin recargar
window.__guardarEstadoMapa = function (linkEl) {
  const map = window.__mapInstance;
  if (map) {
    const center = map.getCenter();
    const filtros = window.__filtrosActuales || {};
    sessionStorage.setItem(
      "mapState",
      JSON.stringify({
        center: [center.lng, center.lat],
        zoom: map.getZoom(),
        bearing: map.getBearing(),
        pitch: map.getPitch(),
        filtro: filtros.filtro || "todos",
        filtroLocalidad: filtros.filtroLocalidad || "",
      }),
    );
  }
  if (linkEl) {
    const href = linkEl.getAttribute?.("href") || linkEl.href;
    history.pushState(null, "", href);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  return false;
};

export const MapChaco = () => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('made-in-chaco-dark-mode') === 'true');
  const [filtro, setFiltro] = useState("todos");
  const [terminoBusqueda, setTerminoBusqueda] = useState("");
  const [localidades, setLocalidades] = useState([]);
  const [departamentos, setDepartamentos] = useState(null);
  const [filtroLocalidad, setFiltroLocalidad] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [recorridoActivo, setRecorridoActivo] = useState(null);
  const [showEscHint, setShowEscHint] = useState(false);
  const [entityActive, setEntityActive] = useState(false);
  const [recorridoPopup, setRecorridoPopup] = useState(null);
  const popupRef = useRef(null);
  const audioRef = useRef(null);
  const escHintTimerRef = useRef(null);
  const returningRef = useRef(false); // ref síncrona para suprimir flyTo inicial
  const conexionesLayerRef = useRef(null);
  const conexionesSourceRef = useRef(null);
  const recorridoLayerRef = useRef(null);
  const recorridoGlowLayerRef = useRef(null);
  const recorridoSourceRef = useRef(null);
  const recorridoRouteDataRef = useRef(null);
  const routeAnimRef = useRef(null);
  const prevRecorridoRef = useRef(null);
  const hoveredLineIdRef = useRef(null);
  const entidadCoordsRef = useRef({});
  const entidadDataRef = useRef({});
  const lastClickedEntityRef = useRef(null);
  const clickResetFilterRef = useRef(false);
  const filtroRef = useRef(filtro);
  const filtroLocalidadRef = useRef(filtroLocalidad);

  // 0. Restaurar estado del mapa al volver
  const savedState = sessionStorage.getItem("mapState");
  const parsedState = savedState ? JSON.parse(savedState) : null;
  const returningToMap = sessionStorage.getItem("return-to-map") === "true";
  const initialCenter = parsedState ? parsedState.center : (returningToMap ? [-60.44, -26.05] : [60.44, 25.4]);
  const initialZoom = parsedState ? parsedState.zoom : (returningToMap ? 7 : 0);

  // 1. Inicializar el mapa y limpiar audio al desmontar
  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: initialZoom,
    });

    const geolocateControl = new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showUserHeading: true,
    });
    map.addControl(geolocateControl, "bottom-left");
    window.__geolocateControl = geolocateControl;

    mapRef.current = map;
    window.__mapInstance = map;
    window.__hideEscHint = () => setShowEscHint(false);

    // Si venimos de una entidad, saltar overlay y restaurar filtros
    if (parsedState) {
      returningRef.current = true;
      introStartedRef.current = true;
      setIsLoading(false);
      setShowStartOverlay(false);
      setShowControls(true);
      setFiltro(parsedState.filtro || "todos");
      setFiltroLocalidad(parsedState.filtroLocalidad || "");
      sessionStorage.removeItem("mapState");
      window.dispatchEvent(new CustomEvent("header-show"));
      window.dispatchEvent(
        new CustomEvent("header-filter-reset", {
          detail: parsedState.filtro || "todos",
        }),
      );
      window.dispatchEvent(
        new CustomEvent("header-localidad-reset", {
          detail: parsedState.filtroLocalidad || "",
        }),
      );
    } else if (returningToMap) {
      // Volviendo de otra pagina (ej. recorridos): sin intro, directo a la provincia
      sessionStorage.removeItem("return-to-map");
      returningRef.current = true;
      introStartedRef.current = true;
      setIsLoading(false);
      setShowStartOverlay(false);
      setShowControls(true);
      window.dispatchEvent(new CustomEvent("header-show"));
    } else {
      // Primera visita: mapa en blanco y negro desde el inicio
      const applyGrayscale = () => {
        try { map.getCanvas().classList.add('grayscale-canvas'); } catch (_) {}
      };
      if (map.isStyleLoaded()) {
        applyGrayscale();
      } else {
        map.once('style.load', applyGrayscale);
      }
    }

    // FlyTo target desde mini-mapa de entidad
    const flyTarget = sessionStorage.getItem("flyToTarget");
    if (flyTarget) {
      const target = JSON.parse(flyTarget);
      sessionStorage.removeItem("flyToTarget");
      map.once("style.load", () => {
        map.flyTo({
          center: target.center,
          zoom: target.zoom || 14,
          speed: 0.3,
          curve: 1.5,
          pitch: 30,
          essential: true,
        });
      });
    }
    return () => {
      // Guardar flag para saltar intro si vuelve a esta pagina
      sessionStorage.setItem("return-to-map", "true");
      // Remover popups antes de destruir el mapa para evitar errores
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      map.remove();
      delete window.__mapInstance;
      delete window.__geolocateControl;
      delete window.__hideEscHint;
      // Limpiar referencia de audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
    };
  }, []);

  // Sincronizar window.__filtrosActuales cada vez que cambian los filtros
  useEffect(() => {
    filtroRef.current = filtro;
    filtroLocalidadRef.current = filtroLocalidad;
    window.__filtrosActuales = { filtro, filtroLocalidad, terminoBusqueda };
  }, [filtro, filtroLocalidad, terminoBusqueda]);

  // Ref para saber si el usuario ya hizo click en el overlay
  const introStartedRef = useRef(false);

  const triggerIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map || introStartedRef.current) return;
    introStartedRef.current = true;

    // 1. BLOQUEAR interacción del usuario
    map.dragPan.disable();
    map.scrollZoom.disable();
    map.boxZoom.disable();
    map.doubleClickZoom.disable();
    map.touchZoomRotate.disable();

    // Crear elemento de audio
    const audio = new Audio("/audios/Intro.wav");
    audio.volume = 0.7;
    audioRef.current = audio;

    // Poner el mapa en blanco y negro antes del flyTo
    const canvas = map.getCanvas();
    canvas.style.filter = 'grayscale(1)';
    canvas.style.transition = 'filter 0.1s linear';

    // Animar de BW a color durante el flyTo
    const onMove = () => {
      const progress = Math.min(map.getZoom() / 7, 1);
      canvas.style.filter = `grayscale(${1 - progress})`;
    };
    map.on('move', onMove);

    // setTimeout para dar respiro al navegador
    const timerId = setTimeout(() => {
      // Intentar reproducir audio
      audio.play()
        .then(() => console.log("Audio de intro reproducido correctamente"))
        .catch(() => {
          // Reintentar una vez
          setTimeout(() => audio.play().catch(() => { audioRef.current = null; }), 200);
        });

      map.flyTo({
        center: [-60.44, -26.05],
        zoom: 7,
        speed: 0.2,
        curve: 1.5,
        essential: true,
      });
    }, 500);

    // RE-ACTIVAR interacción cuando termine el movimiento
    map.once("moveend", () => {
      canvas.style.filter = 'grayscale(0)';
      canvas.style.transition = 'none';
      map.off('move', onMove);

      map.dragPan.enable();
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();

      if (map.getLayer("capa-puntos")) {
        map.setLayoutProperty("capa-puntos", "visibility", "visible");
        map.setPaintProperty("capa-puntos", "icon-opacity", 1);
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setIsLoading(false);
      setTimeout(() => {
        setShowControls(true);
        window.dispatchEvent(new CustomEvent("header-show"));
      }, 100);
    });
  }, []);

  // Función para iniciar la experiencia
  const handleStartExperience = () => {
    setShowStartOverlay(false);
    triggerIntro();
  };

  // Fallback: si geoData llega DESPUÉS del click (antes de que triggerIntro se llamara)
  useEffect(() => {
    if (geoData && !showStartOverlay && isLoading && !introStartedRef.current) {
      triggerIntro();
    }
  }, [geoData, showStartOverlay, isLoading, triggerIntro]);

  // 2. Traer datos de la API
  useEffect(() => {
    let cancelled = false;
    // Cargar localidades
    fetch("/api/localidades")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setLocalidades(data); })
      .catch((err) => console.error("Error cargando localidades:", err));

    // Cargar departamentos (polígonos)
    fetch("/api/departamentos")
      .then((res) => res.json())
      .then((data) => { if (!cancelled) setDepartamentos(data); })
      .catch((err) => console.error("Error cargando departamentos:", err));

    // Cargar puntos del mapa
    fetch("/api/mapa-puntos")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const geojson = {
          type: "FeatureCollection",
          features: data.map((punto) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [parseFloat(punto.longitud), parseFloat(punto.latitud)],
            },
            properties: { ...punto },
          })),
        };
        setGeoData(geojson);
        window.__geoData = geojson;
      })
      .catch((err) => console.error("Error cargando GeoJSON:", err));
    return () => { cancelled = true; };
  }, []);

  // Construir lookups por ID de entidad
  useEffect(() => {
    if (!geoData) return;
    const coords = {};
    const data = {};
    geoData.features.forEach((f) => {
      coords[f.properties.id] = f.geometry.coordinates;
      data[f.properties.id] = f.properties;
    });
    entidadCoordsRef.current = coords;
    entidadDataRef.current = data;
  }, [geoData]);

  // Limpiar líneas de conexión
  const limpiarConexiones = useCallback((map) => {
    hoveredLineIdRef.current = null;
    try {
      if (conexionesLayerRef.current && map?.getLayer(conexionesLayerRef.current)) {
        map.removeLayer(conexionesLayerRef.current);
        conexionesLayerRef.current = null;
      }
      if (conexionesSourceRef.current && map?.getSource(conexionesSourceRef.current)) {
        map.removeSource(conexionesSourceRef.current);
        conexionesSourceRef.current = null;
      }
    } catch (_) {}
  }, []);

  // Limpiar ruta del recorrido
  const limpiarRutaRecorrido = useCallback((map) => {
    if (routeAnimRef.current) {
      clearInterval(routeAnimRef.current);
      routeAnimRef.current = null;
    }
    if (recorridoGlowLayerRef.current && map?.getLayer(recorridoGlowLayerRef.current)) {
      map.removeLayer(recorridoGlowLayerRef.current);
      recorridoGlowLayerRef.current = null;
    }
    if (recorridoLayerRef.current && map?.getLayer(recorridoLayerRef.current)) {
      map.removeLayer(recorridoLayerRef.current);
      recorridoLayerRef.current = null;
    }
    if (recorridoSourceRef.current && map?.getSource(recorridoSourceRef.current)) {
      map.removeSource(recorridoSourceRef.current);
      recorridoSourceRef.current = null;
    }
    recorridoRouteDataRef.current = null;
  }, []);

  // Generar curva bezier entre dos puntos con gap visual en los extremos
  const generarCurva = useCallback((from, to) => {
    const [lng1, lat1] = from;
    const [lng2, lat2] = to;
    const dlng = lng2 - lng1;
    const dlat = lat2 - lat1;
    const dist = Math.sqrt(dlng * dlng + dlat * dlat) || 0.001;
    // Acortar los extremos ~0.001° para dejar espacio entre la línea y el ícono
    const gap = Math.min(0.001, dist * 0.15);
    const ratio = gap / dist;
    const f1 = [lng1 + dlng * ratio, lat1 + dlat * ratio];
    const f2 = [lng2 - dlng * ratio, lat2 - dlat * ratio];
    const steps = 30;
    const points = [];
    const midLng = (f1[0] + f2[0]) / 2;
    const midLat = (f1[1] + f2[1]) / 2;
    const d2 = Math.sqrt((f2[0] - f1[0]) ** 2 + (f2[1] - f1[1]) ** 2) || 0.001;
    const offsetAmt = d2 * 0.12;
    const cpLng = midLng + (-(f2[1] - f1[1]) / d2) * offsetAmt;
    const cpLat = midLat + ((f2[0] - f1[0]) / d2) * offsetAmt;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const t1 = 1 - t;
      points.push([
        t1 * t1 * f1[0] + 2 * t1 * t * cpLng + t * t * f2[0],
        t1 * t1 * f1[1] + 2 * t1 * t * cpLat + t * t * f2[1],
      ]);
    }
    return points;
  }, []);

  // Dibujar líneas de conexión con animación de trazado
  const dibujarConexiones = useCallback(async (entityId, clickedCoords, map, existingData) => {
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
      } catch (_) { return; }
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
          "match", ["get", "tipo"],
          "artesano", "#ff5722", "gastronomia", "#4caf50",
          "comercio", "#2196f3", "evento", "#9c27b0",
          "patrimonio", "#795548", "personalidad", "#e91e63",
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

    // Hover: resaltar solo la línea hovereada con feature-state
    map.on("mouseenter", layerId, (e) => {
      map.getCanvas().style.cursor = "";
      const fid = e.features?.[0]?.id;
      if (fid != null) {
        if (hoveredLineIdRef.current != null) {
          map.setFeatureState({ source: sourceId, id: hoveredLineIdRef.current }, { hover: false });
        }
        hoveredLineIdRef.current = fid;
        map.setFeatureState({ source: sourceId, id: fid }, { hover: true });
      }
    });
    map.on("mouseleave", layerId, () => {
      map.getCanvas().style.cursor = "";
      if (hoveredLineIdRef.current != null) {
        try { map.setFeatureState({ source: sourceId, id: hoveredLineIdRef.current }, { hover: false }); } catch (_) {}
        hoveredLineIdRef.current = null;
      }
    });

    conexionesSourceRef.current = sourceId;
    conexionesLayerRef.current = layerId;

    // Animación de trazado progresivo
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

    // Actualizar popup con chips de entidades conectadas
    if (conectados.length > 0 && popupRef.current) {
      const popupEl = popupRef.current.getElement();
      const container = popupEl?.querySelector(".conexiones-container");
      if (container) {
        container.innerHTML = conectados
          .map((c) => {
            const chipColor = ({ artesano: "#ff5722", gastronomia: "#4caf50", comercio: "#2196f3", evento: "#9c27b0", patrimonio: "#795548", personalidad: "#e91e63" })[c.tipo] || "#863819";
            return `<a href="/entidad/${c.slug}" onclick="return window.__guardarEstadoMapa(this)" style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;background:${chipColor}15;color:${chipColor};font-size:10px;font-weight:800;letter-spacing:0.5px;text-decoration:none;text-transform:uppercase;white-space:nowrap">${c.nombre}</a>`;
          })
          .join("");
      }
    }
    } catch (err) {
      console.error("Error al cargar conexiones:", err);
    }
  }, [limpiarConexiones, generarCurva]);

  // 3. Efecto para manejar el zoom cuando se selecciona una localidad
  useEffect(() => {
    if (clickResetFilterRef.current) return;
    const map = mapRef.current;
    if (!map || localidades.length === 0) return;

    if (filtroLocalidad) {
      // No volar a la localidad si recién volvemos de detalle (posición ya restaurada)
      if (returningRef.current) return;

      // Buscar las coordenadas de la localidad seleccionada
      const localidad = localidades.find(
        (loc) => loc.id === parseInt(filtroLocalidad),
      );
      if (localidad) {
        map.flyTo({
          center: [localidad.longitud, localidad.latitud],
          zoom: 12,
          essential: true,
          speed: 0.8, // Rápido para filtros
        });
      }
    } else {
      // Volver al zoom original de la provincia
      map.flyTo({
        center: [-60.44, -26],
        zoom: 7,
        essential: true,
        speed: 0.8, // Rápido para quitar filtro
      });
    }
  }, [filtroLocalidad]); // Solo depender de filtroLocalidad, no de localidades

  // 4. Lógica Unificada: Carga de Iconos, Capas y Filtros
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;

    const inicializarCapaYRecursos = async () => {
      // A. Cargar Imágenes (Promisificado para esperar a que todas carguen)
      const iconos = [
        "artesano",
        "gastronomia",
        "comercio",
        "evento",
        "patrimonio",
        "personalidad",
      ];

      await Promise.all(
        iconos.map((nombre) => {
          return new Promise((resolve) => {
            if (map.hasImage(nombre)) return resolve();
            map.loadImage(`/icons/${nombre}.png`, (error, image) => {
              if (!error && image) map.addImage(nombre, image);
              resolve();
            });
          });
        }),
      );

      // B. Capa de polígonos de departamentos
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
      }

      // C. Configurar Source y Layer de puntos
      if (!map.getSource("puntos-chaco")) {
        map.addSource("puntos-chaco", { type: "geojson", data: geoData });

        // Si venimos de detalle de entidad, la capa se crea visible directamente
        const visibleInicial = returningRef.current ? "visible" : "none";
        const opacidadInicial = returningRef.current ? 1 : 0;

        map.addLayer({
          id: "capa-puntos",
          type: "symbol",
          source: "puntos-chaco",
          layout: {
            "icon-image": ["get", "tipo"],
            "icon-size": 1,
            "icon-allow-overlap": true,
            visibility: visibleInicial,
          },
          paint: {
            // CLAVE 1: Empezamos con opacidad cero
            "icon-opacity": opacidadInicial,
            // CLAVE 2: Definimos una transición de 1000ms (1 segundo)
            "icon-opacity-transition": { duration: 1500 },
          },
        });

        // Después de crear la capa visible, ya podemos permitir flyTo en futuros cambios de filtro
        if (returningRef.current) {
          setTimeout(() => {
            returningRef.current = false;
          }, 0);
        }

        const hoverPopupRef = { current: null };

        // Eventos de Mouse - Popup al hacer hover
        map.on("mouseenter", "capa-puntos", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const coordinates = e.features[0].geometry.coordinates.slice();
          const { nombre } = e.features[0].properties;

          // Cerrar hover popup anterior si existe
          if (hoverPopupRef.current) {
            hoverPopupRef.current.remove();
          }

          // Crear popup minimalista de hover
          const hoverHtml = `
            <div class="hover-popup-text" style="
              padding: 6px 14px;
              font-family: 'Cinzel', serif;
              font-size: 13px;
              font-weight: 700;
              color: #2D1A12;
              white-space: nowrap;
              letter-spacing: 0.5px;
            ">
              ${nombre}
            </div>
          `;

          hoverPopupRef.current = new mapboxgl.Popup({
            offset: 12,
            closeButton: false,
            closeOnClick: false,
          })
            .setLngLat(coordinates)
            .setHTML(hoverHtml)
            .addTo(map);
        });

        map.on("mouseleave", "capa-puntos", () => {
          map.getCanvas().style.cursor = "";
          if (hoverPopupRef.current) {
            hoverPopupRef.current.remove();
            hoverPopupRef.current = null;
          }
        });

        // Evento Click - Popup detallado moderno
        map.on("click", "capa-puntos", async (e) => {
          // Resetear filtros de categoría y localidad
          if (filtroRef.current !== "todos" || filtroLocalidadRef.current !== "") {
            clickResetFilterRef.current = true;
            setFiltro("todos");
            setFiltroLocalidad("");
            window.dispatchEvent(new CustomEvent("header-localidad-reset", { detail: "" }));
          }
          const coordinates = e.features[0].geometry.coordinates.slice();
          const { id, nombre, resumen, slug, tipo, imagen, horario_apertura, horario_cierre, dias_abierto, fecha_evento } = e.features[0].properties;
          const colorMap = {
            artesano: "#ff5722",
            gastronomia: "#4caf50",
            comercio: "#2196f3",
            evento: "#9c27b0",
            patrimonio: "#795548",
            personalidad: "#e91e63",
          };
          const catColor = colorMap[tipo] || "#863819";

          // Limpiar conexiones anteriores
          limpiarConexiones(map);

          // Limpiar hover popup si existe
          if (hoverPopupRef.current) {
            hoverPopupRef.current.remove();
            hoverPopupRef.current = null;
          }

          // Limpiar popup anterior si existe
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }

          // Fetch conexiones para calcular bounds
          let conexionesData = [];
          try {
            const res = await fetch(`/api/entidades/${id}/conexiones`);
            conexionesData = await res.json();
          } catch (_) {}

          // Si es la misma entidad → zoom de cerca; si no → fitBounds para mostrar conexiones
          const isSameEntity = lastClickedEntityRef.current === id;
          lastClickedEntityRef.current = id;
          setEntityActive(true);
          if (isSameEntity) {
            map.flyTo({ center: coordinates, zoom: 14, speed: 0.5, essential: true });
          } else {
            const bounds = new mapboxgl.LngLatBounds(coordinates, coordinates);
            const lookup = entidadCoordsRef.current;
            for (const c of conexionesData) {
              const isOrigin = c.entidad_origen_id === id;
              const otherId = isOrigin ? c.entidad_destino_id : c.entidad_origen_id;
              const otherCoords = lookup[otherId];
              if (otherCoords) bounds.extend(otherCoords);
            }
            map.fitBounds(bounds, { padding: 120, maxZoom: 15, speed: 0.5 });
          }

          // Determinar si el comercio está abierto ahora
          const getOpenBadge = () => {
            if (tipo !== "comercio" || !dias_abierto || !horario_apertura || !horario_cierre) return "";
            const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
            const hoy = diasSemana[new Date().getDay()];
            const dias = dias_abierto.split(",").map((d) => d.trim());
            if (!dias.includes(hoy)) {
              return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#e74c3c15;color:#e74c3c;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Cerrado</span>`;
            }
            const ahora = new Date();
            const [hA, mA] = horario_apertura.split(":").map(Number);
            const [hC, mC] = horario_cierre.split(":").map(Number);
            const minActual = ahora.getHours() * 60 + ahora.getMinutes();
            const minApertura = hA * 60 + mA;
            const minCierre = hC * 60 + mC;
            if (minActual >= minApertura && minActual < minCierre) {
              return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#2e7d3215;color:#2e7d32;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Abierto</span>`;
            }
            return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#e74c3c15;color:#e74c3c;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Cerrado</span>`;
          };
          const openBadge = getOpenBadge();

          const eventBadge = (() => {
            if (tipo !== "evento" || !fecha_evento) return "";
            const diff = Math.ceil((new Date(fecha_evento) - new Date(new Date().toDateString())) / 86400000);
            if (diff === 0) return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#2e7d3215;color:#2e7d32;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">¡Hoy!</span>`;
            if (diff <= 7) return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#f39c1215;color:#f39c12;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">¡Pronto! (${diff}d)</span>`;
            return "";
          })();

          const htmlContent = `
            <div style="
              padding: 16px;
              min-width: 240px;
              max-width: 280px;
              font-family: 'Epilogue', sans-serif;
              position: relative;
            ">
              <div style="
                position: absolute;
                top: 0;
                left: 0;
                width: 4px;
                height: 100%;
                background: ${catColor};
                border-radius: 3px 0 0 3px;
              "></div>
              <div style="margin-left: 8px;">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                  <div style="
                    display: inline-block;
                    padding: 2px 10px;
                    border-radius: 20px;
                    background: ${catColor}15;
                    color: ${catColor};
                    font-size: 10px;
                    font-weight: 800;
                    letter-spacing: 1.2px;
                    text-transform: uppercase;
                  ">${tipo}</div>${openBadge}${eventBadge}
                </div>
                                <div style="display:flex;align-items:center;gap:10px;margin:4px 0 6px 0;">
                  <h3 style="
                    margin:0;
                    flex:1;
                    color: #2D1A12;
                    font-family: 'Cinzel', serif;
                    font-size: 16px;
                    font-weight: 700;
                    line-height: 1.3;
                  ">${nombre}</h3>
                  ${imagen ? `<img src="${imagen}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;" />` : ''}
                </div>
                <p style="
                  font-size: 12px;
                  color: #666;
                  line-height: 1.5;
                  margin: 0 0 12px 0;
                ">${resumen}</p>
                <div class="conexiones-container" style="
                  display: flex;
                  flex-wrap: wrap;
                  gap: 6px;
                  margin-bottom: 10px;
                  min-height: 4px;
                "></div>
                <div>
                  <a href="/entidad/${slug}"
                     onclick="return window.__guardarEstadoMapa(this)"
                     style="
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 8px 18px;
                    background: linear-gradient(135deg, ${catColor}, ${catColor}dd);
                    color: white;
                    text-decoration: none;
                    border-radius: 25px;
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px ${catColor}40;
                  " onmouseenter="this.style.transform='translateY(-1px)';this.style.boxShadow='0 6px 16px ${catColor}60'" onmouseleave="this.style.transform='none';this.style.boxShadow='0 4px 12px ${catColor}40'">
                    Explorar
                    <span style="font-size: 14px; line-height: 1;">→</span>
                  </a>
                  <div style="margin-top: 6px; position: relative; display: inline-block;">
                    <button onclick="
                      var m = this.nextElementSibling;
                      m.style.display = m.style.display === 'flex' ? 'none' : 'flex';
                    " style="
                      display: inline-flex;
                      align-items: center;
                      gap: 4px;
                      padding: 2px 10px;
                      background: transparent;
                      color: #4285F4;
                      border: 1px solid #4285F4;
                      border-radius: 25px;
                      font-size: 10px;
                      font-weight: 600;
                      cursor: pointer;
                      transition: all 0.2s ease;
                      font-family: 'Epilogue', sans-serif;
                      line-height: 1.4;
                    " onmouseenter="this.style.background='rgba(66,133,244,0.08)'" onmouseleave="this.style.background='transparent'">
                      Cómo llegar
                    </button>
                    <div style="
                      display: none;
                      position: absolute;
                      top: 100%;
                      left: 0;
                      margin-top: 6px;
                      background: white;
                      border-radius: 12px;
                      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                      padding: 6px;
                      gap: 4px;
                      z-index: 10;
                      flex-direction: column;
                      min-width: 140px;
                    ">
                      <a href="https://www.google.com/maps/dir/?api=1&destination=${coordinates[1]},${coordinates[0]}"
                         target="_blank" rel="noopener noreferrer"
                         style="
                        display: flex; align-items: center; gap: 8px;
                        padding: 8px 12px; border-radius: 8px;
                        text-decoration: none; font-size: 12px; font-weight: 600;
                        color: #333; transition: background 0.15s;
                      " onmouseenter="this.style.background='#f5f5f5'" onmouseleave="this.style.background='transparent'">
                        <img src="/icons/googlemaps.png" style="width:18px;height:18px;object-fit:contain;" alt=""/> Google Maps
                      </a>
                      <a href="https://waze.com/ul?ll=${coordinates[1]},${coordinates[0]}&navigate=yes"
                         target="_blank" rel="noopener noreferrer"
                         style="
                        display: flex; align-items: center; gap: 8px;
                        padding: 8px 12px; border-radius: 8px;
                        text-decoration: none; font-size: 12px; font-weight: 600;
                        color: #333; transition: background 0.15s;
                      " onmouseenter="this.style.background='#f5f5f5'" onmouseleave="this.style.background='transparent'">
                        <img src="/icons/waze.png" style="width:18px;height:18px;object-fit:contain;" alt=""/> Waze
                      </a>
                      <a href="https://maps.apple.com/?daddr=${coordinates[1]},${coordinates[0]}"
                         target="_blank" rel="noopener noreferrer"
                         style="
                        display: flex; align-items: center; gap: 8px;
                        padding: 8px 12px; border-radius: 8px;
                        text-decoration: none; font-size: 12px; font-weight: 600;
                        color: #333; transition: background 0.15s;
                      " onmouseenter="this.style.background='#f5f5f5'" onmouseleave="this.style.background='transparent'">
                        <img src="/icons/applemaps.png" style="width:18px;height:18px;object-fit:contain;" alt=""/> Apple Maps
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `;

          // Crear nuevo popup y guardarlo en la ref
          popupRef.current = new mapboxgl.Popup({
            offset: 15,
            closeButton: false,
            closeOnClick: false,
            maxWidth: "320px",
          })
            .setLngLat(coordinates)
            .setHTML(htmlContent)
            .addTo(map);

          // Limpiar líneas al cerrar popup
          popupRef.current.on("close", () => {
            const m = mapRef.current;
            if (m && recorridoRouteDataRef.current && m.getLayer("capa-puntos")) {
              m.setFilter("capa-puntos", [
                "in",
                ["get", "id"],
                ["literal", recorridoRouteDataRef.current.entityIds],
              ]);
            }
            limpiarConexiones(m);
          });

          // Cargar y dibujar conexiones
          if (id) {
            dibujarConexiones(id, coordinates, map, conexionesData);
            // Mostrar pines de entidades conectadas si hay recorrido activo
            if (map.getLayer("capa-puntos") && recorridoRouteDataRef.current) {
              const recorridoEntIds = recorridoRouteDataRef.current.entityIds;
              const extraIds = [];
              for (const c of conexionesData) {
                const isOrigin = c.entidad_origen_id === id;
                const otherId = isOrigin ? c.entidad_destino_id : c.entidad_origen_id;
                if (!recorridoEntIds.includes(otherId)) extraIds.push(otherId);
              }
              if (extraIds.length > 0) {
                map.setFilter("capa-puntos", [
                  "in",
                  ["get", "id"],
                  ["literal", [...recorridoEntIds, id, ...extraIds]],
                ]);
              } else {
                // Aunque no tenga conexiones, la entidad clickeada debe seguir visible
                map.setFilter("capa-puntos", [
                  "in",
                  ["get", "id"],
                  ["literal", [...recorridoEntIds, id]],
                ]);
              }
            }
          }
        });

        // Click en fondo del mapa (no punto, no línea) → cerrar popup y conexiones
        map.on("click", (e) => {
          if (!popupRef.current && !recorridoPopup) return;
          const underPoint = map.queryRenderedFeatures(e.point, { layers: ["capa-puntos"] });
          if (underPoint.length > 0) return;
          const styleLayers = map.getStyle()?.layers || [];
          for (const l of styleLayers) {
            if (l.id.startsWith("capa-conexiones-") && map.getLayer(l.id)) {
              const underLine = map.queryRenderedFeatures(e.point, { layers: [l.id] });
              if (underLine.length > 0) return;
            }
          }
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
          setRecorridoPopup(null);
          // Restaurar filtro del recorrido si estaba activo
          if (recorridoRouteDataRef.current && map.getLayer("capa-puntos")) {
            map.setFilter("capa-puntos", [
              "in",
              ["get", "id"],
              ["literal", recorridoRouteDataRef.current.entityIds],
            ]);
          }
          limpiarConexiones(map);
          setEntityActive(false);
        });
      } else if (showControls) {
        map.getSource("puntos-chaco").setData(geoData);
        map.setLayoutProperty("capa-puntos", "visibility", "visible");
        map.setPaintProperty("capa-puntos", "icon-opacity", 1);
      }

      // C. Aplicar Filtros (Solo si la capa existe)

      if (map.getLayer("capa-puntos")) {
        if (recorridoRouteDataRef.current) {
          const entIds = recorridoRouteDataRef.current.entityIds;
          map.setFilter("capa-puntos", [
            "in",
            ["get", "id"],
            ["literal", entIds],
          ]);
        } else {
          let filtroFinal = ["all"];
          if (filtro !== "todos")
            filtroFinal.push(["==", ["get", "tipo"], filtro]);

          if (filtroLocalidad)
            filtroFinal.push([
              "==",
              ["get", "localidad_id"],
              parseInt(filtroLocalidad),
            ]);

          if (terminoBusqueda) {
            filtroFinal.push([
              "match",
              [
                "index-of",
                terminoBusqueda.toLowerCase(),
                ["downcase", ["get", "nombre"]],
              ],
              -1,
              false,
              true,
            ]);
          }
          map.setFilter(
            "capa-puntos",
            filtroFinal.length > 1 ? filtroFinal : null,
          );

        }
      }
    };

    if (map.isStyleLoaded()) {
      inicializarCapaYRecursos();
    } else {
      map.once("idle", inicializarCapaYRecursos);
    }
  }, [geoData, departamentos, filtro, filtroLocalidad, terminoBusqueda, showControls]); // Se encarga de todo cuando algo cambia

  // Escuchar búsqueda desde el HeaderComponent
  useEffect(() => {
    const handler = (e) => {
      setTerminoBusqueda(e.detail);
    };
    window.addEventListener("header-search", handler);
    return () => window.removeEventListener("header-search", handler);
  }, []);

  // Escuchar cambios de filtro desde HeaderComponent
  useEffect(() => {
    const handler = (e) => setFiltro(e.detail);
    window.addEventListener("header-filter", handler);
    return () => window.removeEventListener("header-filter", handler);
  }, []);

  // Escuchar cambios de localidad desde HeaderComponent
  useEffect(() => {
    const handler = (e) => setFiltroLocalidad(e.detail);
    window.addEventListener("header-localidad", handler);
    return () => window.removeEventListener("header-localidad", handler);
  }, []);

  // Escuchar selección de recorrido desde HeaderComponent
  useEffect(() => {
    const handler = (e) => setRecorridoActivo(e.detail);
    window.addEventListener("header-recorrido", handler);
    return () => window.removeEventListener("header-recorrido", handler);
  }, []);

  // Buscar y hacer zoom a una entidad cuando se selecciona del autocomplete
  useEffect(() => {
    const handler = async (e) => {
      const nombre = e.detail;
      if (!nombre || !geoData || !mapRef.current) return;
      const map = mapRef.current;
      const coincidencia = geoData.features.find(
        (f) => f.properties.nombre?.toLowerCase() === nombre.toLowerCase(),
      );
      if (!coincidencia) return;
      const coords = coincidencia.geometry.coordinates;
      const coincId = coincidencia.properties.id;

      if (popupRef.current) popupRef.current.remove();

      // Cerrar popup y limpiar conexiones previas
      limpiarConexiones(map);

      let conexData = [];
      try {
        const r = await fetch(`/api/entidades/${coincId}/conexiones`);
        conexData = await r.json();
      } catch (_) {}
      lastClickedEntityRef.current = coincId;
      setEntityActive(true);

      const bounds = new mapboxgl.LngLatBounds(coords, coords);
      const lookup = entidadCoordsRef.current;
      for (const c of conexData) {
        const isOrigin = c.entidad_origen_id === coincId;
        const otherId = isOrigin ? c.entidad_destino_id : c.entidad_origen_id;
        const otherCoords = lookup[otherId];
        if (otherCoords) bounds.extend(otherCoords);
      }
      map.fitBounds(bounds, { padding: 120, maxZoom: 15, speed: 0.5 });

      const { nombre: n, resumen, slug, tipo, imagen, horario_apertura, horario_cierre, dias_abierto, fecha_evento } = coincidencia.properties;
      const colorMap = { artesano: "#ff5722", gastronomia: "#4caf50", comercio: "#2196f3", evento: "#9c27b0", patrimonio: "#795548", personalidad: "#e91e63" };
      const catColor = colorMap[tipo] || "#863819";
      const openBadge2 = (() => {
        if (tipo !== "comercio" || !dias_abierto || !horario_apertura || !horario_cierre) return "";
        const diasSemana = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
        const hoy = diasSemana[new Date().getDay()];
        const dias = dias_abierto.split(",").map((d) => d.trim());
        if (!dias.includes(hoy)) return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#e74c3c15;color:#e74c3c;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Cerrado</span>`;
        const ahora = new Date();
        const [hA, mA] = horario_apertura.split(":").map(Number);
        const [hC, mC] = horario_cierre.split(":").map(Number);
        const minActual = ahora.getHours() * 60 + ahora.getMinutes();
        const minApertura = hA * 60 + mA;
        const minCierre = hC * 60 + mC;
        if (minActual >= minApertura && minActual < minCierre) return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#2e7d3215;color:#2e7d32;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Abierto</span>`;
        return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#e74c3c15;color:#e74c3c;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Cerrado</span>`;
      })();
      const eventBadge2 = (() => {
        if (tipo !== "evento" || !fecha_evento) return "";
        const diff = Math.ceil((new Date(fecha_evento) - new Date(new Date().toDateString())) / 86400000);
        if (diff === 0) return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#2e7d3215;color:#2e7d32;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">¡Hoy!</span>`;
        if (diff <= 7) return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#f39c1215;color:#f39c12;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">¡Pronto! (${diff}d)</span>`;
        return "";
      })();

      const html = `<div style="padding:16px;min-width:240px;max-width:280px;font-family:'Epilogue',sans-serif;position:relative;"><div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${catColor};border-radius:3px 0 0 3px;"></div><div style="margin-left:8px;"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><div style="display:inline-block;padding:2px 10px;border-radius:20px;background:${catColor}15;color:${catColor};font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">${tipo}</div>${openBadge2}${eventBadge2}</div><div style="display:flex;align-items:center;gap:10px;margin:4px 0 6px 0;"><h3 style="margin:0;flex:1;color:#2D1A12;font-family:'Cinzel',serif;font-size:16px;font-weight:700;line-height:1.3;">${n}</h3>${imagen ? `<img src="${imagen}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;" />` : ''}</div><p style="font-size:12px;color:#666;line-height:1.5;margin:0 0 12px 0;">${resumen}</p><div style="display:flex;gap:6px;flex-wrap:wrap;"><a href="/entidad/${slug}" onclick="return window.__guardarEstadoMapa(this)" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,${catColor},${catColor}dd);color:white;text-decoration:none;border-radius:25px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;box-shadow:0 4px 12px ${catColor}40;">Explorar <span style="font-size:14px;line-height:1;">→</span></a><div style="margin-top:6px;position:relative;display:inline-block;"><button onclick="var m=this.nextElementSibling;m.style.display=m.style.display==='flex'?'none':'flex';" style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;background:transparent;color:#4285F4;border:1px solid #4285F4;border-radius:25px;font-size:10px;font-weight:600;cursor:pointer;font-family:'Epilogue',sans-serif;line-height:1.4;">Cómo llegar</button><div style="display:none;position:absolute;top:100%;left:0;margin-top:6px;background:white;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:6px;gap:4px;z-index:10;flex-direction:column;min-width:140px;"><a href="https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;">Google Maps</a><a href="https://waze.com/ul?ll=${coords[1]},${coords[0]}&navigate=yes" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;">Waze</a><a href="https://maps.apple.com/?daddr=${coords[1]},${coords[0]}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;">Apple Maps</a></div></div></div></div></div>`;

      popupRef.current = new mapboxgl.Popup({ offset: 15, closeButton: false, closeOnClick: false, maxWidth: "320px" })
        .setLngLat(coords)
        .setHTML(html)
        .addTo(map);
      popupRef.current.on("close", () => {
        const m = mapRef.current;
        if (m && recorridoRouteDataRef.current && m.getLayer("capa-puntos")) {
          m.setFilter("capa-puntos", ["in", ["get", "id"], ["literal", recorridoRouteDataRef.current.entityIds]]);
        }
        limpiarConexiones(m);
      });
      dibujarConexiones(coincId, coords, map, conexData);
      if (map.getLayer("capa-puntos") && recorridoRouteDataRef.current) {
        const ids = recorridoRouteDataRef.current.entityIds;
        const extra = [];
        for (const c of conexData) {
          const isOrigin = c.entidad_origen_id === coincId;
          const otherId = isOrigin ? c.entidad_destino_id : c.entidad_origen_id;
          if (!ids.includes(otherId)) extra.push(otherId);
        }
        map.setFilter("capa-puntos", ["in", ["get", "id"], ["literal", [...ids, coincId, ...extra]]]);
      }

      // Restaurar el texto en el input
      window.dispatchEvent(new CustomEvent("header-search-set", { detail: nombre }));
    };
    window.addEventListener("header-search-select", handler);
    return () => window.removeEventListener("header-search-select", handler);
  }, [geoData]);

  // Estado para saber si un panel del header está abierto
  const [panelOpen, setPanelOpen] = useState(false);

  useEffect(() => {
    const handler = (e) => setPanelOpen(e.detail.open);
    window.addEventListener("header-panel", handler);
    return () => window.removeEventListener("header-panel", handler);
  }, []);

  // Volver a la vista general cuando se limpia el recorrido
  useEffect(() => {
    const handler = () => {
      const map = mapRef.current;
      if (map) {
        map.flyTo({
          center: [-60.44, -26.05],
          zoom: 7,
          speed: 0.8,
          curve: 1.5,
          essential: true,
        });
      }
    };
    window.addEventListener("header-recorrido-fly", handler);
    return () => window.removeEventListener("header-recorrido-fly", handler);
  }, []);

  // Dibujar ruta del recorrido en el mapa
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;
    const coords = entidadCoordsRef.current;

    const dibujarRuta = async () => {
      limpiarRutaRecorrido(map);
      limpiarConexiones(map);
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }

      if (!recorridoActivo) {
        // Restaurar filtro normal solo si estamos limpiando una selección previa
        if (prevRecorridoRef.current) {
          if (map.getLayer("capa-puntos")) {
            map.setFilter("capa-puntos", null);
          }
        }
        // Cerrar popup del recorrido si existe
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
        setRecorridoPopup(null);
        prevRecorridoRef.current = null;
        return;
      }

      // Fetch recorrido detail
      let recorridoData;
      try {
        const res = await fetch(`/api/recorridos/${recorridoActivo.slug}`);
        if (!res.ok) throw new Error("Error");
        recorridoData = await res.json();
      } catch {
        return;
      }

      const pasos = recorridoData.pasos || [];
      if (pasos.length < 2) return;

      // Build route coordinates from entity coords
      const routeCoords = [];
      const entityIds = [];
      for (const p of pasos) {
          const c = coords[p.entidad_id];
        if (c) {
          routeCoords.push(c);
          entityIds.push(p.entidad_id);
        }
      }

      if (routeCoords.length < 2) return;

      // Helper: generar curva bezier con gap agrandado para la ruta
      const generarCurvaRuta = (from, to) => {
        const [lng1, lat1] = from;
        const [lng2, lat2] = to;
        const dlng = lng2 - lng1;
        const dlat = lat2 - lat1;
        const dist = Math.sqrt(dlng * dlng + dlat * dlat) || 0.001;
        const gap = Math.min(0.003, dist * 0.3);
        const ratio = gap / dist;
        const f1 = [lng1 + dlng * ratio, lat1 + dlat * ratio];
        const f2 = [lng2 - dlng * ratio, lat2 - dlat * ratio];
        const steps = 30;
        const points = [];
        const midLng = (f1[0] + f2[0]) / 2;
        const midLat = (f1[1] + f2[1]) / 2;
        const d = Math.sqrt((f2[0] - f1[0]) ** 2 + (f2[1] - f1[1]) ** 2) || 0.001;
        const offsetAmt = d * 0.12;
        const cpLng = midLng + (-(f2[1] - f1[1]) / d) * offsetAmt;
        const cpLat = midLat + ((f2[0] - f1[0]) / d) * offsetAmt;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const t1 = 1 - t;
          points.push([
            t1 * t1 * f1[0] + 2 * t1 * t * cpLng + t * t * f2[0],
            t1 * t1 * f1[1] + 2 * t1 * t * cpLat + t * t * f2[1],
          ]);
        }
        return points;
      };

      // Build curved route points with gaps
      let allRoutePoints = [];
      for (let i = 0; i < routeCoords.length - 1; i++) {
        const curve = generarCurvaRuta(routeCoords[i], routeCoords[i + 1]);
        allRoutePoints = allRoutePoints.concat(curve);
      }
      if (allRoutePoints.length < 2) return;

      // Draw route line with progressive animation
      const sourceId = `ruta-recorrido-${recorridoActivo.id}`;
      const layerId = `capa-ruta-recorrido-${recorridoActivo.id}`;
      const glowLayerId = `capa-ruta-glow-${recorridoActivo.id}`;
      recorridoRouteDataRef.current = { sourceId, layerId, entityIds };

      // Cancel any previous animation
      if (routeAnimRef.current) {
        cancelAnimationFrame(routeAnimRef.current);
        routeAnimRef.current = null;
      }

      // Add source with initial points (first segment at minimum)
      const initialCoords = allRoutePoints.slice(0, Math.min(4, allRoutePoints.length));
      map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: initialCoords,
          },
        },
      });

      // Glow layer underneath
      map.addLayer({
        id: glowLayerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#42A5F5",
          "line-width": 10,
          "line-opacity": 0.2,
          "line-blur": 3,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
      });

      // Main route line - GPS blue neon
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": "#42A5F5",
          "line-width": 3,
          "line-opacity": 1,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
      });

      recorridoSourceRef.current = sourceId;
      recorridoLayerRef.current = layerId;
      recorridoGlowLayerRef.current = glowLayerId;

      // Animate drawing the line progressively
      const duracionMs = 2000;
      const fpsRuta = 30;
      const totalFrames = Math.ceil(duracionMs / (1000 / fpsRuta));
      let frame = 0;
      const anim = setInterval(() => {
        frame++;
        const progress = Math.min(frame / totalFrames, 1);
        if (!map || !map.getSource(sourceId)) {
          clearInterval(anim);
          return;
        }
        const currentEnd = Math.max(2, Math.ceil(allRoutePoints.length * progress));
        map.getSource(sourceId).setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: allRoutePoints.slice(0, currentEnd),
          },
        });
        if (frame >= totalFrames) clearInterval(anim);
      }, 1000 / fpsRuta);
      routeAnimRef.current = anim;

      // Filter points to only show entities in this recorrido
      if (map.getLayer("capa-puntos")) {
        map.setFilter("capa-puntos", [
          "in",
          ["get", "id"],
          ["literal", entityIds],
        ]);
      }

      // Fit bounds to all route entities
      const bounds = new mapboxgl.LngLatBounds();
      routeCoords.forEach((c) => bounds.extend(c));
      map.fitBounds(bounds, { padding: 120, maxZoom: 14, speed: 0.8 });

      // Mostrar popup del recorrido tras el zoom
      map.once("moveend", () => {
        if (!recorridoActivo) return;
        setRecorridoPopup({
          nombre: recorridoActivo.nombre || "Recorrido",
          slug: recorridoActivo.slug || "",
        });
      });

      prevRecorridoRef.current = recorridoActivo;

      prevRecorridoRef.current = recorridoActivo;
    };

    dibujarRuta();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorridoActivo, geoData]);

  // Sincronizar Header cuando Footer cambia filtro
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("header-filter-reset", { detail: filtro }),
    );
  }, [filtro]);

  // Escape key: resetear mapa a vista completa de Chaco
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowEscHint(false);
        setEntityActive(false);
        setRecorridoPopup(null);
        // Limpiar líneas de conexión
        limpiarConexiones(map);
        lastClickedEntityRef.current = null;
        // Cerrar popup si existe
        if (popupRef.current) {
          popupRef.current.remove();
          popupRef.current = null;
        }
        // Resetear todos los filtros
        setFiltro("todos");
        setFiltroLocalidad("");
        setTerminoBusqueda("");
        setRecorridoActivo(null);
        limpiarRutaRecorrido(map);
        // Sincronizar header: deseleccionar recorrido
        window.dispatchEvent(
          new CustomEvent("header-recorrido", { detail: null }),
        );
        // Volar a la vista general de Chaco
        map.flyTo({
          center: [-60.44, -26.05],
          zoom: 7,
          speed: 0.8,
          curve: 1.5,
          essential: true,
        });
        // Sincronizar header
        window.dispatchEvent(
          new CustomEvent("header-filter-reset", { detail: "todos" }),
        );
        window.dispatchEvent(
          new CustomEvent("header-localidad-reset", { detail: "" }),
        );
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Resetear mapa desde el header (logo símbolo)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleReset = () => {
      setEntityActive(false);
      setRecorridoPopup(null);
      limpiarConexiones(map);
      lastClickedEntityRef.current = null;
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      setFiltro("todos");
      setFiltroLocalidad("");
      setTerminoBusqueda("");
      setRecorridoActivo(null);
      limpiarRutaRecorrido(map);
      window.dispatchEvent(new CustomEvent("header-recorrido", { detail: null }));
      map.flyTo({
        center: [-60.44, -26.05],
        zoom: 7,
        speed: 0.8,
        curve: 1.5,
        essential: true,
      });
      window.dispatchEvent(new CustomEvent("header-filter-reset", { detail: "todos" }));
      window.dispatchEvent(new CustomEvent("header-localidad-reset", { detail: "" }));
    };

    window.addEventListener("header-reset-map", handleReset);
    return () => window.removeEventListener("header-reset-map", handleReset);
  }, []);

  // 4b. Toggle dark mode on map canvas, persist, and broadcast
  useEffect(() => {
    localStorage.setItem('made-in-chaco-dark-mode', darkMode);
    const map = mapRef.current;
    if (!map) return;
    try {
      const canvas = map.getCanvas();
      canvas.style.filter = darkMode ? 'brightness(0.7) saturate(0.6) invert(0.92) hue-rotate(180deg)' : '';
      canvas.style.transition = 'filter 0.5s ease';
      canvas.classList.remove('grayscale-canvas');
    } catch (_) {}
    window.dispatchEvent(new CustomEvent("darkmode-toggle", { detail: darkMode }));
  }, [darkMode]);

  // 5. Cerrar popups y limpiar conexiones cuando cambian los filtros
  useEffect(() => {
    if (clickResetFilterRef.current) {
      clickResetFilterRef.current = false;
      return;
    }
    const map = mapRef.current;
    if (map) limpiarConexiones(map);
    if (map) limpiarRutaRecorrido(map);
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
    setRecorridoActivo(null);
  }, [filtro, filtroLocalidad, terminoBusqueda, limpiarConexiones, limpiarRutaRecorrido]);

  // 6. Mostrar hint de ESC después de 5s con filtro/ruta activos
  useEffect(() => {
    const anyActive = filtro !== "todos" || filtroLocalidad !== "" || recorridoActivo !== null || entityActive;

    if (escHintTimerRef.current) {
      clearTimeout(escHintTimerRef.current);
      escHintTimerRef.current = null;
    }

    if (anyActive) {
      escHintTimerRef.current = setTimeout(() => {
        setShowEscHint(true);
      }, 10000);
    } else {
      setShowEscHint(false);
    }

    return () => {
      if (escHintTimerRef.current) {
        clearTimeout(escHintTimerRef.current);
        escHintTimerRef.current = null;
      }
    };
  }, [filtro, filtroLocalidad, recorridoActivo, entityActive]);

  return (
      <div
        className={darkMode ? "dark-mode" : ""}
        style={{
          position: "relative",
          width: "100%",
          height: "100vh",
          overflow: "hidden",
        }}
      >
      {/* Estilos para animaciones */}
      <style>{welcomeOverlayStyles}</style>
      <style>{`
        .mapboxgl-ctrl-bottom-left {
          display: none !important;
        }

        /* Popup con fondo semitransparente tipo glassmorphism */
        .mapboxgl-popup {
          z-index: 100 !important;
        }

        .mapboxgl-popup-content {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.15) 0%,
            rgba(210, 195, 165, 0.35) 40%,
            rgba(210, 195, 165, 0.6) 100%
          ) !important;
          backdrop-filter: blur(16px) saturate(1.2) !important;
          -webkit-backdrop-filter: blur(16px) saturate(1.2) !important;
          border-radius: 12px !important;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15) !important;
          padding: 0 !important;
        }

        .mapboxgl-popup-tip {
          border-top-color: rgba(210, 195, 165, 0.5) !important;
        }

        .dark-mode .mapboxgl-popup-content {
          background: linear-gradient(
            180deg,
            rgba(30, 30, 40, 0.2) 0%,
            rgba(35, 35, 45, 0.45) 40%,
            rgba(35, 35, 45, 0.75) 100%
          ) !important;
        }

        .dark-mode .mapboxgl-popup-tip {
          border-top-color: rgba(35, 35, 45, 0.6) !important;
        }

        .dark-mode .recorrido-popup-overlay {
          background: linear-gradient(
            180deg,
            rgba(30, 30, 40, 0.2) 0%,
            rgba(35, 35, 45, 0.45) 40%,
            rgba(35, 35, 45, 0.75) 100%
          ) !important;
        }

        .dark-mode .recorrido-popup-overlay .recorrido-label {
          color: #c0a880 !important;
        }

        .dark-mode .recorrido-popup-overlay .recorrido-name {
          color: #e0d8c0 !important;
        }

        .dark-mode .localidad-detail-panel {
          background: linear-gradient(
            180deg,
            rgba(30, 30, 40, 0.2) 0%,
            rgba(35, 35, 45, 0.45) 40%,
            rgba(35, 35, 45, 0.75) 100%
          ) !important;
        }

        .dark-mode .localidad-detail-panel .localidad-name {
          color: #e0d8c0 !important;
        }

        .dark-mode .localidad-detail-panel .localidad-label {
          color: #c0a880 !important;
        }

        .dark-mode .localidad-detail-panel .localidad-value {
          color: #d0c8b0 !important;
        }

        .dark-mode .esc-hint-overlay {
          background: rgba(20, 20, 25, 0.6) !important;
          color: rgba(200, 195, 180, 0.8) !important;
        }

        .dark-mode .esc-hint-overlay svg {
          stroke: rgba(200, 195, 180, 0.8) !important;
        }

        .dark-mode .hover-popup-text {
          color: #e0d8c0 !important;
        }

        .dark-mode .mapboxgl-popup-content h3 {
          color: #e0d8c0 !important;
        }

        .dark-mode .mapboxgl-popup-content p {
          color: #b0a890 !important;
        }

        .dark-mode .mapboxgl-popup-content .conexiones-container span {
          color: #b0a890 !important;
        }

        .dark-canvas {
          filter: brightness(0.7) saturate(0.6) invert(0.92) hue-rotate(180deg);
          transition: filter 0.5s ease;
        }

        .grayscale-canvas {
          filter: grayscale(1);
        }

        .mapboxgl-popup-content,
        .recorrido-popup-overlay,
        .localidad-detail-panel,
        .esc-hint-overlay {
          transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
      `}</style>

      {/* OVERLAY DE BIENVENIDA - Requiere interacción del usuario */}
      {showStartOverlay && (
        <div
          onClick={handleStartExperience}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 2000,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "white",
            fontFamily: "Epilogue, sans-serif",
          }}
        >
          <div
            style={{
              marginBottom: "30px",
              animation: "pulse 2s infinite",
            }}
          >
            <img src="/icons/touch.png" />
          </div>
          <h2
            style={{
              fontSize: "38px",
              opacity: 0.9,
              marginBottom: "15px",
              textAlign: "center",
              fontFamily: "Epilogue, sans-serif",
              color: "#fcf9f2",
            }}
          >
            Bienvenido a Made in Chaco
          </h2>
          <p
            style={{
              fontSize: "25px",
              opacity: 0.8,
              textAlign: "center",
              maxWidth: "400px",
              marginBottom: "30px",
              fontFamily: "Epilogue, sans-serif",
              color: "#fcf9f2",
            }}
          >
            Hacé click o tocá la pantalla para comenzar la experiencia
          </p>
        </div>
      )}


      {/* ESC HINT - aparece tras 5s con filtro/ruta activa */}
      {showEscHint && (
        <div
          style={{
            position: "absolute",
            bottom: "90px",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 1500,
            pointerEvents: "none",
          }}
        >
          <div
            className="esc-hint-overlay"
            onClick={() => setShowEscHint(false)}
            style={{
              background: "rgba(0,0,0,0.45)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
              color: "rgba(252,249,242,0.7)",
              padding: "10px 20px",
              borderRadius: "10px",
              fontFamily: "Manrope, sans-serif",
              fontSize: "13px",
              fontWeight: 400,
              textShadow: "none",
              cursor: "pointer",
              pointerEvents: "auto",
              boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
              maxWidth: "80%",
              textAlign: "center",
              animation: "filterPanelSlideIn 0.6s ease-out",
              lineHeight: 1.3,
              letterSpacing: "0.2px",
            }}
          >
            Presioná ESC o{" "}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(252,249,242,0.7)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", margin: "0 2px" }}>
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              </svg>
              {" "}para volver a la vista principal
          </div>
        </div>
      )}

      {/* RECORRIDO POPUP OVERLAY - borde superior centrado */}
      {recorridoPopup && (
        <div
          style={{
            position: "absolute",
            top: "95px",
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 1500,
            pointerEvents: "none",
          }}
        >
          <div
            className="recorrido-popup-overlay"
            onClick={() => setRecorridoPopup(null)}
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(210,195,165,0.35) 40%, rgba(210,195,165,0.6) 100%)",
              backdropFilter: "blur(16px) saturate(1.2)",
              WebkitBackdropFilter: "blur(16px) saturate(1.2)",
              borderRadius: "12px",
              padding: "10px 16px",
              pointerEvents: "auto",
              cursor: "pointer",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              maxHeight: "500px",
              overflowY: "auto",
              animation: "filterPanelSlideIn 0.3s ease-out",
            }}
          >
            <div>
              <div className="recorrido-label" style={{ fontSize: "10px", color: "#863819", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", textShadow: "none" }}>
                Recorrido
              </div>
              <div className="recorrido-name" style={{ fontSize: "14px", fontWeight: 700, color: "#2d1a12", textShadow: "none" }}>
                {recorridoPopup.nombre}
              </div>
            </div>
            <a
              href={`/recorrido/${recorridoPopup.slug}`}
              onClick={(e) => e.stopPropagation()}
              style={{
                display: "inline-block",
                padding: "6px 12px",
                background: "#863819",
                color: "white",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "11px",
                fontWeight: 600,
                textShadow: "none",
                whiteSpace: "nowrap",
              }}
            >
              Ver en detalle →
            </a>
          </div>
        </div>
      )}

      {/* LOCALIDAD DETAIL PANEL - borde superior derecho */}
      {filtroLocalidad && (() => {
        const loc = localidades.find((l) => l.id === parseInt(filtroLocalidad));
        if (!loc) return null;
        const fundDate = loc.fecha_fundacion ? new Date(loc.fecha_fundacion).getFullYear() : null;
        return (
          <div
            className="localidad-detail-panel"
            style={{
              position: "absolute",
              top: panelOpen ? "680px" : "95px",
              right: "16px",
              zIndex: 1500,
              pointerEvents: "auto",
              background: "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(210,195,165,0.35) 40%, rgba(210,195,165,0.6) 100%)",
              backdropFilter: "blur(16px) saturate(1.2)",
              WebkitBackdropFilter: "blur(16px) saturate(1.2)",
              borderRadius: "12px",
              padding: "12px 16px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              animation: "filterPanelSlideIn 0.3s ease-out",
              transition: "top 0.35s ease-out",
              minWidth: "180px",
            }}
          >
            <div className="localidad-name" style={{ fontSize: "15px", color: "#863819", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", textShadow: "none", marginBottom: "6px" }}>
              {loc.nombre}
            </div>
            {(loc.departamento_nombre || loc.departamento) && (
              <div className="localidad-value" style={{ fontSize: "13px", color: "#000", textShadow: "none", marginBottom: "3px" }}>
                <span className="localidad-label" style={{ opacity: 0.6, color: "#000" }}>Departamento:</span> {loc.departamento_nombre || loc.departamento}
              </div>
            )}
            {loc.habitantes != null && (
              <div className="localidad-value" style={{ fontSize: "13px", color: "#000", textShadow: "none", marginBottom: "3px" }}>
                <span className="localidad-label" style={{ opacity: 0.6, color: "#000" }}>Población:</span> {loc.habitantes.toLocaleString()}
              </div>
            )}
            {fundDate && (
              <div className="localidad-value" style={{ fontSize: "13px", color: "#000", textShadow: "none", marginBottom: "3px" }}>
                <span className="localidad-label" style={{ opacity: 0.6, color: "#000" }}>Fundación:</span> {fundDate}
              </div>
            )}
            {loc.gentilicio && (
              <div className="localidad-value" style={{ fontSize: "13px", color: "#000", textShadow: "none" }}>
                <span className="localidad-label" style={{ opacity: 0.6, color: "#000" }}>Gentilicio:</span> {loc.gentilicio}
              </div>
            )}
          </div>
        );
      })()}

      {/* FOOTER ESTILO MAPA ANTIGUO */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 500,
          opacity: showControls ? 1 : 0,
          transform: showControls ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.8s ease, transform 0.8s ease",
          pointerEvents: showControls ? "auto" : "none",
        }}
      >
        <FooterComponent
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          onFilterChange={setFiltro}
          activeFilter={filtro}
          localidades={localidades}
          filtroLocalidad={filtroLocalidad}
          onLocalidadChange={setFiltroLocalidad}
        />
      </div>

      <div ref={mapContainer} style={{ width: "100%", height: "100vh" }} />
    </div>
  );
};
