import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import TagSelector from "../components/TagSelector";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
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
sInput[":focus"] = { borderBottomColor: "#863819" };

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

const sectionStyle = {
  marginBottom: 64,
};

const sectionHeaderStyle = {
  fontFamily: "Cinzel, serif",
  color: "#1a1a1a",
  margin: "0 0 8px",
  fontSize: 22,
  fontWeight: 500,
  letterSpacing: "-0.02em",
};

const sectionDividerStyle = {
  width: 40,
  height: 3,
  background: "#863819",
  marginBottom: 28,
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
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitHover, setSubmitHover] = useState(false);
  const [contactos, setContactos] = useState([]);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState([]);
  const geoTimeoutRef = useRef(null);
  const [latitud, setLatitud] = useState(null);
  const [longitud, setLongitud] = useState(null);
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const [extra, setExtra] = useState({});

  useEffect(() => {
    fetch("/api/localidades")
      .then((r) => r.json())
      .then((data) => setLocalidades(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v10",
      center: [-58.9861, -27.4511],
      zoom: 8,
      attributionControl: false,
    });
    const mk = new mapboxgl.Marker({ draggable: true, color: "#863819" })
      .setLngLat([-58.9861, -27.4511])
      .addTo(m);
    mk.on("dragend", () => {
      const ll = mk.getLngLat();
      setLatitud(ll.lat.toFixed(7));
      setLongitud(ll.lng.toFixed(7));
    });
    m.on("click", (e) => {
      mk.setLngLat(e.lngLat);
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
  }, [tipo]);

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
        const res = await fetch("/api/upload-public", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al subir");
        setImagen(data.url);
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "0 40px" }}>
        <div style={{ maxWidth: 600, textAlign: "center" }}>
          <div style={{ fontSize: 72, marginBottom: 20, color: "#1a1a1a", fontWeight: 300, lineHeight: 1 }}>✓</div>
          <h1 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", marginBottom: 16, fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Solicitud enviada</h1>
          <p style={{ color: "#777", fontSize: 20, lineHeight: 1.5, marginBottom: 40, maxWidth: 520, letterSpacing: "-0.01em", margin: "0 auto 40px" }}>
            Recibimos tu solicitud para el Sello Made in Chaco. Nuestro equipo la va a revisar y te
            vamos a contactar a la brevedad. Una vez aprobada, vas a poder gestionar el pago anual
            para activar tu membresía.
          </p>
          <button
            onClick={() => navigate("/")}
            style={{
              fontFamily: "inherit",
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: 0,
              color: "#1a1a1a",
            }}
          >
            Volver al inicio <span style={{ fontSize: "1.2em", display: "inline-block", color: "#1a1a1a" }}>↑</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "80px auto 0", padding: "80px 40px 120px" }}>
      {/* Header */}
      <div style={{ marginBottom: 64, textAlign: "center" }}>
        <h1 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: 0, fontSize: 48, fontWeight: 600, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Solicitar el Sello</h1>
        <p style={{ color: "#777", marginTop: 12, lineHeight: 1.5, fontSize: 20, fontWeight: 400, letterSpacing: "-0.01em" }}>
          Obtené el Sello Made in Chaco para tu comercio, hospedaje, producto o evento.
          Formá parte del mapa cultural y comercial de la provincia.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Tipo */}
        <div style={{ marginBottom: 48 }}>
          <label style={sLabel}>Tipo de entidad</label>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8 }}>
            {TIPOS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => { setTipo(t.value); setExtra({}); }}
                style={{
                  padding: "14px 28px",
                  borderRadius: 0,
                  border: "none",
                  borderBottom: tipo === t.value ? `2px solid ${t.color}` : "2px solid #e8e8e8",
                  background: "transparent",
                  color: tipo === t.value ? t.color : "#aaa",
                  fontWeight: tipo === t.value ? 600 : 400,
                  fontSize: 18,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                  transition: "0.2s",
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
            <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Información básica</h3>
              <div style={sectionDividerStyle} />
              <div style={{ marginBottom: 32 }}>
                <label style={sLabel}>Nombre *</label>
                <input
                  style={sInput}
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre de la entidad"
                />
              </div>
              <div style={{ marginBottom: 32 }}>
                <label style={sLabel}>Email *</label>
                <input
                  type="email"
                  style={sInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  onPaste={(e) => e.preventDefault()}
                />
              </div>
              <div style={{ marginBottom: 32 }}>
                <label style={sLabel}>Repetir Email *</label>
                <input
                  type="email"
                  style={sInput}
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="correo@ejemplo.com"
                  onPaste={(e) => e.preventDefault()}
                />
              </div>
              <div style={{ marginBottom: 32 }}>
                <label style={sLabel}>Descripción *</label>
                <textarea
                  style={sTextarea}
                  value={resumen}
                  onChange={(e) => setResumen(e.target.value)}
                  placeholder="Contanos brevemente de qué se trata..."
                />
              </div>
              <div style={{ marginBottom: 32 }}>
                <label style={sLabel}>Localidad *</label>
                <select
                  style={{ ...sInput, cursor: "pointer", color: localidadId ? "#1a1a1a" : "#aaa" }}
                  value={localidadId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setLocalidadId(id);
                    const loc = localidades.find((l) => l.id === parseInt(id));
                    if (loc?.latitud && loc?.longitud && mapRef.current && markerRef.current) {
                      mapRef.current.flyTo({ center: [parseFloat(loc.longitud), parseFloat(loc.latitud)], zoom: 10, speed: 1.2 });
                      markerRef.current.setLngLat([parseFloat(loc.longitud), parseFloat(loc.latitud)]);
                      setLatitud(loc.latitud);
                      setLongitud(loc.longitud);
                    }
                  }}
                >
                  <option value="">Seleccionar localidad...</option>
                  {localidades.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 0, position: "relative" }}>
                <label style={sLabel}>Dirección *</label>
                <input
                  style={sInput}
                  placeholder="Ej: San Martín 123, Resistencia..."
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
                        onMouseEnter={(e) => e.currentTarget.style.background = "#f5f2eb"}
                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                      >
                        {r.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={sLabel}>Ubicación en el mapa</label>
                <p style={{ fontSize: 13, color: "#999", margin: "0 0 8px" }}>Hacé clic o arrastrá el marcador para ubicar tu entidad en el mapa</p>
                <div style={{ position: "relative" }}>
                  <div ref={mapContainer} style={{ height: 250, borderRadius: 12, overflow: "hidden" }} />
                  <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                    <button type="button" onClick={() => mapRef.current?.zoomIn()} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#333" }}>+</button>
                    <button type="button" onClick={() => mapRef.current?.zoomOut()} style={{ width: 32, height: 32, borderRadius: 6, border: "1px solid #ccc", background: "white", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", color: "#333" }}>−</button>
                  </div>
                </div>
                {latitud && longitud && (
                  <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>
                    Lat: {latitud}, Lng: {longitud}
                  </div>
                )}
              </div>
            </div>

            {/* Campos específicos */}
            {CAMPOS_POR_TIPO[tipo] && (
              <div style={sectionStyle}>
                <h3 style={sectionHeaderStyle}>Datos de {TIPOS.find((t) => t.value === tipo)?.label}</h3>
                <div style={sectionDividerStyle} />
                {CAMPOS_POR_TIPO[tipo].map((campo) => (
                  <div key={campo.key} style={{ marginBottom: 32 }}>
                    <label style={sLabel}>{campo.label}</label>
                    {campo.type === "categoria" ? (
                      <>
                        <select
                          style={sInput}
                          value={extra[campo.key] || ""}
                          onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                        >
                          <option value="">Seleccionar categoría...</option>
                          {CATEGORIAS_HOSPEDAJE.map((r) => <option key={r} value={r}>{r}</option>)}
                          <option value="__otro__">Otros</option>
                        </select>
                        {extra[campo.key] === "__otro__" && (
                          <input
                            style={{ ...sInput, marginTop: 8 }}
                            placeholder="Escribí la categoría..."
                            value={extra[`${campo.key}_custom`] || ""}
                            onChange={(e) => handleExtraChange(`${campo.key}_custom`, e.target.value)}
                          />
                        )}
                      </>
                    ) : campo.type === "rubro" ? (
                      <>
                        <select
                          style={{ ...sInput, cursor: "pointer" }}
                          value={extra[campo.key] || ""}
                          onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                        >
                          <option value="">Seleccionar rubro...</option>
                          {RUBROS_COMERCIO.map((r) => <option key={r} value={r}>{r}</option>)}
                          <option value="__otro__">Otros</option>
                        </select>
                        {extra[campo.key] === "__otro__" && (
                          <input
                            style={{ ...sInput, marginTop: 8 }}
                            placeholder="Escribí el rubro..."
                            value={extra[`${campo.key}_custom`] || ""}
                            onChange={(e) => handleExtraChange(`${campo.key}_custom`, e.target.value)}
                          />
                        )}
                      </>
                    ) : campo.type === "dias" ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {DIAS_SEMANA.map((dia) => {
                          const dias = (extra[campo.key] || "").split(",").filter(Boolean);
                          const checked = dias.includes(dia);
                          return (
                            <label
                              key={dia}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "6px 12px",
                                borderRadius: "8px",
                                fontSize: "12px",
                                fontWeight: 600,
                                cursor: "pointer",
                                background: checked ? "#863819" : "white",
                                color: checked ? "#fff" : "#555",
                                border: checked ? "1px solid #863819" : "1px solid #ddd",
                                transition: "all 0.15s",
                              }}
                            >
                              <input
                                type="checkbox"
                                style={{ display: "none" }}
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
                    ) : campo.type === "select" ? (
                      <select
                        style={{ ...sInput, cursor: "pointer" }}
                        value={extra[campo.key] || ""}
                        onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                      >
                        <option value="">Seleccionar...</option>
                        {campo.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : campo.type === "servicios" ? (
                      <TagSelector
                        value={extra[campo.key] || ""}
                        onChange={(v) => handleExtraChange(campo.key, v)}
                        suggestions={SERVICIOS_SUGERIDOS}
                        placeholder="Escribí o seleccioná servicios..."
                      />
                    ) : campo.type === "select-multiple" ? (
                      <TagSelector
                        value={extra[campo.key] || ""}
                        onChange={(v) => handleExtraChange(campo.key, v)}
                        suggestions={campo.options || []}
                        placeholder={campo.placeholder || "Escribí o seleccioná..."}
                      />
                    ) : campo.type === "textarea" ? (
                      <textarea
                        style={sTextarea}
                        value={extra[campo.key] || ""}
                        onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                        placeholder={campo.placeholder || ""}
                      />
                    ) : (
                      <input
                        type={campo.type || "text"}
                        style={sInput}
                        value={extra[campo.key] || ""}
                        onChange={(e) => handleExtraChange(campo.key, e.target.value)}
                        placeholder={campo.placeholder || ""}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Contacto */}
            <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Contacto / Redes sociales</h3>
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
                      background: "none",
                      border: "none",
                      borderBottom: "1px solid #e8e8e8",
                      color: "#d32f2f",
                      cursor: "pointer",
                      fontSize: 18,
                      padding: "8px 0",
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={agregarContacto}
                style={{
                  fontFamily: "inherit",
                  fontSize: 15,
                  fontWeight: 400,
                  cursor: "pointer",
                  border: "none",
                  borderBottom: "1px solid #e8e8e8",
                  background: "none",
                  padding: "8px 0",
                  color: "#aaa",
                  letterSpacing: "-0.01em",
                  marginTop: 8,
                }}
              >
                + Agregar contacto
              </button>
            </div>

            {/* Foto */}
            <div style={sectionStyle}>
              <h3 style={sectionHeaderStyle}>Foto de portada *</h3>
              <div style={sectionDividerStyle} />
              <p style={{ fontSize: 15, color: "#777", margin: "0 0 16px", lineHeight: 1.5, letterSpacing: "-0.01em" }}>
                Esta foto se va a usar como imagen principal de tu entidad en el mapa y en su página de detalle.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 16, border: "1px dashed #ddd", padding: "20px 24px", background: "#fafaf8" }}>
                <label style={{
                  fontFamily: "inherit",
                  fontSize: 15,
                  letterSpacing: "-0.01em",
                  cursor: "pointer",
                  border: "none",
                  borderBottom: "1px solid #bbb",
                  background: "none",
                  padding: "4px 0",
                  color: "#555",
                }}>
                  {uploading ? "Subiendo..." : "Seleccionar archivo"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleUpload} disabled={uploading} />
                </label>
                {imagen && (
                  <img src={imagen} alt="" style={{ width: 72, height: 72, borderRadius: 4, objectFit: "cover", border: "1px solid #eee" }} />
                )}
              </div>
              <div style={{ fontSize: 13, color: "#aaa", marginTop: 6, letterSpacing: "-0.01em" }}>Formatos: JPG, PNG, WebP • Mínimo 1920×1080 px (16:9)</div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                fontSize: 14,
                color: "#d32f2f",
                fontWeight: 400,
                marginTop: 8,
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || uploading}
              onMouseEnter={() => setSubmitHover(true)}
              onMouseLeave={() => setSubmitHover(false)}
              style={{
                fontFamily: "inherit",
                fontSize: 18,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                cursor: submitting || uploading ? "default" : "pointer",
                border: "2px solid #1a1a1a",
                background: submitHover && !submitting && !uploading ? "#1a1a1a" : "transparent",
                padding: "12px 32px",
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                color: submitHover && !submitting && !uploading ? "white" : "#1a1a1a",
                marginTop: 56,
                transition: "all 0.25s ease",
              }}
            >
              {submitting ? "Enviando solicitud..." : uploading ? "Subiendo imagen..." : "Enviar solicitud"}
              {!submitting && !uploading && <span style={{ fontSize: "1.2em", display: "inline-block", color: "#1a1a1a", transform: submitHover ? "translateX(6px)" : "none", transition: "transform 0.2s ease" }}>→</span>}
            </button>
          </>
        )}
      </form>
    </div>
  );
};
