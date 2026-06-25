import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/AdminPanel.css";
import { useAuth } from "../context/AuthContext";
import { validarArchivo, validarFormato, INFO_FORMATOS } from "../utils/mediaValidation";
import { subirArchivo, subirImagen } from "./uploadService";
import TagSelector from "../components/TagSelector";
import { MiniMap } from "../components/MiniMap";
import { useSocketEvent } from "../hooks/useSocket";
import { getToken, authHeaders, authFetch, colorMapAdmin, parseSocialList, styles } from "./helpers";
import { SOCIAL_PLATFORMS, COMUNIDADES_ETNICAS, QUE_INCLUYE_EXPERIENCIA, TIPOS_EXPERIENCIA, TIPOS_PRODUCTO, SERVICIOS_SUGERIDOS, ACTIVIDADES_SUGERIDAS, TIPOS_RELATO } from "./constants";
import { DetailField, GastronomiaSelector, SocialMediaManager, LocalidadRow } from "./components";
import { DashboardView } from "./DashboardView";
import { PalabrasView } from "./PalabrasView";
import { DevolucionesView } from "./DevolucionesView";
import { EdicionesView } from "./EdicionesView";
import { UsuariosView } from "./UsuariosView";
import { PlanesView } from "./PlanesView";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export const AdminPanel = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState("entidades");
  const [expandedGroups, setExpandedGroups] = useState({ entidades: true, recorridos: false });
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
  const [entidadFilterPerfil, setEntidadFilterPerfil] = useState("");
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
  const [conexiones, setConexiones] = useState([]);

  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [subiendoIconoAdm, setSubiendoIconoAdm] = useState(false);
  const [multimediaError, setMultimediaError] = useState("");
  const [detailError, setDetailError] = useState("");

  const [conexModal, setConexModal] = useState(null); // { id, nombre }
  const [conexSearch, setConexSearch] = useState("");
  const [conexResults, setConexResults] = useState([]);
  const [conexTempList, setConexTempList] = useState([]); // [{ entidad_destino_id, nombre, tipo_relacion, tipo_relacion_inversa }]
  const [conexSaving, setConexSaving] = useState(false);

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

  // Tag search
  const [tagSearchQueries, setTagSearchQueries] = useState({});
  const [tagTypeFilters, setTagTypeFilters] = useState({});

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

  const entidadesFiltradas = useMemo(() => {
    let items = [...allEntities];
    if (entidadSearch) {
      const q = entidadSearch.toLowerCase();
      items = items.filter((e) => e.nombre.toLowerCase().includes(q) || e.tipo?.includes(q) || e.localidad_nombre?.toLowerCase().includes(q));
    }
    if (entidadFilterPerfil) {
      items = items.filter((e) => {
        const email = (e.perfil_email || "").toLowerCase();
        const nombre = (e.perfil_nombre || "").toLowerCase();
        return email.includes(entidadFilterPerfil.toLowerCase()) || nombre.includes(entidadFilterPerfil.toLowerCase());
      });
    }
    return items;
  }, [allEntities, entidadSearch, entidadFilterPerfil]);

  const tipoCounts = useMemo(() => {
    const counts = {};
    allEntities.forEach((e) => { counts[e.tipo] = (counts[e.tipo] || 0) + 1; });
    return counts;
  }, [allEntities]);

  const tipos = Object.keys(tipoCounts);
  const totalEntidades = allEntities.length;

  // --- MAPA ---
  useEffect(() => {
    if (step === 1 || !mapContainer.current) return;
    if (!map.current) {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [general.longitud, general.latitud],
        zoom: 12,
      });
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
    }
    if (marker.current) marker.current.remove();
    marker.current = new mapboxgl.Marker({ color: "#863819", draggable: true })
      .setLngLat([general.longitud, general.latitud])
      .addTo(map.current);
    marker.current.on("dragend", () => {
      const lngLat = marker.current.getLngLat();
      setGeneral((prev) => ({ ...prev, latitud: lngLat.lat, longitud: lngLat.lng }));
    });
    return () => {
      if (marker.current) { marker.current.remove(); marker.current = null; }
    };
  }, [step]);

  useEffect(() => {
    if (marker.current && step > 1) {
      marker.current.setLngLat([general.longitud, general.latitud]);
    }
  }, [general.latitud, general.longitud, step]);

  // --- BÚSQUEDA GEOGRÁFICA ---
  useEffect(() => {
    if (!geoQuery.trim()) { setGeoResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(geoQuery)}.json?country=AR&limit=6&types=place,locality,region&access_token=${mapboxgl.accessToken}`,
        );
        if (res.ok) { const data = await res.json(); setGeoResults(data.features || []); }
      } catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [geoQuery]);

  const seleccionarGeo = (feature) => {
    const [lng, lat] = feature.center;
    const nombreLocalidad = feature.text;
    const match = localidades.find(
      (l) => l.nombre.toLowerCase() === nombreLocalidad.toLowerCase(),
    );
    setGeneral((prev) => ({
      ...prev,
      latitud: lat,
      longitud: lng,
      localidad_id: match ? match.id : prev.localidad_id,
      direccion_escrita: feature.place_name,
    }));
    setGeoQuery(feature.place_name);
    setGeoResults([]);
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
    try {
      const res = await authFetch(`/api/entidades/${id}`);
      if (!res.ok) return;
      const ent = await res.json();
      setEditingEntityId(ent.id);
      setStep(1);
      setGeneral({
        tipo: ent.tipo || "",
        nombre: ent.nombre || "",
        slug: ent.slug || "",
        resumen: ent.resumen || "",
        localidad_id: ent.localidad_id || "",
        latitud: ent.latitud || -27.4511,
        longitud: ent.longitud || -58.9861,
        visible: ent.visible ?? true,
        direccion_escrita: ent.direccion_escrita || "",
      });
      const spec = {};
      const typeDefs = TIPO_DETALLES[ent.tipo];
      if (typeDefs) typeDefs.forEach((def) => { spec[def.field] = ent[def.field] ?? ""; });
      setEspecifico(spec);

      // Multimedia existente
      const multRes = await authFetch(`/api/entidades/${id}/multimedia`);
      if (multRes.ok) {
        const multimedia = await multRes.json();
        setMultimediaItems(
          multimedia.length > 0
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
            : [{ url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", es_principal: true, public_id: "", entidades_etiquetadas: [] }],
        );
      }
      // Conexiones
      const conexRes = await authFetch(`/api/entidades/${id}/conexiones`);
      if (conexRes.ok) setConexiones(await conexRes.json());

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
      { field: "rubro_especifico", label: "Rubro específico" },
      { field: "horario_apertura", label: "Horario apertura" },
      { field: "horario_cierre", label: "Horario cierre" },
      { field: "dias_abierto", label: "Días abierto" },
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
      { field: "actividades_principales", label: "Actividades principales", type: "textarea" },
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
      { field: "categoria_hospedaje", label: "Categoría" },
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
      const selected = (especifico[fieldDef.field] || "").split(",").map((s) => s.trim()).filter(Boolean);
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {fieldDef.label}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {SERVICIOS_SUGERIDOS.map((sv) => {
              const active = selected.includes(sv);
              return (
                <span
                  key={sv}
                  onClick={() => {
                    const next = active ? selected.filter((s) => s !== sv) : [...selected, sv];
                    onSpecChange(fieldDef.field, next.join(", "));
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    cursor: "pointer",
                    background: active ? "#863819" : "#f5f2eb",
                    color: active ? "white" : "#555",
                    fontWeight: active ? 600 : 400,
                    border: active ? "none" : "1px solid #eee",
                    transition: "0.15s",
                  }}
                >
                  {sv}
                </span>
              );
            })}
          </div>
        </div>
      );
    }
    if (fieldDef.type === "productos") {
      const selected = (especifico[fieldDef.field] || "").split(",").map((s) => s.trim()).filter(Boolean);
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {fieldDef.label}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TIPOS_PRODUCTO.map((tp) => {
              const active = selected.includes(tp);
              return (
                <span
                  key={tp}
                  onClick={() => {
                    const next = active ? selected.filter((s) => s !== tp) : [...selected, tp];
                    onSpecChange(fieldDef.field, next.join(", "));
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    cursor: "pointer",
                    background: active ? "#863819" : "#f5f2eb",
                    color: active ? "white" : "#555",
                    fontWeight: active ? 600 : 400,
                    border: active ? "none" : "1px solid #eee",
                    transition: "0.15s",
                  }}
                >
                  {tp}
                </span>
              );
            })}
          </div>
        </div>
      );
    }
    if (fieldDef.type === "experiencias") {
      const selected = (especifico[fieldDef.field] || "").split(",").map((s) => s.trim()).filter(Boolean);
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {fieldDef.label}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {TIPOS_EXPERIENCIA.map((tx) => {
              const active = selected.includes(tx);
              return (
                <span
                  key={tx}
                  onClick={() => {
                    const next = active ? selected.filter((s) => s !== tx) : [...selected, tx];
                    onSpecChange(fieldDef.field, next.join(", "));
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    cursor: "pointer",
                    background: active ? "#863819" : "#f5f2eb",
                    color: active ? "white" : "#555",
                    fontWeight: active ? 600 : 400,
                    border: active ? "none" : "1px solid #eee",
                    transition: "0.15s",
                  }}
                >
                  {tx}
                </span>
              );
            })}
          </div>
        </div>
      );
    }
    if (fieldDef.type === "incluye") {
      const selected = (especifico[fieldDef.field] || "").split(",").map((s) => s.trim()).filter(Boolean);
      return (
        <div key={fieldDef.field} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {fieldDef.label}
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {QUE_INCLUYE_EXPERIENCIA.map((incl) => {
              const active = selected.includes(incl);
              return (
                <span
                  key={incl}
                  onClick={() => {
                    const next = active ? selected.filter((s) => s !== incl) : [...selected, incl];
                    onSpecChange(fieldDef.field, next.join(", "));
                  }}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 20,
                    fontSize: 13,
                    cursor: "pointer",
                    background: active ? "#863819" : "#f5f2eb",
                    color: active ? "white" : "#555",
                    fontWeight: active ? 600 : 400,
                    border: active ? "none" : "1px solid #eee",
                    transition: "0.15s",
                  }}
                >
                  {incl}
                </span>
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
    setLoading(true);
    try {
      const body = {
        ...general,
        ...especifico,
        fecha_inicio_suscripcion: general.fecha_inicio_suscripcion || null,
        fecha_fin_suscripcion: general.fecha_fin_suscripcion || null,
        latitud: Number(general.latitud),
        longitud: Number(general.longitud),
      };
      if (body.nombre_completo && !body.nombre) body.nombre = body.nombre_completo;
      if (body.es_referente_comunidad === "true") body.es_referente_comunidad = true;
      if (body.es_referente_comunidad === "false") body.es_referente_comunidad = false;

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
          for (const c of conexTempList) {
            await authFetch(`/api/entidades/${entityId}/conexiones`, {
              method: "POST",
              headers: authHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({
                entidad_destino_id: c.entidad_destino_id,
                tipo_relacion: c.tipo_relacion,
                tipo_relacion_inversa: c.tipo_relacion_inversa,
              }),
            });
          }
          setConexTempList([]);
        }

        showPopup(editingEntityId ? "Entidad actualizada" : "Entidad creada");
        setView("entidades");
        setEditingEntityId(null);
        setStep(1);
        setGeneral({ tipo: "", nombre: "", slug: "", resumen: "", localidad_id: "", latitud: -27.4511, longitud: -58.9861, visible: true, direccion_escrita: "" });
        setEspecifico({});
        setMultimediaItems([{ url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", es_principal: true, public_id: "", entidades_etiquetadas: [] }]);
        setConexiones([]);
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

  // --- CONEXIONES ---
  const buscarConexiones = async (q) => {
    if (!q.trim()) { setConexResults([]); return; }
    try {
      const res = await authFetch(`/api/entidades?search=${encodeURIComponent(q)}`);
      if (res.ok) setConexResults(await res.json());
    } catch {}
  };

  useEffect(() => {
    const t = setTimeout(() => buscarConexiones(conexSearch), 300);
    return () => clearTimeout(t);
  }, [conexSearch]);

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
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={{ fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 700, color: "#863819", lineHeight: 1.2 }}>
            Admin
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>{user?.username}</div>
        </div>

        <div style={styles.sidebarNav}>
          {[
            { key: "dashboard", label: "Dashboard", icon: "/icons/todos.png" },
            { key: "entidades", label: "Entidades", icon: "/icons/todos.png", count: totalEntidades },
            { key: "solicitudes", label: "Solicitudes", icon: "/icons/mail.png", badge: pendingSolicitudes },
            { key: "ediciones", label: "Ediciones", icon: "/icons/edit.png", badge: pendingEdiciones },
            { key: "devoluciones", label: "Devoluciones", icon: "/icons/mail.png", badge: pendingDevoluciones },
            { key: "recorridos", label: "Recorridos", icon: "/icons/route.png" },
            { key: "palabras", label: "Palabras", icon: "/icons/edit.png" },
            { key: "usuarios", label: "Usuarios", icon: "/icons/user.png" },
            { key: "planes", label: "Planes", icon: "/icons/card.png" },
            { key: "localidades", label: "Localidades", icon: "/icons/location.png" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setView(item.key)}
              style={{
                ...styles.navBtn,
                background: view === item.key ? "#f5f2eb" : "transparent",
                color: view === item.key ? "#863819" : "#555",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                justifyContent: "space-between",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {item.icon && <img src={item.icon} style={{ width: 18, height: 18 }} alt="" />}
                {item.label}
              </span>
              {(item.count || item.badge) && (
                <span style={{
                  background: item.badge > 0 ? "#863819" : "#f0ede8",
                  color: item.badge > 0 ? "white" : "#888",
                  fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, minWidth: 20, textAlign: "center",
                }}>
                  {item.badge ?? item.count}
                </span>
              )}
            </button>
          ))}
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
                  <img src="/icons/todos.png" style={{ width: 26, height: 26, marginRight: 10, verticalAlign: "middle" }} alt="" />
                  Entidades ({totalEntidades})
                </h2>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <button onClick={() => { setView("nuevo-editar"); setEditingEntityId(null); setStep(1); setGeneral({ tipo: "", nombre: "", slug: "", resumen: "", localidad_id: "", latitud: -27.4511, longitud: -58.9861, visible: true, direccion_escrita: "" }); setEspecifico({}); setConexTempList([]); setMultimediaItems([{ url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", es_principal: true, public_id: "", entidades_etiquetadas: [] }]); setDetailError(""); setMultimediaError(""); }} className="admin-btn" style={styles.btnPrimary}>
                    + NUEVA
                  </button>
                </div>
              </div>

              {/* Filter + search */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                <input
                  style={{ ...styles.input, marginBottom: 0, flex: 1, minWidth: 200 }}
                  placeholder="Buscar entidad por nombre, tipo o localidad..."
                  value={entidadSearch}
                  onChange={(e) => setEntidadSearch(e.target.value)}
                />
                <input
                  style={{ ...styles.input, marginBottom: 0, width: 200 }}
                  placeholder="Filtrar por perfil (email/nombre)..."
                  value={entidadFilterPerfil}
                  onChange={(e) => setEntidadFilterPerfil(e.target.value)}
                />
              </div>

              {/* Tipo filters */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "16px" }}>
                {[
                  { value: "", label: "Todas", color: "#555" },
                  ...TIPO_OPTIONS.filter((o) => o.value).map((o) => ({
                    ...o,
                    color: colorMapAdmin[o.value] || "#555",
                  })),
                ].map((f) => {
                  const active = entidadSearch === "" && entidadFilterPerfil === "" && tipos.length > 0
                    ? f.value === ""
                    : false;
                  return (
                    <span
                      key={f.value}
                      onClick={() => setEntidadSearch(f.value)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: 20,
                        fontSize: 12,
                        cursor: "pointer",
                        background: active ? f.color : "#f5f2eb",
                        color: active ? "white" : "#555",
                        fontWeight: active ? 700 : 500,
                        border: active ? "none" : "1px solid #eee",
                      }}
                    >
                      {f.label} {f.value ? `(${tipoCounts[f.value] || 0})` : ""}
                    </span>
                  );
                })}
              </div>

              {/* Entity list */}
              <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                {entidadesFiltradas.map((ent) => (
                  <div key={ent.id} style={styles.entityCard}>
                    {ent.imagen && <img src={ent.imagen} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />}
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
                        {ent.perfil_email && <span>👤 {ent.perfil_email}</span>}
                        {ent.fecha_fin_suscripcion && <span>📅 Vence: {new Date(ent.fecha_fin_suscripcion).toLocaleDateString("es-AR")}</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                      <a href={`/entidad/${ent.slug}`} target="_blank" rel="noopener noreferrer">
                        <button className="admin-btn-ghost" style={styles.smallBtn("#863819")}>
                          <img src="/icons/view.png" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }} alt="" />
                          VER
                        </button>
                      </a>
                      <button onClick={() => cargarEntidadParaEditar(ent.id)} className="admin-btn" style={styles.smallBtn("#863819")}>
                        EDITAR
                      </button>
                      <button onClick={() => toggleVisibilidad(ent.id, ent.visible)} className="admin-btn" style={styles.smallBtn(ent.visible ? "#f39c12" : "#2e7d32")}>
                        {ent.visible ? "OCULTAR" : "MOSTRAR"}
                      </button>
                      <button onClick={() => eliminarEntidad(ent.id, ent.nombre)} className="admin-btn-danger" style={styles.smallBtn("#c0392b")}>
                        <img src="/icons/delete.png" style={{ width: 14, height: 14, verticalAlign: "middle", marginRight: 4 }} alt="" />
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
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <button onClick={() => setView("entidades")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#888", padding: "4px 8px" }}>
                  ←
                </button>
                <h2 style={{ ...styles.sectionTitle, margin: 0 }}>
                  {editingEntityId ? "Editar entidad" : "Nueva entidad"}
                </h2>
              </div>

              {/* Stepper */}
              <div style={styles.stepperNav}>
                {["Datos generales", "Detalles específicos", "Multimedia", "Conexiones"].map((label, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{ ...styles.dot, background: step >= i + 1 ? "#863819" : "#ddd" }}>{i + 1}</div>
                    <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 700 : 400, color: step === i + 1 ? "#863819" : "#888", display: i === 3 ? "inline" : "none" }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              {step === 1 && (
                <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee" }}>
                  <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>Datos generales</h3>

                  <DetailField field="tipo" fieldVal={general.tipo} onFieldChange={onFieldChange} label="Tipo de entidad" type="select" options={TIPO_OPTIONS} />
                  <DetailField field="nombre" fieldVal={general.nombre} onFieldChange={onFieldChange} label="Nombre" placeholder="Nombre de la entidad" />
                  <DetailField field="slug" fieldVal={general.slug} onFieldChange={onFieldChange} label="Slug (URL)" placeholder="nombre-de-la-entidad" />
                  <DetailField field="resumen" fieldVal={general.resumen} onFieldChange={onFieldChange} label="Resumen / descripción breve" type="textarea" placeholder="Breve descripción..." />

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Localidad
                    </label>
                    <select
                      style={styles.input}
                      value={general.localidad_id}
                      onChange={(e) => setGeneral((prev) => ({ ...prev, localidad_id: e.target.value }))}
                    >
                      <option value="">Sin localidad</option>
                      {localidades.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
                    </select>
                  </div>

                  <DetailField field="direccion_escrita" fieldVal={general.direccion_escrita} onFieldChange={onFieldChange} label="Dirección escrita" placeholder="Calle y número" />

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, cursor: "pointer" }}>
                      <input type="checkbox" checked={general.visible} onChange={(e) => setGeneral((prev) => ({ ...prev, visible: e.target.checked }))} />
                      Visible en el mapa
                    </label>
                  </div>

                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: "#863819", display: "block", marginBottom: 4, letterSpacing: "0.5px", textTransform: "uppercase" }}>
                      Ubicación en el mapa
                    </label>
                    <input
                      style={{ ...styles.input, marginBottom: 8 }}
                      placeholder="Buscar dirección o localidad..."
                      value={geoQuery}
                      onChange={(e) => setGeoQuery(e.target.value)}
                    />
                    {geoResults.length > 0 && (
                      <div style={{ background: "white", border: "1px solid #eee", borderRadius: 12, maxHeight: 200, overflowY: "auto", marginBottom: 12 }}>
                        {geoResults.map((f) => (
                          <div key={f.id} onClick={() => seleccionarGeo(f)} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 14, borderBottom: "1px solid #f5f2eb", color: "#333" }}>
                            {f.place_name}
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Lat:</label>
                      <input
                        style={{ flex: 1, padding: "8px 12px", border: "1px solid #eee", borderRadius: 8, fontSize: 13, color: "#1c1c18" }}
                        type="number" step="any" value={general.latitud}
                        onChange={(e) => setGeneral((prev) => ({ ...prev, latitud: e.target.value }))}
                      />
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#555" }}>Lng:</label>
                      <input
                        style={{ flex: 1, padding: "8px 12px", border: "1px solid #eee", borderRadius: 8, fontSize: 13, color: "#1c1c18" }}
                        type="number" step="any" value={general.longitud}
                        onChange={(e) => setGeneral((prev) => ({ ...prev, longitud: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div ref={mapContainer} style={{ width: "100%", height: 300, borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }} />

                  {(editingEntityId || general.tipo === "comercio" || general.tipo === "hospedaje" || general.tipo === "evento" || general.tipo === "productor") && (
                    <div style={{ marginTop: 20, padding: "16px 20px", background: "#fff8e1", borderRadius: 12, border: "1px solid #ffe082" }}>
                      <h4 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 12px", fontSize: 15 }}>Suscripción</h4>
                      <DetailField field="fecha_inicio_suscripcion" fieldVal={general.fecha_inicio_suscripcion} onFieldChange={onFieldChange} label="Inicio de suscripción" type="date" />
                      <DetailField field="fecha_fin_suscripcion" fieldVal={general.fecha_fin_suscripcion} onFieldChange={onFieldChange} label="Fin de suscripción" type="date" />
                    </div>
                  )}

                  <div style={{ textAlign: "right", marginTop: 20 }}>
                    <button onClick={() => setStep(2)} className="admin-btn" style={styles.btnNext}>
                      SIGUIENTE →
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && renderSpecInputs() && (
                <div style={{ textAlign: "right", marginTop: 20, display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setStep(1)} className="admin-btn" style={styles.btnSecondary}>← ANTERIOR</button>
                  <button onClick={() => setStep(3)} className="admin-btn" style={styles.btnNext}>SIGUIENTE →</button>
                </div>
              )}

              {step === 2 && !renderSpecInputs() && (
                <div style={{ textAlign: "center", padding: 40, color: "#888" }}>
                  Seleccioná un tipo de entidad para ver los detalles específicos.
                </div>
              )}

              {step === 3 && (
                <div>
                  <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee" }}>
                    <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>Multimedia</h3>
                    {multimediaError && <div style={{ color: "#c62828", fontSize: 13, marginBottom: 12 }}>{multimediaError}</div>}
                    {multimediaItems.map((item, i) => (
                      <div key={i} style={{ marginBottom: 16, padding: 16, background: "#fafaf8", borderRadius: 12, border: "1px solid #eee" }}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                          {item.url_recurso && item.tipo_recurso === "foto" && (
                            <img src={item.url_recurso} alt="" style={{ width: 80, height: 80, borderRadius: 8, objectFit: "cover" }} />
                          )}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                              <select
                                value={item.tipo_recurso}
                                onChange={(e) => setMultimediaItems((prev) => prev.map((m, idx) => idx === i ? { ...m, tipo_recurso: e.target.value } : m))}
                                style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, color: "#1c1c18" }}
                              >
                                <option value="foto">Foto</option>
                                <option value="video">Video</option>
                                <option value="audio">Audio</option>
                              </select>
                              <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" }}>
                                <input
                                  type="checkbox"
                                  checked={item.es_principal}
                                  onChange={(e) => setMultimediaItems((prev) => prev.map((m, idx) => idx === i ? { ...m, es_principal: e.target.checked } : m))}
                                />
                                Principal
                              </label>
                            </div>
                            <input
                              style={{ ...styles.input, marginBottom: 8 }}
                              placeholder="URL del recurso"
                              value={item.url_recurso}
                              onChange={(e) => setMultimediaItems((prev) => prev.map((m, idx) => idx === i ? { ...m, url_recurso: e.target.value } : m))}
                            />
                            <input
                              style={{ ...styles.input, marginBottom: 8 }}
                              placeholder="Título alternativo (opcional)"
                              value={item.titulo_alternativo}
                              onChange={(e) => setMultimediaItems((prev) => prev.map((m, idx) => idx === i ? { ...m, titulo_alternativo: e.target.value } : m))}
                            />
                            <textarea
                              style={{ ...styles.input, marginBottom: 8 }}
                              placeholder="Descripción (opcional)"
                              value={item.descripcion_recurso}
                              onChange={(e) => setMultimediaItems((prev) => prev.map((m, idx) => idx === i ? { ...m, descripcion_recurso: e.target.value } : m))}
                            />
                          </div>
                        </div>
                        <TagSelector
                          entidades={allEntities.filter((e) => e.id !== (editingEntityId || -1))}
                          selected={item.entidades_etiquetadas || []}
                          onChange={(tags) => setMultimediaItems((prev) => prev.map((m, idx) => idx === i ? { ...m, entidades_etiquetadas: tags } : m))}
                          searchQuery={tagSearchQueries[i] || ""}
                          setSearchQuery={(q) => setTagSearchQueries((prev) => ({ ...prev, [i]: q }))}
                          typeFilter={tagTypeFilters[i] || ""}
                          setTypeFilter={(f) => setTagTypeFilters((prev) => ({ ...prev, [i]: f }))}
                        />
                        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            type="file"
                            accept={INFO_FORMATOS[item.tipo_recurso]?.accept?.join(",") || "image/*"}
                            onChange={(e) => e.target.files[0] && handleUpload(i, e.target.files[0])}
                            style={{ fontSize: 13, flex: 1 }}
                          />
                          {uploadingIndex === i && <span style={{ fontSize: 12, color: "#888" }}>Subiendo...</span>}
                          {multimediaItems.length > 1 && (
                            <button onClick={() => setMultimediaItems((prev) => prev.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 13 }}>
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => setMultimediaItems((prev) => [...prev, { url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", es_principal: false, public_id: "", entidades_etiquetadas: [] }])} className="admin-btn" style={{ ...styles.smallBtn("#863819"), marginRight: 8 }}>
                      + AGREGAR ARCHIVO
                    </button>
                  </div>

                  {/* Conexiones en step 3 */}
                  <div style={{ background: "white", borderRadius: 12, padding: "20px 24px", border: "1px solid #eee", marginTop: 16 }}>
                    <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 16px", fontSize: 18 }}>
                      Conexiones {conexTempList.length > 0 && `(${conexTempList.length})`}
                    </h3>

                    <div style={{ position: "relative", marginBottom: 12 }}>
                      <input
                        style={styles.input}
                        placeholder="Buscar entidad para conectar..."
                        value={conexSearch}
                        onChange={(e) => setConexSearch(e.target.value)}
                      />
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

                    {conexTempList.map((c, i) => (
                      <div key={c.entidad_destino_id} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, padding: "10px 14px", background: "#fafaf8", borderRadius: 8 }}>
                        <span style={{ flex: 1, fontWeight: 600, fontSize: 14, color: "#1c1c18" }}>{c.nombre}</span>
                        <input
                          style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, color: "#1c1c18" }}
                          placeholder="Tipo de relación (ej: colabora con)"
                          value={c.tipo_relacion}
                          onChange={(e) => {
                            const next = [...conexTempList];
                            next[i] = { ...next[i], tipo_relacion: e.target.value };
                            setConexTempList(next);
                          }}
                        />
                        <input
                          style={{ flex: 1, padding: "6px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, color: "#1c1c18" }}
                          placeholder="Relación inversa (ej: es colaborado por)"
                          value={c.tipo_relacion_inversa}
                          onChange={(e) => {
                            const next = [...conexTempList];
                            next[i] = { ...next[i], tipo_relacion_inversa: e.target.value };
                            setConexTempList(next);
                          }}
                        />
                        <button onClick={() => quitarConexTemp(c.entidad_destino_id)} style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 16 }}>✕</button>
                      </div>
                    ))}
                  </div>

                  <div style={{ textAlign: "right", marginTop: 20, display: "flex", justifyContent: "space-between" }}>
                    <button onClick={() => setStep(2)} className="admin-btn" style={styles.btnSecondary}>← ANTERIOR</button>
                    <button onClick={guardarEntidad} disabled={loading} className="admin-btn" style={{ ...styles.btnPrimary, opacity: loading ? 0.6 : 1 }}>
                      {loading ? "GUARDANDO..." : editingEntityId ? "ACTUALIZAR ENTIDAD" : "CREAR ENTIDAD"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SOLICITUDES */}
          {view === "solicitudes" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={styles.sectionTitle}>
                  <img src="/icons/mail.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
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
                  <img src="/icons/route.png" style={{ width: 26, height: 26, marginRight: 10, verticalAlign: "middle" }} alt="" />
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
                    + NUEVO RECORRIDO
                  </button>
                </div>
              </div>

              {/* Lista de recorridos */}
              {recorridos.map((rec) => (
                <div key={rec.id} style={styles.entityCard}>
                  {rec.imagen && <img src={rec.imagen} alt="" style={{ width: 60, height: 60, borderRadius: 8, objectFit: "cover" }} />}
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

              <div style={{ textAlign: "right", marginTop: 20 }}>
                <button onClick={guardarRecorrido} disabled={recSaving} className="admin-btn" style={{ ...styles.btnPrimary, opacity: recSaving ? 0.6 : 1 }}>
                  {recSaving ? "GUARDANDO..." : editingRecorridoId ? "ACTUALIZAR RECORRIDO" : "CREAR RECORRIDO"}
                </button>
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
                  <img src="/icons/location.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
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
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: popup.isConfirm ? "rgba(0,0,0,0.4)" : "transparent", pointerEvents: popup.isConfirm ? "auto" : "none" }}
          onClick={() => {
            if (popup.isConfirm) {
              pendingConfirm.current?.(false);
              setPopup(null);
            }
          }}
        >
          <div style={{
            background: "white",
            borderRadius: "16px",
            padding: "24px 32px",
            maxWidth: "420px",
            width: "100%",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            pointerEvents: "auto",
          }}
            onClick={(e) => e.stopPropagation()}
          >
            {popup.isConfirm ? (
              <>
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
              </>
            ) : (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                background: popup.type === "error" ? "#ffebee" : "#e8f5e9",
                color: "#1c1c18",
                padding: "14px 24px",
                borderRadius: "14px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                textAlign: "center",
                fontFamily: "Merriweather, serif",
                fontSize: "14px",
                fontWeight: 500,
              }}
              >
                {popup.message}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
