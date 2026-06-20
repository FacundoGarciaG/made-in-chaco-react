import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import TagSelector from "../components/TagSelector";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/SolicitarSelloPage.css";
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const TIPO_COLOR = {
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

const TIPOS_LABEL = {
  artesano: "Artesano",
  gastronomia: "Gastronomía",
  comercio: "Comercio",
  evento: "Evento",
  patrimonio: "Patrimonio",
  personalidad: "Personalidad",
  comunidad_indigena: "Comunidad Indígena",
  lugar_natural: "Lugar Natural",
  hospedaje: "Hospedaje",
  productor: "Productor",
  experiencia: "Experiencia",
  relato: "Relato",
  espacio_cultural: "Espacio Cultural",
};

const RUBROS_COMERCIO = [
  "Alfarería y cerámica", "Alimentos y bebidas artesanales", "Artesanías en cuero / Talabartería",
  "Artesanías en madera", "Carnes y embutidos regionales", "Cerveza artesanal",
  "Cestería y fibras naturales", "Comercio minorista", "Comercio mayorista",
  "Conservas y dulces", "Construcción y materiales", "Consultoría y asesoría",
  "Decoración artesanal", "Educación y capacitación", "Farmacia y perfumería",
  "Ferias y eventos", "Ferretería", "Gastronomía / Restaurante",
  "Gastronomía típica regional", "Herrería artesanal", "Hierbas medicinales y aromáticas",
  "Hilados y tejidos artesanales", "Indumentaria textil", "Indumentaria deportiva",
  "Informática y tecnología", "Instrumentos musicales", "Joyería y bijouterie artesanal",
  "Juguetería y librería", "Kiosco y almacén", "Lácteos artesanales",
  "Limpieza e higiene", "Mascotas y veterinaria", "Miel y derivados",
  "Muebles artesanales", "Mueblería y decoración", "Orfebrería y platería",
  "Panadería y pastelería", "Panificación y pastelería artesanal", "Papelería e imprenta",
  "Peluquería y barbería", "Plantas y vivero", "Productos regionales",
  "Quesos artesanales", "Reciclado y reutilización", "Repostería artesanal",
  "Salud y bienestar", "Servicios culturales", "Servicios turísticos",
  "Supermercado y autoservicio", "Textiles y bordados tradicionales", "Transporte y logística",
  "Velas y jabones artesanales", "Venta de combustibles", "Vidriería y vidrio",
];

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const CATEGORIAS_HOSPEDAJE = [
  "Hotel", "Cabaña", "Hostel", "Posada", "Complejo turístico",
  "Camping", "Departamento temporario", "Casa de campo",
  "Albergue", "Lodge", "Eco-aldea", "Hostería", "Resort",
];

const SERVICIOS_SUGERIDOS = [
  "WiFi gratis", "Desayuno incluido", "Aire acondicionado", "Calefacción",
  "Estacionamiento", "Pileta", "Jardín", "Parrilla", "Cocina compartida",
  "Habitación privada", "Baño privado", "Ropa de cama", "Toallas",
  "TV", "Heladera", "Microondas", "Ventilador", "Agua caliente",
  "Mascotas bienvenidas", "Acceso discapacitados", "Transporte al aeropuerto",
  "Excursiones", "Bicicletas", "Lavandería", "Room service",
  "Restaurante", "Bar", "Salón de eventos", "Seguridad 24h",
];

const TIPOS_PRODUCTO = [
  "Alfajores artesanales", "Alimentos y bebidas", "Artesanías en cuero",
  "Artesanías en madera", "Carnes y embutidos", "Cerveza artesanal",
  "Cestería y fibras naturales", "Conservas y dulces", "Decoración artesanal",
  "Hilados y tejidos", "Indumentaria textil", "Instrumentos musicales",
  "Joyería y bijouterie", "Lácteos artesanales", "Miel y derivados",
  "Muebles artesanales", "Orfebrería y platería", "Panificación artesanal",
  "Plantas y vivero", "Productos regionales", "Quesos artesanales",
  "Textiles y bordados", "Velas y jabones artesanales", "Hierbas medicinales",
];

const ACTIVIDADES_SUGERIDAS = [
  "Feria", "Exposición", "Concierto", "Espectáculo", "Taller",
  "Feria gastronómica", "Feria artesanal", "Muestra de arte",
  "Feria de productores", "Charla / Conferencia", "Feria de emprendedores",
  "Encuentro cultural", "Festival", "Desfile", "Fiesta popular",
  "Ronda de negocios", "Feria de artesanos", "Exposición de arte",
  "Feria de la economía social", "Feria de diseño",
];

const CAMPOS_POR_TIPO = {
  artesano: [
    { key: "biografia_larga", label: "Biografía", type: "textarea" },
    { key: "tecnica_principal", label: "Técnica principal" },
    { key: "materiales_usados", label: "Materiales usados", type: "textarea" },
    { key: "anios_experiencia", label: "Años de experiencia", type: "number" },
    { key: "taller_abierto", label: "Taller abierto", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
    { key: "comunidad_etnica", label: "Comunidad étnica" },
    { key: "contacto_comercial", label: "Contacto comercial" },
    { key: "sitio_web", label: "Sitio web" },
  ],
  gastronomia: [
    { key: "historia_plato", label: "Historia del plato", type: "textarea" },
    { key: "ingredientes_clave", label: "Ingredientes clave" },
    { key: "receta_destacada", label: "Receta destacada", type: "textarea" },
    { key: "establecimientos_donde_probar", label: "Establecimientos" },
  ],
  comercio: [
    { key: "razon_social", label: "Razón social" },
    { key: "cuit", label: "CUIT" },
    { key: "rubro_especifico", label: "Rubro específico", type: "rubro" },
    { key: "horario_apertura", label: "Horario de apertura", type: "time" },
    { key: "horario_cierre", label: "Horario de cierre", type: "time" },
    { key: "dias_abierto", label: "Días abierto", type: "dias" },
    { key: "sitio_web", label: "Sitio web" },
    { key: "acepta_tarjetas", label: "Acepta tarjetas", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
  ],
  evento: [
    { key: "razon_social", label: "Razón social" },
    { key: "cuit", label: "CUIT" },
    { key: "fecha_evento", label: "Fecha del evento", type: "date" },
    { key: "duracion_dias", label: "Duración (días)", type: "number" },
    { key: "actividades_principales", label: "Actividades principales", type: "select-multiple", options: ACTIVIDADES_SUGERIDAS },
    { key: "link_entradas", label: "Link de entradas" },
    { key: "es_itinerante", label: "Es itinerante", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
  ],
  patrimonio: [
    { key: "año_referencia", label: "Año de referencia" },
    { key: "estilo_arquitectonico", label: "Estilo arquitectónico" },
    { key: "declaratoria_oficial", label: "Declaratoria oficial" },
    { key: "estado_conservacion", label: "Estado de conservación" },
  ],
  personalidad: [
    { key: "nombre_completo", label: "Nombre completo" },
    { key: "apodo", label: "Apodo" },
    { key: "biografia_resumida", label: "Biografía", type: "textarea" },
    { key: "profesion", label: "Profesión" },
    { key: "fecha_nacimiento", label: "Fecha de nacimiento", type: "date" },
    { key: "es_referente_comunidad", label: "Referente comunitario", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
    { key: "comunidad_etnica", label: "Comunidad étnica" },
    { key: "contacto", label: "Contacto" },
  ],
  comunidad_indigena: [
    { key: "biografia_larga", label: "Descripción", type: "textarea" },
    { key: "etnia", label: "Etnia" },
    { key: "lenguas", label: "Lenguas" },
    { key: "territorio_tradicional", label: "Territorio tradicional" },
    { key: "cosmovision", label: "Cosmovisión", type: "textarea" },
  ],
  lugar_natural: [
    { key: "biografia_larga", label: "Descripción", type: "textarea" },
    { key: "categoria_natural", label: "Categoría" },
    { key: "actividades", label: "Actividades" },
    { key: "acceso", label: "Acceso" },
    { key: "flora_fauna_destacada", label: "Flora y fauna destacada" },
    { key: "mejor_epoca", label: "Mejor época" },
  ],
  hospedaje: [
    { key: "razon_social", label: "Razón social" },
    { key: "cuit", label: "CUIT" },
    { key: "biografia_larga", label: "Descripción", type: "textarea" },
    { key: "categoria_hospedaje", label: "Categoría", type: "categoria" },
    { key: "servicios", label: "Servicios", type: "servicios" },
    { key: "capacidad", label: "Capacidad" },
    { key: "sitio_web", label: "Sitio web" },
  ],
  productor: [
    { key: "razon_social", label: "Razón social" },
    { key: "cuit", label: "CUIT" },
    { key: "biografia_larga", label: "Descripción", type: "textarea" },
    { key: "tipo_producto", label: "Tipo de producto", type: "select-multiple", options: TIPOS_PRODUCTO },
    { key: "metodos_produccion", label: "Métodos de producción" },
    { key: "certificaciones", label: "Certificaciones" },
    { key: "contacto_comercial", label: "Contacto comercial" },
    { key: "sitio_web", label: "Sitio web" },
  ],
  experiencia: [
    { key: "biografia_larga", label: "Descripción", type: "textarea" },
    { key: "tipo_experiencia", label: "Tipo de experiencia" },
    { key: "duracion_experiencia", label: "Duración" },
    { key: "que_incluye", label: "Qué incluye" },
    { key: "precio_referencia", label: "Precio de referencia" },
    { key: "contacto_reserva", label: "Contacto / Reserva" },
    { key: "operador", label: "Operador" },
  ],
  relato: [
    { key: "autor", label: "Autor" },
    { key: "fecha_relato", label: "Fecha del relato", type: "date" },
    { key: "tipo_relato", label: "Tipo de relato" },
    { key: "contenido_completo", label: "Contenido completo", type: "textarea" },
  ],
  espacio_cultural: [
    { key: "biografia_larga", label: "Descripción", type: "textarea" },
    { key: "tipo_espacio", label: "Tipo de espacio" },
    { key: "horarios", label: "Horarios" },
    { key: "sitio_web", label: "Sitio web" },
  ],
};



export const SolicitarEdicionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, getToken } = useAuthPublico();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [entity, setEntity] = useState(null);
  const [localidades, setLocalidades] = useState([]);
  const [form, setForm] = useState({});
  const [contactos, setContactos] = useState([]);
  const [imagen, setImagen] = useState("");
  const [uploadingImagen, setUploadingImagen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [icono, setIcono] = useState("");
  const [subiendoIcono, setSubiendoIcono] = useState(false);
  const [multimediaItems, setMultimediaItems] = useState([]);
  const [uploadingMultimediaIndex, setUploadingMultimediaIndex] = useState(null);

  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState([]);
  const geoTimeoutRef = useRef(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInitialized = useRef(false);
  const originalFormRef = useRef(null);
  const originalContactosRef = useRef(null);
  const originalImagenRef = useRef(null);
  const originalIconoRef = useRef(null);
  const originalMultimediaIdsRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) return;
    (async () => {
      try {
        const [res, locRes] = await Promise.all([
          fetch(`/api/entidades/${id}/editar`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          }),
          fetch("/api/localidades"),
        ]);
        if (!res.ok) { navigate("/perfil"); return; }
        const data = await res.json();
        setEntity(data);
        const initial = {};
        const campos = CAMPOS_POR_TIPO[data.tipo] || [];
        for (const c of campos) {
          let val = data[c.key];
          if (c.type === "date" && val) {
            const d = new Date(val);
            if (!isNaN(d.getTime())) val = d.toISOString().split("T")[0];
          }
          initial[c.key] = val != null ? String(val) : "";
        }
        initial.nombre = data.nombre || "";
        initial.resumen = data.resumen || "";
        initial.email = data.email || "";
        initial.direccion_escrita = data.direccion_escrita || "";
        initial.latitud = data.latitud != null ? String(data.latitud) : "";
        initial.longitud = data.longitud != null ? String(data.longitud) : "";
        initial.localidad_id = data.localidad_id != null ? String(data.localidad_id) : "";
        setGeoQuery(data.direccion_escrita || "");
        setForm(initial);
        if (locRes.ok) setLocalidades(await locRes.json());
        let loadedContactos = [];
        try {
          const c = data.redes_sociales;
          if (c) loadedContactos = typeof c === "string" ? JSON.parse(c) : Array.isArray(c) ? c : [];
        } catch { loadedContactos = []; }
        setContactos(loadedContactos);
        const loadedImagen = data.imagen || "";
        const loadedIcono = data.icono || "";
        setImagen(loadedImagen);
        setIcono(loadedIcono);
        let loadedMultimedia = [];
        try {
          const mmRes = await fetch(`/api/entidades/${id}/multimedia`);
          if (mmRes.ok) loadedMultimedia = await mmRes.json();
        } catch {}
        setMultimediaItems(loadedMultimedia);
        originalFormRef.current = initial;
        originalContactosRef.current = loadedContactos;
        originalImagenRef.current = loadedImagen;
        originalIconoRef.current = loadedIcono;
        originalMultimediaIdsRef.current = new Set(loadedMultimedia.filter((m) => m.id).map((m) => m.id));
      } catch {} finally { setLoading(false); }
    })();
  }, [isAuthenticated, id, getToken, navigate]);

  useLayoutEffect(() => {
    if (!entity || mapInitialized.current) return;
    const el = mapContainer.current;
    console.log("Map init check, container:", el, "entity:", !!entity);
    if (!el) {
      console.log("Map container not ready, retrying...");
      const timer = setTimeout(() => {
        const el2 = mapContainer.current;
        if (el2 && !mapInitialized.current) initMap(el2);
      }, 100);
      return () => { clearTimeout(timer); if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; markerRef.current = null; mapInitialized.current = false; } };
    }
    initMap(el);
    return () => {
      mapInitialized.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [entity]);

  const initMap = (el) => {
    mapInitialized.current = true;
    console.log("Init map, size:", el.offsetWidth, el.offsetHeight);
    const lng = parseFloat(form.longitud) || -58.9861;
    const lat = parseFloat(form.latitud) || -27.4511;
    const m = new mapboxgl.Map({
      container: el,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 8,
      attributionControl: false,
    });
    requestAnimationFrame(() => { try { m.resize(); } catch {} });
    const markerEl = document.createElement("div");
    markerEl.style.width = "28px";
    markerEl.style.height = "28px";
    markerEl.style.cursor = "pointer";
    const img = document.createElement("img");
    img.src = icono || `/icons/${entity.tipo}.png`;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.filter = "drop-shadow(0 1px 4px rgba(0,0,0,0.3))";
    markerEl.appendChild(img);
    const mk = new mapboxgl.Marker({ element: markerEl, draggable: true })
      .setLngLat([lng, lat])
      .addTo(m);
    mk.on("dragend", () => {
      const ll = mk.getLngLat();
      setForm((f) => ({ ...f, latitud: ll.lat.toFixed(7), longitud: ll.lng.toFixed(7) }));
    });
    m.on("click", (e) => {
      mk.setLngLat(e.lngLat);
      setForm((f) => ({ ...f, latitud: e.lngLat.lat.toFixed(7), longitud: e.lngLat.lng.toFixed(7) }));
    });
    mapRef.current = m;
    markerRef.current = mk;
  };

  useEffect(() => {
    const mk = markerRef.current;
    if (!mk) return;
    const el = mk.getElement();
    if (!el) return;
    el.innerHTML = "";
    const img = document.createElement("img");
    img.src = icono || `/icons/${entity?.tipo}.png`;
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "contain";
    img.style.filter = "drop-shadow(0 1px 4px rgba(0,0,0,0.3))";
    el.appendChild(img);
  }, [icono]);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const agregarContacto = () => setContactos((p) => [...p, { type: "whatsapp", value: "" }]);
  const actualizarContacto = (i, field, val) => setContactos((p) => p.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  const eliminarContacto = (i) => setContactos((p) => p.filter((_, idx) => idx !== i));

  const handleUploadImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    const formatos = ["image/jpeg", "image/png", "image/webp"];
    if (!formatos.includes(file.type)) {
      setUploadError("Formato no soportado. Usá: JPG, PNG o WebP.");
      e.target.value = "";
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      if (img.width < 1920 || img.height < 1080) {
        setUploadError(`Resolución muy baja: ${img.width}×${img.height}. Mínimo: 1920×1080 px (16:9).`);
        e.target.value = "";
        return;
      }
      setUploadingImagen(true);
      try {
        const formData = new FormData();
        formData.append("archivo", file);
        const res = await fetch("/api/upload-public", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir");
        setImagen(data.url);
      } catch (err) {
        setUploadError(err.message);
      } finally {
        setUploadingImagen(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setUploadError("No se pudo leer la imagen.");
      e.target.value = "";
    };
    img.src = url;
  };

  const handleUploadIcono = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      if (img.width !== 24 || img.height !== 24) {
        alert("El icono debe ser exactamente 24×24 px");
        e.target.value = "";
        return;
      }
      setSubiendoIcono(true);
      try {
        const formData = new FormData();
        formData.append("archivo", file);
        const res = await fetch("/api/upload-public", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir");
        setIcono(data.url);
      } catch (err) {
        alert(err.message);
      } finally {
        setSubiendoIcono(false);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); e.target.value = ""; };
    img.src = url;
  };

  const agregarMultimedia = () => setMultimediaItems((p) => [...p, { url_recurso: "", titulo_alternativo: "", descripcion_recurso: "", tipo_recurso: "foto", public_id: "", thumbnail_url: "" }]);

  const eliminarMultimedia = (i) => setMultimediaItems((p) => p.filter((_, idx) => idx !== i));

  const handleUploadMultimedia = async (index, file) => {
    if (!file) return;
    setUploadingMultimediaIndex(index);
    try {
      const tipo = multimediaItems[index].tipo_recurso || "foto";
      const formData = new FormData();
      formData.append("archivo", file);
      formData.append("tipo_recurso", tipo);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al subir");
      setMultimediaItems((p) => p.map((item, idx) =>
        idx === index ? { ...item, url_recurso: data.url, public_id: data.public_id, thumbnail_url: data.thumbnail_url || "" } : item
      ));
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingMultimediaIndex(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (payload.rubro_especifico === "__otro__") {
        payload.rubro_especifico = payload.rubro_especifico_custom || "Otros";
      }
      delete payload.rubro_especifico_custom;
      if (payload.categoria_hospedaje === "__otro__") {
        payload.categoria_hospedaje = payload.categoria_hospedaje_custom || "Otros";
      }
      delete payload.categoria_hospedaje_custom;
      payload.redes_sociales = JSON.stringify(contactos);
      payload.imagen = imagen;
      if (icono) payload.icono = icono;
      const multimediaNuevas = multimediaItems.filter((m) => m.id === undefined && m.url_recurso);
      if (multimediaNuevas.length > 0) payload.multimedia = multimediaNuevas;
      const res = await fetch(`/api/entidades/${id}/solicitar-edicion`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(payload),
      });
      if (res.ok) setSaved(true);
      else alert("Error al enviar la solicitud");
    } catch { alert("Error de conexión"); } finally { setSaving(false); }
  };

  if (!isAuthenticated) {
    return <div style={{ padding: 40, textAlign: "center", color: "#999" }}>Iniciá sesión para editar</div>;
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#aaa" }}>Cargando...</div>;
  }

  if (saved) {
    return (
      <div className="solicitar-success">
        <div className="solicitar-success-inner">
          <div className="solicitar-success-icon">✓</div>
          <h1>Edición enviada para revisión</h1>
          <p>Tu solicitud de edición fue registrada. Un administrador la revisará y aprobará en breve.</p>
          <button className="solicitar-btn-back" onClick={() => navigate("/perfil")}>
            Volver al perfil <span className="arrow-up">↑</span>
          </button>
        </div>
      </div>
    );
  }

  if (!entity) return null;

  const campos = CAMPOS_POR_TIPO[entity.tipo] || [];
  const catColor = TIPO_COLOR[entity.tipo] || "#555";

  const hasChanges = (() => {
    if (!originalFormRef.current) return false;
    const allKeys = new Set([...Object.keys(form), ...Object.keys(originalFormRef.current)]);
    for (const key of allKeys) {
      const a = String(form[key] ?? "").trim();
      const b = String(originalFormRef.current[key] ?? "").trim();
      if (a !== b) return true;
    }
    if (JSON.stringify(contactos) !== JSON.stringify(originalContactosRef.current)) return true;
    if ((imagen || "") !== (originalImagenRef.current || "")) return true;
    if ((icono || "") !== (originalIconoRef.current || "")) return true;
    if (multimediaItems.some((m) => !m.id)) return true;
    return false;
  })();

  const renderField = (c) => {
    if (c.type === "textarea") {
      return <textarea id={`edit-${c.key}`} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} placeholder=" " />;
    }
    if (c.type === "select") {
      return (
        <select className="solicitar-select" style={{ color: form[c.key] ? "#1a1a1a" : "#aaa" }} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)}>
          <option value="">Seleccionar...</option>
          {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (c.type === "number") {
      return <input type="number" id={`edit-${c.key}`} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} placeholder=" " />;
    }
    if (c.type === "date") {
      return <input type="date" id={`edit-${c.key}`} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} placeholder=" " />;
    }
    if (c.type === "time") {
      return <input type="time" id={`edit-${c.key}`} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} placeholder=" " />;
    }
    if (c.type === "dias") {
      const dias = (form[c.key] || "").split(",").filter(Boolean);
      return (
        <div className="solicitar-dias">
          {DIAS_SEMANA.map((dia) => {
            const checked = dias.includes(dia);
            return (
              <label key={dia} className={`solicitar-dia-label ${checked ? "checked" : ""}`}>
                <input type="checkbox" checked={checked} onChange={() => {
                  const nuevos = checked ? dias.filter((d) => d !== dia) : [...dias, dia];
                  set(c.key, nuevos.join(","));
                }} />
                {dia.slice(0, 3)}
              </label>
            );
          })}
        </div>
      );
    }
    if (c.type === "rubro") {
      const val = form[c.key] || "";
      return (
        <>
          <select className="solicitar-select" style={{ color: val ? "#1a1a1a" : "#aaa" }}
            value={val} onChange={(e) => set(c.key, e.target.value)}
          >
            <option value="">Seleccionar rubro...</option>
            {RUBROS_COMERCIO.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="__otro__">Otros</option>
          </select>
          {val === "__otro__" && (
            <div className="solicitar-floating-group" style={{ marginTop: 8 }}>
              <input id={`edit-${c.key}-custom`} value={form[`${c.key}_custom`] || ""} onChange={(e) => set(`${c.key}_custom`, e.target.value)} placeholder=" " />
              <label htmlFor={`edit-${c.key}-custom`}>Personalizado</label>
            </div>
          )}
        </>
      );
    }
    if (c.type === "categoria") {
      const val = form[c.key] || "";
      return (
        <>
          <select className="solicitar-select" style={{ color: val ? "#1a1a1a" : "#aaa" }}
            value={val} onChange={(e) => set(c.key, e.target.value)}
          >
            <option value="">Seleccionar categoría...</option>
            {CATEGORIAS_HOSPEDAJE.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="__otro__">Otros</option>
          </select>
          {val === "__otro__" && (
            <div className="solicitar-floating-group" style={{ marginTop: 8 }}>
              <input id={`edit-${c.key}-custom`} value={form[`${c.key}_custom`] || ""} onChange={(e) => set(`${c.key}_custom`, e.target.value)} placeholder=" " />
              <label htmlFor={`edit-${c.key}-custom`}>Personalizado</label>
            </div>
          )}
        </>
      );
    }
    if (c.type === "servicios") {
      return (
        <TagSelector
          value={form[c.key] || ""}
          onChange={(v) => set(c.key, v)}
          suggestions={SERVICIOS_SUGERIDOS}
          placeholder="Escribí o seleccioná servicios..."
        />
      );
    }
    if (c.type === "select-multiple") {
      return (
        <TagSelector
          value={form[c.key] || ""}
          onChange={(v) => set(c.key, v)}
          suggestions={c.options || []}
          placeholder={c.placeholder || "Escribí o seleccioná..."}
        />
      );
    }
    return <input type={c.type || "text"} id={`edit-${c.key}`} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} placeholder=" " />;
  };

  return (
    <div className="solicitar-page">
      <div className="solicitar-form-side" style={{ marginTop: 60, minHeight: "calc(100vh - 60px)" }}>
        <form onSubmit={handleSubmit}>
          <div className="solicitar-header">
            <p style={{ fontSize: 20, fontWeight: 400, color: catColor, margin: "0 0 4px" }}>
              {TIPOS_LABEL[entity.tipo] || entity.tipo}
            </p>
            <h1>Editar {entity.nombre}</h1>
            <p>Los cambios quedarán pendientes hasta aprobación del administrador.</p>
          </div>

          <div className="solicitar-floating-group">
            <input id="edit-nombre" value={form.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} placeholder=" " />
            <label htmlFor="edit-nombre">Nombre</label>
          </div>

          <div className="solicitar-floating-group">
            <textarea id="edit-resumen" value={form.resumen ?? ""} onChange={(e) => set("resumen", e.target.value)} placeholder=" " />
            <label htmlFor="edit-resumen">Descripción</label>
          </div>

          <div className="solicitar-floating-group">
            <input id="edit-email" type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder=" " />
            <label htmlFor="edit-email">Email de contacto</label>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label className="solicitar-label">Localidad</label>
            <select className="solicitar-select" style={{ color: form.localidad_id ? "#1a1a1a" : "#aaa" }}
              value={form.localidad_id ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                set("localidad_id", val ? Number(val) : null);
                const loc = localidades.find((l) => l.id === parseInt(val));
                if (loc?.latitud && loc?.longitud && mapRef.current && markerRef.current) {
                  mapRef.current.flyTo({ center: [parseFloat(loc.longitud), parseFloat(loc.latitud)], zoom: 15, speed: 1.2 });
                  markerRef.current.setLngLat([parseFloat(loc.longitud), parseFloat(loc.latitud)]);
                  setForm((f) => ({ ...f, latitud: loc.latitud, longitud: loc.longitud }));
                }
              }}
            >
              <option value="">Seleccionar localidad...</option>
              {localidades.map((l) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>

          <div className="solicitar-floating-group" style={{ position: "relative" }}>
            <input id="edit-direccion" value={geoQuery}
              onChange={(e) => {
                setGeoQuery(e.target.value);
                set("direccion_escrita", e.target.value);
                if (e.target.value.length < 3) { setGeoResults([]); return; }
                clearTimeout(geoTimeoutRef.current);
                geoTimeoutRef.current = setTimeout(async () => {
                  try {
                    const q = e.target.value.includes(",") ? e.target.value : `${e.target.value}, Chaco, Argentina`;
                    const r = await fetch(
                      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=ar`,
                      { headers: { "User-Agent": "MadeInChaco/1.0", "Accept-Language": "es" } },
                    );
                    if (!r.ok) return;
                    setGeoResults(await r.json());
                  } catch {}
                }, 400);
              }}
              onFocus={() => geoResults.length > 0 && setGeoResults(geoResults)}
              placeholder=" "
              autoComplete="off"
            />
            <label htmlFor="edit-direccion">Dirección</label>
            {geoResults.length > 0 && (
              <div className="solicitar-geo-results">
                {geoResults.map((r, i) => (
                  <div key={i} className="solicitar-geo-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      clearTimeout(geoTimeoutRef.current);
                      const lat = parseFloat(r.lat);
                      const lon = parseFloat(r.lon);
                      setForm((f) => ({ ...f, direccion_escrita: r.display_name, latitud: lat.toFixed(7), longitud: lon.toFixed(7) }));
                      setGeoQuery(r.display_name);
                      setGeoResults([]);
                      if (mapRef.current && markerRef.current) {
                        mapRef.current.flyTo({ center: [lon, lat], zoom: 14, speed: 1 });
                        markerRef.current.setLngLat([lon, lat]);
                      }
                    }}
                  >
                    {r.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {campos.length > 0 && (
            <div style={{ marginTop: 40 }}>
              <div className="solicitar-section-title">Datos de {entity.tipo ? TIPOS_LABEL[entity.tipo] || entity.tipo : ""}</div>
              <div className="solicitar-section-divider" />
              {campos.map((c) => {
                if (c.type === "textarea" || c.type === "number" || c.type === "date" || c.type === "time" || !c.type || c.type === "text") {
                  return (
                    <div key={c.key} className="solicitar-floating-group">
                      {renderField(c)}
                      <label htmlFor={`edit-${c.key}`}>{c.label}</label>
                    </div>
                  );
                }
                return (
                  <div key={c.key} style={{ marginBottom: 32 }}>
                    <label className="solicitar-label">{c.label}</label>
                    {renderField(c)}
                  </div>
                );
              })}
            </div>
          )}

          {/* Contacto / Redes sociales */}
          <div style={{ marginTop: 40 }}>
            <div className="solicitar-section-title">Contacto / Redes sociales</div>
            <div className="solicitar-section-divider" />
            {contactos.map((item, i) => (
              <div key={i} className="solicitar-contact-row">
                <select
                  className="solicitar-contact-select"
                  value={item.type}
                  onChange={(e) => actualizarContacto(i, "type", e.target.value)}
                >
                  <option value="instagram">Instagram</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telefono">Teléfono</option>
                  <option value="email">Email</option>
                  <option value="facebook">Facebook</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube</option>
                  <option value="twitter">X / Twitter</option>
                  <option value="otro">Otro</option>
                </select>
                <input
                  className="solicitar-contact-input"
                  value={item.value}
                  onChange={(e) => actualizarContacto(i, "value", e.target.value)}
                  placeholder="Valor"
                />
                <button type="button" className="solicitar-contact-remove" onClick={() => eliminarContacto(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="solicitar-btn-add" onClick={agregarContacto}>+ Agregar contacto</button>
          </div>

          {/* Foto de portada */}
          <div style={{ marginTop: 40 }}>
            <div className="solicitar-section-title">Foto de portada</div>
            <div className="solicitar-section-divider" />
            <p className="solicitar-hint">
              Esta foto se va a usar como imagen principal de tu entidad en el mapa y en su página de detalle.
            </p>
            <div className="solicitar-upload-area">
              <label className="solicitar-upload-btn">
                {uploadingImagen ? "Subiendo..." : "Seleccionar archivo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleUploadImagen} disabled={uploadingImagen} />
              </label>
              {imagen && (
                <img src={imagen} alt="" className="solicitar-upload-preview" />
              )}
            </div>
            <div className="solicitar-small">Formatos: JPG, PNG, WebP • Mínimo 1920×1080 px (16:9)</div>
            {uploadError && (
              <div className="solicitar-error">{uploadError}</div>
            )}
          </div>

          {/* Icono personalizado */}
          <div style={{ marginTop: 40 }}>
            <div className="solicitar-section-title">Icono personalizado</div>
            <div className="solicitar-section-divider" />
            <p className="solicitar-hint">
              Subí un icono PNG de exactamente 24×24 px para identificar tu entidad en el mapa.
            </p>
            <div className="solicitar-upload-area">
              {icono && (
                <img src={icono} alt="" className="solicitar-upload-preview-sm" />
              )}
              <label className="solicitar-upload-btn">
                {subiendoIcono ? "Subiendo..." : icono ? "Cambiar icono" : "Seleccionar archivo"}
                <input type="file" accept="image/png" hidden onChange={handleUploadIcono} disabled={subiendoIcono} />
              </label>
              {icono && (
                <button type="button" className="solicitar-contact-remove" onClick={() => setIcono("")}>✕</button>
              )}
            </div>
            <div className="solicitar-small">Solo PNG • 24×24 px exacto</div>
          </div>

          {/* Multimedia */}
          <div style={{ marginTop: 40 }}>
            <div className="solicitar-section-title">Multimedia</div>
            <div className="solicitar-section-divider" />
            <p className="solicitar-hint">
              Agregá fotos, videos o audios para mostrar en la página de detalle de tu entidad.
            </p>
            {multimediaItems.filter((m) => m.id).length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <p style={{ fontSize: 13, color: "#999", fontWeight: 500, letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>Actuales</p>
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
            {multimediaItems.filter((m) => !m.id).map((item, idx) => {
              const realIdx = multimediaItems.indexOf(item);
              return (
                <div key={realIdx} style={{ marginBottom: 20, padding: 16, background: "#fafaf8", borderRadius: 12, border: "1px solid #eee" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                    <select
                      className="solicitar-contact-select"
                      value={item.tipo_recurso}
                      onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, tipo_recurso: e.target.value } : m))}
                    >
                      <option value="foto">📷 Foto</option>
                      <option value="video">🎥 Video</option>
                      <option value="audio">🎵 Audio</option>
                    </select>
                    <label style={{
                      fontFamily: "inherit", fontSize: 13, cursor: "pointer", padding: "6px 16px",
                      border: "1px solid #ccc", borderRadius: 6, background: "white", color: "#555",
                      fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4,
                    }}>
                      {uploadingMultimediaIndex === realIdx ? "⏳ Subiendo..." : item.url_recurso ? "✅ Subido" : "📁 Seleccionar"}
                      <input type="file" hidden disabled={uploadingMultimediaIndex === realIdx}
                        accept={
                          item.tipo_recurso === "foto" ? "image/jpeg,image/png,image/webp" :
                          item.tipo_recurso === "video" ? "video/mp4,video/webm" : "audio/mpeg,audio/wav,audio/ogg"
                        }
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadMultimedia(realIdx, f); e.target.value = ""; }}
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
                    <button type="button" onClick={() => eliminarMultimedia(realIdx)}
                      style={{ background: "none", border: "none", color: "#d32f2f", cursor: "pointer", fontSize: 18, padding: "4px", lineHeight: 1 }}
                    >✕</button>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap" }}>
                    <input className="solicitar-contact-input"
                      placeholder="Título"
                      value={item.titulo_alternativo}
                      onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, titulo_alternativo: e.target.value } : m))}
                    />
                    <input className="solicitar-contact-input"
                      placeholder="Descripción"
                      value={item.descripcion_recurso}
                      onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, descripcion_recurso: e.target.value } : m))}
                    />
                  </div>
                </div>
              );
            })}
            <button type="button" className="solicitar-btn-add" onClick={agregarMultimedia}>+ Agregar multimedia</button>
          </div>

          <div style={{ marginTop: 40 }}>
            <button type="submit" className="solicitar-btn-submit" disabled={!hasChanges || saving || uploadingImagen || subiendoIcono || uploadingMultimediaIndex !== null}
              style={{
                background: !hasChanges || saving || uploadingImagen || subiendoIcono || uploadingMultimediaIndex !== null ? undefined : "#863819",
                color: !hasChanges || saving || uploadingImagen || subiendoIcono || uploadingMultimediaIndex !== null ? undefined : "#fff",
                borderColor: !hasChanges || saving || uploadingImagen || subiendoIcono || uploadingMultimediaIndex !== null ? undefined : "#863819",
              }}
            >
              {saving ? "Enviando..." : uploadingImagen ? "Subiendo portada..." : subiendoIcono ? "Subiendo icono..." : uploadingMultimediaIndex !== null ? "Subiendo multimedia..." : "Enviar solicitud de edición"}
              {!saving && !uploadingImagen && !subiendoIcono && uploadingMultimediaIndex === null && <span className="arrow">→</span>}
            </button>
          </div>
        </form>
      </div>

      <div className="solicitar-map-side">
        <div ref={mapContainer} className="solicitar-map-container" style={{ width: "100%", height: "100vh" }} />
        <div className="solicitar-map-zoom">
          <button type="button" onClick={() => mapRef.current?.zoomIn()}>+</button>
          <button type="button" onClick={() => mapRef.current?.zoomOut()}>−</button>
        </div>
        {form.latitud && form.longitud && (
          <div className="solicitar-map-coords">Lat: {form.latitud}, Lng: {form.longitud}</div>
        )}
      </div>
    </div>
  );
};
