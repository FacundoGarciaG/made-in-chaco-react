import { useRef, useEffect, useState, useCallback } from "react";
import { track } from "../utils/tracking";
import { optimizarUrlCloudinary } from "../utils/imageUrl";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/MapPage.css";
import { FooterComponent } from "../components/FooterComponent";
import { guardarEstadoMapa } from "../utils/mapUtils";
import { WelcomeOverlay } from "../components/map/WelcomeOverlay";
import { EscHint } from "../components/map/EscHint";
import { RecorridoPopup } from "../components/map/RecorridoPopup";
import { SpeechBubble } from "../components/map/SpeechBubble";
import { LocalidadDetailPanel } from "../components/map/LocalidadDetailPanel";
import { useMapConexiones } from "../hooks/useMapConexiones";
import { useMapRecorridos } from "../hooks/useMapRecorridos";
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

  const [localidades, setLocalidades] = useState([]);
  const [departamentos, setDepartamentos] = useState(null);
  const [provincia, setProvincia] = useState(null);
  const [showDepartamentos, setShowDepartamentos] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showStartOverlay, setShowStartOverlay] = useState(true);
  const [showEscHint, setShowEscHint] = useState(false);
  const [entityActive, setEntityActive] = useState(false);
  const [recorridoPopup, setRecorridoPopup] = useState(null);
  const popupRef = useRef(null);
  const audioRef = useRef(null);
  const escHintTimerRef = useRef(null);
  const returningRef = useRef(false);
  const entidadCoordsRef = useRef({});
  const entidadDataRef = useRef({});
  const lastClickedEntityRef = useRef(null);
  const clickResetFilterRef = useRef(false);
  const filtroRef = useRef(filtro);
  const filtroLocalidadRef = useRef(filtroLocalidad);
  const showDepartamentosRef = useRef(showDepartamentos);
  const imagenesCargadasRef = useRef(new Set());

  const { limpiarConexiones, dibujarConexiones } = useMapConexiones(entidadCoordsRef, entidadDataRef, popupRef);
  const { limpiarRutaRecorrido, recorridoRouteDataRef, savedPuntosFilterRef, prevRecorridoRef, recorridoLayerRef, recorridoGlowLayerRef, recorridoSourceRef, routeAnimRef } = useMapRecorridos();

  const [socketRefresh, setSocketRefresh] = useState(0);
  useSocketEvent("entidad:change", () => setSocketRefresh((t) => t + 1));
  useSocketEvent("recorrido:change", () => setSocketRefresh((t) => t + 1));
  useSocketEvent("localidad:change", () => setSocketRefresh((t) => t + 1));

  // 0. Restaurar estado del mapa al volver
  const savedState = sessionStorage.getItem("mapState");
  const parsedState = savedState ? JSON.parse(savedState) : null;
  const returningToMap = sessionStorage.getItem("return-to-map") === "true";
  const initialCenter = parsedState
    ? parsedState.center
    : returningToMap
      ? [-60.44, -26.05]
      : [60.44, 25.4];
  const initialZoom = parsedState ? parsedState.zoom : returningToMap ? 7 : 0;

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
    setGeolocateControl(geolocateControl);

    mapRef.current = map;
    window.__mapInstance = map;
    setMapInstance(map);
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
      setHeaderVisible(true);
    } else if (returningToMap) {
      // Volviendo de otra pagina (ej. recorridos): sin intro, directo a la provincia
      sessionStorage.removeItem("return-to-map");
      returningRef.current = true;
      introStartedRef.current = true;
      setIsLoading(false);
      setShowStartOverlay(false);
      setShowControls(true);
      setHeaderVisible(true);
    } else {
      // Primera visita: mapa en blanco y negro desde el inicio
      const applyGrayscale = () => {
        try {
          map.getCanvas().classList.add("grayscale-canvas");
        } catch (_) {}
      };
      if (map.isStyleLoaded()) {
        applyGrayscale();
      } else {
        map.once("style.load", applyGrayscale);
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
      window.__mapInstance = null;
      setMapInstance(null);
      setGeolocateControl(null);
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

  // Mantener refs actualizadas para usar en event handlers del mapa
  useEffect(() => {
    filtroRef.current = filtro;
    filtroLocalidadRef.current = filtroLocalidad;
  }, [filtro, filtroLocalidad]);

  useEffect(() => {
    showDepartamentosRef.current = showDepartamentos;
  }, [showDepartamentos]);

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
    canvas.style.filter = "grayscale(1)";
    canvas.style.transition = "filter 0.1s linear";

    // Animar de BW a color durante el flyTo
    const onMove = () => {
      const progress = Math.min(map.getZoom() / 7, 1);
      canvas.style.filter = `grayscale(${1 - progress})`;
    };
    map.on("move", onMove);

    // setTimeout para dar respiro al navegador
    const timerId = setTimeout(() => {
      // Intentar reproducir audio
      audio
        .play()
        .then(() => console.log("Audio de intro reproducido correctamente"))
        .catch(() => {
          // Reintentar una vez
          setTimeout(
            () =>
              audio.play().catch(() => {
                audioRef.current = null;
              }),
            200,
          );
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
      canvas.style.filter = "grayscale(0)";
      canvas.style.transition = "none";
      map.off("move", onMove);

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
        setHeaderVisible(true);
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
      .then((data) => {
        if (!cancelled) setLocalidades(data);
      })
      .catch((err) => console.error("Error cargando localidades:", err));

    // Cargar departamentos (polígonos)
    fetch("/api/departamentos")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setDepartamentos(data);
      })
      .catch((err) => console.error("Error cargando departamentos:", err));

    // Cargar contorno unificado de la provincia
    fetch("/api/provincia")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setProvincia(data);
      })
      .catch((err) => console.error("Error cargando provincia:", err));

    // Cargar puntos del mapa
    fetch("/api/mapa-puntos")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const geojson = {
          type: "FeatureCollection",
          features: data.map((punto) => {
            const { icono: iconoVal, ...resto } = punto;
            return {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [
                  parseFloat(punto.longitud),
                  parseFloat(punto.latitud),
                ],
              },
              properties: iconoVal ? { ...resto, icono: iconoVal } : resto,
            };
          }),
        };
        setGeoData(geojson);
        window.__geoData = geojson;
      })
      .catch((err) => console.error("Error cargando GeoJSON:", err));
    return () => {
      cancelled = true;
    };
  }, [socketRefresh]);

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

  // (limpiarConexiones, limpiarRutaRecorrido, dibujarConexiones movidas a hooks)

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
          speed: 0.8,
        });
      }
    } else {
      // Volver al zoom original de la provincia
        map.flyTo({
          center: [-60.44, -26],
          zoom: 7,
          essential: true,
          speed: 0.8,
        });
    }
  }, [filtroLocalidad]); // Solo depender de filtroLocalidad, no de localidades

  // 4. Lógica Unificada: Carga de Iconos, Capas y Filtros
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geoData) return;

    const inicializarCapaYRecursos = async () => {
      // A. Cargar Imágenes (solo una vez por mapa)
      const iconos = [
        "artesano",
        "gastronomia",
        "comercio",
        "evento",
        "patrimonio",
        "personalidad",
        "comunidad_indigena",
        "lugar_natural",
        "hospedaje",
        "productor",
        "experiencia",
        "relato",
        "espacio_cultural",
      ];

      await Promise.all(
        iconos.map((nombre) => {
          return new Promise((resolve) => {
            if (imagenesCargadasRef.current.has(nombre) || map.hasImage(nombre)) return resolve();
            map.loadImage(`/icons/${nombre}.png`, (error, image) => {
              if (!error && image) {
                if (!map.hasImage(nombre)) {
                  map.addImage(nombre, image);
                }
                imagenesCargadasRef.current.add(nombre);
              }
              resolve();
            });
          });
        }),
      );

      // Cargar iconos personalizados de entidades
      const customIcons = geoData.features.filter((f) => f.properties.icono);
      const failedIconIds = new Set();
      await Promise.all(
        customIcons.map((f) => {
          const imageName = String(f.properties.id);
          if (imagenesCargadasRef.current.has(imageName) || map.hasImage(imageName)) return Promise.resolve();
          return new Promise((resolve) => {
            map.loadImage(f.properties.icono, (error, image) => {
              if (!error && image) {
                if (!map.hasImage(imageName)) {
                  map.addImage(imageName, image, { sdf: false, pixelRatio: 1 });
                }
                imagenesCargadasRef.current.add(imageName);
              } else {
                failedIconIds.add(f.properties.id);
              }
              resolve();
            });
          });
        }),
      );

      // Si algún icono no se pudo cargar, remover icono de esas features
      // para que la expresión del layer caiga al fallback por tipo
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

      // A. Capa de polígonos de departamentos
      if (departamentos && !map.getSource("departamentos")) {
        map.addSource("departamentos", {
          type: "geojson",
          data: departamentos,
        });
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
          layout: {
            visibility: "none",
          },
          paint: {
            "line-color": "#863819",
            "line-opacity": 0.6,
            "line-width": 1.5,
          },
        });
      }

      // C. Configurar Source y Layer de puntos
      if (!map.getSource("puntos-chaco")) {
        map.addSource("puntos-chaco", { type: "geojson", data: geoDataClean });

        // Si venimos de detalle de entidad, la capa se crea visible directamente
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

        // Hover sobre departamentos
        let hoverDeptEl = document.getElementById("dept-hover-label");
        if (!hoverDeptEl) {
          hoverDeptEl = document.createElement("div");
          hoverDeptEl.id = "dept-hover-label";
          hoverDeptEl.style.cssText =
            "position:absolute;top:90px;left:50%;transform:translateX(-50%);padding:8px 24px;background:linear-gradient(180deg,rgba(255,255,255,0.15) 0%,rgba(210,195,165,0.35) 40%,rgba(210,195,165,0.6) 100%);backdrop-filter:blur(16px) saturate(1.2);-webkit-backdrop-filter:blur(16px) saturate(1.2);border-radius:12px;font-family:'Cinzel',serif;font-size:13px;font-weight:700;color:#000;text-align:center;letter-spacing:1px;z-index:10;pointer-events:none;display:none;box-shadow:0 8px 32px rgba(0,0,0,0.15)";
          map.getContainer().appendChild(hoverDeptEl);
        }

        map.on("mousemove", "capa-departamentos", (e) => {
          if (!showDepartamentosRef.current) return;
          const nombre = e.features?.[0]?.properties?.nombre;
          if (nombre) {
            hoverDeptEl.textContent = nombre;
            hoverDeptEl.style.display = "block";
          }
        });
        map.on("mouseleave", "capa-departamentos", () => {
          hoverDeptEl.style.display = "none";
        });

        // Evento Click - Popup detallado moderno
        map.on("click", "capa-puntos", async (e) => {
          // Resetear filtros de categoría y localidad
          if (
            filtroRef.current !== "todos" ||
            filtroLocalidadRef.current !== ""
          ) {
            clickResetFilterRef.current = true;
            setFiltro("todos");
            setFiltroLocalidad("");
          }
          const coordinates = e.features[0].geometry.coordinates.slice();
          const {
            id,
            nombre,
            resumen,
            slug,
            tipo,
            imagen,
            horario_apertura,
            horario_cierre,
            dias_abierto,
            fecha_evento,
          } = e.features[0].properties;
          track("click_mapa", id, slug);
          const colorMap = {
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

          // Determinar si es la misma entidad ANTES del fetch
          const isSameEntity = lastClickedEntityRef.current === id;
          lastClickedEntityRef.current = id;
          setEntityActive(true);

          // Arrancar easeTo INMEDIATAMENTE (sin esperar fetch)
          if (isSameEntity) {
            map.easeTo({
              center: coordinates,
              zoom: 14,
              duration: 2500,
            });
          } else {
            map.easeTo({
              center: coordinates,
              zoom: 9,
              duration: 1800,
            });
          }

          // Fetch conexiones en paralelo (mientras se anima el mapa)
          let conexionesData = [];
          try {
            const res = await fetch(`/api/entidades/${id}/conexiones`);
            conexionesData = await res.json();
          } catch (_) {}

          // Si es nueva entidad con conexiones → fitBounds
          if (!isSameEntity && conexionesData.length > 0) {
            const bounds = new mapboxgl.LngLatBounds(coordinates, coordinates);
            const lookup = entidadCoordsRef.current;
            for (const c of conexionesData) {
              const isOrigin = c.entidad_origen_id === id;
              const otherId = isOrigin
                ? c.entidad_destino_id
                : c.entidad_origen_id;
              const otherCoords = lookup[otherId];
              if (otherCoords) bounds.extend(otherCoords);
            }
            map.fitBounds(bounds, { padding: 120, maxZoom: 15, speed: 0.5 });
          }

          // Esperar a que termine la animación del mapa antes de crear el popup
          const mostrarPopup = () => {
          // Determinar si el comercio está abierto ahora
          const getOpenBadge = () => {
            if (
              tipo !== "comercio" ||
              !dias_abierto ||
              !horario_apertura ||
              !horario_cierre
            )
              return "";
            const diasSemana = [
              "Domingo",
              "Lunes",
              "Martes",
              "Miércoles",
              "Jueves",
              "Viernes",
              "Sábado",
            ];
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
            const diff = Math.ceil(
              (new Date(fecha_evento) - new Date(new Date().toDateString())) /
                86400000,
            );
            if (diff === 0)
              return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#2e7d3215;color:#2e7d32;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">¡Hoy!</span>`;
            if (diff <= 7)
              return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#f39c1215;color:#f39c12;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">¡Pronto! (${diff}d)</span>`;
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
                  ${imagen ? `<img src="${optimizarUrlCloudinary(imagen)}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;" />` : ""}
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
            if (m && m.getLayer("capa-puntos")) {
              m.setFilter("capa-puntos", savedPuntosFilterRef.current);
              savedPuntosFilterRef.current = null;
            }
            limpiarConexiones(m);
          });

          // Cargar y dibujar conexiones
          if (id) {
            dibujarConexiones(id, coordinates, map, conexionesData);
            if (map.getLayer("capa-puntos")) {
              savedPuntosFilterRef.current = map.getFilter("capa-puntos");
              const ids = recorridoRouteDataRef.current
                ? recorridoRouteDataRef.current.entityIds
                : [];
              const allIds = [...ids, id];
              for (const c of conexionesData) {
                const isOrigin = c.entidad_origen_id === id;
                const otherId = isOrigin
                  ? c.entidad_destino_id
                  : c.entidad_origen_id;
                if (!allIds.includes(otherId)) allIds.push(otherId);
              }
              map.setFilter("capa-puntos", [
                "in",
                ["get", "id"],
                ["literal", allIds],
              ]);
            }
          }
          };

          // Mostrar popup después de que terminen todas las animaciones del mapa
          if (map.isMoving()) {
            map.once("moveend", mostrarPopup);
          } else {
            mostrarPopup();
          }
        });

        // Click en fondo del mapa (no punto, no línea) → cerrar popup y conexiones
        map.on("click", (e) => {
          if (!popupRef.current && !recorridoPopup) return;
          const underPoint = map.queryRenderedFeatures(e.point, {
            layers: ["capa-puntos"],
          });
          if (underPoint.length > 0) return;
          const styleLayers = map.getStyle()?.layers || [];
          for (const l of styleLayers) {
            if (l.id.startsWith("capa-conexiones-") && map.getLayer(l.id)) {
              const underLine = map.queryRenderedFeatures(e.point, {
                layers: [l.id],
              });
              if (underLine.length > 0) return;
            }
          }
          if (popupRef.current) {
            popupRef.current.remove();
            popupRef.current = null;
          }
          setRecorridoPopup(null);
          // Restaurar filtro
          if (map.getLayer("capa-puntos")) {
            if (savedPuntosFilterRef.current !== null) {
              map.setFilter("capa-puntos", savedPuntosFilterRef.current);
              savedPuntosFilterRef.current = null;
            } else if (recorridoRouteDataRef.current) {
              map.setFilter("capa-puntos", [
                "in",
                ["get", "id"],
                ["literal", recorridoRouteDataRef.current.entityIds],
              ]);
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
  }, [
    geoData,
    departamentos,
    provincia,
    filtro,
    filtroLocalidad,
    terminoBusqueda,
    showControls,
  ]); // Se encarga de todo cuando algo cambia

  const handleSearchSelect = useCallback(async (nombre) => {
    if (!nombre || !geoData || !mapRef.current) return;
    const map = mapRef.current;
    const coincidencia = geoData.features.find(
      (f) => f.properties.nombre?.toLowerCase() === nombre.toLowerCase(),
    );
    if (!coincidencia) return;
    const coords = coincidencia.geometry.coordinates;
    const coincId = coincidencia.properties.id;
    const coincSlug = coincidencia.properties.slug;

    track("busqueda", coincId, coincSlug);

    if (popupRef.current) popupRef.current.remove();

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

    const {
      nombre: n,
      resumen,
      slug,
      tipo,
      imagen,
      horario_apertura,
      horario_cierre,
      dias_abierto,
      fecha_evento,
    } = coincidencia.properties;
    const colorMap = {
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
    };
    const catColor = colorMap[tipo] || "#863819";
    const openBadge2 = (() => {
      if (
        tipo !== "comercio" ||
        !dias_abierto ||
        !horario_apertura ||
        !horario_cierre
      )
        return "";
      const diasSemana = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ];
      const hoy = diasSemana[new Date().getDay()];
      const dias = dias_abierto.split(",").map((d) => d.trim());
      if (!dias.includes(hoy))
        return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#e74c3c15;color:#e74c3c;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Cerrado</span>`;
      const ahora = new Date();
      const [hA, mA] = horario_apertura.split(":").map(Number);
      const [hC, mC] = horario_cierre.split(":").map(Number);
      const minActual = ahora.getHours() * 60 + ahora.getMinutes();
      const minApertura = hA * 60 + mA;
      const minCierre = hC * 60 + mC;
      if (minActual >= minApertura && minActual < minCierre)
        return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#2e7d3215;color:#2e7d32;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Abierto</span>`;
      return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#e74c3c15;color:#e74c3c;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">Cerrado</span>`;
    })();
    const eventBadge2 = (() => {
      if (tipo !== "evento" || !fecha_evento) return "";
      const diff = Math.ceil(
        (new Date(fecha_evento) - new Date(new Date().toDateString())) /
          86400000,
      );
      if (diff === 0)
        return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#2e7d3215;color:#2e7d32;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">¡Hoy!</span>`;
      if (diff <= 7)
        return `<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:#f39c1215;color:#f39c12;font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;margin-left:6px;">¡Pronto! (${diff}d)</span>`;
      return "";
    })();

    const html = `<div style="padding:16px;min-width:240px;max-width:280px;font-family:'Epilogue',sans-serif;position:relative;"><div style="position:absolute;top:0;left:0;width:4px;height:100%;background:${catColor};border-radius:3px 0 0 3px;"></div><div style="margin-left:8px;"><div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;"><div style="display:inline-block;padding:2px 10px;border-radius:20px;background:${catColor}15;color:${catColor};font-size:10px;font-weight:800;letter-spacing:1.2px;text-transform:uppercase;">${tipo}</div>${openBadge2}${eventBadge2}</div><div style="display:flex;align-items:center;gap:10px;margin:4px 0 6px 0;"><h3 style="margin:0;flex:1;color:#2D1A12;font-family:'Cinzel',serif;font-size:16px;font-weight:700;line-height:1.3;">${n}</h3>${imagen ? `<img src="${optimizarUrlCloudinary(imagen)}" alt="" style="width:48px;height:48px;border-radius:8px;object-fit:cover;flex-shrink:0;" />` : ""}</div><p style="font-size:12px;color:#666;line-height:1.5;margin:0 0 12px 0;">${resumen}</p><div style="display:flex;gap:6px;flex-wrap:wrap;"><a href="/entidad/${slug}" onclick="return window.__guardarEstadoMapa(this)" style="display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:linear-gradient(135deg,${catColor},${catColor}dd);color:white;text-decoration:none;border-radius:25px;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;box-shadow:0 4px 12px ${catColor}40;">Explorar <span style="font-size:14px;line-height:1;">→</span></a><div style="margin-top:6px;position:relative;display:inline-block;"><button onclick="var m=this.nextElementSibling;m.style.display=m.style.display==='flex'?'none':'flex';" style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;background:transparent;color:#4285F4;border:1px solid #4285F4;border-radius:25px;font-size:10px;font-weight:600;cursor:pointer;font-family:'Epilogue',sans-serif;line-height:1.4;">Cómo llegar</button><div style="display:none;position:absolute;top:100%;left:0;margin-top:6px;background:white;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:6px;gap:4px;z-index:10;flex-direction:column;min-width:140px;"><a href="https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;">Google Maps</a><a href="https://waze.com/ul?ll=${coords[1]},${coords[0]}&navigate=yes" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;">Waze</a><a href="https://maps.apple.com/?daddr=${coords[1]},${coords[0]}" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;text-decoration:none;font-size:12px;font-weight:600;color:#333;">Apple Maps</a></div></div></div></div></div>`;

    popupRef.current = new mapboxgl.Popup({
      offset: 15,
      closeButton: false,
      closeOnClick: false,
      maxWidth: "320px",
    })
      .setLngLat(coords)
      .setHTML(html)
      .addTo(map);
    popupRef.current.on("close", () => {
      const m = mapRef.current;
      if (m && m.getLayer("capa-puntos")) {
        if (savedPuntosFilterRef.current !== null) {
          m.setFilter("capa-puntos", savedPuntosFilterRef.current);
          savedPuntosFilterRef.current = null;
        } else if (recorridoRouteDataRef.current) {
          m.setFilter("capa-puntos", [
            "in",
            ["get", "id"],
            ["literal", recorridoRouteDataRef.current.entityIds],
          ]);
        }
      }
      limpiarConexiones(m);
    });
    dibujarConexiones(coincId, coords, map, conexData);
    if (map.getLayer("capa-puntos")) {
      savedPuntosFilterRef.current = map.getFilter("capa-puntos");
      const ids = recorridoRouteDataRef.current
        ? recorridoRouteDataRef.current.entityIds
        : [];
      const allIds = [...ids, coincId];
      for (const c of conexData) {
        const isOrigin = c.entidad_origen_id === coincId;
        const otherId = isOrigin ? c.entidad_destino_id : c.entidad_origen_id;
        if (!allIds.includes(otherId)) allIds.push(otherId);
      }
      map.setFilter("capa-puntos", [
        "in",
        ["get", "id"],
        ["literal", allIds],
      ]);
    }

    setTerminoBusqueda(nombre);
  }, [geoData, limpiarConexiones, dibujarConexiones, setTerminoBusqueda]);

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
        const d =
          Math.sqrt((f2[0] - f1[0]) ** 2 + (f2[1] - f1[1]) ** 2) || 0.001;
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
      const initialCoords = allRoutePoints.slice(
        0,
        Math.min(4, allRoutePoints.length),
      );
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
        const currentEnd = Math.max(
          2,
          Math.ceil(allRoutePoints.length * progress),
        );
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
        // Volar a la vista general de Chaco
        map.flyTo({
          center: [-60.44, -26.05],
          zoom: 7,
          speed: 0.8,
          essential: true,
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleResetMap = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
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
    map.flyTo({
      center: [-60.44, -26.05],
      zoom: 7,
      speed: 0.8,
      essential: true,
    });
  }, []);

  const handleRecorridoFly = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [-60.44, -26.05],
        zoom: 7,
        speed: 0.8,
        essential: true,
      });
    }
  }, []);

  // Watchers para acciones del Header via store
  useEffect(() => {
    if (searchSelectToken === 0) return;
    handleSearchSelect(useMapStore.getState().searchTerm);
  }, [searchSelectToken, handleSearchSelect]);

  useEffect(() => {
    if (resetMapToken === 0) return;
    handleResetMap();
  }, [resetMapToken, handleResetMap]);

  useEffect(() => {
    if (recorridoFlyToken === 0) return;
    handleRecorridoFly();
  }, [recorridoFlyToken, handleRecorridoFly]);

  // 4b. Toggle dark mode on map canvas, persist, and broadcast
  useEffect(() => {
    localStorage.setItem("made-in-chaco-dark-mode", darkMode);
    const map = mapRef.current;
    if (!map) return;
    try {
      const canvas = map.getCanvas();
      canvas.style.filter = darkMode
        ? "brightness(0.7) saturate(0.6) invert(0.92) hue-rotate(180deg)"
        : "";
      canvas.style.transition = "filter 0.5s ease";
      canvas.classList.remove("grayscale-canvas");
    } catch (_) {}
  }, [darkMode]);

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
  }, [
    filtro,
    filtroLocalidad,
    terminoBusqueda,
    limpiarConexiones,
    limpiarRutaRecorrido,
  ]);

  // 6. Mostrar hint de ESC después de 5s con filtro/ruta activos
  useEffect(() => {
    const anyActive =
      filtro !== "todos" ||
      filtroLocalidad !== "" ||
      recorridoActivo !== null ||
      entityActive;

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
      <SEO title="Mapa Interactivo" description="Explorá el mapa interactivo de Made in Chaco y descubrí emprendedores, cultura, turismo y tradiciones de toda la provincia." />
      {/* Estilos para animaciones */}
      <style>{`
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

        @keyframes wobble {
          0% { opacity: 0; transform: scale(0.4) rotate(var(--bubble-rotate, 0deg)); }
          12% { opacity: 1; transform: scale(1.08) rotate(var(--bubble-rotate, 0deg)); }
          20% { transform: scale(1) rotate(var(--bubble-rotate, 0deg)); }
          25% { transform: rotate(var(--bubble-rotate, 0deg)) translateX(-1.5px); }
          75% { transform: rotate(var(--bubble-rotate, 0deg)) translateX(1.5px); }
          85% { opacity: 1; transform: rotate(var(--bubble-rotate, 0deg)) translateX(0); }
          100% { opacity: 0; transform: scale(0.4) rotate(var(--bubble-rotate, 0deg)); }
        }

        @keyframes tipFade {
          0% { opacity: 0; }
          12% { opacity: 1; }
          85% { opacity: 1; }
          100% { opacity: 0; }
        }

        .speech-bubble-popup .mapboxgl-popup-content {
          background: white !important;
          border: 3px solid #2D1A12 !important;
          border-radius: 30px 18px 30px 18px / 20px 30px 18px 30px !important;
          padding: 0 !important;
          box-shadow:
            4px 4px 0px #2D1A12,
            0 6px 20px rgba(0,0,0,0.12) !important;
          animation: wobble 3s ease-in-out forwards;
        }

        .speech-bubble-popup .mapboxgl-popup-tip {
          border-top-color: #2D1A12 !important;
          border-width: 12px 10px 0 10px !important;
          animation: tipFade 3s ease-in-out forwards;
        }

        .speech-bubble-popup .mapboxgl-popup-content::before {
          content: '';
          position: absolute;
          top: 4px;
          left: 6px;
          right: 6px;
          height: 6px;
          background: rgba(255,255,255,0.35);
          border-radius: 50%;
        }

        .speech-bubble-popup-content {
          display: block;
          padding: 14px 28px;
          font-family: 'Patrick Hand', 'Caveat', 'Comic Sans MS', cursive, sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #2D1A12;
          text-align: center;
          white-space: nowrap;
          background: linear-gradient(145deg, #fffdf5 0%, #fff5e6 100%);
          border-radius: 28px 16px 28px 16px / 18px 28px 16px 28px;
          position: relative;
          text-shadow: 1px 1px 0 rgba(0,0,0,0.05);
          letter-spacing: 0.02em;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.1s;
        }

        .speech-bubble-popup-content:hover {
          transform: scale(1.04);
        }

        .speech-bubble-popup-content:active {
          transform: scale(0.96);
        }

        .dark-mode .speech-bubble-popup .mapboxgl-popup-content {
          background: linear-gradient(145deg, #2a2a35 0%, #1e1e28 100%) !important;
          border-color: #c0a880 !important;
          box-shadow:
            4px 4px 0px #c0a880,
            0 6px 20px rgba(0,0,0,0.3) !important;
        }

        .dark-mode .speech-bubble-popup .mapboxgl-popup-tip {
          border-top-color: #c0a880 !important;
        }

        .dark-mode .speech-bubble-popup-content {
          background: transparent;
          color: #f0e8d0;
          text-shadow: 1px 1px 0 rgba(0,0,0,0.2);
        }

        .dark-mode .speech-bubble-popup .mapboxgl-popup-content::before {
          background: rgba(255,255,255,0.08);
        }

        .mapboxgl-popup-content,
        .recorrido-popup-overlay,
        .localidad-detail-panel,
        .esc-hint-overlay {
          transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease;
        }
      `}</style>

      {showStartOverlay && (
        <WelcomeOverlay onClick={handleStartExperience} />
      )}

      {showEscHint && (
        <EscHint onDismiss={() => setShowEscHint(false)} />
      )}

      {recorridoPopup && (
        <RecorridoPopup
          nombre={recorridoPopup.nombre}
          slug={recorridoPopup.slug}
          onDismiss={() => setRecorridoPopup(null)}
        />
      )}

      {filtroLocalidad && (() => {
        const loc = localidades.find(
          (l) => l.id === parseInt(filtroLocalidad),
        );
        if (!loc) return null;
        return (
          <LocalidadDetailPanel localidad={loc} panelOpen={panelOpen} />
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
          localidades={localidades}
          showDepartamentos={showDepartamentos}
          onToggleDepartamentos={(val) => {
            setShowDepartamentos(val);
            const map = window.__mapInstance;
            if (map?.getLayer("capa-departamentos-lineas")) {
              map.setLayoutProperty(
                "capa-departamentos-lineas",
                "visibility",
                val ? "visible" : "none",
              );
            }
          }}
        />
      </div>

      <div ref={mapContainer} className="map-container" style={{ width: "100%", height: "100vh" }} />

      {showControls && provincia && <SpeechBubble mapRef={mapRef} provincia={provincia} />}
    </div>
  );
};
