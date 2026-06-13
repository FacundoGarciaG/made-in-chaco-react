import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import TagSelector from "../components/TagSelector";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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

const sInput = {
  width: "100%",
  padding: "8px 0 6px",
  border: "none",
  borderBottom: "1px solid #e8e8e8",
  borderRadius: 0,
  fontSize: "24px",
  fontWeight: 400,
  letterSpacing: "-0.02em",
  outline: "none",
  boxSizing: "border-box",
  background: "transparent",
  color: "#1a1a1a",
  fontFamily: "inherit",
  WebkitAppearance: "none",
  appearance: "none",
  cursor: "text",
  transition: "border-color 0.2s",
};

const sTextarea = {
  ...sInput,
  minHeight: 100,
  resize: "vertical",
  lineHeight: 1.4,
};

const sLabel = {
  display: "block",
  fontSize: "13px",
  fontWeight: 500,
  color: "#888",
  marginBottom: 2,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const sectionDividerStyle = {
  width: 40,
  height: 3,
  background: "#863819",
  marginBottom: 28,
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
  const [multimediaItems, setMultimediaItems] = useState([]);
  const [uploadingMultimediaIndex, setUploadingMultimediaIndex] = useState(null);

  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState([]);
  const geoTimeoutRef = useRef(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const mapInitialized = useRef(false);

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
          initial[c.key] = val ?? "";
        }
        initial.nombre = data.nombre || "";
        initial.resumen = data.resumen || "";
        initial.email = data.email || "";
        initial.direccion_escrita = data.direccion_escrita || "";
        initial.latitud = data.latitud ?? "";
        initial.longitud = data.longitud ?? "";
        initial.localidad_id = data.localidad_id ?? "";
        initial.fecha_inicio_suscripcion = data.fecha_inicio_suscripcion ? data.fecha_inicio_suscripcion.split("T")[0] : "";
        initial.fecha_fin_suscripcion = data.fecha_fin_suscripcion ? data.fecha_fin_suscripcion.split("T")[0] : "";
        setGeoQuery(data.direccion_escrita || "");
        setForm(initial);
        if (locRes.ok) setLocalidades(await locRes.json());
        try {
          const c = data.redes_sociales;
          if (c) setContactos(typeof c === "string" ? JSON.parse(c) : Array.isArray(c) ? c : []);
        } catch { setContactos([]); }
        setImagen(data.imagen || "");
        try {
          const mmRes = await fetch(`/api/entidades/${id}/multimedia`);
          if (mmRes.ok) setMultimediaItems(await mmRes.json());
        } catch {}
      } catch {} finally { setLoading(false); }
    })();
  }, [isAuthenticated, id, getToken, navigate]);

  useLayoutEffect(() => {
    if (!entity || mapInitialized.current || !mapContainer.current) return;
    mapInitialized.current = true;
    const el = mapContainer.current;
    const lng = parseFloat(form.longitud) || -58.9861;
    const lat = parseFloat(form.latitud) || -27.4511;
    const m = new mapboxgl.Map({
      container: el,
      style: "mapbox://styles/mapbox/light-v10",
      center: [lng, lat],
      zoom: 8,
      attributionControl: false,
    });
    const mk = new mapboxgl.Marker({ draggable: true, color: "#863819" })
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
    return () => {
      mapInitialized.current = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [entity]);

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
      <div style={{ background: "#f5f2e8", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Epilogue, sans-serif" }}>
        <div style={{ textAlign: "center", maxWidth: 480, padding: 40 }}>
          <p style={{ fontSize: 13, color: "#999", fontWeight: 500, letterSpacing: "0.04em", marginBottom: 12 }}>Solicitud enviada</p>
          <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 26, fontWeight: 600, color: "#1c1c18", margin: "0 0 12px" }}>
            Edición enviada para revisión
          </h2>
          <p style={{ color: "#666", lineHeight: 1.7, fontSize: 15 }}>
            Tu solicitud de edición fue registrada. Un administrador la revisará y aprobará en breve.
          </p>
          <button onClick={() => navigate("/perfil")} style={{
            marginTop: 32, padding: "14px 48px", background: "#863819", color: "#fff",
            border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.06em",
          }}>
            Volver al perfil
          </button>
        </div>
      </div>
    );
  }

  if (!entity) return null;

  const campos = CAMPOS_POR_TIPO[entity.tipo] || [];
  const catColor = TIPO_COLOR[entity.tipo] || "#555";

  const renderField = (c) => {
    if (c.type === "textarea") {
      return <textarea style={sTextarea} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} />;
    }
    if (c.type === "select") {
      return (
        <select style={{ ...sInput, cursor: "pointer", color: form[c.key] ? "#1a1a1a" : "#aaa" }} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)}>
          <option value="">Seleccionar...</option>
          {c.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    }
    if (c.type === "number") {
      return <input type="number" style={sInput} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} placeholder={c.label} />;
    }
    if (c.type === "date") {
      return <input type="date" style={sInput} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} />;
    }
    if (c.type === "time") {
      return <input type="time" style={sInput} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} />;
    }
    if (c.type === "dias") {
      const dias = (form[c.key] || "").split(",").filter(Boolean);
      return (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {DIAS_SEMANA.map((dia) => {
            const checked = dias.includes(dia);
            return (
              <label
                key={dia}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "4px",
                  padding: "6px 12px", borderRadius: "8px", fontSize: "12px",
                  fontWeight: 600, cursor: "pointer",
                  background: checked ? "#863819" : "white",
                  color: checked ? "#fff" : "#555",
                  border: checked ? "1px solid #863819" : "1px solid #ddd",
                  transition: "all 0.15s",
                }}
              >
                <input
                  type="checkbox" style={{ display: "none" }}
                  checked={checked}
                  onChange={() => {
                    const nuevos = checked
                      ? dias.filter((d) => d !== dia)
                      : [...dias, dia];
                    set(c.key, nuevos.join(","));
                  }}
                />
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
          <select style={{ ...sInput, cursor: "pointer", color: val ? "#1a1a1a" : "#aaa" }}
            value={val} onChange={(e) => set(c.key, e.target.value)}
          >
            <option value="">Seleccionar rubro...</option>
            {RUBROS_COMERCIO.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="__otro__">Otros</option>
          </select>
          {val === "__otro__" && (
            <input
              style={{ ...sInput, marginTop: 8 }}
              placeholder="Escribí el rubro..."
              value={form[`${c.key}_custom`] || ""}
              onChange={(e) => set(`${c.key}_custom`, e.target.value)}
            />
          )}
        </>
      );
    }
    if (c.type === "categoria") {
      const val = form[c.key] || "";
      return (
        <>
          <select style={{ ...sInput, cursor: "pointer", color: val ? "#1a1a1a" : "#aaa" }}
            value={val} onChange={(e) => set(c.key, e.target.value)}
          >
            <option value="">Seleccionar categoría...</option>
            {CATEGORIAS_HOSPEDAJE.map((r) => <option key={r} value={r}>{r}</option>)}
            <option value="__otro__">Otros</option>
          </select>
          {val === "__otro__" && (
            <input
              style={{ ...sInput, marginTop: 8 }}
              placeholder="Escribí la categoría..."
              value={form[`${c.key}_custom`] || ""}
              onChange={(e) => set(`${c.key}_custom`, e.target.value)}
            />
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
    return <input type={c.type || "text"} style={sInput} value={form[c.key] ?? ""} onChange={(e) => set(c.key, e.target.value)} />;
  };

  return (
    <div style={{ minHeight: "100vh", fontFamily: "Epilogue, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "80px auto 0", padding: "80px 40px 120px" }}>
        <div style={{ marginBottom: 64 }}>
          <p style={{ fontSize: 20, fontWeight: 400, color: catColor, margin: "0 0 4px" }}>
            {TIPOS_LABEL[entity.tipo] || entity.tipo}
          </p>
          <h1 style={{ fontFamily: "Cinzel, serif", fontSize: 48, fontWeight: 600, color: "#1c1c18", margin: 0, letterSpacing: "-0.03em", lineHeight: 1.05 }}>
            Editar {entity.nombre}
          </h1>
          <p style={{ color: "#777", fontSize: 20, lineHeight: 1.5, letterSpacing: "-0.01em", marginTop: 12 }}>
            Los cambios quedarán pendientes hasta aprobación del administrador.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div>
            <label style={sLabel}>Nombre</label>
            <input style={sInput} value={form.nombre ?? ""} onChange={(e) => set("nombre", e.target.value)} />
          </div>

          <div style={{ marginTop: 32 }}>
            <label style={sLabel}>Descripción</label>
            <textarea style={sTextarea} value={form.resumen ?? ""} onChange={(e) => set("resumen", e.target.value)} />
          </div>

          <div style={{ marginTop: 32 }}>
            <label style={sLabel}>Email de contacto</label>
            <input style={sInput} type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} />
          </div>

          <div style={{ marginTop: 32 }}>
            <label style={sLabel}>Localidad</label>
            <select style={{ ...sInput, cursor: "pointer", color: form.localidad_id ? "#1a1a1a" : "#aaa" }}
              value={form.localidad_id ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                set("localidad_id", val ? Number(val) : null);
                const loc = localidades.find((l) => l.id === parseInt(val));
                if (loc?.latitud && loc?.longitud && mapRef.current && markerRef.current) {
                  mapRef.current.flyTo({ center: [parseFloat(loc.longitud), parseFloat(loc.latitud)], zoom: 10, speed: 1.2 });
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

          <div style={{ marginTop: 32, position: "relative" }}>
            <label style={sLabel}>Dirección</label>
            <input style={sInput} placeholder="Ej: San Martín 123, Resistencia..." value={geoQuery}
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
            />
            {geoResults.length > 0 && (
              <div style={{
                position: "absolute", top: "100%", left: 0, right: 0,
                background: "white", border: "1px solid #eee",
                borderRadius: "10px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                zIndex: 100, maxHeight: "200px", overflowY: "auto",
              }}>
                {geoResults.map((r, i) => (
                  <div key={i} style={{
                    padding: "10px 14px", cursor: "pointer", fontSize: "14px",
                    color: "#1c1c18", borderBottom: i < geoResults.length - 1 ? "1px solid #f5f2eb" : "none",
                  }}
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
                    onMouseEnter={(e) => e.currentTarget.style.background = "#f5f2eb"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    {r.display_name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: 32 }}>
            <label style={sLabel}>Ubicación en el mapa</label>
            <p style={{ fontSize: 13, color: "#999", margin: "0 0 8px" }}>Hacé clic o arrastrá el marcador para ubicar tu entidad en el mapa</p>
            <div style={{ position: "relative" }}>
              <div ref={mapContainer} style={{ height: 250, borderRadius: 12, overflow: "hidden" }} />
              <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                <button type="button" onClick={() => mapRef.current?.zoomIn()} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#333" }}>+</button>
                <button type="button" onClick={() => mapRef.current?.zoomOut()} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#333" }}>−</button>
              </div>
            </div>
            {form.latitud && form.longitud && (
              <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                Lat: {form.latitud}, Lng: {form.longitud}
              </div>
            )}
          </div>

          {/* Suscripción */}
          <div style={{ marginTop: 56 }}>
            <h3 style={{
              fontFamily: "Cinzel, serif", color: "#1a1a1a", margin: "0 0 8px",
              fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em",
            }}>Suscripción</h3>
            <div style={sectionDividerStyle} />
            <p style={{ fontSize: 15, color: "#777", margin: "0 0 16px", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
              Podés solicitar cambios en las fechas de tu suscripción. El administrador revisará y aprobará la modificación.
            </p>
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={sLabel}>Inicio de suscripción</label>
                <input type="date" style={sInput} value={form.fecha_inicio_suscripcion ?? ""} onChange={(e) => set("fecha_inicio_suscripcion", e.target.value)} />
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <label style={sLabel}>Fin de suscripción</label>
                <input type="date" style={sInput} value={form.fecha_fin_suscripcion ?? ""} onChange={(e) => set("fecha_fin_suscripcion", e.target.value)} />
              </div>
            </div>
          </div>

          {campos.length > 0 && (
            <div style={{ marginTop: 56 }}>
              <h3 style={{
                fontFamily: "Cinzel, serif", color: "#1a1a1a", margin: "0 0 8px",
                fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em",
              }}>
                Datos de {entity.tipo ? TIPOS_LABEL[entity.tipo] || entity.tipo : ""}
              </h3>
              <div style={sectionDividerStyle} />
              {campos.map((c) => (
                <div key={c.key} style={{ marginBottom: 32 }}>
                  <label style={sLabel}>{c.label}</label>
                  {renderField(c)}
                </div>
              ))}
            </div>
          )}

          {/* Contacto / Redes sociales */}
          <div style={{ marginTop: 56 }}>
            <h3 style={{
              fontFamily: "Cinzel, serif", color: "#1a1a1a", margin: "0 0 8px",
              fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em",
            }}>Contacto / Redes sociales</h3>
            <div style={sectionDividerStyle} />
            {contactos.map((item, i) => (
              <div key={i} style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "center", background: "#fafaf8", padding: "8px 12px" }}>
                <select
                  value={item.type}
                  onChange={(e) => actualizarContacto(i, "type", e.target.value)}
                  style={{ ...sInput, width: 150, flexShrink: 0, marginBottom: 0, fontSize: 16, cursor: "pointer" }}
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
                  style={{ ...sInput, flex: 1, marginBottom: 0 }}
                  value={item.value}
                  onChange={(e) => actualizarContacto(i, "value", e.target.value)}
                  placeholder="Valor"
                />
                <button
                  type="button"
                  onClick={() => eliminarContacto(i)}
                  style={{
                    background: "none", border: "none", borderBottom: "1px solid #e8e8e8",
                    color: "#d32f2f", cursor: "pointer", fontSize: 18, padding: "8px 0", lineHeight: 1,
                  }}
                >✕</button>
              </div>
            ))}
            <button
              type="button" onClick={agregarContacto}
              style={{
                fontFamily: "inherit", fontSize: 15, fontWeight: 400, cursor: "pointer",
                border: "none", borderBottom: "1px solid #e8e8e8", background: "none",
                padding: "8px 0", color: "#aaa", letterSpacing: "-0.01em", marginTop: 8,
              }}
            >+ Agregar contacto</button>
          </div>

          {/* Foto de portada */}
          <div style={{ marginTop: 56 }}>
            <h3 style={{
              fontFamily: "Cinzel, serif", color: "#1a1a1a", margin: "0 0 8px",
              fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em",
            }}>Foto de portada</h3>
            <div style={sectionDividerStyle} />
            <p style={{ fontSize: 15, color: "#777", margin: "0 0 16px", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
              Esta foto se va a usar como imagen principal de tu entidad en el mapa y en su página de detalle.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 16, border: "1px dashed #ddd", padding: "20px 24px", background: "#fafaf8" }}>
              <label style={{
                fontFamily: "inherit", fontSize: 15, letterSpacing: "-0.01em", cursor: "pointer",
                border: "none", borderBottom: "1px solid #bbb", background: "none", padding: "4px 0", color: "#555",
              }}>
                {uploadingImagen ? "Subiendo..." : "Seleccionar archivo"}
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleUploadImagen} disabled={uploadingImagen} />
              </label>
              {imagen && (
                <img src={imagen} alt="" style={{ width: 72, height: 72, borderRadius: 4, objectFit: "cover", border: "1px solid #eee" }} />
              )}
            </div>
            <div style={{ fontSize: 13, color: "#aaa", marginTop: 6, letterSpacing: "-0.01em" }}>Formatos: JPG, PNG, WebP • Mínimo 1920×1080 px (16:9)</div>
            {uploadError && (
              <div style={{ fontSize: 14, color: "#d32f2f", fontWeight: 400, marginTop: 8 }}>{uploadError}</div>
            )}
          </div>

          {/* Multimedia */}
          <div style={{ marginTop: 56 }}>
            <h3 style={{
              fontFamily: "Cinzel, serif", color: "#1a1a1a", margin: "0 0 8px",
              fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em",
            }}>Multimedia</h3>
            <div style={sectionDividerStyle} />
            <p style={{ fontSize: 15, color: "#777", margin: "0 0 16px", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
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
                      value={item.tipo_recurso}
                      onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, tipo_recurso: e.target.value } : m))}
                      style={{ ...sInput, width: 140, flexShrink: 0, fontSize: 14, cursor: "pointer" }}
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
                    <input style={{ ...sInput, flex: 1, minWidth: 160, fontSize: 16 }}
                      placeholder="Título"
                      value={item.titulo_alternativo}
                      onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, titulo_alternativo: e.target.value } : m))}
                    />
                    <input style={{ ...sInput, flex: 1, minWidth: 160, fontSize: 16 }}
                      placeholder="Descripción"
                      value={item.descripcion_recurso}
                      onChange={(e) => setMultimediaItems((p) => p.map((m, i) => i === realIdx ? { ...m, descripcion_recurso: e.target.value } : m))}
                    />
                  </div>
                </div>
              );
            })}
            <button
              type="button" onClick={agregarMultimedia}
              style={{
                fontFamily: "inherit", fontSize: 15, fontWeight: 400, cursor: "pointer",
                border: "none", borderBottom: "1px solid #e8e8e8", background: "none",
                padding: "8px 0", color: "#aaa", letterSpacing: "-0.01em",
              }}
            >+ Agregar multimedia</button>
          </div>

          <button type="submit" disabled={saving} style={{
            fontFamily: "inherit", fontSize: 14, fontWeight: 600, letterSpacing: "0.06em",
            padding: "16px 40px", background: saving ? "#ccc" : "#863819", color: "#fff",
            border: "none", borderRadius: 8, cursor: saving ? "not-allowed" : "pointer",
            width: "100%", marginTop: 32,
          }}>
            {saving ? "Enviando..." : "Enviar solicitud de edición"}
          </button>
        </form>
      </div>
    </div>
  );
};
