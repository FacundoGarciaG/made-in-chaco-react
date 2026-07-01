import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/AdminPanel.css";
import { useAuth } from "../context/AuthContext";
import { validarArchivo } from "../utils/mediaValidation";
import { subirArchivo, subirImagen } from "./uploadService";
import TagSelector from "../components/TagSelector";
import { MiniMap } from "../components/MiniMap";
import { useSocketEvent } from "../hooks/useSocket";
import { getToken, authHeaders, authFetch, colorMapAdmin, parseSocialList, styles } from "./helpers";
import { optimizarUrlCloudinary } from "../utils/imageUrl";
import { SOCIAL_PLATFORMS, COMUNIDADES_ETNICAS, QUE_INCLUYE_EXPERIENCIA, TIPOS_EXPERIENCIA, TIPOS_PRODUCTO, SERVICIOS_SUGERIDOS, ACTIVIDADES_SUGERIDAS, TIPOS_RELATO, RUBROS_COMERCIO, DIAS_SEMANA, CATEGORIAS_HOSPEDAJE } from "./constants";
import { DetailField, GastronomiaSelector, SocialMediaManager, LocalidadRow } from "./components";
import { DashboardView } from "./DashboardView";
import logoAdm from "../assets/imagenes/logo-madeinchaco.png";
import { SEO } from "../components/SEO";
import { PalabrasView } from "./PalabrasView";
import { DevolucionesView } from "./DevolucionesView";
import { EdicionesView } from "./EdicionesView";
import { UsuariosView } from "./UsuariosView";
import { PlanesView } from "./PlanesView";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const AdminPanel = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState("entidades");
  const [expandedGroups, setExpandedGroups] = useState({ contenido: true, pendientes: true, administracion: false });
  const [loading, setLoading] = useState(false);
  const [localidades, setLocalidades] = useState([]);
  const [editValues, setEditValues] = useState({});

  const isRowDirty = (loc) => {
    const vals = editValues[loc.id];
    if (!vals) return false;
    return (
      (vals.habitantes ?? "") !== (loc.habitantes?.toString() ?? "") ||
      (vals.fecha_fundacion ?? "") !== (loc.fecha_fundacion ?? "") ||
      (vals.gentilicio ?? "") !== (loc.gentilicio ?? "")
    );
  };

  const handleEditChange = (id, field, value) => {
    setEditValues((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const guardarLocalidades = async () => {
    const dirty = localidades.filter((loc) => isRowDirty(loc));
    if (dirty.length === 0) return;

    const confirmed = await showConfirm(
      `¿Estás seguro de guardar los cambios en ${dirty.length} localidad${dirty.length !== 1 ? "es" : ""}?`,
      "GUARDAR"
    );
    if (!confirmed) return;

    await Promise.all(
      dirty.map((loc) => {
        const vals = editValues[loc.id];
        return authFetch(`/api/localidades/${loc.id}`, {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            habitantes: vals.habitantes || null,
            fecha_fundacion: vals.fecha_fundacion || null,
            gentilicio: vals.gentilicio || null,
            es_cabecera: loc.es_cabecera ?? false,
          }),
        });
      })
    );

    showPopup(`Cambios guardados en ${dirty.length} localidad${dirty.length !== 1 ? "es" : ""}.`, "success");
    setEditValues({});
    await cargarLocalidades();
  };

  const dirtyCount = localidades.reduce((c, loc) => c + (isRowDirty(loc) ? 1 : 0), 0);

  const formatDate = (d) => {
    if (!d) return "";
    if (/^\d{4}$/.test(d)) return d;
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  const [allEntities, setAllEntities] = useState([]);
  const [entidadSearch, setEntidadSearch] = useState("");
  const [entidadFilterTipo, setEntidadFilterTipo] = useState("");
  const [entidadFilterPerfil, setEntidadFilterPerfil] = useState("");
  const [entidadFilterLocalidad, setEntidadFilterLocalidad] = useState("");
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [approveModal, setApproveModal] = useState(null); // { id, tipo, nombre }
  const [solicitudDetalle, setSolicitudDetalle] = useState(null);
  const [pendingSolicitudes, setPendingSolicitudes] = useState(0);
  const [pendingEdiciones, setPendingEdiciones] = useState(0);
  const [pendingDevoluciones, setPendingDevoluciones] = useState(0);
  const [step, setStep] = useState(1);
  const [editingEntityId, setEditingEntityId] = useState(null);

  const mapContainer = useRef(null);
  const map = useRef(null);
  const marker = useRef(null);
  const geoTimeoutRef = useRef(null);
  const originalGeneralRef = useRef(null);
  const originalEspecificoRef = useRef(null);
  const originalMultimediaRef = useRef(null);
  const originalConexRef = useRef(null);

  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState([]);

  const [general, setGeneral] = useState({
    tipo: "",
    nombre: "",
    slug: "",
    resumen: "",
    localidad_id: "",
    latitud: -27.4511,
    longitud: -58.9861,
    visible: true,
    direccion_escrita: "",
    icono: "",
  });

  const [especifico, setEspecifico] = useState({});
  const [multimediaItems, setMultimediaItems] = useState([
    {
      url_recurso: "",
      titulo_alternativo: "",
      descripcion_recurso: "",
      tipo_recurso: "foto",
      es_principal: true,
      public_id: "",
      entidades_etiquetadas: [],
    },
  ]);

  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [uploadingPortada, setUploadingPortada] = useState(false);
  const [subiendoIconoAdm, setSubiendoIconoAdm] = useState(false);
  const [multimediaError, setMultimediaError] = useState("");
  const [detailError, setDetailError] = useState("");

  const [conexModal, setConexModal] = useState(null); // { id, nombre }
  const [conexSearch, setConexSearch] = useState("");
  const [conexFilterTipo, setConexFilterTipo] = useState("");
  const [conexResults, setConexResults] = useState([]);
  const [conexTempList, setConexTempList] = useState([]); // [{ entidad_destino_id, nombre, tipo_relacion, tipo_relacion_inversa }]
  const [conexSaving, setConexSaving] = useState(false);

  const hasEntityChanges = (() => {
    if (!editingEntityId) return true;
    const orig = originalGeneralRef.current;
    if (!orig) return false;
    for (const k of Object.keys(orig)) {
      if (String(general[k] ?? "") !== String(orig[k] ?? "")) return true;
    }
    const origSpec = originalEspecificoRef.current;
    if (origSpec) {
      const keys = new Set([...Object.keys(origSpec), ...Object.keys(especifico)]);
      for (const k of keys) {
        if (String(especifico[k] ?? "") !== String(origSpec[k] ?? "")) return true;
      }
    } else if (Object.keys(especifico).length > 0) {
      return true;
    }
    const origMult = originalMultimediaRef.current;
    if (origMult) {
      const a = JSON.stringify(multimediaItems.map((m) => m.url_recurso));
      const b = JSON.stringify(origMult.map((m) => m.url_recurso));
      if (a !== b) return true;
    }
    const origCx = originalConexRef.current;
    if (origCx) {
      const a = JSON.stringify([...conexTempList].sort((x, y) => x.entidad_destino_id - y.entidad_destino_id));
      const b = JSON.stringify([...origCx].sort((x, y) => x.entidad_destino_id - y.entidad_destino_id));
      if (a !== b) return true;
    }
    return false;
  })();

  const [recorridos, setRecorridos] = useState([]);
  const [editingRecorridoId, setEditingRecorridoId] = useState(null);
  const [recForm, setRecForm] = useState({ nombre: "", slug: "", descripcion: "", imagen: "" });
  const [recPasos, setRecPasos] = useState([]); // [{ entidad_id, nombre, descripcion_paso, paso_orden }]
  const [pasoSearch, setPasosearch] = useState("");
  const [pasoResults, setPasoResults] = useState([]);
  const [recSaving, setRecSaving] = useState(false);
  const recImagenRef = useRef(null);

  const [socketRefresh, setSocketRefresh] = useState(0);
  useSocketEvent("entidad:change", () => setSocketRefresh((t) => t + 1));
  useSocketEvent("recorrido:change", () => setSocketRefresh((t) => t + 1));
  useSocketEvent("localidad:change", () => setSocketRefresh((t) => t + 1));
  useSocketEvent("perfil:change", () => setSocketRefresh((t) => t + 1));

  const [popup, setPopup] = useState(null);
  const [confirmEmailInput, setConfirmEmailInput] = useState("");
  const pendingConfirm = useRef(null);
  const fotoPerfilRef = useRef(null);

  const showPopup = (msg, type = "success", duration = 3000) => {
    setPopup({ message: msg, type, isConfirm: false });
    setTimeout(() => setPopup(null), duration);
  };

  const showConfirm = (msg, confirmLabel = "ELIMINAR", confirmEmail = null) => {
    return new Promise((resolve) => {
      pendingConfirm.current = resolve;
      setConfirmEmailInput("");
      setPopup({ message: msg, confirmLabel, isConfirm: true, confirmEmail });
    });
  };

  // --- CARGAR DATOS ---
  const cargarLocalidades = async () => {
    try {
      const res = await authFetch("/api/localidades");
      if (res.ok) setLocalidades(await res.json());
    } catch {}
  };

  const cargarEntidades = async () => {
    try {
      const res = await authFetch("/api/entidades");
      if (res.ok) setAllEntities(await res.json());
    } catch {}
  };

  const cargarRecorridos = async () => {
    try {
      const res = await authFetch("/api/recorridos");
      if (res.ok) setRecorridos(await res.json());
    } catch {}
  };

  const cargarSolicitudes = async () => {
    setSolicitudesLoading(true);
    try {
      const res = await authFetch("/api/solicitudes", { headers: authHeaders() });
      if (res.ok) { const data = await res.json(); setSolicitudes(data); setPendingSolicitudes(data.length); }
    } catch {} finally {
      setSolicitudesLoading(false);
    }
  };

  useEffect(() => {
    cargarLocalidades();
    cargarEntidades();
    cargarRecorridos();
    (async () => {
      try {
        const res = await authFetch("/api/solicitudes-edicion/count", { headers: authHeaders() });
        if (res.ok) { const data = await res.json(); setPendingEdiciones(data.count || 0); }
      } catch {}
    })();
    (async () => {
      try {
        const res = await authFetch("/api/suscripciones/devoluciones/count", { headers: authHeaders() });
        if (res.ok) { const data = await res.json(); setPendingDevoluciones(data.count || 0); }
      } catch {}
    })();
    cargarSolicitudes();
  }, []);

  useEffect(() => {
    if (socketRefresh > 0) {
      cargarEntidades();
      cargarRecorridos();
      cargarLocalidades();
    }
  }, [socketRefresh]);

  const localidadOptions = useMemo(() => {
    const set = new Set(allEntities.map((e) => e.localidad_nombre).filter(Boolean));
    localidades.forEach((l) => { if (l.nombre) set.add(l.nombre); });
    return [...set].sort();
  }, [allEntities, localidades]);

  const perfilOptions = useMemo(() => {
    const map = new Map();
    allEntities.forEach((e) => {
      if (e.perfil_nombre && e.perfil_id) map.set(e.perfil_id, e.perfil_nombre);
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [allEntities]);

  const entidadesFiltradas = useMemo(() => {
    let items = [...allEntities];
    if (entidadSearch) {
      const q = entidadSearch.toLowerCase();
      items = items.filter((e) => e.nombre.toLowerCase().includes(q));
    }
    if (entidadFilterTipo) {
      items = items.filter((e) => e.tipo === entidadFilterTipo);
    }
    if (entidadFilterPerfil) {
      items = items.filter((e) => String(e.perfil_id) === entidadFilterPerfil);
    }
    if (entidadFilterLocalidad) {
      const locId = localidades.find((l) => l.nombre === entidadFilterLocalidad)?.id;
      items = items.filter((e) => e.localidad_nombre === entidadFilterLocalidad || (locId && e.localidad_id === locId));
    }
    return items;
  }, [allEntities, entidadSearch, entidadFilterTipo, entidadFilterPerfil, entidadFilterLocalidad]);

  const tipoCounts = useMemo(() => {
    const counts = {};
    allEntities.forEach((e) => { counts[e.tipo] = (counts[e.tipo] || 0) + 1; });
    return counts;
  }, [allEntities]);

  const tipos = Object.keys(tipoCounts);
  const totalEntidades = allEntities.length;

  // --- MAPA ---
  const mapLat = general.latitud ?? -27.4511;
  const mapLng = general.longitud ?? -58.9861;

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) {
      map.current.remove();
      map.current = null;
    }
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [mapLng, mapLat],
      zoom: 12,
    });
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    if (marker.current) marker.current.remove();
    const el = document.createElement("div");
    const iconoSrc = general.icono || (general.tipo ? `/icons/${general.tipo}.png` : "");
    if (iconoSrc) {
      const img = document.createElement("img");
      img.src = iconoSrc;
      img.style.width = "36px";
      img.style.height = "36px";
      img.style.borderRadius = "4px";
      img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
      img.style.objectFit = "contain";
      el.appendChild(img);
    }
    marker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([mapLng, mapLat])
      .addTo(map.current);
    return () => {
      if (marker.current) { marker.current.remove(); marker.current = null; }
      if (map.current) { map.current.remove(); map.current = null; }
    };
  }, [step, view, mapLat, mapLng]);

  useEffect(() => {
    if (marker.current) {
      marker.current.setLngLat([mapLng, mapLat]);
      map.current?.flyTo({ center: [mapLng, mapLat], zoom: 15, duration: 800 });
    }
  }, [mapLat, mapLng]);

  useEffect(() => {
    if (!marker.current || !map.current) return;
    const iconoSrc = general.icono || (general.tipo ? `/icons/${general.tipo}.png` : "");
    const el = document.createElement("div");
    if (iconoSrc) {
      const img = document.createElement("img");
      img.src = iconoSrc;
      img.style.width = "36px";
      img.style.height = "36px";
      img.style.borderRadius = "4px";
      img.style.boxShadow = "0 2px 8px rgba(0,0,0,0.25)";
      img.style.objectFit = "contain";
      el.appendChild(img);
    }
    marker.current.remove();
    marker.current = new mapboxgl.Marker({ element: el })
      .setLngLat([mapLng, mapLat])
      .addTo(map.current);
  }, [general.tipo, general.icono]);

  // Mover mapa al seleccionar localidad (solo cambios del usuario)
  const localidadUserRef = useRef(false);
  useEffect(() => {
    if (!localidadUserRef.current) return;
    if (!general.localidad_id) return;
    const loc = localidades.find((l) => l.id === Number(general.localidad_id));
    if (loc?.latitud && loc?.longitud) {
      setGeneral((prev) => ({
        ...prev,
        latitud: Number(loc.latitud),
        longitud: Number(loc.longitud),
      }));
    }
  }, [general.localidad_id, localidades]);

  // --- BÚSQUEDA GEOGRÁFICA ---
  const geoTimer = useRef(null);
  useEffect(() => {
    if (!geoQuery.trim() || geoQuery.trim().length < 3) { setGeoResults([]); return; }
    clearTimeout(geoTimer.current);
    geoTimer.current = setTimeout(async () => {
      try {
        const locNombre = general.localidad_id
          ? localidades.find((l) => l.id === Number(general.localidad_id))?.nombre
          : null;
        const q = geoQuery.includes(",") ? geoQuery : `${geoQuery}${locNombre ? `, ${locNombre}` : ""}, Chaco, Argentina`;
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=ar`,
          { headers: { "User-Agent": "MadeInChaco/1.0", "Accept-Language": "es" } },
        );
        if (res.ok) setGeoResults(await res.json());
      } catch {}
    }, 400);
    return () => clearTimeout(geoTimer.current);
  }, [geoQuery, general.localidad_id]);

  const seleccionarGeo = (r) => {
    const lat = parseFloat(r.lat);
    const lon = parseFloat(r.lon);
    setGeneral((prev) => ({
      ...prev,
      latitud: lat,
      longitud: lon,
      direccion_escrita: (prev.direccion_escrita || "").trim() || r.display_name.split(",")[0]?.trim() || r.display_name,
    }));
    setGeoQuery(r.display_name);
    setGeoResults([]);
    if (map.current && marker.current) {
      map.current.flyTo({ center: [lon, lat], zoom: 15, duration: 800 });
      marker.current.setLngLat([lon, lat]);
    }
  };

  const onFieldChange = (field, value) => {
    if (field === "nombre" && !editingEntityId) {
      const newSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9áéíóúüñ\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setGeneral((prev) => ({ ...prev, nombre: value, slug: newSlug }));
    } else {
      setGeneral((prev) => ({ ...prev, [field]: value }));
    }
  };

  const onSpecChange = (field, value) => {
    setEspecifico((prev) => ({ ...prev, [field]: value }));
  };

  // --- CARGAR ENTIDAD PARA EDITAR ---
  const cargarEntidadParaEditar = async (id) => {
    originalGeneralRef.current = null;
    originalEspecificoRef.current = null;
    originalMultimediaRef.current = null;
    originalConexRef.current = null;
    try {
      const res = await authFetch(`/api/entidades/${id}`);
      if (!res.ok) return;
      const ent = await res.json();
      setEditingEntityId(ent.id);
      setStep(1);
      const gen = {
        tipo: ent.tipo || "",
        nombre: ent.nombre || "",
        slug: ent.slug || "",
        resumen: ent.resumen || "",
        localidad_id: ent.localidad_id || "",
        latitud: ent.latitud ?? null,
        longitud: ent.longitud ?? null,
        visible: ent.visible ?? true,
        direccion_escrita: ent.direccion_escrita || "",
        imagen: ent.imagen || "",
        icono: ent.icono || "",
        fecha_inicio_suscripcion: ent.fecha_inicio_suscripcion
          ? (typeof ent.fecha_inicio_suscripcion === "string" ? ent.fecha_inicio_suscripcion.split("T")[0] : new Date(ent.fecha_inicio_suscripcion).toISOString().split("T")[0])
          : "",
        fecha_fin_suscripcion: ent.fecha_fin_suscripcion
          ? (typeof ent.fecha_fin_suscripcion === "string" ? ent.fecha_fin_suscripcion.split("T")[0] : new Date(ent.fecha_fin_suscripcion).toISOString().split("T")[0])
          : "",
      };
      setGeneral(gen);
      originalGeneralRef.current = gen;
      setGeoQuery(ent.direccion_escrita || "");
      const spec = {};
      const typeDefs = TIPO_DETALLES[ent.tipo];
      if (typeDefs) typeDefs.forEach((def) => {
        let val = ent[def.field] ?? "";
        if (def.type === "date" && val) {
          val = typeof val === "string" ? val.split("T")[0] : new Date(val).toISOString().split("T")[0];
        }
        spec[def.field] = val;
      });
      setEspecifico(spec);
      originalEspecificoRef.current = { ...spec };

      // Multimedia existente
      const multRes = await authFetch(`/api/entidades/${id}/multimedia`);
      if (multRes.ok) {
        const multimedia = await multRes.json();
        const items = multimedia.length > 0
          ? multimedia.map((m) => ({
              id: m.id,
              url_recurso: m.url_recurso,
              titulo_alternativo: m.titulo_alternativo || "",
              descripcion_recurso: m.descripcion_recurso || "",
              tipo_recurso: m.tipo_recurso || "foto",
              es_principal: m.es_principal || false,
              public_id: m.public_id || "",
              entidades_etiquetadas: m.entidades_etiquetadas || [],
            }))
          : [{ url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", es_principal: true, public_id: "", entidades_etiquetadas: [] }];
        setMultimediaItems(items);
        originalMultimediaRef.current = items;
      }
      // Conexiones
      const conexRes = await authFetch(`/api/entidades/${id}/conexiones`);
      if (conexRes.ok) {
        const conexData = await conexRes.json();
        const items = conexData.map((c) => ({
          id: c.id,
          entidad_destino_id: c.entidad_origen_id === ent.id ? c.entidad_destino_id : c.entidad_origen_id,
          nombre: c.entidad_origen_id === ent.id ? c.nombre_destino : c.nombre_origen,
          tipo: c.entidad_origen_id === ent.id ? c.tipo_destino : c.tipo_origen,
          tipo_relacion: c.tipo_relacion || "",
          tipo_relacion_inversa: c.tipo_relacion_inversa || "",
        }));
        setConexTempList(items);
        originalConexRef.current = items;
      }

      setView("nuevo-editar");
      window.scrollTo(0, 0);
    } catch {}
  };

  // --- TIPOS DE ENTIDAD ---
  const TIPO_OPTIONS = [
    { value: "", label: "Seleccionar tipo..." },
    { value: "artesano", label: "Artesano" },
    { value: "gastronomia", label: "Gastronomía" },
    { value: "comercio", label: "Comercio" },
    { value: "evento", label: "Evento" },
    { value: "patrimonio", label: "Patrimonio" },
    { value: "personalidad", label: "Personalidad" },
    { value: "comunidad_indigena", label: "Comunidad indígena" },
    { value: "lugar_natural", label: "Lugar natural" },
    { value: "hospedaje", label: "Hospedaje" },
    { value: "productor", label: "Productor" },
    { value: "experiencia", label: "Experiencia" },
    { value: "relato", label: "Relato" },
    { value: "espacio_cultural", label: "Espacio cultural" },
  ];

  const TIPO_DETALLES = {
    artesano: [
      { field: "biografia_larga", label: "Biografía", type: "textarea" },
      { field: "tecnica_principal", label: "Técnica principal" },
      { field: "materiales_usados", label: "Materiales" },
      { field: "anios_experiencia", label: "Años de experiencia", type: "number" },
      { field: "taller_abierto", label: "Taller abierto al público", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
      { field: "fotos_galeria_url", label: "URLs de fotos (separadas por comas)" },
      { field: "comunidad_etnica", label: "Comunidad étnica", type: "select", dynamic: true },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    gastronomia: [
      { field: "historia_plato", label: "Historia del plato", type: "textarea" },
      { field: "ingredientes_clave", label: "Ingredientes clave" },
      { field: "receta_destacada", label: "Receta destacada", type: "textarea" },
      { field: "establecimientos_donde_probar", label: "Establecimientos", type: "gastronomia" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    comercio: [
      { field: "razon_social", label: "Razón social" },
      { field: "cuit", label: "CUIT" },
      { field: "email", label: "Email" },
      { field: "rubro_especifico", label: "Rubro específico", type: "rubro" },
      { field: "horario_apertura", label: "Horario apertura" },
      { field: "horario_cierre", label: "Horario cierre" },
      { field: "dias_abierto", label: "Días abierto", type: "dias" },
      { field: "acepta_tarjetas", label: "Acepta tarjetas", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
      { field: "sitio_web", label: "Sitio web" },
      { field: "biografia_larga", label: "Descripción", type: "textarea" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    evento: [
      { field: "razon_social", label: "Razón social" },
      { field: "cuit", label: "CUIT" },
      { field: "fecha_evento", label: "Fecha del evento", type: "date" },
      { field: "duracion_dias", label: "Duración (días)", type: "number" },
      { field: "actividades_principales", label: "Actividades principales", type: "actividades" },
      { field: "es_itinerante", label: "Evento itinerante", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
      { field: "link_entradas", label: "Link a compra de entradas" },
      { field: "biografia_larga", label: "Descripción", type: "textarea" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    patrimonio: [
      { field: "año_referencia", label: "Año de referencia" },
      { field: "estilo_arquitectonico", label: "Estilo arquitectónico" },
      { field: "declaratoria_oficial", label: "Declaratoria oficial" },
      { field: "estado_conservacion", label: "Estado de conservación" },
      { field: "biografia_larga", label: "Descripción", type: "textarea" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    personalidad: [
      { field: "nombre_completo", label: "Nombre completo" },
      { field: "apodo", label: "Apodo / conocido como" },
      { field: "biografia_resumida", label: "Biografía", type: "textarea" },
      { field: "profesion", label: "Profesión" },
      { field: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" },
      { field: "biografia_larga", label: "Biografía detallada", type: "textarea" },
      { field: "es_referente_comunidad", label: "Referente comunitario", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
      { field: "comunidad_etnica", label: "Comunidad étnica", type: "select", dynamic: true },
      { field: "contacto", label: "Contacto" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    comunidad_indigena: [
      { field: "biografia_larga", label: "Historia / Descripción", type: "textarea" },
      { field: "etnia", label: "Etnia", type: "select", dynamic: true },
      { field: "lenguas", label: "Lenguas" },
      { field: "territorio_tradicional", label: "Territorio tradicional", type: "textarea" },
      { field: "cosmovision", label: "Cosmovisión", type: "textarea" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    lugar_natural: [
      { field: "biografia_larga", label: "Descripción", type: "textarea" },
      { field: "categoria_natural", label: "Categoría" },
      { field: "actividades", label: "Actividades", type: "textarea" },
      { field: "acceso", label: "Acceso", type: "textarea" },
      { field: "flora_fauna_destacada", label: "Flora y fauna destacada", type: "textarea" },
      { field: "mejor_epoca", label: "Mejor época para visitar" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    hospedaje: [
      { field: "razon_social", label: "Razón social" },
      { field: "cuit", label: "CUIT" },
      { field: "biografia_larga", label: "Descripción", type: "textarea" },
      { field: "categoria_hospedaje", label: "Categoría", type: "categoria" },
      { field: "servicios", label: "Servicios", type: "servicios" },
      { field: "capacidad", label: "Capacidad" },
      { field: "sitio_web", label: "Sitio web" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    productor: [
      { field: "razon_social", label: "Razón social" },
      { field: "cuit", label: "CUIT" },
      { field: "biografia_larga", label: "Descripción", type: "textarea" },
      { field: "tipo_producto", label: "Tipo de producto", type: "productos" },
      { field: "metodos_produccion", label: "Métodos de producción", type: "textarea" },
      { field: "certificaciones", label: "Certificaciones" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
      { field: "sitio_web", label: "Sitio web" },
    ],
    experiencia: [
      { field: "biografia_larga", label: "Descripción", type: "textarea" },
      { field: "tipo_experiencia", label: "Tipo de experiencia", type: "experiencias" },
      { field: "duracion_experiencia", label: "Duración" },
      { field: "que_incluye", label: "Qué incluye", type: "incluye" },
      { field: "precio_referencia", label: "Precio de referencia" },
      { field: "contacto_reserva", label: "Contacto / Reserva" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
      { field: "operador", label: "Operador / Guía" },
    ],
    relato: [
      { field: "autor", label: "Autor del relato" },
      { field: "fecha_relato", label: "Fecha del relato", type: "date" },
      { field: "tipo_relato", label: "Tipo de relato", type: "select", options: TIPOS_RELATO.map((v) => ({ value: v, label: v })) },
      { field: "contenido_completo", label: "Contenido completo", type: "textarea" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
    espacio_cultural: [
      { field: "biografia_larga", label: "Descripción", type: "textarea" },
      { field: "tipo_espacio", label: "Tipo de espacio" },
      { field: "horarios", label: "Horarios" },
      { field: "sitio_web", label: "Sitio web" },
      { field: "redes_sociales", label: "Redes sociales", type: "social" },
    ],
  };

  // Helper para renderizar el detalle específico según tipo y field
  const renderSpecField = (fieldDef) => {
    if (fieldDef.type === "social") {
      return (
        <SocialMediaManager
          key={fieldDef.field}
          value={especifico[fieldDef.field]}
          onChange={(v) => onSpecChange(fieldDef.field, v)}
          label={fieldDef.label}
        />
      );
    }
    if (fieldDef.type === "gastronomia") {
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {fieldDef.label}
          </label>
          <GastronomiaSelector
            value={especifico[fieldDef.field]}
            onChange={(v) => onSpecChange(fieldDef.field, v)}
            allEntities={allEntities}
          />
        </div>
      );
    }
    if (fieldDef.type === "servicios") {
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {fieldDef.label}
          </label>
          <TagSelector
            value={especifico[fieldDef.field] || ""}
            onChange={(v) => onSpecChange(fieldDef.field, v)}
            suggestions={SERVICIOS_SUGERIDOS}
            placeholder="Escribí o seleccioná servicios..."
          />
        </div>
      );
    }
    if (fieldDef.type === "productos") {
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {fieldDef.label}
          </label>
          <TagSelector
            value={especifico[fieldDef.field] || ""}
            onChange={(v) => onSpecChange(fieldDef.field, v)}
            suggestions={TIPOS_PRODUCTO}
            placeholder="Escribí o seleccioná tipo de producto..."
          />
        </div>
      );
    }
    if (fieldDef.type === "experiencias") {
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {fieldDef.label}
          </label>
          <TagSelector
            value={especifico[fieldDef.field] || ""}
            onChange={(v) => onSpecChange(fieldDef.field, v)}
            suggestions={TIPOS_EXPERIENCIA}
            placeholder="Escribí o seleccioná tipo de experiencia..."
          />
        </div>
      );
    }
    if (fieldDef.type === "incluye") {
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {fieldDef.label}
          </label>
          <TagSelector
            value={especifico[fieldDef.field] || ""}
            onChange={(v) => onSpecChange(fieldDef.field, v)}
            suggestions={QUE_INCLUYE_EXPERIENCIA}
            placeholder="Escribí o seleccioná..."
          />
        </div>
      );
    }
    if (fieldDef.type === "actividades") {
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {fieldDef.label}
          </label>
          <TagSelector
            value={especifico[fieldDef.field] || ""}
            onChange={(v) => onSpecChange(fieldDef.field, v)}
            suggestions={ACTIVIDADES_SUGERIDAS}
            placeholder="Escribí o seleccioná actividades..."
          />
        </div>
      );
    }
    if (fieldDef.type === "rubro") {
      const val = especifico[fieldDef.field] || "";
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {fieldDef.label}
          </label>
          <select
            value={val}
            onChange={(e) => onSpecChange(fieldDef.field, e.target.value)}
            style={styles.input}
          >
            <option value="">Seleccionar rubro...</option>
            {RUBROS_COMERCIO.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
            <option value="__otro__">Otros</option>
          </select>
          {val === "__otro__" && (
            <input
              type="text"
              placeholder="Escribí el rubro..."
              value={especifico[fieldDef.field + "_custom"] || ""}
              onChange={(e) => onSpecChange(fieldDef.field + "_custom", e.target.value)}
              style={{ ...styles.input, marginTop: 8 }}
            />
          )}
        </div>
      );
    }
    if (fieldDef.type === "categoria") {
      const val = especifico[fieldDef.field] || "";
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {fieldDef.label}
          </label>
          <select
            value={val}
            onChange={(e) => onSpecChange(fieldDef.field, e.target.value)}
            style={styles.input}
          >
            <option value="">Seleccionar categoría...</option>
            {CATEGORIAS_HOSPEDAJE.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__otro__">Otros</option>
          </select>
          {val === "__otro__" && (
            <input
              type="text"
              placeholder="Escribí la categoría..."
              value={especifico[fieldDef.field + "_custom"] || ""}
              onChange={(e) => onSpecChange(fieldDef.field + "_custom", e.target.value)}
              style={{ ...styles.input, marginTop: 8 }}
            />
          )}
        </div>
      );
    }
    if (fieldDef.type === "dias") {
      const dias = (especifico[fieldDef.field] || "").split(",").filter(Boolean);
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 8, letterSpacing: "0.5px", textTransform: "uppercase" }}>
            {fieldDef.label}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {DIAS_SEMANA.map((dia) => {
              const checked = dias.includes(dia);
              return (
                <label
                  key={dia}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    cursor: "pointer",
                    background: checked ? "#863819" : "#f5f2eb",
                    color: checked ? "white" : "#555",
                    fontWeight: checked ? 600 : 400,
                    border: checked ? "none" : "1px solid #eee",
                    transition: "0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? dias.filter((d) => d !== dia)
                        : [...dias, dia];
                      onSpecChange(fieldDef.field, next.join(","));
                    }}
                    style={{ display: "none" }}
                  />
                  {dia}
                </label>
              );
            })}
          </div>
        </div>
      );
    }
    if (fieldDef.dynamic) {
      return (
        <DetailField
          key={fieldDef.field}
          field={fieldDef.field}
          fieldVal={especifico[fieldDef.field]}
          onFieldChange={onSpecChange}
          label={fieldDef.label}
          type="select"
          options={COMUNIDADES_ETNICAS.map((v) => ({ value: v, label: v || "Seleccionar..." }))}
        />
      );
    }
    return (
      <DetailField
        key={fieldDef.field}
        field={fieldDef.field}
        fieldVal={especifico[fieldDef.field]}
        onFieldChange={onSpecChange}
        label={fieldDef.label}
        type={fieldDef.type || "text"}
        options={fieldDef.options}
      />
    );
  };

  // --- RENDER INPUTS DE TIPO ESPECÍFICO ---
  const renderSpecInputs = () => {
    const defs = TIPO_DETALLES[general.tipo];
    if (!defs) return null;
    return <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee", marginTop: 16 }}>
      <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>Detalles específicos</h3>
      {defs.map(renderSpecField)}
    </div>;
  };

  // --- CREAR / ACTUALIZAR ENTIDAD ---
  const guardarEntidad = async () => {
    if (!general.tipo || !general.nombre.trim()) {
      showPopup("Completá tipo y nombre", "error");
      return;
    }
    if (editingEntityId && !hasEntityChanges) {
      showPopup("No hay cambios para guardar", "error");
      return;
    }
    setLoading(true);
    try {
      const body = {
        ...general,
        ...especifico,
        fecha_inicio_suscripcion: general.fecha_inicio_suscripcion || null,
        fecha_fin_suscripcion: general.fecha_fin_suscripcion || null,
      };
      delete body.latitud;
      delete body.longitud;
      if (general.latitud != null) body.latitud = Number(general.latitud);
      if (general.longitud != null) body.longitud = Number(general.longitud);
      if (body.nombre_completo && !body.nombre) body.nombre = body.nombre_completo;
      if (body.es_referente_comunidad === "true") body.es_referente_comunidad = true;
      if (body.es_referente_comunidad === "false") body.es_referente_comunidad = false;

      // Convertir __otro__ en selects con opción "Otros"
      if (body.rubro_especifico === "__otro__") {
        body.rubro_especifico = body.rubro_especifico_custom || "Otros";
      }
      delete body.rubro_especifico_custom;
      if (body.categoria_hospedaje === "__otro__") {
        body.categoria_hospedaje = body.categoria_hospedaje_custom || "Otros";
      }
      delete body.categoria_hospedaje_custom;

      const method = editingEntityId ? "PUT" : "POST";
      const url = editingEntityId ? `/api/entidades/${editingEntityId}` : "/api/entidades";
      const res = await authFetch(url, {
        method,
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const saved = await res.json();
        const entityId = saved.id || editingEntityId;

        // Guardar multimedia
        if (multimediaItems.length > 0 && multimediaItems[0].url_recurso) {
          for (let i = 0; i < multimediaItems.length; i++) {
            const m = multimediaItems[i];
            if (m.id) {
              // skip existing
            } else if (m.url_recurso) {
              await authFetch(`/api/multimedia`, {
                method: "POST",
                headers: authHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                  entidad_id: entityId,
                  url_recurso: m.url_recurso,
                  titulo_alternativo: m.titulo_alternativo || "Multimedia",
                  descripcion_recurso: m.descripcion_recurso || "",
                  tipo_recurso: m.tipo_recurso || "foto",
                  es_principal: i === 0,
                  public_id: m.public_id || "",
                  entidades_etiquetadas: m.entidades_etiquetadas || [],
                }),
              });
            }
          }
        }

        // Guardar conexiones
        if (conexTempList.length > 0) {
          await authFetch(`/api/entidades/${entityId}/conexiones`, {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(conexTempList.map((c) => ({
              entidad_destino_id: c.entidad_destino_id,
              tipo_relacion: c.tipo_relacion,
              tipo_relacion_inversa: c.tipo_relacion_inversa,
            }))),
          });
          setConexTempList([]);
        } else {
          // Si no hay conexiones, mandar array vacío para limpiar
          await authFetch(`/api/entidades/${entityId}/conexiones`, {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify([]),
          });
        }

        showPopup(editingEntityId ? "Entidad actualizada" : "Entidad creada");
        setView("entidades");
        setEditingEntityId(null);
        setStep(1);
        setGeneral({ tipo: "", nombre: "", slug: "", resumen: "", localidad_id: "", latitud: -27.4511, longitud: -58.9861, visible: true, direccion_escrita: "", imagen: "", fecha_inicio_suscripcion: "", fecha_fin_suscripcion: "" });
        setGeoQuery("");
        setEspecifico({});
        setMultimediaItems([{ url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", es_principal: true, public_id: "", entidades_etiquetadas: [] }]);
        cargarEntidades();
        cargarSolicitudes();
      } else {
        const err = await res.json().catch(() => ({}));
        showPopup(err.error || "Error al guardar", "error");
      }
    } catch (err) {
      showPopup("Error al guardar entidad", "error");
    } finally {
      setLoading(false);
    }
  };

  // --- ELIMINAR ENTIDAD ---
  const eliminarEntidad = async (id, nombre) => {
    const ok = await showConfirm(`¿Eliminar "${nombre}"?`, "ELIMINAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/entidades/${id}`, { method: "DELETE", headers: authHeaders({ "Content-Type": "application/json" }) });
      if (res.ok) {
        showPopup("Entidad eliminada");
        cargarEntidades();
      }
    } catch {}
  };

  const toggleVisibilidad = async (id, visible) => {
    const ok = await showConfirm(`¿${visible ? "Ocultar" : "Mostrar"} esta entidad?`, "CONFIRMAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/entidades/${id}/visible`, {
        method: "PATCH",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ visible: !visible }),
      });
      if (res.ok) cargarEntidades();
    } catch {}
  };

  // --- SUBIR PORTADA ---
  const handlePortadaUpload = async (file) => {
    setUploadingPortada(true);
    try {
      const url = await subirImagen(file);
      setGeneral((prev) => ({ ...prev, imagen: url }));
    } catch {
      showPopup("Error al subir imagen de portada", "error");
    } finally {
      setUploadingPortada(false);
    }
  };

  const handleIconoUpload = async (file) => {
    if (file.type !== "image/png") {
      showPopup("El icono debe ser una imagen PNG.", "error");
      return;
    }
    setSubiendoIconoAdm(true);
    try {
      const dimensionsValid = await new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
          URL.revokeObjectURL(url);
          if (img.width !== 24 || img.height !== 24) {
            showPopup(`El icono debe ser de 24×24 px. La imagen subida es de ${img.width}×${img.height} px.`, "error");
            resolve(false);
          } else {
            resolve(true);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          showPopup("No se pudo leer la imagen.", "error");
          resolve(false);
        };
        img.src = url;
      });
      if (!dimensionsValid) { setSubiendoIconoAdm(false); return; }
      const url = await subirImagen(file);
      setGeneral((prev) => ({ ...prev, icono: url }));
    } catch {
      showPopup("Error al subir icono", "error");
    } finally {
      setSubiendoIconoAdm(false);
    }
  };

  // --- SUBIR MULTIMEDIA ---
  const handleUpload = async (index, file) => {
    const tipo = multimediaItems[index]?.tipo_recurso || "foto";
    const error = validarArchivo(file, tipo);
    if (error) { setMultimediaError(error); return; }
    setMultimediaError("");
    setUploadingIndex(index);
    try {
      const result = await subirArchivo(file, tipo, "made-in-chaco");
      setMultimediaItems((prev) => prev.map((item, i) => i === index ? { ...item, url_recurso: result.url, public_id: result.public_id } : item));
    } catch {
      setMultimediaError("Error al subir archivo");
    } finally {
      setUploadingIndex(null);
    }
  };

  const eliminarMultimedia = (i) => setMultimediaItems((p) => p.filter((_, idx) => idx !== i));

  // --- CONEXIONES ---
  useEffect(() => {
    if (!conexSearch.trim() && !conexFilterTipo) { setConexResults([]); return; }
    const q = conexSearch.toLowerCase();
    setConexResults(allEntities.filter((e) => e.id !== editingEntityId && e.nombre?.toLowerCase().includes(q) && (!conexFilterTipo || e.tipo === conexFilterTipo)));
  }, [conexSearch, conexFilterTipo, allEntities, editingEntityId]);

  const agregarConexTemp = (entidad) => {
    if (conexTempList.some((c) => c.entidad_destino_id === entidad.id)) return;
    setConexTempList((prev) => [...prev, { entidad_destino_id: entidad.id, nombre: entidad.nombre, tipo_relacion: "", tipo_relacion_inversa: "" }]);
    setConexSearch("");
    setConexResults([]);
  };

  const quitarConexTemp = (id) => {
    setConexTempList((prev) => prev.filter((c) => c.entidad_destino_id !== id));
  };

  // --- RECORRIDOS ---
  const buscarPasos = async (q) => {
    if (!q.trim()) { setPasoResults([]); return; }
    try {
      const res = await authFetch(`/api/entidades?search=${encodeURIComponent(q)}`);
      if (res.ok) setPasoResults(await res.json());
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(() => buscarPasos(pasoSearch), 300);
    return () => clearTimeout(t);
  }, [pasoSearch]);

  const agregarPaso = (entidad) => {
    if (recPasos.some((p) => p.entidad_id === entidad.id)) return;
    setRecPasos((prev) => [...prev, { entidad_id: entidad.id, nombre: entidad.nombre, descripcion_paso: "", paso_orden: prev.length + 1 }]);
    setPasosearch("");
    setPasoResults([]);
  };

  const reordenarPasos = (index, direction) => {
    const newPasos = [...recPasos];
    const target = index + direction;
    if (target < 0 || target >= newPasos.length) return;
    [newPasos[index], newPasos[target]] = [newPasos[target], newPasos[index]];
    newPasos.forEach((p, i) => { p.paso_orden = i + 1; });
    setRecPasos(newPasos);
  };

  const guardarRecorrido = async () => {
    if (!recForm.nombre.trim()) { showPopup("Falta el nombre del recorrido", "error"); return; }
    setRecSaving(true);
    try {
      let imagenUrl = recForm.imagen;
      if (recImagenRef.current?.files?.[0]) {
        const uploaded = await subirImagen(recImagenRef.current.files[0]);
        if (uploaded?.url) imagenUrl = uploaded.url;
      }

      if (editingRecorridoId) {
        const res = await authFetch(`/api/recorridos/${editingRecorridoId}`, {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ ...recForm, imagen: imagenUrl }),
        });
        if (!res.ok) { showPopup("Error al actualizar", "error"); return; }
      } else {
        const res = await authFetch("/api/recorridos", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({ ...recForm, imagen: imagenUrl }),
        });
        if (!res.ok) { showPopup("Error al crear", "error"); return; }
      }

      for (const [i, paso] of recPasos.entries()) {
        await authFetch("/api/recorridos/paso", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            recorrido_id: editingRecorridoId || 0,
            entidad_id: paso.entidad_id,
            descripcion_paso: paso.descripcion_paso,
            paso_orden: i + 1,
          }),
        });
      }

      showPopup(editingRecorridoId ? "Recorrido actualizado" : "Recorrido creado");
      setEditingRecorridoId(null);
      setRecForm({ nombre: "", slug: "", descripcion: "", imagen: "" });
      setRecPasos([]);
      cargarRecorridos();
    } catch {
      showPopup("Error al guardar recorrido", "error");
    } finally {
      setRecSaving(false);
    }
  };

  const cargarRecorridoParaEditar = async (id) => {
    try {
      const res = await authFetch(`/api/recorridos/${id}`);
      if (!res.ok) return;
      const rec = await res.json();
      setEditingRecorridoId(rec.id);
      setRecForm({ nombre: rec.nombre, slug: rec.slug, descripcion: rec.descripcion, imagen: rec.imagen });
      if (rec.pasos) setRecPasos(rec.pasos.map((p, i) => ({ entidad_id: p.entidad_id, nombre: p.entidad_nombre, descripcion_paso: p.descripcion_paso, paso_orden: i + 1 })));
    } catch {}
  };

  const eliminarRecorrido = async (id, nombre) => {
    const ok = await showConfirm(`¿Eliminar el recorrido "${nombre}"?`, "ELIMINAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/recorridos/${id}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) { showPopup("Recorrido eliminado"); cargarRecorridos(); }
    } catch {}
  };

  // --- SOLICITUDES SELLO ---
  const aprobarSolicitud = async (id, nombre, tipo) => {
    const ok = await showConfirm(
      `¿Aprobar solicitud de "${nombre}"? Se habilitarán suscripciones para esta entidad.`,
      "APROBAR"
    );
    if (!ok) return;
    try {
      const res = await authFetch(`/api/solicitudes/${id}/aprobar`, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ tipo }),
      });
      if (res.ok) {
        showPopup(`Solicitud de "${nombre}" aprobada`);
        setApproveModal(null);
        cargarSolicitudes();
        cargarEntidades();
      } else {
        const d = await res.json().catch(() => ({}));
        showPopup(d.error || "Error al aprobar", "error");
      }
    } catch {}
  };

  const rechazarSolicitud = async (id, nombre) => {
    const ok = await showConfirm(`¿Rechazar solicitud de "${nombre}"?`, "RECHAZAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/solicitudes/${id}/rechazar`, { method: "POST", headers: authHeaders({ "Content-Type": "application/json" }) });
      if (res.ok) {
        showPopup(`Solicitud de "${nombre}" rechazada`);
        setSolicitudDetalle(null);
        cargarSolicitudes();
      }
    } catch {}
  };

  // --- CONTEO DE SOLICITUDES PENDIENTES ---
  const solicitudesPendientes = solicitudes.filter((s) => s.estado === "pendiente").length;

  // --- RENDER ---
  return (
    <div style={styles.mainLayout}>
      <SEO title="Admin - Panel" description="Panel de administración de Made in Chaco." />
      {/* Sidebar */}
      <div className="admin-sidebar" style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <img src={logoAdm} alt="Made in Chaco" style={{ width: 180 }} />
          </div>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 16, fontWeight: 700, color: "#863819", lineHeight: 1.2, letterSpacing: "1px", textAlign: "center" }}>
            ADMINISTRADOR
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 6, textAlign: "center" }}>{user?.username}</div>
        </div>

        <div style={styles.sidebarNav}>
          <button
            onClick={() => setView("dashboard")}
            style={{
              ...styles.navBtn,
              background: view === "dashboard" ? "#f5f2eb" : "transparent",
            }}
          >
            Dashboard
          </button>

          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => setExpandedGroups((g) => ({ ...g, contenido: !g.contenido }))}
              style={{
                ...styles.navBtn,
                color: "#1c1c18",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                cursor: "pointer",
              }}
            >
              Contenido
              <span style={{ fontSize: 10, color: "#999" }}>{expandedGroups.contenido ? "▾" : "▸"}</span>
            </button>
            {expandedGroups.contenido && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[
                  { key: "entidades", label: "Entidades", count: totalEntidades },
                  { key: "recorridos", label: "Recorridos" },
                  { key: "palabras", label: "Wikia Chaqueña" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    style={{
                      ...styles.navBtn,
                      background: view === item.key ? "#f5f2eb" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingLeft: 24,
                    }}
                  >
                    {item.label}
                    {item.count != null && (
                      <span style={{
                        background: "#f0ede8",
                        color: "#888",
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, minWidth: 20, textAlign: "center",
                      }}>
                        {item.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => setExpandedGroups((g) => ({ ...g, pendientes: !g.pendientes }))}
              style={{
                ...styles.navBtn,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                cursor: "pointer",
              }}
            >
              Pendientes
              <span style={{ fontSize: 10, color: "#999" }}>{expandedGroups.pendientes ? "▾" : "▸"}</span>
            </button>
            {expandedGroups.pendientes && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[
                  { key: "solicitudes", label: "Solicitudes", badge: pendingSolicitudes },
                  { key: "ediciones", label: "Ediciones", badge: pendingEdiciones },
                  { key: "devoluciones", label: "Devoluciones", badge: pendingDevoluciones },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    style={{
                      ...styles.navBtn,
                      background: view === item.key ? "#f5f2eb" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingLeft: 24,
                    }}
                  >
                    {item.label}
                    {item.badge != null && (
                      <span style={{
                        background: item.badge > 0 ? "#863819" : "#f0ede8",
                      color: item.badge > 0 ? "white" : "#888",
                      fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, minWidth: 20, textAlign: "center",
                    }}>
                      {item.badge}
                    </span>
                  )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 4 }}>
            <button
              onClick={() => setExpandedGroups((g) => ({ ...g, administracion: !g.administracion }))}
              style={{
                ...styles.navBtn,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                cursor: "pointer",
              }}
            >
              Administración
              <span style={{ fontSize: 10, color: "#999" }}>{expandedGroups.administracion ? "▾" : "▸"}</span>
            </button>
            {expandedGroups.administracion && (
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {[
                  { key: "usuarios", label: "Usuarios" },
                  { key: "planes", label: "Planes" },
                  { key: "localidades", label: "Localidades" },
                ].map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setView(item.key)}
                    style={{
                      ...styles.navBtn,
                      background: view === item.key ? "#f5f2eb" : "transparent",
                      paddingLeft: 24,
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <button onClick={logout} style={styles.logoutBtn}>
          CERRAR SESIÓN
        </button>
      </div>

      {/* Content */}
      <div style={styles.contentArea}>
        <div style={styles.viewContainer}>
          {/* ENTIDADES */}
          {view === "entidades" && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                  Entidades ({totalEntidades})
                </h2>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button onClick={() => {
                    setView("nuevo-editar"); setEditingEntityId(null); setStep(1);
                    setGeneral({ tipo: "", nombre: "", slug: "", resumen: "", localidad_id: "", latitud: -27.4511, longitud: -58.9861, visible: true, direccion_escrita: "", fecha_inicio_suscripcion: "", fecha_fin_suscripcion: "", imagen: "", icono: "" });
                    setGeoQuery(""); setEspecifico({}); setConexTempList([]);
                    setMultimediaItems([{ url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", es_principal: true, public_id: "", entidades_etiquetadas: [] }]);
                    setDetailError(""); setMultimediaError("");
                    originalGeneralRef.current = null; originalEspecificoRef.current = null; originalMultimediaRef.current = null; originalConexRef.current = null;
                  }} className="admin-btn" style={styles.btnPrimary}>
                    Nueva entidad
                  </button>
                </div>
              </div>

              {/* Filter + search */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap", alignItems: "center" }}>
                <input
                  style={{ ...styles.input, marginBottom: 0, flex: 1, minWidth: 180 }}
                  placeholder="Buscar por nombre..."
                  value={entidadSearch}
                  onChange={(e) => setEntidadSearch(e.target.value)}
                />
                <select
                  style={{ ...styles.input, marginBottom: 0, width: 170, cursor: "pointer" }}
                  value={entidadFilterTipo}
                  onChange={(e) => setEntidadFilterTipo(e.target.value)}
                >
                  <option value="">Todos los tipos</option>
                  {TIPO_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} ({tipoCounts[o.value] || 0})
                    </option>
                  ))}
                </select>
                <select
                  style={{ ...styles.input, marginBottom: 0, width: 170, cursor: "pointer" }}
                  value={entidadFilterLocalidad}
                  onChange={(e) => setEntidadFilterLocalidad(e.target.value)}
                >
                  <option value="">Todas las localidades</option>
                  {localidadOptions.map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <select
                  style={{ ...styles.input, marginBottom: 0, width: 170, cursor: "pointer" }}
                  value={entidadFilterPerfil}
                  onChange={(e) => setEntidadFilterPerfil(e.target.value)}
                >
                  <option value="">Todos los perfiles</option>
                  {perfilOptions.map(([id, nombre]) => (
                    <option key={id} value={id}>{nombre}</option>
                  ))}
                </select>
                <button
                  onClick={() => { setEntidadSearch(""); setEntidadFilterTipo(""); setEntidadFilterLocalidad(""); setEntidadFilterPerfil(""); }}
                  style={{
                    background: "none", border: "1px solid #e0ddd5", borderRadius: "6px",
                    padding: "10px 12px", cursor: "pointer", color: "#888", fontSize: "12px",
                    fontWeight: 500, whiteSpace: "nowrap",
                  }}
                >
                  ✕ Limpiar
                </button>
              </div>

              {/* Entity list */}
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {entidadesFiltradas.map((ent) => (
                  <div key={ent.id} style={styles.entityCard}>
                    {ent.imagen && <img src={optimizarUrlCloudinary(ent.imagen)} alt="" loading="lazy" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 600, color: "#1c1c18" }}>{ent.nombre}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: colorMapAdmin[ent.tipo] || "#555", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                          {ent.tipo}
                        </span>
                        {ent.estado_sello === "aprobado" && <span style={{ fontSize: 9, fontWeight: 700, background: "#2e7d32", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>SELLO</span>}
                        {ent.estado_pago === "al_dia" && <span style={{ fontSize: 9, fontWeight: 700, background: "#d4a017", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>AL DÍA</span>}
                        {ent.estado_pago === "atrasado" && <span style={{ fontSize: 9, fontWeight: 700, background: "#c62828", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>DEUDA</span>}
                        {!ent.visible && <span style={{ fontSize: 9, fontWeight: 700, background: "#f39c12", color: "#fff", padding: "2px 8px", borderRadius: 10 }}>OCULTA</span>}
                      </div>
                      <div style={{ fontSize: 12, color: "#888", marginTop: 4, display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        {ent.localidad_nombre && <span>📍 {ent.localidad_nombre}</span>}
                        {(ent.perfil_nombre || ent.perfil_email) && (
                          <span style={{ color: "#1c1c18" }}>👤 {ent.perfil_nombre || ent.perfil_email}</span>
                        )}
                        {ent.created_at && <span style={{ color: "#1c1c18" }}>📅 Creado: {new Date(ent.created_at).toLocaleDateString("es-AR")}</span>}
                        {ent.fecha_fin_suscripcion && <span style={{ color: "#1c1c18" }}>⏱ Vence: {new Date(ent.fecha_fin_suscripcion).toLocaleDateString("es-AR")}</span>}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <button onClick={() => { sessionStorage.setItem("fromAdmin", "true"); navigate(`/entidad/${ent.slug}`); }} className="admin-btn-ghost" style={styles.smallBtn("#863819")}>
                        VER
                      </button>
                      <button onClick={() => { cargarEntidadParaEditar(ent.id); }} className="admin-btn" style={styles.smallBtn("#863819")}>
                        EDITAR
                      </button>
                      <button onClick={async () => { await cargarEntidadParaEditar(ent.id); setStep(4); }} className="admin-btn" style={styles.smallBtn("#5b6abf")}>
                        CONEXIONES
                      </button>
                      <button onClick={() => toggleVisibilidad(ent.id, ent.visible)} className="admin-btn" style={styles.smallBtn(ent.visible ? "#f39c12" : "#2e7d32")}>
                        {ent.visible ? "OCULTAR" : "MOSTRAR"}
                      </button>
                      <button onClick={() => eliminarEntidad(ent.id, ent.nombre)} className="admin-btn-danger" style={styles.smallBtn("#c0392b")}>
                        ELIMINAR
                      </button>
                    </div>
                  </div>
              ))}
              </div>
            </>
          )}

          {/* NUEVO / EDITAR ENTIDAD */}
          {view === "nuevo-editar" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <button onClick={() => setView("entidades")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#888", padding: "0 0 12px", display: "flex", alignItems: "center", gap: 6, width: "fit-content" }}>
                ← Entidades
              </button>

              {editingEntityId && general.nombre ? (
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: colorMapAdmin[general.tipo] || "#888", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>
                    {TIPO_OPTIONS.find((o) => o.value === general.tipo)?.label || general.tipo}
                  </div>
                  <div style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 400, color: "#1c1c18" }}>{general.nombre}</div>
                </div>
              ) : (
                <h2 style={{ ...styles.sectionTitle, textAlign: "center", marginBottom: 20 }}>Nueva entidad</h2>
              )}

              {/* Stepper */}
              <div style={styles.stepperNav}>
                {["Datos generales", "Detalles específicos", "Multimedia", "Conexiones"].map((label, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }} onClick={() => setStep(i + 1)} title={label}>
                    <div style={{ ...styles.dot, background: step >= i + 1 ? "#863819" : "#ddd" }}>{i + 1}</div>
                    <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? "#863819" : "#888", display: "none" }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Scrollable step content */}
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

              {step === 1 && (
                <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee" }}>
                  <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>Datos generales</h3>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Imagen de portada
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {general.imagen ? (
                        <div style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", flexShrink: 0, border: "1px solid #eee" }}>
                          <img src={optimizarUrlCloudinary(general.imagen)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          <button onClick={() => setGeneral((prev) => ({ ...prev, imagen: "" }))} style={{ position: "absolute", top: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ width: 80, height: 80, borderRadius: 8, background: "#f5f5f5", border: "1px dashed #ddd", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#ccc" }}>+</div>
                      )}
                      <label className="admin-btn" style={{ padding: "6px 14px", fontSize: 12, cursor: "pointer", background: editingEntityId ? "#863819" : "#863819", color: "#fff", border: "none", borderRadius: 6, fontWeight: 500, fontFamily: "inherit" }}>
                        {uploadingPortada ? "Subiendo..." : "Seleccionar imagen"}
                        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) handlePortadaUpload(e.target.files[0]); }} disabled={uploadingPortada} />
                      </label>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 6, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Icono del mapa
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {general.icono ? (
                        <div style={{ position: "relative", width: 40, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0, border: "1px solid #eee" }}>
                          <img src={general.icono} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                          <button onClick={() => setGeneral((prev) => ({ ...prev, icono: "" }))} style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.5)", color: "#fff", border: "none", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: 4, background: "#f5f5f5", border: "1px dashed #ddd", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: "#ccc" }}>+</div>
                      )}
                      <label className="admin-btn" style={{ padding: "6px 14px", fontSize: 12, cursor: "pointer", background: "#863819", color: "#fff", border: "none", borderRadius: 6, fontWeight: 500, fontFamily: "inherit" }}>
                        {subiendoIconoAdm ? "Subiendo..." : "Seleccionar icono"}
                        <input type="file" accept="image/png" style={{ display: "none" }} onChange={(e) => { if (e.target.files[0]) handleIconoUpload(e.target.files[0]); }} disabled={subiendoIconoAdm} />
                      </label>
                    </div>
                  </div>

                  <DetailField field="tipo" fieldVal={general.tipo} onFieldChange={onFieldChange} label="Tipo de entidad" type="select" options={TIPO_OPTIONS} readOnly={!!editingEntityId} />
                  <DetailField field="nombre" fieldVal={general.nombre} onFieldChange={onFieldChange} label="Nombre" placeholder="Nombre de la entidad" />
                  <DetailField field="slug" fieldVal={general.slug} onFieldChange={onFieldChange} label="Slug (URL)" placeholder="nombre-de-la-entidad" readOnly={!!editingEntityId} />
                  <DetailField field="resumen" fieldVal={general.resumen} onFieldChange={onFieldChange} label="Resumen / descripción breve" type="textarea" placeholder="Breve descripción..." />

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Localidad
                    </label>
                    <select
                      style={styles.input}
                      value={general.localidad_id}
                      onChange={(e) => { localidadUserRef.current = true; setGeneral((prev) => ({ ...prev, localidad_id: e.target.value })); }}
                    >
                      <option value="">Sin localidad</option>
                      {localidades.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                    </select>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Calle y número
                    </label>
                    <input
                      style={styles.input}
                      placeholder="Ej: San Martín 123"
                      value={general.direccion_escrita || ""}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, direccion_escrita: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Buscar en el mapa
                    </label>
                    <input
                      style={styles.input}
                      placeholder="Ej: San Martín 123, Resistencia..."
                      value={geoQuery}
                      onChange={(e) => { setGeoQuery(e.target.value); }}
                    />
                    {geoResults.length > 0 && (
                      <div style={{ background: "white", border: "1px solid #eee", borderRadius: 12, maxHeight: 180, overflowY: "auto", marginTop: 4 }}>
                        {geoResults.map((r, i) => (
                          <div key={i} onMouseDown={(e) => { e.preventDefault(); seleccionarGeo(r); }} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13, borderBottom: "1px solid #f5f2eb", color: "#333" }}>
                            {r.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div ref={mapContainer} className="admin-edit-map" style={{ width: "100%", height: 250, borderRadius: 12, overflow: "hidden", border: "1px solid #eee", marginBottom: 12 }} />

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="checkbox" checked={general.visible} onChange={(e) => setGeneral((prev) => ({ ...prev, visible: e.target.checked }))} />
                      Visible en el mapa
                    </label>
                  </div>

                  {(editingEntityId || general.tipo === "comercio" || general.tipo === "hospedaje" || general.tipo === "evento" || general.tipo === "productor") && (
                    <div style={{ marginTop: 20, padding: "16px 20px", background: "#fff8e1", borderRadius: 12, border: "1px solid #ffe082" }}>
                      <h4 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 12px", fontSize: 15 }}>Suscripción</h4>
                      <DetailField field="fecha_inicio_suscripcion" fieldVal={general.fecha_inicio_suscripcion} onFieldChange={onFieldChange} label="Inicio de suscripción" type="date" />
                      <DetailField field="fecha_fin_suscripcion" fieldVal={general.fecha_fin_suscripcion} onFieldChange={onFieldChange} label="Fin de suscripción" type="date" />
                    </div>
                  )}

                </div>
              )}

              {step === 2 && (
                <>
                  {renderSpecInputs()}
                  {!TIPO_DETALLES[general.tipo] && (
                    <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
                      Seleccioná un tipo de entidad para ver los detalles específicos.
                    </div>
                  )}
                </>
              )}

              {step === 3 && (
                <div>
                  <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee" }}>
                    <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>Multimedia</h3>
                    {multimediaError && <div style={{ color: "#c62828", fontSize: 13, marginBottom: 12 }}>{multimediaError}</div>}

                    {/* Multimedia existente */}
                    {multimediaItems.filter((m) => m.id).length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: 12, color: "#999", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Actuales</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                          {multimediaItems.filter((m) => m.id).map((m) => (
                            <div key={m.id} style={{ width: 120, textAlign: "center" }}>
                              {m.tipo_recurso === "foto" ? (
                                <img src={m.url_recurso} alt={m.titulo_alternativo || ""} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                              ) : m.tipo_recurso === "video" ? (
                                <video src={m.url_recurso} style={{ width: 120, height: 80, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                              ) : (
                                <div style={{ width: 120, height: 80, background: "#fafaf8", borderRadius: 6, border: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#999" }}>🎵</div>
                              )}
                              <div style={{ fontSize: 11, color: "#999", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.titulo_alternativo || m.tipo_recurso}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Nuevos archivos multimedia */}
                    {multimediaItems.filter((m) => !m.id).map((item, idx) => {
                      const realIdx = multimediaItems.indexOf(item);
                      return (
                        <div key={realIdx} style={{ marginBottom: 16, padding: 16, background: "#fafaf8", borderRadius: 12, border: "1px solid #eee" }}>
                          <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                            <select
                              value={item.tipo_recurso}
                              onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, tipo_recurso: e.target.value } : m))}
                              style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, color: "#1c1c18" }}
                            >
                              <option value="foto">Foto</option>
                              <option value="video">Video</option>
                              <option value="audio">Audio</option>
                            </select>
                            <label style={{ fontFamily: "inherit", fontSize: 13, cursor: "pointer", padding: "6px 16px", border: "1px solid #ccc", borderRadius: 6, background: "white", color: "#555", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
                              {uploadingIndex === realIdx ? "Subiendo..." : item.url_recurso ? "✅ Subido" : "Seleccionar"}
                              <input type="file" hidden disabled={uploadingIndex === realIdx}
                                accept={
                                  item.tipo_recurso === "foto" ? "image/jpeg,image/png,image/webp" :
                                  item.tipo_recurso === "video" ? "video/mp4,video/webm" : "audio/mpeg,audio/wav,audio/ogg"
                                }
                                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(realIdx, f); e.target.value = ""; }}
                              />
                            </label>
                            {item.url_recurso && (
                              item.tipo_recurso === "foto" ? (
                                <img src={item.url_recurso} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                              ) : item.tipo_recurso === "video" ? (
                                <video src={item.url_recurso} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                              ) : (
                                <div style={{ width: 64, height: 64, background: "#f5f2eb", borderRadius: 6, border: "1px solid #eee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#999" }}>🎵</div>
                              )
                            )}
                            {multimediaItems.filter((m) => !m.id).length > 1 && (
                              <button onClick={() => eliminarMultimedia(realIdx)} style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 18, padding: 4, lineHeight: 1 }}>✕</button>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                            <input
                              style={{ ...styles.input, flex: 1 }}
                              placeholder="Título (opcional)"
                              value={item.titulo_alternativo}
                              onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, titulo_alternativo: e.target.value } : m))}
                            />
                            <input
                              style={{ ...styles.input, flex: 1 }}
                              placeholder="Descripción (opcional)"
                              value={item.descripcion_recurso}
                              onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, descripcion_recurso: e.target.value } : m))}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <button onClick={() => setMultimediaItems((prev) => [...prev, { url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", public_id: "", entidades_etiquetadas: [] }])} className="admin-btn" style={{ ...styles.smallBtn("#863819"), marginRight: 8 }}>
                      + AGREGAR ARCHIVO
                    </button>
                  </div>

                </div>
              )}

              {step === 4 && (
                <div>
                  <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee" }}>
                    <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>
                      Conexiones {conexTempList.length > 0 && `(${conexTempList.length})`}
                    </h3>

                    <div style={{ position: "relative", marginBottom: 12 }}>
                      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                        <input
                          style={{ ...styles.input, flex: 1 }}
                          placeholder="Buscar entidad para conectar..."
                          value={conexSearch}
                          onChange={(e) => setConexSearch(e.target.value)}
                        />
                        <select
                          style={{ ...styles.input, width: 180, flexShrink: 0 }}
                          value={conexFilterTipo}
                          onChange={(e) => setConexFilterTipo(e.target.value)}
                        >
                          <option value="">Todos los tipos</option>
                          {TIPO_OPTIONS.filter((o) => o.value).map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </div>
                      {conexResults.length > 0 && (
                        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #eee", borderRadius: 12, zIndex: 10, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                          {conexResults.filter((e) => e.id !== editingEntityId).map((e) => (
                            <div key={e.id} onClick={() => agregarConexTemp(e)} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f2eb", color: "#333", display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: colorMapAdmin[e.tipo] || "#888", textTransform: "uppercase" }}>{e.tipo}</span>
                              {e.nombre}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {conexTempList.length === 0 ? (
                      <div style={{ textAlign: "center", padding: 32, color: "#999", fontSize: 14 }}>
                        No hay conexiones. Buscá entidades para conectar arriba.
                      </div>
                    ) : (
                      conexTempList.map((c, i) => (
                        <div key={c.entidad_destino_id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, padding: "10px 14px", background: "#fafaf8", borderRadius: 8 }}>
                          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: colorMapAdmin[c.tipo] || "#888", textTransform: "uppercase" }}>{c.tipo}</span>
                            <span style={{ fontWeight: 600, fontSize: 14, color: "#1c1c18" }}>{c.nombre}</span>
                          </div>
                          <input
                            style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, color: "#1c1c18", minWidth: 120 }}
                            placeholder="Tipo de relación (ej: colabora con)"
                            value={c.tipo_relacion}
                            onChange={(e) => {
                              const next = [...conexTempList];
                              next[i] = { ...next[i], tipo_relacion: e.target.value };
                              setConexTempList(next);
                            }}
                          />
                          <input
                            style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, color: "#1c1c18", minWidth: 120 }}
                            placeholder="Relación inversa (ej: es colaborado por)"
                            value={c.tipo_relacion_inversa}
                            onChange={(e) => {
                              const next = [...conexTempList];
                              next[i] = { ...next[i], tipo_relacion_inversa: e.target.value };
                              setConexTempList(next);
                            }}
                          />
                          <button onClick={() => quitarConexTemp(c.entidad_destino_id)} style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 16, padding: 4, flexShrink: 0 }}>✕</button>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}

              </div>{/* end scrollable step content */}

              {/* Bottom navigation */}
              <div style={{
                padding: "12px 24px 0",
                display: "flex",
                justifyContent: step === 1 ? "flex-end" : "space-between",
                gap: 12,
                flexShrink: 0,
              }}>
                {step > 1 && (
                  <button onClick={() => setStep(step - 1)} className="admin-btn" style={styles.btnSecondary}>
                    ← ANTERIOR
                  </button>
                )}
                {step < 4 ? (
                  <button onClick={() => setStep(step + 1)} className="admin-btn" style={styles.btnNext}>
                    SIGUIENTE →
                  </button>
                ) : (
                  <button onClick={guardarEntidad} disabled={loading || (!hasEntityChanges && !!editingEntityId)} className="admin-btn" style={{ ...styles.btnPrimary, opacity: loading ? 0.6 : (!hasEntityChanges && editingEntityId ? 0.5 : 1) }}>
                    {loading ? "GUARDANDO..." : editingEntityId ? "ACTUALIZAR ENTIDAD" : "CREAR ENTIDAD"}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SOLICITUDES */}
          {view === "solicitudes" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={styles.sectionTitle}>
                  Solicitudes de Sello
                  {solicitudesPendientes > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#863819", marginLeft: 12, background: "#f5f2eb", padding: "4px 12px", borderRadius: 10 }}>
                      {solicitudesPendientes} pendiente{solicitudesPendientes !== 1 ? "s" : ""}
                    </span>
                  )}
                </h2>
                <button onClick={cargarSolicitudes} className="admin-btn" style={styles.smallBtn("#863819")}>
                  <img src="/icons/refresh.png" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }} alt="" />
                  RECARGAR
                </button>
              </div>

              {solicitudesLoading ? (
                <p style={{ color: "#aaa", fontSize: 13 }}>Cargando...</p>
              ) : solicitudes.length === 0 ? (
                <p style={{ color: "#aaa", fontSize: 13, textAlign: "center", padding: "40px 0" }}>No hay solicitudes.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {solicitudes.map((sol) => (
                    <div key={sol.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "16px 20px", border: "1px solid #eee", borderRadius: 12, background: "#fff", gap: 8,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: colorMapAdmin[sol.tipo] || "#555", textTransform: "uppercase", letterSpacing: "1px" }}>{sol.tipo}</span>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 10,
                            background: sol.estado === "aprobado" ? "#e8f5e9" : sol.estado === "rechazado" ? "#ffebee" : "#fff8e1",
                            color: sol.estado === "aprobado" ? "#2e7d32" : sol.estado === "rechazado" ? "#c62828" : "#f39c12",
                          }}>
                            {sol.estado?.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: "#1c1c18", margin: "0 0 4px" }}>{sol.nombre}</p>
                        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
                          {sol.perfil_nombre || sol.perfil_email} · {new Date(sol.created_at).toLocaleDateString("es-AR")}
                          {sol.updated_at && ` · ${sol.estado === "aprobado" ? "Aprobado" : "Rechazado"} el ${new Date(sol.updated_at).toLocaleDateString("es-AR")}`}
                        </p>
                      </div>
                      {sol.estado === "pendiente" && (
                        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                          <button onClick={() => setSolicitudDetalle(sol)} className="admin-btn" style={styles.smallBtn("#863819")}>
                            <img src="/icons/view.png" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }} alt="" />
                            VER
                          </button>
                          <button onClick={() => setApproveModal(sol)} className="admin-btn" style={{ ...styles.smallBtn("#2e7d32"), background: "#2e7d32", color: "white" }}>
                            APROBAR
                          </button>
                          <button onClick={() => rechazarSolicitud(sol.id, sol.nombre)} className="admin-btn" style={{ ...styles.smallBtn("#c62828"), background: "#c62828", color: "white" }}>
                            RECHAZAR
                          </button>
                        </div>
                      )}
                      {sol.estado !== "pendiente" && (
                        <span style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>
                          {sol.estado === "aprobado" ? "✅ Aprobado" : "❌ Rechazado"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Solicitud detail modal */}
              {solicitudDetalle && (
                <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setSolicitudDetalle(null)}>
                  <div style={{ background: "white", borderRadius: 16, padding: 32, maxWidth: 500, width: "100%", maxHeight: "80vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
                    <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", marginBottom: 16, fontSize: 20 }}>{solicitudDetalle.nombre}</h3>
                    <div style={{ display: "grid", gap: 8 }}>
                      {[
                        { label: "Tipo", val: solicitudDetalle.tipo },
                        { label: "Estado", val: solicitudDetalle.estado },
                        { label: "Email", val: solicitudDetalle.email || "—" },
                        { label: "Teléfono", val: solicitudDetalle.telefono || "—" },
                        { label: "Solicitante", val: solicitudDetalle.perfil_nombre || solicitudDetalle.perfil_email },
                        { label: "Fecha", val: new Date(solicitudDetalle.created_at).toLocaleDateString("es-AR") },
                      ].map((f) => (
                        <div key={f.label}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: "#999", textTransform: "uppercase" }}>{f.label}</span>
                          <div style={{ fontSize: 14, color: "#1c1c18" }}>{f.val}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
                      <button onClick={() => { setSolicitudDetalle(null); setApproveModal(solicitudDetalle); }} className="admin-btn" style={{ ...styles.smallBtn("#2e7d32"), background: "#2e7d32", color: "white" }}>APROBAR</button>
                      <button onClick={() => { rechazarSolicitud(solicitudDetalle.id, solicitudDetalle.nombre); }} className="admin-btn" style={{ ...styles.smallBtn("#c62828"), background: "#c62828", color: "white" }}>RECHAZAR</button>
                      <button onClick={() => setSolicitudDetalle(null)} className="admin-btn" style={styles.smallBtn("#555")}>CERRAR</button>
                    </div>
                  </div>
                </div>
              )}

              {/* Approve modal */}
              {approveModal && (
                <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setApproveModal(null)}>
                  <div style={{ background: "white", borderRadius: 16, padding: 32, maxWidth: 500, width: "100%" }} onClick={(e) => e.stopPropagation()}>
                    <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", marginBottom: 8, fontSize: 20 }}>Aprobar "{approveModal.nombre}"</h3>
                    <p style={{ fontSize: 14, color: "#555", marginBottom: 16 }}>
                      Al aprobar esta solicitud, la entidad quedará habilitada para adquirir un plan de suscripción y aparecer en el mapa.
                    </p>
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button onClick={() => setApproveModal(null)} className="admin-btn" style={styles.smallBtn("#555")}>CANCELAR</button>
                      <button onClick={() => aprobarSolicitud(approveModal.id, approveModal.nombre, approveModal.tipo)} className="admin-btn" style={{ ...styles.smallBtn("#2e7d32"), background: "#2e7d32", color: "white" }}>APROBAR</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RECORRIDOS */}
          {view === "recorridos" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={styles.sectionTitle}>
                  Recorridos
                </h2>
                <div style={{ display: "flex", gap: 8 }}>
                  {editingRecorridoId && (
                    <button onClick={() => { setEditingRecorridoId(null); setRecForm({ nombre: "", slug: "", descripcion: "", imagen: "" }); setRecPasos([]); }} className="admin-btn" style={styles.smallBtn("#555")}>
                      CANCELAR EDICIÓN
                    </button>
                  )}
                  <button onClick={() => {
                    setEditingRecorridoId(null);
                    setRecForm({ nombre: "", slug: "", descripcion: "", imagen: "" });
                    setRecPasos([]);
                    setView("recorrido-form");
                  }} className="admin-btn" style={styles.btnPrimary}>
                    Nuevo recorrido
                  </button>
                </div>
              </div>

              {/* Lista de recorridos */}
              {recorridos.map((rec) => (
                <div key={rec.id} style={styles.entityCard}>
                  {rec.imagen && <img src={optimizarUrlCloudinary(rec.imagen)} alt="" loading="lazy" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#1c1c18" }}>{rec.nombre}</div>
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                      {rec.pasos?.length || 0} paso{(rec.pasos?.length || 0) !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <a href={`/recorrido/${rec.slug}`} target="_blank" rel="noopener noreferrer">
                      <button className="admin-btn-ghost" style={styles.smallBtn("#863819")}>VER</button>
                    </a>
                    <button onClick={() => cargarRecorridoParaEditar(rec.id)} className="admin-btn" style={styles.smallBtn("#863819")}>EDITAR</button>
                    <button onClick={() => eliminarRecorrido(rec.id, rec.nombre)} className="admin-btn-danger" style={styles.smallBtn("#c0392b")}>ELIMINAR</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* RECORRIDO FORM */}
          {view === "recorrido-form" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <button onClick={() => setView("recorridos")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#888", padding: "4px 8px" }}>←</button>
                <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
                  {editingRecorridoId ? "Editar recorrido" : "Nuevo recorrido"}
                </h2>
              </div>

              <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee", marginBottom: 16 }}>
                <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>Datos del recorrido</h3>
                <DetailField field="nombre" fieldVal={recForm.nombre} onFieldChange={(_, v) => {
                  const slug = v.toLowerCase().replace(/[^a-z0-9áéíóúüñ\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
                  setRecForm((prev) => ({ ...prev, nombre: v, slug }));
                }} label="Nombre" placeholder="Nombre del recorrido" />
                <DetailField field="slug" fieldVal={recForm.slug} onFieldChange={(_, v) => setRecForm((prev) => ({ ...prev, slug: v }))} label="Slug" placeholder="nombre-del-recorrido" />
                <DetailField field="descripcion" fieldVal={recForm.descripcion} onFieldChange={(_, v) => setRecForm((prev) => ({ ...prev, descripcion: v }))} label="Descripción" type="textarea" placeholder="Descripción del recorrido..." />
                <input ref={recImagenRef} type="file" accept="image/*" style={{ fontSize: 14, color: "#555" }} />
              </div>

              <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee" }}>
                <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>
                  Pasos del recorrido {recPasos.length > 0 && `(${recPasos.length})`}
                </h3>

                <div style={{ position: "relative", marginBottom: 12 }}>
                  <input
                    style={styles.input}
                    placeholder="Buscar entidad para agregar al recorrido..."
                    value={pasoSearch}
                    onChange={(e) => setPasosearch(e.target.value)}
                  />
                  {pasoResults.length > 0 && (
                    <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "white", border: "1px solid #eee", borderRadius: 12, zIndex: 10, maxHeight: 200, overflowY: "auto", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
                      {pasoResults.map((e) => (
                        <div key={e.id} onClick={() => agregarPaso(e)} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f2eb", color: "#333", display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: colorMapAdmin[e.tipo] || "#888", textTransform: "uppercase" }}>{e.tipo}</span>
                          {e.nombre}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {recPasos.map((paso, i) => (
                  <div key={paso.entidad_id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, padding: "10px 14px", background: "#fafaf8", borderRadius: 8, border: "1px solid #f0ede8" }}>
                    <span style={{ fontWeight: 700, color: "#863819", fontSize: 14, minWidth: 24 }}>{i + 1}.</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#1c1c18" }}>{paso.nombre}</span>
                    <input
                      style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, color: "#1c1c18" }}
                      placeholder="Descripción de este paso"
                      value={paso.descripcion_paso}
                      onChange={(e) => {
                        const next = [...recPasos];
                        next[i] = { ...next[i], descripcion_paso: e.target.value };
                        setRecPasos(next);
                      }}
                    />
                    <button onClick={() => reordenarPasos(i, -1)} disabled={i === 0} style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? "#ddd" : "#863819", fontSize: 16 }}>↑</button>
                    <button onClick={() => reordenarPasos(i, 1)} disabled={i === recPasos.length - 1} style={{ background: "none", border: "none", cursor: i === recPasos.length - 1 ? "default" : "pointer", color: i === recPasos.length - 1 ? "#ddd" : "#863819", fontSize: 16 }}>↓</button>
                    <button onClick={() => setRecPasos((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 16 }}>✕</button>
                  </div>
                ))}
                  </div>
                </div>
              )}

          {/* EDICIONES */}
          {view === "ediciones" && <EdicionesView authFetch={authFetch} authHeaders={authHeaders} colorMapAdmin={colorMapAdmin} setPendingEdiciones={setPendingEdiciones} showConfirm={showConfirm} showPopup={showPopup} />}

          {/* PALABRAS */}
          {view === "palabras" && <PalabrasView authFetch={authFetch} showConfirm={showConfirm} showPopup={showPopup} />}

          {/* PLANES */}
          {view === "planes" && <PlanesView authFetch={authFetch} showConfirm={showConfirm} showPopup={showPopup} />}

          {/* USUARIOS */}
          {view === "usuarios" && (
            <UsuariosView
              authFetch={authFetch}
              authHeaders={authHeaders}
              showConfirm={showConfirm}
              showPopup={showPopup}
              onEditEntity={(id) => { cargarEntidadParaEditar(id); setView("nuevo-editar"); }}
            />
          )}

          {/* DEVOLUCIONES */}
          {view === "devoluciones" && (
            <DevolucionesView
              authFetch={authFetch}
              authHeaders={authHeaders}
              colorMapAdmin={colorMapAdmin}
              setPendingDevoluciones={setPendingDevoluciones}
              cargarEntidades={cargarEntidades}
              showPopup={showPopup}
              showConfirm={showConfirm}
            />
          )}

          {/* DASHBOARD */}
          {view === "dashboard" && (
            <DashboardView authFetch={authFetch} />
          )}

          {/* LOCALIDADES */}
          {view === "localidades" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                  Localidades
                </h2>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={guardarLocalidades}
                    disabled={dirtyCount === 0}
                    className="admin-btn"
                    style={{
                      ...styles.btnPrimary,
                      opacity: dirtyCount === 0 ? 0.4 : 1,
                      fontSize: "13px",
                      padding: "10px 20px",
                    }}
                  >
                    GUARDAR CAMBIOS{dirtyCount > 0 ? ` (${dirtyCount})` : ""}
                  </button>
                </div>
              </div>

              <div style={{
                display: "grid", gridTemplateColumns: "1fr 140px 160px 160px 80px", gap: "40px",
                padding: "10px 16px", fontWeight: 700, fontSize: "12px", textTransform: "uppercase",
                color: "#888", background: "white", borderRadius: "12px", border: "1px solid #eee",
                marginBottom: "8px",
              }}>
                <div>Nombre</div>
                <div>Habitantes</div>
                <div>Fundación</div>
                <div>Gentilicio</div>
                <div>Cabecera</div>
              </div>

              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {localidades.map((loc) => (
                  <LocalidadRow
                    key={loc.id}
                    loc={loc}
                    values={editValues[loc.id]}
                    onChange={(field, value) => handleEditChange(loc.id, field, value)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popup */}
      {popup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: popup.isConfirm ? "center" : "flex-start", justifyContent: "center", background: popup.isConfirm ? "rgba(0,0,0,0.4)" : "transparent", pointerEvents: popup.isConfirm ? "auto" : "none", paddingTop: popup.isConfirm ? 0 : 40 }}
          onClick={() => {
            if (popup.isConfirm) {
              pendingConfirm.current?.(false);
              setPopup(null);
            }
          }}
        >
          {popup.isConfirm ? (
            <div style={{
              background: "white",
              borderRadius: "12px",
              padding: "24px 32px",
              maxWidth: "420px",
              width: "100%",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              pointerEvents: "auto",
            }}
              onClick={(e) => e.stopPropagation()}
            >
              <p style={{ margin: "0 0 16px", fontSize: "15px", color: "#1c1c18", fontFamily: "Merriweather, serif", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                {popup.message}
              </p>
              {popup.confirmEmail && (
                <input
                  style={{ ...styles.input, marginBottom: 12, fontSize: 14 }}
                  placeholder={`Escribí ${popup.confirmEmail} para confirmar`}
                  value={confirmEmailInput}
                  onChange={(e) => setConfirmEmailInput(e.target.value)}
                />
              )}
              <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                <button onClick={() => { pendingConfirm.current?.(false); setPopup(null); }} className="admin-btn" style={{ padding: "8px 20px", background: "white", color: "#555", border: "1px solid #ccc", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                  CANCELAR
                </button>
                <button onClick={() => {
                  if (popup.confirmEmail && confirmEmailInput !== popup.confirmEmail) {
                    showPopup("El email no coincide", "error");
                    return;
                  }
                  pendingConfirm.current?.(true);
                  setPopup(null);
                }} className="admin-btn" style={{ padding: "8px 20px", background: "#863819", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, fontFamily: "inherit" }}>
                  {popup.confirmLabel || "CONFIRMAR"}
                </button>
              </div>
            </div>
          ) : (
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              background: popup.type === "error" ? "#fef2f2" : "#f0faf0",
              color: "#1c1c18",
              padding: "14px 28px",
              borderRadius: "10px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              fontFamily: "Merriweather, serif",
              fontSize: "15px",
              fontWeight: 400,
              letterSpacing: "0.3px",
              pointerEvents: "auto",
            }}
            >
              <span style={{ fontSize: 16, color: popup.type === "error" ? "#dc2626" : "#16a34a" }}>
                {popup.type === "error" ? "✕" : "✓"}
              </span>
              {popup.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
