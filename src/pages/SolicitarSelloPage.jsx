import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import TagSelector from "../components/TagSelector";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/SolicitarSelloPage.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const TIPOS = [
  { value: "comercio", label: "Comercio", color: "#2196f3" },
  { value: "hospedaje", label: "Hospedaje", color: "#FF6F00" },
  { value: "productor", label: "Productor", color: "#00695C" },
  { value: "evento", label: "Evento", color: "#9c27b0" },
];

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
  "Velas y jabones artesanales", "Venta de combustibles", "Vidriería y cristalería",
];

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

const CATEGORIAS_HOSPEDAJE = [
  "Hotel", "Cabaña", "Hostel", "Posada", "Complejo turístico",
  "Camping", "Departamento temporario", "Casa de campo",
  "Albergue", "Lodge", "Eco-aldea", "Hostería", "Resort",
];

const TIPOS_PRODUCTO = [
  "Alfajores artesanales", "Alimentos y bebidas", "Artesanías en cuero",
  "Artesanías en madera", "Carnes y embutidos", "Cerveza artesanal",
  "Cestería y fibras naturales", "Conservas y dulces", "Decoración artesanal",
  "Hilados y tejidos", "Indumentaria textil", "Instrumentos musicales",
  "Joyería y bijouterie", "Lácteos artesanales", "Miel y derivados",
  "Muebles artesanales", "Orfebrería y platería", "Panificación artesanal",
  "Plantas y vivero", "Productos regionales", "Quesos artesanales",
  "Textiles y bordados",   "Velas y jabones artesanales", "Hierbas medicinales",
];

const ACTIVIDADES_SUGERIDAS = [
  "Feria", "Exposición", "Concierto", "Espectáculo", "Taller",
  "Feria gastronómica", "Feria artesanal", "Muestra de arte",
  "Feria de productores", "Charla / Conferencia", "Feria de emprendedores",
  "Encuentro cultural", "Festival", "Desfile", "Fiesta popular",
  "Ronda de negocios", "Feria de artesanos", "Exposición de arte",
  "Feria de la economía social", "Feria de diseño",
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

const CAMPOS_POR_TIPO = {
  comercio: [
    { key: "razon_social", label: "Razón social *", placeholder: "Nombre legal..." },
    { key: "cuit", label: "CUIT *", placeholder: "20-12345678-9" },
    { key: "rubro_especifico", label: "Rubro específico", type: "rubro" },
    { key: "horario_apertura", label: "Horario de apertura", type: "time" },
    { key: "horario_cierre", label: "Horario de cierre", type: "time" },
    { key: "dias_abierto", label: "Días abierto", type: "dias" },
    { key: "sitio_web", label: "Sitio web", placeholder: "https://..." },
    { key: "acepta_tarjetas", label: "Acepta tarjetas", type: "select", options: [{ value: "true", label: "Sí" }, { value: "false", label: "No" }] },
  ],
  hospedaje: [
    { key: "razon_social", label: "Razón social *", placeholder: "Nombre legal..." },
    { key: "cuit", label: "CUIT *", placeholder: "20-12345678-9" },
    { key: "biografia_larga", label: "Descripción", type: "textarea", placeholder: "Descripción del alojamiento..." },
    { key: "categoria_hospedaje", label: "Categoría", type: "categoria" },
    { key: "servicios", label: "Servicios", type: "servicios" },
    { key: "capacidad", label: "Capacidad", placeholder: "Ej: 4 personas, 10 huéspedes..." },
    { key: "sitio_web", label: "Sitio web", placeholder: "https://..." },
  ],
  productor: [
    { key: "razon_social", label: "Razón social *", placeholder: "Nombre legal..." },
    { key: "cuit", label: "CUIT *", placeholder: "20-12345678-9" },
    { key: "biografia_larga", label: "Descripción", type: "textarea", placeholder: "Historia del productor..." },
    { key: "tipo_producto", label: "Tipo de producto", type: "select-multiple", options: TIPOS_PRODUCTO },
    { key: "metodos_produccion", label: "Métodos de producción", placeholder: "Ej: Artesanal, tradicional, orgánico..." },
    { key: "certificaciones", label: "Certificaciones", placeholder: "Ej: Orgánico, Comercio Justo" },
    { key: "sitio_web", label: "Sitio web", placeholder: "https://..." },
  ],
  evento: [
    { key: "razon_social", label: "Razón social *", placeholder: "Nombre legal..." },
    { key: "cuit", label: "CUIT *", placeholder: "20-12345678-9" },
    { key: "fecha_evento", label: "Fecha del evento", type: "date" },
    { key: "duracion_dias", label: "Duración (días)", type: "number", placeholder: "Ej: 3" },
    { key: "actividades_principales", label: "Actividades principales", type: "select-multiple", options: ACTIVIDADES_SUGERIDAS },
    { key: "link_entradas", label: "Link de entradas", placeholder: "https://..." },
  ],
};

export const SolicitarSelloPage = () => {
  const navigate = useNavigate();
  const { perfil, getToken, isAuthenticated } = useAuthPublico();
  const [tipo, setTipo] = useState("");
  const [nombre, setNombre] = useState("");
  const [resumen, setResumen] = useState("");
  const [email, setEmail] = useState("");
  const [confirmEmail, setConfirmEmail] = useState("");

  useEffect(() => {
    if (perfil) {
      if (!email) { setEmail(perfil.email || ""); setConfirmEmail(perfil.email || ""); }
    }
  }, [perfil]);
  const [localidadId, setLocalidadId] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidades, setLocalidades] = useState([]);
  const [imagen, setImagen] = useState("");
  const [imagenPublicId, setImagenPublicId] = useState("");
  const [icono, setIcono] = useState("");
  const [iconoPublicId, setIconoPublicId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [subiendoIcono, setSubiendoIcono] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [contactos, setContactos] = useState([]);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState([]);
  const geoTimeoutRef = useRef(null);
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const grayRef = useRef(1);

  const [extra, setExtra] = useState({});

  useEffect(() => {
    fetch("/api/localidades")
      .then((r) => r.json())
      .then((data) => setLocalidades(data))
      .catch(() => {});
  }, []);

  const crearMarcador = (tipo, iconoUrl, lngLat, map) => {
    const el = document.createElement("div");
    el.style.width = "28px";
    el.style.height = "28px";
    el.style.cursor = "pointer";

    if (tipo && TIPOS.find((t) => t.value === tipo)) {
      const img = document.createElement("img");
      img.src = iconoUrl || `/icons/${tipo}.png`;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.style.filter = "drop-shadow(0 1px 4px rgba(0,0,0,0.3))";
      el.appendChild(img);
    } else {
      const dot = document.createElement("div");
      dot.style.width = "14px";
      dot.style.height = "14px";
      dot.style.borderRadius = "50%";
      dot.style.background = "#863819";
      dot.style.border = "2px solid #fff";
      dot.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
      el.appendChild(dot);
    }

    const mk = new mapboxgl.Marker({ element: el, draggable: true })
      .setLngLat(lngLat || [-60.44, -26.05])
      .addTo(map);

    mk.on("dragend", () => {
      const ll = mk.getLngLat();
      setLatitud(ll.lat.toFixed(7));
      setLongitud(ll.lng.toFixed(7));
    });

    return mk;
  };

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [-60.44, -26.05],
      zoom: 6.5,
      attributionControl: false,
    });
    const setGray = () => {
      const canvas = m.getCanvas();
      if (canvas) canvas.style.filter = "grayscale(1)";
    };
    setGray();
    m.once("idle", setGray);
    const mk = crearMarcador(tipo, icono, null, m);
    m.on("click", (e) => {
      if (markerRef.current) {
        markerRef.current.setLngLat(e.lngLat);
      }
      setLatitud(e.lngLat.lat.toFixed(7));
      setLongitud(e.lngLat.lng.toFixed(7));
    });
    mapRef.current = m;
    markerRef.current = mk;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const mk = markerRef.current;
    if (!mk) return;
    const el = mk.getElement();
    if (!el) return;
    el.innerHTML = "";
    if (tipo && TIPOS.find((t) => t.value === tipo)) {
      el.style.width = "28px";
      el.style.height = "28px";
      const img = document.createElement("img");
      img.src = icono || `/icons/${tipo}.png`;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.style.filter = "drop-shadow(0 1px 4px rgba(0,0,0,0.3))";
      el.appendChild(img);
    } else {
      el.style.width = "";
      el.style.height = "";
      const dot = document.createElement("div");
      dot.style.width = "14px";
      dot.style.height = "14px";
      dot.style.borderRadius = "50%";
      dot.style.background = "#863819";
      dot.style.border = "2px solid #fff";
      dot.style.boxShadow = "0 1px 4px rgba(0,0,0,0.3)";
      el.appendChild(dot);
    }
  }, [tipo, icono]);

  useEffect(() => {
    if (!localidadId || !mapRef.current) return;
    const startGray = grayRef.current;
    const endGray = 0;
    const startTime = performance.now();
    const DURATION = 3000;
    const animate = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DURATION, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      const gray = startGray + (endGray - startGray) * ease;
      const canvas = mapRef.current?.getCanvas();
      if (canvas) canvas.style.filter = `grayscale(${gray})`;
      if (t < 1) requestAnimationFrame(animate);
      else grayRef.current = endGray;
    };
    requestAnimationFrame(animate);
  }, [localidadId]);

  const handleExtraChange = (key, val) => {
    setExtra((prev) => ({ ...prev, [key]: val }));
  };

  const agregarContacto = () => {
    setContactos((prev) => [...prev, { type: "whatsapp", value: "" }]);
  };

  const actualizarContacto = (i, field, val) => {
    setContactos((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: val } : item)),
    );
  };

  const eliminarContacto = (i) => {
    setContactos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const formatos = ["image/jpeg", "image/png", "image/webp"];
    if (!formatos.includes(file.type)) {
      setError("Formato no soportado. Usá: JPG, PNG o WebP.");
      e.target.value = "";
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      if (img.width < 1920 || img.height < 1080) {
        setError(`Resolución muy baja: ${img.width}×${img.height}. Mínimo: 1920×1080 px (16:9).`);
        e.target.value = "";
        return;
      }
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("archivo", file);
        if (imagenPublicId) formData.append("old_public_id", imagenPublicId);
        const res = await fetch("/api/upload-public", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir");
        setImagen(data.url);
        setImagenPublicId(data.public_id);
      } catch (err) {
        setError(err.message);
      } finally {
        setUploading(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("No se pudo leer la imagen.");
      e.target.value = "";
    };
    img.src = url;
  };

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.type !== "image/png") {
      setError("El icono debe ser una imagen PNG.");
      e.target.value = "";
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      if (img.width !== 24 || img.height !== 24) {
        setError(`El icono debe ser de 24×24 px. La imagen subida es de ${img.width}×${img.height} px.`);
        e.target.value = "";
        return;
      }
      setSubiendoIcono(true);
      try {
        const formData = new FormData();
        formData.append("archivo", file);
        if (iconoPublicId) formData.append("old_public_id", iconoPublicId);
        const res = await fetch("/api/upload-public", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir");
        setIcono(data.url);
        setIconoPublicId(data.public_id);
      } catch (err) {
        setError(err.message);
      } finally {
        setSubiendoIcono(false);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setError("No se pudo leer la imagen.");
      e.target.value = "";
    };
    img.src = url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!tipo || !nombre.trim()) {
      setError("Completá el tipo y nombre de la entidad");
      return;
    }
    if (!email.trim()) {
      setError("El email es obligatorio");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Ingresá un email válido");
      return;
    }
    if (email.trim() !== confirmEmail.trim()) {
      setError("Los emails no coinciden");
      return;
    }
    if (!resumen.trim()) {
      setError("Completá la descripción");
      return;
    }
    if (!localidadId) {
      setError("Seleccioná una localidad");
      return;
    }
    if (!direccion.trim()) {
      setError("Completá la dirección");
      return;
    }
    if (!imagen) {
      setError("Subí una foto de portada");
      return;
    }
    if (["comercio", "hospedaje", "productor", "evento"].includes(tipo)) {
      if (!extra.razon_social?.trim()) {
        setError("Completá la razón social");
        return;
      }
      if (!extra.cuit?.trim()) {
        setError("Completá el CUIT");
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        tipo,
        nombre: nombre.trim(),
        resumen,
        localidad_id: localidadId || null,
        latitud: latitud || null,
        longitud: longitud || null,
        direccion_escrita: direccion,
        imagen,
        icono: icono || null,
        email: email.trim(),
        ...Object.fromEntries(
          Object.entries(extra).map(([k, v]) => [
            k.endsWith("_custom") ? k.replace("_custom", "") : k,
            v,
          ])
        ),
        redes_sociales: JSON.stringify(contactos),
      };
      if (payload.rubro_especifico === "__otro__") {
        payload.rubro_especifico = payload.rubro_especifico_custom || "Otros";
      }
      delete payload.rubro_especifico_custom;
      if (payload.categoria_hospedaje === "__otro__") {
        payload.categoria_hospedaje = payload.categoria_hospedaje_custom || "Otros";
      }
      delete payload.categoria_hospedaje_custom;

      const headers = { "Content-Type": "application/json" };
      const token = getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/solicitar-sello", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar solicitud");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="solicitar-success">
        <div className="solicitar-success-inner">
          <div className="solicitar-success-icon">✓</div>
          <h1>Solicitud enviada</h1>
          <p>
            Recibimos tu solicitud para el Sello Made in Chaco. Nuestro equipo la va a revisar y te
            vamos a contactar a la brevedad. Una vez aprobada, vas a poder gestionar el pago anual
            para activar tu membresía.
          </p>
          <button className="solicitar-btn-back" onClick={() => navigate("/")}>
            Volver al inicio <span className="arrow-up">↑</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="solicitar-page">
      <div className={`solicitar-form-side${!tipo ? " solicitar-form-side--initial" : ""}`}>
        <div className="solicitar-header">
          <h1>Solicitar el Sello</h1>
          <p>
            Obtené el Sello Made in Chaco para tu comercio, hospedaje, producto o evento.
            Formá parte del mapa cultural y comercial de la provincia.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tipo */}
          <div style={{ marginBottom: 48 }}>
            <label className="solicitar-label">Tipo de entidad</label>
            <div className="solicitar-tipo-group">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => { setTipo(t.value); setExtra({}); }}
                  className={`solicitar-tipo-btn ${tipo === t.value ? "active" : ""}`}
                  style={{
                    borderBottomColor: tipo === t.value ? t.color : undefined,
                    color: tipo === t.value ? t.color : undefined,
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tipo && (
            <>
              {/* Básicos */}
              <div className="solicitar-section">
                <div className="solicitar-section-title">Información básica</div>
                <div className="solicitar-section-divider" />

                <div className="solicitar-floating-group">
                  <input id="sello-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder=" " />
                  <label htmlFor="sello-nombre">Nombre de la entidad *</label>
                </div>

                <div className="solicitar-floating-group">
                  <input id="sello-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder=" " onPaste={(e) => e.preventDefault()} />
                  <label htmlFor="sello-email">Email *</label>
                </div>

                <div className="solicitar-floating-group">
                  <input id="sello-confirm-email" type="email" value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder=" " onPaste={(e) => e.preventDefault()} />
                  <label htmlFor="sello-confirm-email">Repetir Email *</label>
                </div>

                <div className="solicitar-floating-group">
                  <textarea id="sello-desc" value={resumen} onChange={(e) => setResumen(e.target.value)} placeholder=" " />
                  <label htmlFor="sello-desc">Descripción *</label>
                </div>

                <div style={{ marginBottom: 32 }}>
                  <label className="solicitar-label">Localidad *</label>
                  <select
                    className="solicitar-select"
                    value={localidadId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setLocalidadId(id);
                      const loc = localidades.find((l) => l.id === parseInt(id));
                      if (loc?.latitud && loc?.longitud && mapRef.current && markerRef.current) {
                        mapRef.current.flyTo({ center: [parseFloat(loc.longitud), parseFloat(loc.latitud)], zoom: 14, speed: 1.2 });
                        markerRef.current.setLngLat([parseFloat(loc.longitud), parseFloat(loc.latitud)]);
                        setLatitud(loc.latitud);
                        setLongitud(loc.longitud);
                      }
                    }}
                    style={{ color: localidadId ? undefined : "#aaa" }}
                  >
                    <option value="">Seleccionar localidad...</option>
                    {localidades.map((l) => (
                      <option key={l.id} value={l.id}>{l.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="solicitar-floating-group" style={{ position: "relative" }}>
                  <input
                    id="sello-direccion"
                    value={geoQuery}
                    onChange={(e) => {
                      setGeoQuery(e.target.value);
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
                  <label htmlFor="sello-direccion">Dirección *</label>
                  {geoResults.length > 0 && (
                    <div className="solicitar-geo-results">
                      {geoResults.map((r, i) => (
                        <div
                          key={i}
                          className="solicitar-geo-item"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            clearTimeout(geoTimeoutRef.current);
                            setDireccion(r.display_name);
                            setGeoQuery(r.display_name);
                            setGeoResults([]);
                            const lat = parseFloat(r.lat);
                            const lon = parseFloat(r.lon);
                            setLatitud(lat.toFixed(7));
                            setLongitud(lon.toFixed(7));
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
              </div>

              {/* Campos específicos */}
              {CAMPOS_POR_TIPO[tipo] && (
                <div className="solicitar-section">
                  <div className="solicitar-section-title">Datos de {TIPOS.find((t) => t.value === tipo)?.label}</div>
                  <div className="solicitar-section-divider" />
                  {CAMPOS_POR_TIPO[tipo].map((campo) => (
                    <div key={campo.key} style={{ marginBottom: 32 }}>
                      {campo.type === "rubro" ? (
                        <>
                          <label className="solicitar-label">{campo.label}</label>
                          <select
                            className="solicitar-select"
                            value={extra[campo.key] || ""}
                            onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                          >
                            <option value="">Seleccionar rubro...</option>
                            {RUBROS_COMERCIO.map((r) => <option key={r} value={r}>{r}</option>)}
                            <option value="__otro__">Otros</option>
                          </select>
                          {extra[campo.key] === "__otro__" && (
                            <div className="solicitar-floating-group" style={{ marginTop: 8 }}>
                              <input
                                id={`sello-${campo.key}-custom`}
                                value={extra[`${campo.key}_custom`] || ""}
                                onChange={(e) => handleExtraChange(`${campo.key}_custom`, e.target.value)}
                                placeholder=" "
                              />
                              <label htmlFor={`sello-${campo.key}-custom`}>Personalizado</label>
                            </div>
                          )}
                        </>
                      ) : campo.type === "categoria" ? (
                        <>
                          <label className="solicitar-label">{campo.label}</label>
                          <select
                            className="solicitar-select"
                            value={extra[campo.key] || ""}
                            onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                          >
                            <option value="">Seleccionar categoría...</option>
                            {CATEGORIAS_HOSPEDAJE.map((r) => <option key={r} value={r}>{r}</option>)}
                            <option value="__otro__">Otros</option>
                          </select>
                          {extra[campo.key] === "__otro__" && (
                            <div className="solicitar-floating-group" style={{ marginTop: 8 }}>
                              <input
                                id={`sello-${campo.key}-custom`}
                                value={extra[`${campo.key}_custom`] || ""}
                                onChange={(e) => handleExtraChange(`${campo.key}_custom`, e.target.value)}
                                placeholder=" "
                              />
                              <label htmlFor={`sello-${campo.key}-custom`}>Personalizado</label>
                            </div>
                          )}
                        </>
                      ) : campo.type === "dias" ? (
                        <>
                          <label className="solicitar-label">{campo.label}</label>
                          <div className="solicitar-dias">
                            {DIAS_SEMANA.map((dia) => {
                              const dias = (extra[campo.key] || "").split(",").filter(Boolean);
                              const checked = dias.includes(dia);
                              return (
                                <label
                                  key={dia}
                                  className={`solicitar-dia-label ${checked ? "checked" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      const nuevos = checked
                                        ? dias.filter((d) => d !== dia)
                                        : [...dias, dia];
                                      handleExtraChange(campo.key, nuevos.join(","));
                                    }}
                                  />
                                  {dia.slice(0, 3)}
                                </label>
                              );
                            })}
                          </div>
                        </>
                      ) : campo.type === "select" ? (
                        <>
                          <label className="solicitar-label">{campo.label}</label>
                          <select
                            className="solicitar-select"
                            value={extra[campo.key] || ""}
                            onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                          >
                            <option value="">Seleccionar...</option>
                            {campo.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        </>
                      ) : campo.type === "servicios" ? (
                        <>
                          <label className="solicitar-label">{campo.label}</label>
                          <TagSelector
                            value={extra[campo.key] || ""}
                            onChange={(v) => handleExtraChange(campo.key, v)}
                            suggestions={SERVICIOS_SUGERIDOS}
                            placeholder="Escribí o seleccioná servicios..."
                          />
                        </>
                      ) : campo.type === "select-multiple" ? (
                        <>
                          <label className="solicitar-label">{campo.label}</label>
                          <TagSelector
                            value={extra[campo.key] || ""}
                            onChange={(v) => handleExtraChange(campo.key, v)}
                            suggestions={campo.options || []}
                            placeholder={campo.placeholder || "Escribí o seleccioná..."}
                          />
                        </>
                      ) : campo.type === "textarea" ? (
                        <div className="solicitar-floating-group">
                          <textarea
                            id={`sello-${campo.key}`}
                            value={extra[campo.key] || ""}
                            onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                            placeholder=" "
                          />
                          <label htmlFor={`sello-${campo.key}`}>{campo.label}</label>
                        </div>
                      ) : (
                        <div className="solicitar-floating-group">
                          <input
                            id={`sello-${campo.key}`}
                            type={campo.type || "text"}
                            value={extra[campo.key] || ""}
                            onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                            placeholder=" "
                          />
                          <label htmlFor={`sello-${campo.key}`}>{campo.label}</label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Contacto */}
              <div className="solicitar-section">
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

              {/* Foto */}
              <div className="solicitar-section">
                <div className="solicitar-section-title">Foto de portada *</div>
                <div className="solicitar-section-divider" />
                <p className="solicitar-hint">
                  Esta foto se va a usar como imagen principal de tu entidad en el mapa y en su página de detalle.
                </p>
                <div className="solicitar-upload-area">
                  <label className="solicitar-upload-btn">
                    {uploading ? "Subiendo..." : "Seleccionar archivo"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleUpload} disabled={uploading} />
                  </label>
                  {imagen && <img src={imagen} alt="" className="solicitar-upload-preview" />}
                </div>
                <div className="solicitar-small">Formatos: JPG, PNG, WebP • Mínimo 1920×1080 px (16:9)</div>
              </div>

              {/* Icono */}
              <div className="solicitar-section">
                <div className="solicitar-section-title">Icono personalizado (opcional)</div>
                <div className="solicitar-section-divider" />
                <p className="solicitar-hint">
                  Subí un icono PNG de 24×24 px para tu entidad. Si no subís ninguno, se usará el icono predeterminado según el tipo.
                </p>
                <div className="solicitar-upload-area">
                  <label className="solicitar-upload-btn">
                    {subiendoIcono ? "Subiendo..." : "Seleccionar archivo"}
                    <input type="file" accept="image/png" hidden onChange={handleIconUpload} disabled={subiendoIcono} />
                  </label>
                  {icono && (
                    <>
                      <img src={icono} alt="" className="solicitar-upload-preview-sm" />
                      <button type="button" onClick={() => { if (iconoPublicId) fetch("/api/delete-public-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ public_id: iconoPublicId }) }).catch(() => {}); setIcono(""); setIconoPublicId(""); }} style={{ background: "none", border: "none", borderBottom: "1px solid #e8e8e8", color: "#d32f2f", cursor: "pointer", fontSize: 16, padding: "4px 0", lineHeight: 1 }}>✕</button>
                    </>
                  )}
                  {!icono && tipo && (
                    <img src={`/icons/${tipo}.png`} alt="" className="solicitar-upload-preview-sm dim" />
                  )}
                </div>
                <div className="solicitar-small">Solo PNG • 24×24 px</div>
              </div>

              {/* Error */}
              {error && <div className="solicitar-error">{error}</div>}

              {/* Submit */}
              <div className="solicitar-submit-row">
                <button
                  type="submit"
                  className="solicitar-btn-submit"
                  disabled={submitting || uploading || subiendoIcono}
                >
                  {submitting ? "Enviando solicitud..." : uploading ? "Subiendo imagen..." : subiendoIcono ? "Subiendo icono..." : "Enviar solicitud"}
                  {!submitting && !uploading && !subiendoIcono && <span className="arrow">→</span>}
                </button>
              </div>
            </>
          )}
        </form>
      </div>

      <div className="solicitar-map-side">
        <div ref={mapContainer} className="solicitar-map-container" />
        <div className="solicitar-map-zoom">
          <button type="button" onClick={() => mapRef.current?.zoomIn()}>+</button>
          <button type="button" onClick={() => mapRef.current?.zoomOut()}>−</button>
        </div>
        {latitud && longitud && (
          <div className="solicitar-map-coords">Lat: {latitud}, Lng: {longitud}</div>
        )}
      </div>
    </div>
  );
};
