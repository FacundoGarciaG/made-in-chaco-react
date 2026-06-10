import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/AdminPanel.css";
import { useAuth } from "../context/AuthContext";
import { validarArchivo, validarFormato, INFO_FORMATOS } from "../utils/mediaValidation";
import { subirArchivo, subirImagen } from "./uploadService";
import TagSelector from "../components/TagSelector";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const getToken = () => localStorage.getItem("made_in_chaco_token");
const authHeaders = (extra = {}) => {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
};
const authFetch = async (url, opts = {}) => {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    localStorage.removeItem("made_in_chaco_token");
    localStorage.removeItem("made_in_chaco_user");
    window.location.href = "/admin/login";
    throw new Error("Sesión expirada");
  }
  return res;
};

const colorMapAdmin = {
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

const DetailField = ({ field, fieldVal, onFieldChange, label, type = "text", options, placeholder }) => {
  const val = fieldVal ?? "";
  const onChange = (v) => onFieldChange(field, v);
  return (
    <div style={{ marginBottom: "10px" }}>
      <label
        style={{
          fontSize: "11px",
          fontWeight: 700,
          color: "#863819",
          display: "block",
          marginBottom: "4px",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      {type === "textarea" ? (
        <textarea
          style={styles.input}
          value={val}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || ""}
        />
      ) : type === "select" ? (
        <select
          style={styles.input}
          value={val}
          onChange={(e) => onChange(e.target.value)}
        >
          {options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : type === "number" ? (
        <input
          style={styles.input}
          type="number"
          value={val}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || ""}
        />
      ) : type === "date" ? (
        <input
          style={styles.input}
          type="date"
          value={val}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          style={styles.input}
          value={val}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || ""}
        />
      )}
    </div>
  );
};

const SOCIAL_PLATFORMS = [
  { value: "instagram", label: "Instagram", url: (v) => `https://www.instagram.com/${v}/` },
  { value: "youtube", label: "YouTube", url: (v) => v.startsWith("http") ? v : `https://www.youtube.com/${v.startsWith("@") ? v : "@" + v}` },
  { value: "facebook", label: "Facebook", url: (v) => `https://www.facebook.com/${v}/` },
  { value: "tiktok", label: "TikTok", url: (v) => `https://www.tiktok.com/@${v}` },
  { value: "twitter", label: "X / Twitter", url: (v) => `https://x.com/${v}` },
  { value: "whatsapp", label: "WhatsApp", url: (v) => `https://wa.me/${v.replace(/[^0-9]/g, "")}` },
  { value: "telefono", label: "Teléfono", url: (v) => v },
  { value: "email", label: "Email", url: (v) => `mailto:${v}` },
  { value: "otro", label: "Otro", url: (v) => v },
];

const COMUNIDADES_ETNICAS = [
  "", "Qom", "Wichí", "Moqoit", "Pilagá", "General",
];

const parseSocialList = (v) => {
  if (!v) return [];
  try { return JSON.parse(v); } catch { return v ? [{ type: "instagram", value: v }] : []; }
};

const GastronomiaSelector = ({ value, onChange, allEntities }) => {
  const [inputVal, setInputVal] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const comercios = useMemo(
    () => allEntities.filter((e) => {
      if (e.tipo !== "comercio") return false;
      const activo = e.estado_pago === "al_dia";
      const noVencido = !e.fecha_fin_suscripcion || new Date(e.fecha_fin_suscripcion) >= new Date(new Date().toDateString());
      return activo && noVencido;
    }),
    [allEntities],
  );

  const selectedItems = useMemo(
    () => value.split(",").map((s) => s.trim()).filter(Boolean),
    [value],
  );

  const isSelected = (name) => selectedItems.some((s) => s.toLowerCase() === name.toLowerCase());

  const filtered = useMemo(
    () => comercios.filter(
      (c) =>
        !isSelected(c.nombre) &&
        c.nombre.toLowerCase().includes(inputVal.toLowerCase()),
    ),
    [comercios, inputVal, selectedItems],
  );

  const addItem = (item) => {
    const items = [...selectedItems, item];
    onChange(items.join(", "));
    setInputVal("");
    setShowDropdown(false);
  };

  const removeItem = (item) => {
    const items = selectedItems.filter(
      (s) => s.toLowerCase() !== item.toLowerCase(),
    );
    onChange(items.join(", "));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && inputVal.trim()) {
      e.preventDefault();
      const match = comercios.find(
        (c) => c.nombre.toLowerCase() === inputVal.trim().toLowerCase(),
      );
      if (match && !isSelected(match.nombre)) {
        addItem(match.nombre);
      } else if (!isSelected(inputVal.trim())) {
        addItem(inputVal.trim());
      } else {
        setInputVal("");
      }
    }
    if (e.key === "Backspace" && !inputVal && selectedItems.length > 0) {
      removeItem(selectedItems[selectedItems.length - 1]);
    }
  };

  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div style={{ position: "relative" }} ref={dropdownRef}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "8px 10px",
          border: "1px solid #eee",
          borderRadius: "12px",
          background: "white",
          cursor: "text",
          minHeight: "44px",
          alignItems: "center",
          boxSizing: "border-box",
          marginBottom: "12px",
        }}
        onClick={() => setShowDropdown(true)}
      >
        {selectedItems.map((item) => (
          <span
            key={item}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "#863819",
              color: "white",
              fontSize: "12px",
              fontWeight: 600,
              padding: "4px 10px",
              borderRadius: "20px",
              whiteSpace: "nowrap",
            }}
          >
            {item}
            <span
              style={{ cursor: "pointer", fontSize: "14px", lineHeight: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                removeItem(item);
              }}
            >
              ×
            </span>
          </span>
        ))}
        <input
          style={{
            border: "none",
            outline: "none",
            flex: 1,
            minWidth: "100px",
            fontSize: "14px",
            padding: "4px 0",
            background: "transparent",
            color: "#1c1c18",
          }}
          placeholder={selectedItems.length === 0 ? "Buscá o escribí un comercio..." : ""}
          value={inputVal}
          onChange={(e) => {
            setInputVal(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
        />
      </div>
      {showDropdown && (filtered.length > 0 || (inputVal.trim() && !isSelected(inputVal.trim()))) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #eee",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            zIndex: 100,
            maxHeight: "200px",
            overflowY: "auto",
          }}
        >
          {filtered.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#1c1c18",
                borderBottom: "1px solid #f5f2eb",
                transition: "background 0.1s",
              }}
              onClick={() => addItem(c.nombre)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f2eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {c.nombre}
            </div>
          ))}
          {inputVal.trim() && !isSelected(inputVal.trim()) && !filtered.some((c) => c.nombre.toLowerCase() === inputVal.trim().toLowerCase()) && (
            <div
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#1c1c18",
                borderBottom: "1px solid #f5f2eb",
                fontStyle: "italic",
                transition: "background 0.1s",
              }}
              onClick={() => addItem(inputVal.trim())}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f2eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Agregar "{inputVal.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const QUE_INCLUYE_EXPERIENCIA = [
  "Guía especializado", "Equipo de seguridad", "Refrigerio", "Almuerzo",
  "Traslado ida y vuelta", "Entrada", "Seguro", "Hidratación",
  "Fotografía profesional", "Material didáctico", "Certificado",
  "Alquiler de equipo", "Degustación", "Clase práctica",
];

const TIPOS_EXPERIENCIA = [
  "Avistaje de aves", "Cabalgata", "Caminata / Trekking", "Cata de alimentos",
  "Excursión en lancha", "Festival", "Feria artesanal", "Gastronomía",
  "Observación de fauna", "Paseo en bicicleta", "Pesca deportiva",
  "Ruta gastronómica", "Taller artesanal", "Taller de cocina",
  "Tour fotográfico", "Visita a comunidades", "Visita guiada",
  "Yoga y bienestar", "Ecoturismo", "Astroturismo",
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

const SERVICIOS_SUGERIDOS = [
  "WiFi gratis", "Desayuno incluido", "Aire acondicionado", "Calefacción",
  "Estacionamiento", "Pileta", "Jardín", "Parrilla", "Cocina compartida",
  "Habitación privada", "Baño privado", "Ropa de cama", "Toallas",
  "TV", "Heladera", "Microondas", "Ventilador", "Agua caliente",
  "Mascotas bienvenidas", "Acceso discapacitados", "Transporte al aeropuerto",
  "Excursiones", "Bicicletas", "Lavandería", "Room service",
  "Restaurante", "Bar", "Salón de eventos", "Seguridad 24h",
];

const ACTIVIDADES_SUGERIDAS = [
  "Feria", "Exposición", "Concierto", "Espectáculo", "Taller",
  "Feria gastronómica", "Feria artesanal", "Muestra de arte",
  "Feria de productores", "Charla / Conferencia", "Feria de emprendedores",
  "Encuentro cultural", "Festival", "Desfile", "Fiesta popular",
  "Ronda de negocios", "Feria de artesanos", "Exposición de arte",
  "Feria de la economía social", "Feria de diseño",
];

const TIPOS_RELATO = [
  "Leyenda", "Historia", "Memoria", "Testimonio",
  "Tradición oral", "Mitología", "Anécdota", "Crónica",
  "Poesía", "Narrativa", "Relato de viaje", "Saberes ancestrales",
];


function SocialMediaManager({ value, onChange, label = "Redes sociales y contacto" }) {
  const list = parseSocialList(value);
  const add = () => {
    onChange(JSON.stringify([...list, { type: "instagram", value: "" }]));
  };
  const update = (i, field, val) => {
    const next = list.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
    onChange(JSON.stringify(next));
  };
  const remove = (i) => {
    onChange(JSON.stringify(list.filter((_, idx) => idx !== i)));
  };
  const whatsappError = (v) => {
    const digits = v.replace(/[^0-9]/g, "");
    return digits.length > 0 && (digits.length < 10 || digits.length > 15) ? "Número inválido (debe tener 10-15 dígitos)" : "";
  };
  const emailError = (v) => {
    if (!v) return "";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? "" : "Email inválido";
  };
  const phoneError = (v) => {
    if (!v) return "";
    const digits = v.replace(/[^0-9]/g, "");
    return digits.length > 0 && digits.length < 7 ? "Teléfono muy corto" : "";
  };
  const placeholder = (type) => {
    if (type === "whatsapp") return "Código país + número, ej: 5491123456789";
    if (type === "telefono") return "Ej: 3624123456";
    if (type === "email") return "ejemplo@correo.com";
    return "usuario / URL";
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 }}>{label}</label>
      {list.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", gap: 6, marginBottom: 2, alignItems: "center" }}>
            <select value={item.type} onChange={(e) => update(i, "type", e.target.value)}
              style={{ flex: "0 0 130px", padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13, color: "#1c1c18", background: "white" }}>
              {SOCIAL_PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input value={item.value} onChange={(e) => update(i, "value", e.target.value)} placeholder={placeholder(item.type)}
              style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13, color: "#1c1c18", background: "white" }} />
            <button onClick={() => remove(i)}
              style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 16, padding: "4px 6px" }}>
              ✕
            </button>
          </div>
          {item.type === "whatsapp" && item.value && <div style={{ fontSize: 11, color: whatsappError(item.value) ? "#c62828" : "#2e7d32", margin: "0 0 4px 136px" }}>{whatsappError(item.value) || "Número válido"}</div>}
          {item.type === "email" && item.value && emailError(item.value) && <div style={{ fontSize: 11, color: "#c62828", margin: "0 0 4px 136px" }}>{emailError(item.value)}</div>}
          {item.type === "telefono" && item.value && phoneError(item.value) && <div style={{ fontSize: 11, color: "#c62828", margin: "0 0 4px 136px" }}>{phoneError(item.value)}</div>}
        </div>
      ))}
      <button onClick={add}
        style={{ padding: "6px 14px", background: "#f5f2eb", border: "1px dashed #ccc", borderRadius: 6, cursor: "pointer", color: "#555", fontSize: 13 }}>
        + Agregar {label.toLowerCase()}
      </button>
    </div>
  );
}

export const AdminPanel = () => {
  const { user, logout } = useAuth();
  const [view, setView] = useState("entidades");
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
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [approveModal, setApproveModal] = useState(null); // { id, tipo, nombre }
  const [approveFechas, setApproveFechas] = useState({ inicio: "", fin: "", estado_pago: "al_dia" });
  const [solicitudDetalle, setSolicitudDetalle] = useState(null);
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

  const [popup, setPopup] = useState(null);
  const pendingConfirm = useRef(null);
  const fotoPerfilRef = useRef(null);

  const showPopup = (msg, type = "success", duration = 3000) => {
    setPopup({ message: msg, type, isConfirm: false });
    setTimeout(() => setPopup(null), duration);
  };

  const showConfirm = (msg, confirmLabel = "ELIMINAR") => {
    return new Promise((resolve) => {
      pendingConfirm.current = resolve;
      setPopup({ message: msg, confirmLabel, isConfirm: true });
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
      if (res.ok) setSolicitudes(await res.json());
    } catch {} finally {
      setSolicitudesLoading(false);
    }
  };

  useEffect(() => {
    cargarLocalidades();
    cargarEntidades();
    cargarRecorridos();
  }, []);

  useEffect(() => {
    if (view === "solicitudes") cargarSolicitudes();
  }, [view]);

  const allEntitiesForConexiones = useMemo(
    () => allEntities.filter((e) => e.id !== editingEntityId),
    [allEntities, editingEntityId],
  );

  // --- MULTIMEDIA ---
  const handleMultimediaChange = (index, field, value) => {
    if (index === 0 && field === "tipo_recurso") return;
    const updated = [...multimediaItems];
    updated[index] = { ...updated[index], [field]: value };
    setMultimediaItems(updated);
  };

  const addMultimediaItem = () => {
    setMultimediaItems([
      ...multimediaItems,
      {
        url_recurso: "",
        titulo_alternativo: "",
        descripcion_recurso: "",
        tipo_recurso: "foto",
        es_principal: false,
        thumbnail_url: "",
        public_id: "",
        entidades_etiquetadas: [],
      },
    ]);
  };

  const removeMultimediaItem = (index) => {
    if (multimediaItems.length <= 1 || multimediaItems[index].es_principal)
      return;
    setMultimediaItems(multimediaItems.filter((_, i) => i !== index));
  };

  const handleFileSelect = async (index, file, thumbnailFile = null) => {
    const item = multimediaItems[index];
    const tipo = item.tipo_recurso;

    const resultado = await validarArchivo(tipo, file);
    if (!resultado.valido) {
      setMultimediaError(resultado.error);
      return;
    }

    setMultimediaError("");
    setUploadingIndex(index);

    try {
      const data = await subirArchivo(file, tipo, thumbnailFile);
      const updated = [...multimediaItems];
      updated[index] = {
        ...updated[index],
        url_recurso: data.url,
        public_id: data.public_id || "",
        thumbnail_url: data.thumbnail_url || updated[index].thumbnail_url || "",
      };
      setMultimediaItems(updated);
    } catch (err) {
      setMultimediaError("Error al subir archivo: " + err.message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleThumbnailUpload = async (index, file) => {
    setUploadingIndex(index);
    try {
      const url = await subirImagen(file);
      const updated = [...multimediaItems];
      updated[index] = { ...updated[index], thumbnail_url: url };
      setMultimediaItems(updated);
    } catch (err) {
      setMultimediaError("Error al subir imagen de portada: " + err.message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleFotoPerfil = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const formato = validarFormato("foto", file);
    if (!formato.valido) {
      setMultimediaError(formato.error);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      if (img.width < 500 || img.height < 500) {
        setMultimediaError(`Resolución muy baja: ${img.width}×${img.height}. Mínimo: 500×500 px.`);
        return;
      }
      try {
        const fotoUrl = await subirImagen(file);
        onFieldChange("foto_perfil_url", fotoUrl);
      } catch (err) {
        setMultimediaError("Error al subir foto: " + err.message);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setMultimediaError("No se pudo leer la imagen.");
    };
    img.src = url;
  };

  // --- MAPA ---
  useEffect(() => {
    if (
      !mapContainer.current ||
      view !== "nuevo-editar" ||
      step !== 1 ||
      map.current
    )
      return;

    const m = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v10",
      center: [general.longitud, general.latitud],
      zoom: 8,
      attributionControl: false,
    });
    const mk = new mapboxgl.Marker({ draggable: true, color: "#863819" })
      .setLngLat([general.longitud, general.latitud])
      .addTo(m);
    mk.on("dragend", () => {
      const ll = mk.getLngLat();
      setGeneral((g) => ({ ...g, latitud: ll.lat, longitud: ll.lng }));
    });
    m.on("click", (e) => {
      mk.setLngLat(e.lngLat);
      setGeneral((g) => ({
        ...g,
        latitud: e.lngLat.lat,
        longitud: e.lngLat.lng,
      }));
    });
    map.current = m;
    marker.current = mk;
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        marker.current = null;
      }
    };
  }, [view, step]);

  // --- SLUG ---
  useEffect(() => {
    const base = general.nombre
      .toLowerCase()
      .trim()
      .replace(/[\s\W\s]+/g, "-");
    setGeneral((g) => ({ ...g, slug: base ? `${base}-${general.tipo}` : "" }));
  }, [general.nombre, general.tipo]);

  // --- RECORRIDO SLUG ---
  useEffect(() => {
    if (editingRecorridoId === "new" || !editingRecorridoId) {
      const base = recForm.nombre
        .toLowerCase()
        .trim()
        .replace(/[\s\W\s]+/g, "-");
      setRecForm((f) => ({ ...f, slug: base || "" }));
    }
  }, [recForm.nombre]);

  // --- RESET ---
  const resetWizard = () => {
    setStep(1);
    setEditingEntityId(null);
    setGeneral({
      tipo: "",
      nombre: "",
      slug: "",
      resumen: "",
      localidad_id: "",
      direccion_escrita: "",
      latitud: -27.4511,
      longitud: -58.9861,
      visible: true,
    });
    setEspecifico({});
    setMultimediaItems([
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
    setConexiones([]);
    setGeoQuery("");
    setGeoResults([]);
    if (map.current) {
      map.current.remove();
      map.current = null;
      marker.current = null;
    }
  };

  // --- LOCALIDAD ---
  const handleLocalidadChange = (e) => {
    const id = parseInt(e.target.value);
    const loc = localidades.find((l) => l.id === id);
    setGeneral((g) => ({
      ...g,
      localidad_id: id,
      latitud: loc?.latitud || g.latitud,
      longitud: loc?.longitud || g.longitud,
    }));
    if (loc?.latitud && loc?.longitud && map.current) {
      map.current.flyTo({ center: [loc.longitud, loc.latitud], zoom: 10, speed: 1.2 });
      marker.current?.setLngLat([loc.longitud, loc.latitud]);
    }
  };

  // --- GUARDAR ---
  const guardarEntidad = async () => {
    setMultimediaError("");
    if (!multimediaItems[0]?.url_recurso) {
      showPopup("Agregá una foto principal para el encabezado", "warning");
      setStep(3);
      return;
    }

    for (const item of multimediaItems) {
      const hasUrl = item.url_recurso && item.url_recurso.trim();
      const hasTitle = item.titulo_alternativo && item.titulo_alternativo.trim();
      if (hasUrl && !hasTitle) {
        showPopup("Completá el título del recurso multimedia", "warning");
        setStep(3);
        return;
      }
    }

    setLoading(true);
    let createdEntityId = null;
    try {
      const payload = { ...general, imagen: multimediaItems[0].url_recurso };
      if (editingEntityId) {
        const r1 = await authFetch(
          `/api/entidades/${editingEntityId}`,
          {
            method: "PUT",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify(payload),
          },
        );
        if (!r1.ok) {
          const errBody = await r1.json().catch(() => ({}));
          if (r1.status === 401) throw new Error("Sesión expirada. Iniciá sesión de nuevo.");
          throw new Error(errBody.error || "Error al actualizar datos base");
        }
        const r2 = await authFetch(
          `/api/entidades/${editingEntityId}/detalles`,
          {
            method: "PUT",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ tipo: general.tipo, ...especifico, direccion_escrita: general.direccion_escrita || "" }),
          },
        );
        if (!r2.ok) {
          const errBody2 = await r2.json().catch(() => ({}));
          throw new Error(errBody2.error || "Error al actualizar detalles");
        }
        const multimediaExistentes = await authFetch(
          `/api/entidades/${editingEntityId}/multimedia`,
        );
        const datosMulti = await multimediaExistentes.json();
        if (multimediaExistentes.ok) {
          for (const m of datosMulti) {
            await authFetch(`/api/multimedia/${m.id}`, {
              method: "DELETE",
              headers: authHeaders(),
            });
          }
        }
        for (const item of multimediaItems) {
          if (!item.url_recurso) continue;
          const { entidades_etiquetadas, ...itemData } = item;
          const resM = await authFetch(`/api/multimedia`, {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              entidad_id: editingEntityId,
              ...itemData,
              descripcion_recurso: item.descripcion_recurso || "",
            }),
          });
          if (entidades_etiquetadas?.length > 0) {
            const mData = await resM.json();
            const multimediaId = mData.id;
            if (multimediaId) {
              await authFetch(
                `/api/multimedia/${multimediaId}/etiquetas`,
                {
                  method: "PUT",
                  headers: authHeaders({ "Content-Type": "application/json" }),
                  body: JSON.stringify(
                    entidades_etiquetadas.map((e) => ({
                      entidad_id: e.entidad_id,
                      timestamp_inicio: e.timestamp_inicio || null,
                      timestamp_fin: e.timestamp_fin || null,
                    })),
                  ),
                },
              );
            }
          }
        }
        await authFetch(`/api/entidades/${editingEntityId}/conexiones`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(conexiones),
        });
      } else {
        const r1 = await authFetch("/api/entidades", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        const d1 = await r1.json();
        if (!r1.ok) throw new Error(d1.error);
        const id = d1.id;
        createdEntityId = id;
        const r2 = await authFetch(
            `/api/entidades/${id}/detalles`,
            {
              method: "POST",
              headers: authHeaders({ "Content-Type": "application/json" }),
              body: JSON.stringify({ tipo: general.tipo, ...especifico, direccion_escrita: general.direccion_escrita || "" }),
            },
          );
          if (!r2.ok) {
            const errBody2 = await r2.json().catch(() => ({}));
            throw new Error(errBody2.error || "Error al guardar detalles");
          }
        for (const item of multimediaItems) {
          if (!item.url_recurso) continue;
          const { entidades_etiquetadas, ...itemData } = item;
          const resM = await authFetch(`/api/multimedia`, {
            method: "POST",
            headers: authHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({
              entidad_id: id,
              ...itemData,
              descripcion_recurso: item.descripcion_recurso || "",
            }),
          });
          if (entidades_etiquetadas?.length > 0) {
            const mData = await resM.json();
            const multimediaId = mData.id;
            if (multimediaId) {
              await authFetch(
                `/api/multimedia/${multimediaId}/etiquetas`,
                {
                  method: "PUT",
                  headers: authHeaders({ "Content-Type": "application/json" }),
                  body: JSON.stringify(
                    entidades_etiquetadas.map((e) => ({
                      entidad_id: e.entidad_id,
                      timestamp_inicio: e.timestamp_inicio || null,
                      timestamp_fin: e.timestamp_fin || null,
                    })),
                  ),
                },
              );
            }
          }
        }
        await authFetch(`/api/entidades/${id}/conexiones`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(conexiones),
        });
      }
      showPopup(editingEntityId ? "Entidad actualizada" : "Entidad creada");
      resetWizard();
      cargarEntidades();
      setView("entidades");
    } catch (err) {
      if (createdEntityId) {
        await authFetch(`/api/entidades/${createdEntityId}`, {
          method: "DELETE",
          headers: authHeaders(),
        }).catch(() => {});
      }
      showPopup("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // --- CARGAR PARA EDITAR ---
  const cargarEntidadParaEditar = async (id) => {
    try {
      const res = await authFetch(`/api/entidades/${id}`);
      if (!res.ok) throw new Error("No se pudo cargar");
      const data = await res.json();
      setEditingEntityId(data.id);
      setGeneral({
        tipo: data.tipo,
        nombre: data.nombre,
        slug: data.slug,
        resumen: data.resumen || "",
        localidad_id: data.localidad_id || "",
        latitud: data.latitud || -27.4511,
        longitud: data.longitud || -58.9861,
        visible: data.visible !== false,
        direccion_escrita: data.direccion_escrita || "",
      });
      setGeoQuery(data.direccion_escrita || "");
      const fieldsMap = {
        artesano: [
          "email", "biografia_larga", "tecnica_principal",
          "materiales_usados", "anios_experiencia", "taller_abierto",
          "fotos_galeria_url", "comunidad_etnica", "redes_sociales",
        ],
        gastronomia: [
          "email", "historia_plato", "ingredientes_clave",
          "receta_destacada", "establecimientos_donde_probar",
        ],
        comercio: [
          "email", "razon_social", "cuit", "rubro_especifico",
          "sitio_web",
          "horario_apertura", "horario_cierre",
          "dias_abierto", "redes_sociales",
          "acepta_tarjetas", "fecha_inicio_suscripcion",
          "fecha_fin_suscripcion", "estado_pago",
        ],
        personalidad: [
          "email", "nombre_completo", "apodo", "biografia_resumida",
          "profesion", "fecha_nacimiento", "foto_perfil_url",
          "es_referente_comunidad", "comunidad_etnica",
          "contacto", "redes_sociales",
        ],
        patrimonio: [
          "email", "año_referencia", "estilo_arquitectonico",
          "declaratoria_oficial", "estado_conservacion",
        ],
        evento: [
          "email", "razon_social", "cuit", "fecha_evento", "duracion_dias",
          "actividades_principales", "es_itinerante",
          "link_entradas", "fecha_inicio_suscripcion",
          "fecha_fin_suscripcion", "estado_pago",
        ],
        comunidad_indigena: [
          "email", "biografia_larga", "etnia", "lenguas",
          "territorio_tradicional", "cosmovision", "redes_sociales",
        ],
        lugar_natural: [
          "email", "biografia_larga", "categoria_natural",
          "actividades", "acceso",
          "flora_fauna_destacada", "mejor_epoca",
        ],
        hospedaje: [
          "email", "razon_social", "cuit", "biografia_larga", "categoria_hospedaje",
          "servicios", "capacidad", "sitio_web",
          "redes_sociales", "fecha_inicio_suscripcion",
          "fecha_fin_suscripcion", "estado_pago",
        ],
        productor: [
          "email", "razon_social", "cuit", "biografia_larga", "tipo_producto",
          "metodos_produccion", "certificaciones",
          "contacto_comercial", "sitio_web",
          "redes_sociales", "fecha_inicio_suscripcion",
          "fecha_fin_suscripcion", "estado_pago",
        ],
        experiencia: [
          "email", "biografia_larga", "tipo_experiencia",
          "duracion_experiencia", "que_incluye",
          "precio_referencia", "redes_sociales", "operador",
        ],
        relato: [
          "email", "autor", "fecha_relato", "tipo_relato",
          "contenido_completo",
        ],
        espacio_cultural: [
          "email", "biografia_larga", "tipo_espacio",
          "horarios", "sitio_web", "redes_sociales",
        ],
      };
      const esp = {};
      (fieldsMap[data.tipo] || []).forEach((f) => {
        let val = data[f];
        if ((f === "fecha_inicio_suscripcion" || f === "fecha_fin_suscripcion" || f === "fecha_evento" || f === "fecha_nacimiento" || f === "fecha_relato") && val) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) val = d.toISOString().split("T")[0];
        }
        if (val != null) esp[f] = val;
      });
      setEspecifico(esp);

      try {
        const resMulti = await authFetch(
          `/api/entidades/${id}/multimedia`,
        );
        const dataMulti = await resMulti.json();
        if (resMulti.ok && dataMulti.length > 0) {
          const tagsMap = {};
          const ids = dataMulti.map((m) => m.id).filter(Boolean);
          if (ids.length > 0) {
            try {
              const resTags = await authFetch(
                `/api/multimedia/etiquetas?multimedia_ids=${ids.join(",")}`,
              );
              if (resTags.ok) {
                const dataTags = await resTags.json();
                for (const mItem of dataMulti) {
                  if (dataTags[mItem.id]) {
                    tagsMap[mItem.id] = dataTags[mItem.id];
                  }
                }
              }
            } catch {}
          }
          setMultimediaItems(
            dataMulti.map((m) => ({
              url_recurso: m.url_recurso || "",
              titulo_alternativo: m.titulo_alternativo || "",
              descripcion_recurso: m.descripcion_recurso || "",
              tipo_recurso: m.tipo_recurso || "foto",
              es_principal: m.es_principal,
              thumbnail_url: m.thumbnail_url || "",
              public_id: m.public_id || "",
              entidades_etiquetadas: tagsMap[m.id] || [],
            })),
          );
        } else if (data.imagen) {
          setMultimediaItems([
            {
              url_recurso: data.imagen,
              titulo_alternativo: "",
              descripcion_recurso: "",
              tipo_recurso: "foto",
              es_principal: true,
              thumbnail_url: "",
              public_id: "",
              entidades_etiquetadas: [],
            },
          ]);
        }
      } catch {
        if (data.imagen) {
          setMultimediaItems([
            {
              url_recurso: data.imagen,
              titulo_alternativo: "",
              descripcion_recurso: "",
              tipo_recurso: "foto",
              es_principal: true,
              thumbnail_url: "",
              public_id: "",
              entidades_etiquetadas: [],
            },
          ]);
        } else {
          setMultimediaItems([
            {
              url_recurso: "",
              titulo_alternativo: "",
              descripcion_recurso: "",
              tipo_recurso: "foto",
              es_principal: true,
              thumbnail_url: "",
              public_id: "",
              entidades_etiquetadas: [],
            },
          ]);
        }
      }

      // Cargar conexiones
      try {
        const resC = await authFetch(
          `/api/entidades/${id}/conexiones`,
        );
        if (resC.ok) {
          const dataC = await resC.json();
          setConexiones(
            dataC.map((c) => ({
              entidad_destino_id:
                c.entidad_origen_id === data.id
                  ? c.entidad_destino_id
                  : c.entidad_origen_id,
              entidad_destino_nombre:
                c.entidad_origen_id === data.id
                  ? c.nombre_destino
                  : c.nombre_origen,
              tipo_relacion: c.tipo_relacion || "",
            })),
          );
        }
      } catch {}

      setView("nuevo-editar");
      setStep(1);
    } catch (err) {
      showPopup("Error al cargar: " + err.message, "error");
    }
  };

  const buildMailtoUrl = (e) => {
    const lines = [
      `Hola ${e.nombre},`,
      "",
      "Recibimos correctamente tu solicitud para el Sello Made in Chaco.",
      "",
      "Podés continuar con el proceso de suscripción respondiendo a este correo.",
      "",
      "Saludos,",
      "Equipo Made in Chaco",
    ];
    const subject = encodeURIComponent("Made in Chaco — Confirmación de Sello");
    const body = encodeURIComponent(lines.join("\n"));
    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(e.email)}&su=${subject}&body=${body}`;
  };

  // --- ELIMINAR ---
  const eliminarEntidad = async (id, nombre) => {
    const confirmed = await showConfirm(
      `¿Eliminar "${nombre}"? No se puede deshacer.`,
      "ELIMINAR",
    );
    if (!confirmed) return;
    try {
      const res = await authFetch(`/api/entidades/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      showPopup("Entidad eliminada");
      cargarEntidades();
    } catch (err) {
      showPopup("Error: " + err.message, "error");
    }
  };

  const abrirConexModal = async (entidad) => {
    setConexSearch("");
    setConexResults([]);
    try {
      const res = await authFetch(
        `/api/entidades/${entidad.id}/conexiones`,
      );
      if (res.ok) {
        const data = await res.json();
        setConexTempList(
          data.map((c) => {
            const isOrigin = c.entidad_origen_id === entidad.id;
            return {
              entidad_destino_id: isOrigin
                ? c.entidad_destino_id
                : c.entidad_origen_id,
              nombre: isOrigin
                ? c.nombre_destino
                : c.nombre_origen,
              tipo_relacion: isOrigin
                ? (c.tipo_relacion || "")
                : (c.tipo_relacion_inversa || ""),
              tipo_relacion_inversa: isOrigin
                ? (c.tipo_relacion_inversa || "")
                : (c.tipo_relacion || ""),
            };
          }),
        );
      } else {
        setConexTempList([]);
      }
    } catch {
      setConexTempList([]);
    }
    setConexModal(entidad);
  };

  const guardarConexModal = async () => {
    if (!conexModal) return;
    setConexSaving(true);
    try {
      const res = await authFetch(
        `/api/entidades/${conexModal.id}/conexiones`,
        {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(conexTempList),
        },
      );
      if (!res.ok) throw new Error("Error al guardar conexiones");
      showPopup("Conexiones actualizadas");
      setConexModal(null);
    } catch (err) {
      showPopup("Error: " + err.message, "error");
    } finally {
      setConexSaving(false);
    }
  };

  // --- RECORRIDOS ---

  const resetRecForm = () => {
    setEditingRecorridoId(null);
    setRecForm({ nombre: "", slug: "", descripcion: "", imagen: "" });
    setRecPasos([]);
    setPasosearch("");
    setPasoResults([]);
  };

  const cargarRecorridoParaEditar = async (r) => {
    try {
      const res = await authFetch(`/api/recorridos/${r.slug}`);
      if (!res.ok) throw new Error("No se pudo cargar");
      const data = await res.json();
      setEditingRecorridoId(data.id);
      setRecForm({ nombre: data.nombre, slug: data.slug, descripcion: data.descripcion || "", imagen: data.imagen || "" });
      setRecPasos(
        (data.pasos || []).map((p, i) => ({
          entidad_id: p.entidad_id,
          nombre: p.nombre,
          tipo: p.tipo,
          slug: p.slug,
          descripcion_paso: p.descripcion_paso || "",
          paso_orden: i + 1,
        })),
      );
    } catch (err) {
      showPopup("Error: " + err.message, "error");
    }
  };

  const guardarRecorrido = async () => {
    if (!recForm.nombre.trim()) { showPopup("El nombre es obligatorio", "error"); return; }
    setRecSaving(true);
    try {
      if (editingRecorridoId && editingRecorridoId !== "new") {
        const r1 = await authFetch(`/api/recorridos/${editingRecorridoId}`, {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(recForm),
        });
        if (!r1.ok) throw new Error("Error al actualizar");
        await authFetch(`/api/recorridos/${editingRecorridoId}/pasos`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(recPasos.map((p, i) => ({
            entidad_id: p.entidad_id,
            descripcion_paso: p.descripcion_paso || "",
            paso_orden: i + 1,
          }))),
        });
        showPopup("Recorrido actualizado");
      } else {
        const r1 = await authFetch("/api/recorridos", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(recForm),
        });
        if (!r1.ok) throw new Error("Error al crear");
        const data = await r1.json();
        await authFetch(`/api/recorridos/${data.id}/pasos`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(recPasos.map((p, i) => ({
            entidad_id: p.entidad_id,
            descripcion_paso: p.descripcion_paso || "",
            paso_orden: i + 1,
          }))),
        });
        showPopup("Recorrido creado");
      }
      resetRecForm();
      cargarRecorridos();
    } catch (err) {
      showPopup("Error: " + err.message, "error");
    } finally {
      setRecSaving(false);
    }
  };

  const eliminarRecorrido = async (id, nombre) => {
    const ok = await showConfirm(`¿Eliminar el recorrido "${nombre}"?`, "ELIMINAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/recorridos/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      showPopup("Recorrido eliminado");
      cargarRecorridos();
    } catch (err) {
      showPopup("Error: " + err.message, "error");
    }
  };

  const handleRecImagen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const formato = validarFormato("foto", file);
    if (!formato.valido) {
      showPopup(formato.error, "error");
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      URL.revokeObjectURL(url);
      if (img.width < 1920 || img.height < 1080) {
        showPopup(`Resolución muy baja: ${img.width}×${img.height}. Mínimo: 1920×1080 px (16:9). Formatos: JPG, PNG, WebP.`, "error");
        return;
      }
      try {
        const imagenUrl = await subirImagen(file);
        setRecForm((f) => ({ ...f, imagen: imagenUrl }));
      } catch (err) {
        showPopup("Error al subir imagen: " + err.message, "error");
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      showPopup("No se pudo leer la imagen.", "error");
    };
    img.src = url;
  };

  // --- FORM DETALLE ---
  const onFieldChange = (field, value) => {
    setEspecifico((e) => ({ ...e, [field]: value }));
  };

  const renderFormDetalle = () => {
    const tipo = general.tipo;
    if (!tipo) return <p style={{ color: "#999" }}>Seleccioná un tipo primero</p>;

    const fields = {
      artesano: () => (
        <>
          <DetailField field="biografia_larga" fieldVal={especifico.biografia_larga} onFieldChange={onFieldChange} label="Biografía" type="textarea" placeholder="Historia del artesano..." />
          <DetailField field="tecnica_principal" fieldVal={especifico.tecnica_principal} onFieldChange={onFieldChange} label="Técnica principal" placeholder="Ej: alfarería, telar..." />
          <DetailField field="materiales_usados" fieldVal={especifico.materiales_usados} onFieldChange={onFieldChange} label="Materiales" placeholder="Ej: barro, lana de oveja..." />
          <DetailField field="anios_experiencia" fieldVal={especifico.anios_experiencia} onFieldChange={onFieldChange} label="Años de experiencia" type="number" placeholder="Ej: 15" />
          <DetailField field="taller_abierto" fieldVal={especifico.taller_abierto} onFieldChange={onFieldChange} label="Taller abierto al público" type="select" options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]} />
          <DetailField field="fotos_galeria_url" fieldVal={especifico.fotos_galeria_url} onFieldChange={onFieldChange} label="URLs de fotos (separadas por comas)" placeholder="https://..." />
          <DetailField field="comunidad_etnica" fieldVal={especifico.comunidad_etnica} onFieldChange={onFieldChange} label="Comunidad étnica" type="select" options={COMUNIDADES_ETNICAS.map((v) => ({ value: v, label: v || "Seleccionar..." }))} />
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} />
        </>
      ),
      gastronomia: () => (
        <>
          <DetailField field="historia_plato" fieldVal={especifico.historia_plato} onFieldChange={onFieldChange} label="Historia del plato" type="textarea" placeholder="Origen e historia..." />
          <DetailField field="ingredientes_clave" fieldVal={especifico.ingredientes_clave} onFieldChange={onFieldChange} label="Ingredientes clave" placeholder="Ej: maíz, queso de campo..." />
          <DetailField field="receta_destacada" fieldVal={especifico.receta_destacada} onFieldChange={onFieldChange} label="Receta destacada" type="textarea" placeholder="Preparación..." />
          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#863819",
                display: "block",
                marginBottom: "4px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Dónde probarlo
            </label>
            <GastronomiaSelector
              value={especifico.establecimientos_donde_probar || ""}
              onChange={(v) => onFieldChange("establecimientos_donde_probar", v)}
              allEntities={allEntities}
            />
          </div>
        </>
      ),
      comercio: () => (
        <>
          <DetailField field="razon_social" fieldVal={especifico.razon_social} onFieldChange={onFieldChange} label="Razón social" placeholder="Nombre legal..." />
          <DetailField field="cuit" fieldVal={especifico.cuit} onFieldChange={onFieldChange} label="CUIT" placeholder="20-12345678-9" />
          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#863819",
                display: "block",
                marginBottom: "4px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Rubro específico
            </label>
            <select
              style={styles.input}
              value={especifico.rubro_especifico || ""}
              onChange={(e) => onFieldChange("rubro_especifico", e.target.value)}
            >
              <option value="">Seleccionar rubro...</option>
              <option value="Alfarería y cerámica">Alfarería y cerámica</option>
              <option value="Alimentos y bebidas artesanales">Alimentos y bebidas artesanales</option>
              <option value="Artesanías en cuero / Talabartería">Artesanías en cuero / Talabartería</option>
              <option value="Artesanías en madera">Artesanías en madera</option>
              <option value="Carnes y embutidos regionales">Carnes y embutidos regionales</option>
              <option value="Cerveza artesanal">Cerveza artesanal</option>
              <option value="Cestería y fibras naturales">Cestería y fibras naturales</option>
              <option value="Comercio minorista">Comercio minorista</option>
              <option value="Comercio mayorista">Comercio mayorista</option>
              <option value="Conservas y dulces">Conservas y dulces</option>
              <option value="Construcción y materiales">Construcción y materiales</option>
              <option value="Consultoría y asesoría">Consultoría y asesoría</option>
              <option value="Decoración artesanal">Decoración artesanal</option>
              <option value="Educación y capacitación">Educación y capacitación</option>
              <option value="Farmacia y perfumería">Farmacia y perfumería</option>
              <option value="Ferias y eventos">Ferias y eventos</option>
              <option value="Ferretería">Ferretería</option>
              <option value="Gastronomía / Restaurante">Gastronomía / Restaurante</option>
              <option value="Gastronomía típica regional">Gastronomía típica regional</option>
              <option value="Herrería artesanal">Herrería artesanal</option>
              <option value="Hierbas medicinales y aromáticas">Hierbas medicinales y aromáticas</option>
              <option value="Hilados y tejidos artesanales">Hilados y tejidos artesanales</option>
              <option value="Indumentaria textil">Indumentaria textil</option>
              <option value="Indumentaria deportiva">Indumentaria deportiva</option>
              <option value="Informática y tecnología">Informática y tecnología</option>
              <option value="Instrumentos musicales">Instrumentos musicales</option>
              <option value="Joyería y bijouterie artesanal">Joyería y bijouterie artesanal</option>
              <option value="Juguetería y librería">Juguetería y librería</option>
              <option value="Kiosco y almacén">Kiosco y almacén</option>
              <option value="Lácteos artesanales">Lácteos artesanales</option>
              <option value="Limpieza e higiene">Limpieza e higiene</option>
              <option value="Mascotas y veterinaria">Mascotas y veterinaria</option>
              <option value="Miel y derivados">Miel y derivados</option>
              <option value="Muebles artesanales">Muebles artesanales</option>
              <option value="Mueblería y decoración">Mueblería y decoración</option>
              <option value="Orfebrería y platería">Orfebrería y platería</option>
              <option value="Panadería y pastelería">Panadería y pastelería</option>
              <option value="Panificación y pastelería artesanal">Panificación y pastelería artesanal</option>
              <option value="Papelería e imprenta">Papelería e imprenta</option>
              <option value="Pelquería y barbería">Peluquería y barbería</option>
              <option value="Plantas y vivero">Plantas y vivero</option>
              <option value="Productos regionales">Productos regionales</option>
              <option value="Quesos artesanales">Quesos artesanales</option>
              <option value="Reciclado y reutilización">Reciclado y reutilización</option>
              <option value="Repostería artesanal">Repostería artesanal</option>
              <option value="Salud y bienestar">Salud y bienestar</option>
              <option value="Servicios culturales">Servicios culturales</option>
              <option value="Servicios turísticos">Servicios turísticos</option>
              <option value="Supermercado y autoservicio">Supermercado y autoservicio</option>
              <option value="Textiles y bordados tradicionales">Textiles y bordados tradicionales</option>
              <option value="Transporte y logística">Transporte y logística</option>
              <option value="Velas y jabones artesanales">Velas y jabones artesanales</option>
              <option value="Venta de combustibles">Venta de combustibles</option>
              <option value="Vidriería y cristalería">Vidriería y cristalería</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          <DetailField field="sitio_web" fieldVal={especifico.sitio_web} onFieldChange={onFieldChange} label="Sitio web" placeholder="https://..." />
          <div style={{ marginBottom: "10px" }}>
            <label
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "#863819",
                display: "block",
                marginBottom: "4px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              Días abierto
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"].map((dia) => {
                const dias = (especifico.dias_abierto || "").split(",").filter(Boolean);
                const checked = dias.includes(dia);
                return (
                  <label
                    key={dia}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: "pointer",
                      background: checked ? "#863819" : "#f6f3ec",
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
                        onFieldChange("dias_abierto", nuevos.join(","));
                      }}
                    />
                    {dia.slice(0, 3)}
                  </label>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ flex: 1, marginBottom: "10px" }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#863819",
                  display: "block",
                  marginBottom: "4px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Horario apertura
              </label>
              <input
                type="time"
                style={styles.input}
                value={especifico.horario_apertura || ""}
                onChange={(e) => onFieldChange("horario_apertura", e.target.value)}
              />
            </div>
            <div style={{ flex: 1, marginBottom: "10px" }}>
              <label
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "#863819",
                  display: "block",
                  marginBottom: "4px",
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                }}
              >
                Horario cierre
              </label>
              <input
                type="time"
                style={styles.input}
                value={especifico.horario_cierre || ""}
                onChange={(e) => onFieldChange("horario_cierre", e.target.value)}
              />
            </div>
          </div>
          <DetailField field="acepta_tarjetas" fieldVal={especifico.acepta_tarjetas} onFieldChange={onFieldChange} label="Acepta tarjetas" type="select" options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]} />
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} />
        </>
      ),
      personalidad: () => (
        <>
          <DetailField field="nombre_completo" fieldVal={especifico.nombre_completo} onFieldChange={onFieldChange} label="Nombre completo" placeholder="Nombre y apellido" />
          <DetailField field="apodo" fieldVal={especifico.apodo} onFieldChange={onFieldChange} label="Apodo / conocido como" placeholder="..." />
          <DetailField field="biografia_resumida" fieldVal={especifico.biografia_resumida} onFieldChange={onFieldChange} label="Biografía" type="textarea" placeholder="..." />
          <DetailField field="profesion" fieldVal={especifico.profesion} onFieldChange={onFieldChange} label="Profesión" placeholder="..." />
          <DetailField field="fecha_nacimiento" fieldVal={especifico.fecha_nacimiento} onFieldChange={onFieldChange} label="Fecha de nacimiento" type="date" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 4 }}>
              Foto de perfil
            </label>
            {especifico.foto_perfil_url ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <img src={especifico.foto_perfil_url} alt="preview" style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover", border: "2px solid #ddd" }} />
                <button onClick={() => onFieldChange("foto_perfil_url", "")} style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 13 }}>
                  Eliminar
                </button>
              </div>
            ) : (
              <>
                <input type="file" accept="image/jpeg,image/png,image/webp" hidden ref={fotoPerfilRef} onChange={handleFotoPerfil} />
                <button onClick={() => fotoPerfilRef.current?.click()} style={{ padding: "10px 16px", background: "#f5f2eb", border: "1px dashed #ccc", borderRadius: 8, cursor: "pointer", color: "#1c1c18", fontSize: 14, width: "100%", textAlign: "center" }}>
                  + Subir foto de perfil
                </button>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>Formatos: JPG, PNG, WebP • Mínimo 500×500 px</div>
              </>
            )}
          </div>
          <DetailField field="es_referente_comunidad" fieldVal={especifico.es_referente_comunidad} onFieldChange={onFieldChange} label="Referente comunitario" type="select" options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]} />
          <DetailField field="comunidad_etnica" fieldVal={especifico.comunidad_etnica} onFieldChange={onFieldChange} label="Comunidad étnica" type="select" options={COMUNIDADES_ETNICAS.map((v) => ({ value: v, label: v || "Seleccionar..." }))} />
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} label="Contacto / Redes sociales" />
        </>
      ),
      patrimonio: () => (
        <>
          <DetailField field="año_referencia" fieldVal={especifico.año_referencia} onFieldChange={onFieldChange} label="Año de referencia" placeholder="Ej: 1920" />
          <DetailField field="estilo_arquitectonico" fieldVal={especifico.estilo_arquitectonico} onFieldChange={onFieldChange} label="Estilo arquitectónico" placeholder="Ej: neoclásico" />
          <DetailField field="declaratoria_oficial" fieldVal={especifico.declaratoria_oficial} onFieldChange={onFieldChange} label="Declaratoria oficial" placeholder="Ej: Patrimonio Provincial" />
          <DetailField field="estado_conservacion" fieldVal={especifico.estado_conservacion} onFieldChange={onFieldChange} label="Estado de conservación" placeholder="Ej: bueno" />
        </>
      ),
      evento: () => (
        <>
          <DetailField field="razon_social" fieldVal={especifico.razon_social} onFieldChange={onFieldChange} label="Razón social" placeholder="Nombre legal..." />
          <DetailField field="cuit" fieldVal={especifico.cuit} onFieldChange={onFieldChange} label="CUIT" placeholder="20-12345678-9" />
          <DetailField field="fecha_evento" fieldVal={especifico.fecha_evento} onFieldChange={onFieldChange} label="Fecha del evento" type="date" placeholder="" />
          <DetailField field="duracion_dias" fieldVal={especifico.duracion_dias} onFieldChange={onFieldChange} label="Duración (días)" type="number" placeholder="Ej: 1" />
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#863819", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Actividades principales</label>
          <TagSelector value={especifico.actividades_principales || ""} onChange={(v) => onFieldChange("actividades_principales", v)} suggestions={ACTIVIDADES_SUGERIDAS} placeholder="Escribí o seleccioná actividades..." />
          <DetailField field="es_itinerante" fieldVal={especifico.es_itinerante} onFieldChange={onFieldChange} label="Evento itinerante" type="select" options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]} />
          <DetailField field="link_entradas" fieldVal={especifico.link_entradas} onFieldChange={onFieldChange} label="Link a compra de entradas" placeholder="https://..." />
        </>
      ),
      comunidad_indigena: () => (
        <>
          <DetailField field="biografia_larga" fieldVal={especifico.biografia_larga} onFieldChange={onFieldChange} label="Historia / Descripción" type="textarea" placeholder="Historia, origen y contexto..." />
          <DetailField field="etnia" fieldVal={especifico.etnia} onFieldChange={onFieldChange} label="Etnia" type="select" options={COMUNIDADES_ETNICAS.map((v) => ({ value: v, label: v || "Seleccionar..." }))} />
          <DetailField field="lenguas" fieldVal={especifico.lenguas} onFieldChange={onFieldChange} label="Lenguas" placeholder="Ej: Qom, Castellano" />
          <DetailField field="territorio_tradicional" fieldVal={especifico.territorio_tradicional} onFieldChange={onFieldChange} label="Territorio tradicional" type="textarea" placeholder="Ubicación y territorio..." />
          <DetailField field="cosmovision" fieldVal={especifico.cosmovision} onFieldChange={onFieldChange} label="Cosmovisión" type="textarea" placeholder="Creencias, visión del mundo..." />
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} />
        </>
      ),
      lugar_natural: () => (
        <>
          <DetailField field="biografia_larga" fieldVal={especifico.biografia_larga} onFieldChange={onFieldChange} label="Descripción" type="textarea" placeholder="Descripción del lugar..." />
          <DetailField field="categoria_natural" fieldVal={especifico.categoria_natural} onFieldChange={onFieldChange} label="Categoría" placeholder="Ej: Parque, Reserva, Río, Laguna, Monte" />
          <DetailField field="actividades" fieldVal={especifico.actividades} onFieldChange={onFieldChange} label="Actividades" type="textarea" placeholder="Ej: senderismo, avistaje de aves, pesca..." />
          <DetailField field="acceso" fieldVal={especifico.acceso} onFieldChange={onFieldChange} label="Acceso" type="textarea" placeholder="Cómo llegar, rutas, accesos..." />
          <DetailField field="flora_fauna_destacada" fieldVal={especifico.flora_fauna_destacada} onFieldChange={onFieldChange} label="Flora y fauna destacada" type="textarea" placeholder="Especies representativas..." />
          <DetailField field="mejor_epoca" fieldVal={especifico.mejor_epoca} onFieldChange={onFieldChange} label="Mejor época para visitar" placeholder="Ej: Otoño, todo el año..." />
        </>
      ),
      hospedaje: () => (
        <>
          <DetailField field="razon_social" fieldVal={especifico.razon_social} onFieldChange={onFieldChange} label="Razón social" placeholder="Nombre legal..." />
          <DetailField field="cuit" fieldVal={especifico.cuit} onFieldChange={onFieldChange} label="CUIT" placeholder="20-12345678-9" />
          <DetailField field="biografia_larga" fieldVal={especifico.biografia_larga} onFieldChange={onFieldChange} label="Descripción" type="textarea" placeholder="Descripción del alojamiento..." />
          <DetailField field="categoria_hospedaje" fieldVal={especifico.categoria_hospedaje} onFieldChange={onFieldChange} label="Categoría" placeholder="Ej: Hotel, Cabaña, Hostel, Posada" />
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#863819", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Servicios</label>
          <TagSelector value={especifico.servicios || ""} onChange={(v) => onFieldChange("servicios", v)} suggestions={SERVICIOS_SUGERIDOS} placeholder="Escribí o seleccioná servicios..." />
          <DetailField field="capacidad" fieldVal={especifico.capacidad} onFieldChange={onFieldChange} label="Capacidad" placeholder="Ej: 20 personas, 5 habitaciones" />
          <DetailField field="sitio_web" fieldVal={especifico.sitio_web} onFieldChange={onFieldChange} label="Sitio web" placeholder="https://..." />
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} />
        </>
      ),
      productor: () => (
        <>
          <DetailField field="razon_social" fieldVal={especifico.razon_social} onFieldChange={onFieldChange} label="Razón social" placeholder="Nombre legal..." />
          <DetailField field="cuit" fieldVal={especifico.cuit} onFieldChange={onFieldChange} label="CUIT" placeholder="20-12345678-9" />
          <DetailField field="biografia_larga" fieldVal={especifico.biografia_larga} onFieldChange={onFieldChange} label="Descripción" type="textarea" placeholder="Historia del productor..." />
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#863819", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Tipo de producto</label>
          <TagSelector value={especifico.tipo_producto || ""} onChange={(v) => onFieldChange("tipo_producto", v)} suggestions={TIPOS_PRODUCTO} placeholder="Escribí o seleccioná tipo de producto..." />
          <DetailField field="metodos_produccion" fieldVal={especifico.metodos_produccion} onFieldChange={onFieldChange} label="Métodos de producción" type="textarea" placeholder="Ej: artesanal, tradicional, orgánico..." />
          <DetailField field="certificaciones" fieldVal={especifico.certificaciones} onFieldChange={onFieldChange} label="Certificaciones" placeholder="Ej: Orgánico, Comercio Justo" />
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} label="Contacto / Redes sociales" />
          <DetailField field="sitio_web" fieldVal={especifico.sitio_web} onFieldChange={onFieldChange} label="Sitio web" placeholder="https://..." />
        </>
      ),
      experiencia: () => (
        <>
          <DetailField field="biografia_larga" fieldVal={especifico.biografia_larga} onFieldChange={onFieldChange} label="Descripción" type="textarea" placeholder="Descripción de la experiencia..." />
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#863819", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Tipo de experiencia</label>
          <TagSelector value={especifico.tipo_experiencia || ""} onChange={(v) => onFieldChange("tipo_experiencia", v)} suggestions={TIPOS_EXPERIENCIA} placeholder="Escribí o seleccioná tipo de experiencia..." />
          <DetailField field="duracion_experiencia" fieldVal={especifico.duracion_experiencia} onFieldChange={onFieldChange} label="Duración" placeholder="Ej: 3 horas, 1 día completo" />
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#863819", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Qué incluye</label>
          <TagSelector value={especifico.que_incluye || ""} onChange={(v) => onFieldChange("que_incluye", v)} suggestions={QUE_INCLUYE_EXPERIENCIA} placeholder="Escribí o seleccioná qué incluye..." />
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#863819", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Precio de referencia</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <input
              style={{ ...styles.input, flex: 1 }}
              type="number"
              placeholder="Ej: 5000"
              value={(() => { const p = (especifico.precio_referencia || "").trim(); return p.includes(" ") ? p.split(" ")[0] : p })()}
              onChange={(e) => {
                const currency = (especifico.precio_referencia || "").includes("USD") ? "USD" : "ARS";
                onFieldChange("precio_referencia", e.target.value ? `${e.target.value} ${currency}` : "");
              }}
            />
            <select
              style={{ ...styles.input, width: "120px", flexShrink: 0 }}
              value={(especifico.precio_referencia || "").includes("USD") ? "USD" : "ARS"}
              onChange={(e) => {
                const amount = (especifico.precio_referencia || "").split(" ")[0];
                onFieldChange("precio_referencia", amount ? `${amount} ${e.target.value}` : "");
              }}
            >
              <option value="ARS">ARS $</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} label="Contacto / Reservas / Redes sociales" />
          <DetailField field="operador" fieldVal={especifico.operador} onFieldChange={onFieldChange} label="Operador / Guía" placeholder="Nombre del operador o guía" />
        </>
      ),
      relato: () => (
        <>
          <DetailField field="autor" fieldVal={especifico.autor} onFieldChange={onFieldChange} label="Autor del relato" placeholder="Nombre de quien narra" />
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#863819", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Fecha del relato</label>
            <input type="date" style={styles.input} value={especifico.fecha_relato || ""} onChange={(e) => onFieldChange("fecha_relato", e.target.value)} />
          </div>
          <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#863819", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Tipo de relato</label>
          <TagSelector value={especifico.tipo_relato || ""} onChange={(v) => onFieldChange("tipo_relato", v)} suggestions={TIPOS_RELATO} placeholder="Escribí o seleccioná tipo de relato..." />
          <DetailField field="contenido_completo" fieldVal={especifico.contenido_completo} onFieldChange={onFieldChange} label="Contenido completo" type="textarea" placeholder="El relato completo..." />
        </>
      ),
      espacio_cultural: () => (
        <>
          <DetailField field="biografia_larga" fieldVal={especifico.biografia_larga} onFieldChange={onFieldChange} label="Descripción" type="textarea" placeholder="Descripción del espacio..." />
          <DetailField field="tipo_espacio" fieldVal={especifico.tipo_espacio} onFieldChange={onFieldChange} label="Tipo de espacio" placeholder="Ej: Museo, Teatro, Centro Cultural, Biblioteca" />
          <DetailField field="horarios" fieldVal={especifico.horarios} onFieldChange={onFieldChange} label="Horarios" placeholder="Ej: Lun–Vie 9–18, Sáb 10–13" />
          <DetailField field="sitio_web" fieldVal={especifico.sitio_web} onFieldChange={onFieldChange} label="Sitio web" placeholder="https://..." />
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} />
        </>
      ),
    };

    const render = fields[tipo];
    return render ? (
      <>
        <DetailField field="email" fieldVal={especifico.email} onFieldChange={onFieldChange} label="Email" type="email" placeholder="correo@ejemplo.com" />
        {render()}
      </>
    ) : <p style={{ color: "#999" }}>Sin campos específicos</p>;
  };

  // --- RENDER ---
  return (
    <div className="admin-container">
      <div style={styles.mainLayout}>
        {/* SIDEBAR */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <img src="/imagenes/logo-madeinchaco.png" alt="Made in Chaco" style={{ width: "100%", maxWidth: "180px", display: "block", marginBottom: "8px" }} />
            <div style={{ fontSize: "15px", color: "#1c1c18", marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <img src="/icons/user.png" style={{ width: "18px", height: "18px" }} alt="" />
              {user?.username || "Admin"}
            </div>
          </div>
          <div style={styles.sidebarNav}>
            {[
              { id: "dashboard", label: "Dashboard", icon: "/icons/todos.png" },
              { id: "entidades", label: "Entidades", icon: "/icons/book.png" },
              { id: "solicitudes", label: "Solicitudes", icon: "/icons/mail.png" },
              { id: "nuevo-editar", label: "Nueva Entidad", icon: "/icons/add.png" },
              { id: "nuevo-recorrido", label: "Recorridos", icon: "/icons/route.png" },
              { id: "nuevo-recorrido-form", label: "Nuevo Recorrido", icon: "/icons/add.png" },
              { id: "localidades", label: "Localidades", icon: "/icons/location.png" },
              { id: "palabras", label: "Palabras", icon: "/icons/edit.png" },
            ].map((item) => (
              <button
                key={item.id}
                className="admin-nav-btn"
                onClick={() => {
                  if (item.id === "nuevo-editar") resetWizard();
                  if (item.id === "nuevo-recorrido") { resetRecForm(); setView(item.id); }
                  else if (item.id === "nuevo-recorrido-form") { resetRecForm(); setEditingRecorridoId("new"); setView("nuevo-recorrido"); }
                  else setView(item.id);
                }}
                  style={{
                    ...styles.navBtn,
                    background:
                      item.id === "entidades" && view === "nuevo-editar" && editingEntityId
                        ? "#f0ede8"
                      : item.id === "nuevo-recorrido" && view === "nuevo-recorrido" && editingRecorridoId !== "new"
                        ? "#f0ede8"
                      : item.id === "nuevo-recorrido-form" && view === "nuevo-recorrido" && editingRecorridoId === "new"
                        ? "#f0ede8"
                      : view === item.id && !(item.id === "nuevo-editar" && editingEntityId)
                        ? "#f0ede8"
                        : "transparent",
                    color:
                      item.id === "entidades" && view === "nuevo-editar" && editingEntityId
                        ? "#863819"
                      : item.id === "nuevo-recorrido" && view === "nuevo-recorrido" && editingRecorridoId !== "new"
                        ? "#863819"
                      : item.id === "nuevo-recorrido-form" && view === "nuevo-recorrido" && editingRecorridoId === "new"
                        ? "#863819"
                      : view === item.id && !(item.id === "nuevo-editar" && editingEntityId)
                        ? "#863819"
                        : "#555",
                  }}
              >
                <img src={item.icon} style={{ width: "18px", height: "18px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
                {item.label}
              </button>
            ))}
          </div>
          <button onClick={logout} className="admin-logout-btn" style={styles.logoutBtn}>
            <img src="/icons/logout.png" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle" }} alt="" />
            CERRAR SESIÓN
          </button>
        </div>

        {/* CONTENT */}
        <div style={styles.contentArea}>
          <div style={styles.viewContainer}>
            {view === "entidades" && (
              <>
                <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f5f2eb", paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={styles.sectionTitle}>
                    <img src="/icons/book.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
                    Entidades
                  </h2>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button onClick={cargarEntidades} className="admin-btn" style={{ background: "#d4a017", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                      <img src="/icons/refresh.png" style={{ width: "14px", height: "14px" }} alt="" />
                      ACTUALIZAR
                    </button>
                    <button
                      onClick={() => {
                        resetWizard();
                        setView("nuevo-editar");
                      }}
                      className="admin-btn"
                      style={{ ...styles.btnPrimary, background: "#2e7d32" }}
                    >
                      + NUEVA
                    </button>
                  </div>
                </div>
                {allEntities.length === 0 && (
                  <div style={{ color: "#888", fontSize: "14px", padding: "40px", textAlign: "center" }}>
                    No hay entidades todavía
                  </div>
                )}
                {(() => {
                  const grupos = {};
                  for (const e of allEntities) {
                    if (!grupos[e.tipo]) grupos[e.tipo] = [];
                    grupos[e.tipo].push(e);
                  }
                  const tipoLabels = {
                    artesano: "Artesanos",
                    gastronomia: "Gastronomía",
                    comercio: "Comercios",
                    evento: "Eventos",
                    patrimonio: "Patrimonios",
                    personalidad: "Personalidades",
                    comunidad_indigena: "Comunidades Indígenas",
                    lugar_natural: "Lugares Naturales",
                    hospedaje: "Hospedajes",
                    productor: "Productores",
                    experiencia: "Experiencias",
                    relato: "Relatos",
                    espacio_cultural: "Espacios Culturales",
                  };
                  const tipoOrden = ["artesano", "gastronomia", "comercio", "evento", "patrimonio", "personalidad", "comunidad_indigena", "lugar_natural", "hospedaje", "productor", "experiencia", "relato", "espacio_cultural"];
                  return tipoOrden.map((tipo) => {
                    const items = grupos[tipo];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={tipo} style={{ marginBottom: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", padding: "0 4px" }}>
                          <img src={`/icons/${tipo}.png`} style={{ width: "20px", height: "20px" }} alt="" />
                          <span style={{ fontWeight: 700, fontSize: "14px", color: colorMapAdmin[tipo] || "#555", textTransform: "uppercase", letterSpacing: "1px" }}>
                            {tipoLabels[tipo] || tipo}
                          </span>
                          <span style={{ fontSize: "12px", color: "#ccc" }}>({items.length})</span>
                        </div>
                        {items.map((e) => (
                          <div key={e.id} style={styles.entityCard}>
                            <div
                              style={{
                                width: "10px",
                                height: "10px",
                                borderRadius: "50%",
                                background: colorMapAdmin[e.tipo] || "#ccc",
                                flexShrink: 0,
                              }}
                            />
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 700, fontSize: "15px", color: "#1c1c18" }}>
                                  {e.nombre}
                                </span>
                                {e.estado_sello === "pendiente" && <span style={{ fontSize: "10px", fontWeight: 700, background: "#f39c12", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>PENDIENTE</span>}
                                {e.estado_sello === "rechazado" && <span style={{ fontSize: "10px", fontWeight: 700, background: "#c62828", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>RECHAZADO</span>}
                                {e.estado_sello === "aprobado" && e.visible && (e.latitud == null || e.longitud == null) && <span style={{ fontSize: "10px", fontWeight: 700, background: "#e67e22", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>REVISAR MAPA</span>}
                                {e.estado_pago === "atrasado" && <span style={{ fontSize: "10px", fontWeight: 700, background: "#c62828", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>DEUDA</span>}
                                {e.fecha_fin_suscripcion && (() => {
                                  try {
                                    const d = new Date();
                                    const hoy = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                    const fin = e.fecha_fin_suscripcion.split('T')[0];
                                    if (fin < hoy) return <span style={{ fontSize: "10px", fontWeight: 700, background: "#c62828", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>VENCIDA</span>;
                                  } catch {}
                                  return null;
                                })()}
                                {e.fecha_fin_suscripcion && e.estado_pago === "al_dia" && (() => {
                                  try {
                                    const d = new Date();
                                    const hoy = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                    const fin = e.fecha_fin_suscripcion.split('T')[0];
                                    const diff = Math.ceil((new Date(fin + 'T23:59:59') - new Date(hoy + 'T00:00:00')) / 86400000);
                                    if (diff >= 0 && diff <= 30) return <span style={{ fontSize: "10px", fontWeight: 700, background: "#f39c12", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>PRÓXIMO A VENCER ({diff}d)</span>;
                                  } catch {}
                                  return null;
                                })()}
                                {e.tipo === "evento" && e.fecha_evento && (() => {
                                  const d = new Date();
                                  const hoy = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                                  const fe = e.fecha_evento.split('T')[0];
                                  if (fe < hoy) return <span style={{ fontSize: "10px", fontWeight: 700, background: "#e74c3c", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>VENCIDO</span>;
                                  const diff = Math.ceil((new Date(fe + 'T23:59:59') - new Date(hoy + 'T00:00:00')) / 86400000);
                                  if (diff <= 7) return <span style={{ fontSize: "10px", fontWeight: 700, background: "#f39c12", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>PRONTO ({diff}d)</span>;
                                  return <span style={{ fontSize: "10px", fontWeight: 700, background: "#2e7d32", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>FALTAN {diff}d</span>;
                                })()}
                              </div>
                              <div style={{ fontSize: "11px", color: "#999", textTransform: "capitalize" }}>
                                {e.tipo}
                              </div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "4px", cursor: "pointer", fontSize: "10px", fontWeight: 600, color: e.visible ? "#2e7d32" : "#999", userSelect: "none" }}
                                onClick={async (ev) => {
                                  ev.stopPropagation();
                                  const nuevo = !e.visible;
                                  try {
                                    const res = await authFetch(`/api/entidades/${e.id}/visible`, {
                                      method: "PATCH",
                                      headers: authHeaders({ "Content-Type": "application/json" }),
                                      body: JSON.stringify({ visible: nuevo }),
                                    });
                                    if (res.ok) {
                                      setAllEntities((prev) => prev.map((ent) => ent.id === e.id ? { ...ent, visible: nuevo } : ent));
                                    }
                                  } catch {}
                                }}
                              >
                                <div style={{
                                  width: 32, height: 18, borderRadius: 9, background: e.visible ? "#2e7d32" : "#ccc",
                                  position: "relative", transition: "0.2s", cursor: "pointer",
                                }}>
                                  <div style={{
                                    width: 14, height: 14, borderRadius: "50%", background: "white",
                                    position: "absolute", top: 2, left: e.visible ? 16 : 2, transition: "0.2s",
                                  }} />
                                </div>
                                MAPA
                              </label>
                            </div>
                            {e.estado_sello !== "pendiente" && (
                              <>
                                {e.estado_sello !== "rechazado" && (
                                  <>
                                    <button
                                      onClick={() => cargarEntidadParaEditar(e.id)}
                                      className="admin-btn-ghost"
                                      style={styles.smallBtn("#863819")}
                                    >
                                      <img src="/icons/edit.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                                      EDITAR
                                    </button>
                                    <button
                                      onClick={() => abrirConexModal(e)}
                                      className="admin-btn-ghost"
                                      style={styles.smallBtn("#2e7d32")}
                                    >
                                      <img src="/icons/link.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                                      CONEXIÓN
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => eliminarEntidad(e.id, e.nombre)}
                                  className="admin-btn-danger"
                                  style={styles.smallBtn("#c0392b")}
                                >
                                  <img src="/icons/delete.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                                  ELIMINAR
                                </button>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  });
                })()}

                {/* Modal conexiones */}
                {conexModal && (
                  <div style={{
                    position: "fixed", inset: 0, zIndex: 1000,
                    background: "rgba(0,0,0,0.4)", display: "flex",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{
                      background: "white", borderRadius: 16, padding: 28,
                      width: "90%", maxWidth: 520, maxHeight: "80vh",
                      overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h3 style={{ margin: 0, fontSize: 18, color: "#1c1c18" }}>
                          <img src="/icons/link.png" style={{ width: "20px", height: "20px", verticalAlign: "middle", marginRight: 8 }} alt="" />
                          Conexiones: {conexModal.nombre}
                        </h3>
                        <button onClick={() => setConexModal(null)}
                          style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#888" }}>
                          ✕
                        </button>
                      </div>

                      {/* Search */}
                      <input
                        placeholder="Buscar entidad para conectar..."
                        value={conexSearch}
                        onChange={(e) => {
                          const q = e.target.value;
                          setConexSearch(q);
                          if (q.length < 2) { setConexResults([]); return; }
                          const lower = q.toLowerCase();
                          setConexResults(
                            allEntities.filter(
                              (ent) =>
                                ent.id !== conexModal.id &&
                                ent.nombre.toLowerCase().includes(lower) &&
                                !conexTempList.find((c) => c.entidad_destino_id === ent.id),
                            ),
                          );
                        }}
                        style={{
                          width: "100%", padding: "10px 14px", borderRadius: 10,
                          border: "1px solid #ddd", fontSize: 14, color: "#1c1c18",
                          background: "#f9f9f9", marginBottom: 8, boxSizing: "border-box",
                        }}
                      />

                      {/* Search results */}
                      {conexResults.length > 0 && (
                        <div style={{ marginBottom: 12, border: "1px solid #eee", borderRadius: 10, maxHeight: 180, overflowY: "auto" }}>
                          {conexResults.map((r) => (
                            <div key={r.id}
                              onClick={() => {
                                setConexTempList((prev) => [...prev, { entidad_destino_id: r.id, nombre: r.nombre, tipo_relacion: "" }]);
                                setConexResults([]);
                                setConexSearch("");
                              }}
                              style={{
                                padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "#1c1c18",
                                borderBottom: "1px solid #f5f2eb", display: "flex", justifyContent: "space-between", alignItems: "center",
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#f5f2eb"}
                              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                            >
                              <span style={{ color: "#1c1c18" }}>{r.nombre}</span>
                              <span style={{ fontSize: 11, color: colorMapAdmin[r.tipo] || "#888", textTransform: "capitalize" }}>{r.tipo}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Current connections */}
                      {conexTempList.length === 0 && (
                        <p style={{ color: "#999", fontSize: 13, textAlign: "center", margin: "20px 0" }}>
                          Sin conexiones aún
                        </p>
                      )}
                      {conexTempList.map((c, i) => (
                        <div key={c.entidad_destino_id} style={{
                          display: "flex", gap: 6, alignItems: "center",
                          padding: "10px 12px", marginBottom: 6,
                          background: "#f5f2eb", borderRadius: 10, flexWrap: "wrap",
                        }}>
                          <span style={{ flex: "0 0 auto", fontSize: 14, fontWeight: 600, color: "#1c1c18", minWidth: 80 }}>{c.nombre}</span>
                          <input
                            placeholder="Relación (esta → destino)"
                            value={c.tipo_relacion}
                            onChange={(e) => {
                              const next = [...conexTempList];
                              next[i] = { ...next[i], tipo_relacion: e.target.value };
                              setConexTempList(next);
                            }}
                            style={{
                              flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6,
                              border: "1px solid #ddd", fontSize: 11, color: "#1c1c18",
                              background: "white",
                            }}
                            title="Relación desde la entidad actual hacia la entidad destino"
                          />
                          <input
                            placeholder="Relación (destino → esta)"
                            value={c.tipo_relacion_inversa || ""}
                            onChange={(e) => {
                              const next = [...conexTempList];
                              next[i] = { ...next[i], tipo_relacion_inversa: e.target.value };
                              setConexTempList(next);
                            }}
                            style={{
                              flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6,
                              border: "1px solid #ddd", fontSize: 11, color: "#1c1c18",
                              background: "white",
                            }}
                            title="Relación desde la entidad destino hacia la entidad actual"
                          />
                          <button onClick={() => setConexTempList((prev) => prev.filter((_, idx) => idx !== i))}
                            style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 16, padding: 4 }}>
                            ✕
                          </button>
                        </div>
                      ))}

                      {/* Actions */}
                      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                        <button onClick={() => setConexModal(null)}
                          className="admin-btn-ghost"
                          style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #ccc", background: "white", color: "#555", cursor: "pointer", fontSize: 14 }}>
                          CANCELAR
                        </button>
                        <button onClick={guardarConexModal}
                          disabled={conexSaving}
                          className="admin-btn"
                          style={{
                            flex: 1, padding: "10px", borderRadius: 10, border: "none",
                            background: conexSaving ? "#999" : "#2e7d32", color: "#fff",
                            cursor: conexSaving ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700,
                          }}>
                          {conexSaving ? "GUARDANDO…" : "GUARDAR"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {view === "nuevo-editar" && (
              <div className="nueva-container">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                    {editingEntityId ? (
                      <><img src="/icons/edit.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" /> Editar: {general.nombre || "..."}</>
                    ) : (
                      <><img src="/icons/add.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" /> Nueva Entidad</>
                    )}
                  </h2>
                </div>

                {/* Stepper */}
                <div style={styles.stepperNav}>
                  {["Datos", "Detalles", "Multimedia", "Suscripción"].map((label, idx) => {
                    const stepNum = idx + 1;
                    return (
                      <div key={label} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div
                          style={{
                            ...styles.dot,
                            background: step === stepNum ? "#863819" : step > stepNum ? "#2e7d32" : "#ddd",
                            cursor: stepNum < step ? "pointer" : "default",
                          }}
                          onClick={() => stepNum < step && setStep(stepNum)}
                        >
                          {step > stepNum ? "✓" : stepNum}
                        </div>
                        <span style={{ fontSize: "12px", fontWeight: step === stepNum ? 700 : 400, color: "#555" }}>
                          {label}
                        </span>
                        {stepNum < 4 && (
                          <span style={{ color: "#ddd", fontSize: "18px" }}>→</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* PASO 1 */}
                {step === 1 && (
                  <div className="fade-in" style={{ background: "white", borderRadius: "12px", padding: "24px", border: "1px solid #eee" }}>
                    <h3 style={{ fontSize: "16px", color: "#863819", marginBottom: "16px", fontFamily: "Cinzel, serif" }}>
                      Datos generales
                    </h3>
                    <select
                      style={styles.input}
                      value={general.tipo}
                      onChange={(e) => setGeneral((g) => ({ ...g, tipo: e.target.value }))}
                    >
                      <option value="">Seleccionar tipo...</option>
                      <option value="artesano">Artesano</option>
                      <option value="gastronomia">Gastronomía</option>
                      <option value="comercio">Comercio</option>
                      <option value="evento">Evento</option>
                      <option value="patrimonio">Patrimonio</option>
                      <option value="personalidad">Personalidad</option>
                      <option value="comunidad_indigena">Comunidad Indígena</option>
                      <option value="lugar_natural">Lugar Natural</option>
                      <option value="hospedaje">Hospedaje</option>
                      <option value="productor">Productor</option>
                      <option value="experiencia">Experiencia</option>
                      <option value="relato">Relato</option>
                      <option value="espacio_cultural">Espacio Cultural</option>
                    </select>
                    <input
                      style={styles.input}
                      placeholder="Nombre"
                      value={general.nombre}
                      onChange={(e) => setGeneral((g) => ({ ...g, nombre: e.target.value }))}
                    />
                    <input
                      style={{ ...styles.input, color: "#863819", fontWeight: "bold" }}
                      value={general.slug}
                      readOnly
                    />
                    <textarea
                      style={styles.input}
                      placeholder="Resumen breve"
                      value={general.resumen}
                      onChange={(e) => setGeneral((g) => ({ ...g, resumen: e.target.value }))}
                    />
                    <select
                      style={styles.input}
                      onChange={handleLocalidadChange}
                      value={general.localidad_id}
                    >
                      <option value="">Seleccionar Localidad...</option>
                      {localidades.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.nombre}
                        </option>
                      ))}
                    </select>
                    <div style={{ position: "relative", marginBottom: "12px" }}>
                      <input
                        style={styles.input}
                        placeholder="Ej: San Martín 123, Resistencia..."
                        value={geoQuery}
                        onChange={(e) => {
                          setGeoQuery(e.target.value);
                          if (e.target.value.length < 3) { setGeoResults([]); return; }
                          clearTimeout(geoTimeoutRef.current);
                          geoTimeoutRef.current = setTimeout(async () => {
                            try {
                              const q = e.target.value.includes(",") ? e.target.value : `${e.target.value}, Chaco, Argentina`;
                              const r = await authFetch(
                                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5&countrycodes=ar`,
                                { headers: { "User-Agent": "MadeInChaco/1.0", "Accept-Language": "es" } },
                              );
                              if (!r.ok) return;
                              const data = await r.json();
                              setGeoResults(data);
                            } catch {}
                          }, 400);
                        }}
                        onFocus={() => geoResults.length > 0 && setGeoResults(geoResults)}
                      />
                      {geoResults.length > 0 && (
                        <div style={{
                          position: "absolute", top: "100%", left: 0, right: 0,
                          background: "white", border: "1px solid #eee",
                          borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                          zIndex: 100, maxHeight: "200px", overflowY: "auto",
                        }}>
                          {geoResults.map((r, i) => (
                            <div key={i} style={{
                              padding: "10px 14px", cursor: "pointer", fontSize: "14px",
                              color: "#1c1c18", borderBottom: "1px solid #f5f2eb",
                            }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                clearTimeout(geoTimeoutRef.current);
                                const lat = parseFloat(r.lat);
                                const lon = parseFloat(r.lon);
                                setGeneral((g) => ({ ...g, latitud: lat, longitud: lon, direccion_escrita: r.display_name }));
                                if (map.current) {
                                  map.current.flyTo({ center: [lon, lat], zoom: 14, speed: 1 });
                                  marker.current?.setLngLat([lon, lat]);
                                }
                                setGeoQuery(r.display_name);
                                setGeoResults([]);
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
                    <div style={{ position: "relative", marginBottom: "12px" }}>
                      <div
                        ref={mapContainer}
                        style={{
                          height: "250px",
                          borderRadius: "12px",
                          overflow: "hidden",
                        }}
                      />
                      <div style={{ position: "absolute", bottom: "10px", right: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                        <button
                          onClick={() => map.current?.zoomIn()}
                          className="admin-btn-ghost"
                          style={{
                            width: "36px", height: "36px", background: "white",
                            border: "1px solid #e0ddd6", borderRadius: "8px",
                            color: "#863819", fontSize: "18px", fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >+</button>
                        <button
                          onClick={() => map.current?.zoomOut()}
                          className="admin-btn-ghost"
                          style={{
                            width: "36px", height: "36px", background: "white",
                            border: "1px solid #e0ddd6", borderRadius: "8px",
                            color: "#863819", fontSize: "18px", fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >−</button>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <label style={{ fontSize: "13px", color: "#555", display: "flex", alignItems: "center", gap: "6px" }}>
                        <input
                          type="checkbox"
                          checked={general.visible}
                          onChange={(e) => setGeneral((g) => ({ ...g, visible: e.target.checked }))}
                        />
                        Visible en el mapa
                      </label>
                      <button
                        style={general.nombre && general.tipo ? { ...styles.btnNext, background: "#2e7d32", width: "100%" } : { ...styles.btnNext, background: "#2e7d32", width: "100%", opacity: 0.5, cursor: "not-allowed" }}
                        className="admin-btn"
                        disabled={!general.nombre || !general.tipo}
                        onClick={() => setStep(2)}
                      >
                        SIGUIENTE: DETALLES →
                      </button>
                    </div>
                  </div>
                )}

                {/* PASO 2 */}
                {step === 2 && (
                  <div
                    className="fade-in"
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "24px",
                      border: "1px solid #eee",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        color: "#1c1c18",
                        marginBottom: "16px",
                      }}
                    >
                      Detalles de {general.tipo}
                    </h3>
                    {renderFormDetalle()}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    <button
                      onClick={() => setStep(1)}
                      className="admin-btn-ghost"
                      style={styles.btnSecondary}
                    >
                      ← VOLVER
                    </button>
                    <button className="admin-btn" style={{ ...styles.btnNext, background: "#2e7d32", width: "100%" }} onClick={() => {
                        setDetailError("");

                        if (general.tipo === "comercio" || general.tipo === "evento") {
                          const required = [
                            ["razon_social", "Razón social"],
                            ["cuit", "CUIT"],
                          ];
                          if (general.tipo === "comercio") {
                            required.push(["rubro_especifico", "Rubro específico"], ["horario_apertura", "Horario apertura"], ["horario_cierre", "Horario cierre"]);
                          }
                          const missing = required.filter(([k]) => !especifico[k]?.trim());
                          if (missing.length > 0) {
                            showPopup("Completá los campos requeridos: " + missing.map(([,l]) => l).join(", "), "warning");
                            return;
                          }
                        }

                        setStep(3);
                      }}>
                        SIGUIENTE: MULTIMEDIA →
                      </button>
                    {detailError && <p style={{ color: "#e74c3c", fontSize: "12px", margin: 0 }}>{detailError}</p>}
                    </div>
                  </div>
                )}

                {/* PASO 3 */}
                {step === 3 && (
                  <div className="fade-in media-step-container">
                    <h3
                      style={{
                        fontSize: "18px",
                        color: "#1c1c18",
                        marginBottom: "16px",
                      }}
                    >
                      Multimedia
                    </h3>
                    <div className="media-step-list">
                      {multimediaItems.map((item, i) => (
                        <div
                          key={i}
                          style={{
                            background: i === 0 ? "#fff" : "#f9f7f4",
                            borderRadius: "12px",
                            padding: "12px",
                            marginBottom: "10px",
                            border: i === 0
                              ? "2px solid #863819"
                              : item.es_principal
                                ? "2px solid #863819"
                                : "1px solid #eee",
                            position: "relative",
                          }}
                        >
                          {i === 0 ? (
                            <span style={{ ...styles.principalBadge, background: "#2d1a12" }}>ENCABEZADO</span>
                          ) : item.es_principal ? (
                            <span style={styles.principalBadge}>PRINCIPAL</span>
                          ) : null}
                          {i === 0 ? (
                            <div style={{ marginBottom: "8px" }}>
                              <input
                                style={styles.input}
                                value="📷 Foto"
                                disabled
                              />
                            </div>
                          ) : (
                            <select
                              style={styles.input}
                              value={item.tipo_recurso}
                              disabled={item.es_principal}
                              onChange={(e) =>
                                handleMultimediaChange(i, "tipo_recurso", e.target.value)
                              }
                            >
                              <option value="foto">📷 Foto</option>
                              <option value="video">🎥 Video</option>
                              <option value="audio">🎵 Audio</option>
                            </select>
                          )}

                          <div className="media-upload-area">
                            <div className="media-format-info">
                              {i === 0
                                ? "🖼️ JPEG, PNG, WebP — Mín. 1920×1080px (16:9)"
                                : <>{INFO_FORMATOS[item.tipo_recurso].icono} {INFO_FORMATOS[item.tipo_recurso].formatos} — {INFO_FORMATOS[item.tipo_recurso].resolucion}</>
                              }
                            </div>

                            <label className="media-upload-btn">
                              {uploadingIndex === i ? (
                                <>⏳ SUBIENDO…</>
                              ) : item.url_recurso ? (
                                <>✅ ARCHIVO SUBIDO</>
                              ) : i === 0 ? (
                                <>📷 SELECCIONAR FOTO PRINCIPAL</>
                              ) : (
                                <>📁 SELECCIONAR ARCHIVO</>
                              )}
                              <input
                                type="file"
                                className="media-file-input"
                                accept={
                                  item.tipo_recurso === "foto"
                                    ? "image/jpeg,image/png,image/webp"
                                    : item.tipo_recurso === "video"
                                      ? "video/mp4,video/webm"
                                      : "audio/mpeg,audio/wav,audio/ogg"
                                }
                                disabled={uploadingIndex !== null}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileSelect(i, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>

                          </div>

                          {item.url_recurso && item.tipo_recurso === "foto" && (
                            <div style={{ marginTop: 10, borderRadius: 8, overflow: "hidden", border: "1px solid #eee" }}>
                              <img src={item.url_recurso} alt="Vista previa" style={{ width: "100%", maxHeight: 300, objectFit: "contain", display: "block", background: "#f5f2eb" }} />
                            </div>
                          )}

                          {item.tipo_recurso === "audio" && (
                            <div className="media-thumb-section">
                              <div className="media-thumb-label">
                                🖼️ Portada para el audio
                              </div>
                              {item.thumbnail_url ? (
                                <div className="media-thumb-preview">
                                  <img src={item.thumbnail_url} alt="Portada" />
                                  <label className="media-thumb-change" style={{ cursor: "pointer" }}>
                                    CAMBIAR
                                    <input
                                      type="file"
                                      className="media-file-input"
                                      accept="image/jpeg,image/png,image/webp"
                                      disabled={uploadingIndex !== null}
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleThumbnailUpload(i, f);
                                        e.target.value = "";
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <label className="media-upload-btn media-thumb-btn">
                                  {uploadingIndex === i ? "⏳ SUBIENDO…" : "📁 SELECCIONAR PORTADA"}
                                  <input
                                    type="file"
                                    className="media-file-input"
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={uploadingIndex !== null}
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleThumbnailUpload(i, f);
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          )}

                          <input
                            style={styles.input}
                            placeholder="Título alternativo"
                            value={item.titulo_alternativo}
                            onChange={(e) =>
                              handleMultimediaChange(i, "titulo_alternativo", e.target.value)
                            }
                          />
                          <textarea
                            style={{ ...styles.input, minHeight: "60px" }}
                            placeholder="Descripción del recurso"
                            value={item.descripcion_recurso}
                            onChange={(e) =>
                              handleMultimediaChange(i, "descripcion_recurso", e.target.value)
                            }
                          />

                          {i > 0 && (
                            <div className="media-tags-section">
                              <div className="media-tags-header">
                                <span>🏷️ Entidades etiquetadas</span>
                                {(item.tipo_recurso === "video" || item.tipo_recurso === "audio") && (
                                  <span className="media-tags-hint">Marcá el segundo en que aparecen</span>
                                )}
                              </div>
                              {(item.entidades_etiquetadas || []).length > 0 && (
                                <div className="media-tags-list">
                                  {item.entidades_etiquetadas.map((tag, tagIdx) => (
                                    <div key={tagIdx} className="media-tag-chip">
                                      <span className="media-tag-chip-name">{tag.nombre}</span>
                                      <span className="media-tag-chip-tipo" style={{ color: colorMapAdmin[tag.tipo] || "#863819" }}>
                                        {tag.tipo}
                                      </span>
                                      {(item.tipo_recurso === "video" || item.tipo_recurso === "audio") && (
                                        <input
                                          type="number"
                                          step="0.1"
                                          min="0"
                                          placeholder="seg"
                                          className="media-tag-timestamp"
                                          value={tag.timestamp_inicio ?? ""}
                                          onChange={(e) => {
                                            const updated = [...multimediaItems];
                                            const tags = [...(updated[i].entidades_etiquetadas || [])];
                                            tags[tagIdx] = {
                                              ...tags[tagIdx],
                                              timestamp_inicio: e.target.value ? parseFloat(e.target.value) : null,
                                            };
                                            updated[i] = { ...updated[i], entidades_etiquetadas: tags };
                                            setMultimediaItems(updated);
                                          }}
                                        />
                                      )}
                                      <button
                                        className="media-tag-remove"
                                        onClick={() => {
                                          const updated = [...multimediaItems];
                                          updated[i] = {
                                            ...updated[i],
                                            entidades_etiquetadas: (updated[i].entidades_etiquetadas || []).filter((_, ti) => ti !== tagIdx),
                                          };
                                          setMultimediaItems(updated);
                                        }}
                                        title="Quitar"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <div className="media-tag-search">
                                <div className="media-tag-filters">
                                  <select
                                    className="media-tag-type-select"
                                    value={tagTypeFilters[i] || ""}
                                    onChange={(e) => {
                                      setTagTypeFilters((prev) => ({ ...prev, [i]: e.target.value }));
                                    }}
                                  >
                                    <option value="">Todos los tipos</option>
                                    {["artesano", "gastronomia", "comercio", "evento", "patrimonio", "personalidad", "comunidad_indigena", "lugar_natural", "hospedaje", "productor", "experiencia", "relato", "espacio_cultural"].map((t) => (
                                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                                    ))}
                                  </select>
                                  <input
                                    type="text"
                                    placeholder="Buscar entidad para etiquetar..."
                                    className="media-tag-search-input"
                                    value={tagSearchQueries[i] || ""}
                                    onChange={(e) => {
                                      setTagSearchQueries((prev) => ({ ...prev, [i]: e.target.value }));
                                    }}
                                  />
                                </div>
                                {(tagSearchQueries[i]?.trim() || tagTypeFilters[i]) && (
                                  <div className="media-tag-results">
                                    {(() => {
                                      const filtered = allEntities.filter(
                                        (e) =>
                                          !(item.entidades_etiquetadas || []).some(
                                            (t) => t.entidad_id === e.id,
                                          ) &&
                                          (!tagSearchQueries[i]?.trim() || e.nombre.toLowerCase().includes(tagSearchQueries[i].toLowerCase())) &&
                                          (!tagTypeFilters[i] || e.tipo === tagTypeFilters[i]),
                                      );
                                      const grouped = {};
                                      const typeOrder = ["artesano", "gastronomia", "comercio", "evento", "patrimonio", "personalidad", "comunidad_indigena", "lugar_natural", "hospedaje", "productor", "experiencia", "relato", "espacio_cultural"];
                                      filtered.forEach((e) => {
                                        if (!grouped[e.tipo]) grouped[e.tipo] = [];
                                        grouped[e.tipo].push(e);
                                      });
                                      const hasResults = Object.keys(grouped).length > 0;
                                      return hasResults ? (
                                        typeOrder.filter((t) => grouped[t]).map((tipo) => (
                                          <div key={tipo} className="media-tag-type-group">
                                            <div className="media-tag-type-group-header">
                                              <span style={{ color: colorMapAdmin[tipo] || "#863819" }}>{tipo.charAt(0).toUpperCase() + tipo.slice(1)}</span>
                                              <span className="media-tag-type-count">{grouped[tipo].length}</span>
                                            </div>
                                            {grouped[tipo].slice(0, 10).map((e) => (
                                              <button
                                                key={e.id}
                                                className="media-tag-result"
                                                onClick={() => {
                                                  const updated = [...multimediaItems];
                                                  const tags = [...(updated[i].entidades_etiquetadas || [])];
                                                  tags.push({
                                                    entidad_id: e.id,
                                                    nombre: e.nombre,
                                                    tipo: e.tipo,
                                                    timestamp_inicio: null,
                                                    timestamp_fin: null,
                                                  });
                                                  updated[i] = { ...updated[i], entidades_etiquetadas: tags };
                                                  setMultimediaItems(updated);
                                                  setTagSearchQueries((prev) => ({ ...prev, [i]: "" }));
                                                  setTagTypeFilters((prev) => ({ ...prev, [i]: "" }));
                                                }}
                                              >
                                                <span>{e.nombre}</span>
                                                <span className="media-tag-result-tipo" style={{ color: colorMapAdmin[e.tipo] || "#863819" }}>
                                                  {e.tipo}
                                                </span>
                                              </button>
                                            ))}
                                          </div>
                                        ))
                                      ) : (
                                        <div className="media-tag-no-results">Sin resultados</div>
                                      );
                                    })()}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {multimediaItems.length > 1 && !item.es_principal && (
                            <button
                              onClick={() => removeMultimediaItem(i)}
                              className="admin-btn-danger"
                              style={{
                                background: "none",
                                border: "1px solid #e74c3c",
                                color: "#e74c3c",
                                padding: "4px 10px",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontSize: "11px",
                              }}
                            >
                              ✕ ELIMINAR
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button onClick={addMultimediaItem} className="admin-btn-ghost" style={styles.btnSecondary}>
                      + AGREGAR OTRO ARCHIVO
                    </button>

                    {multimediaError && (
                      <div style={{ color: "#e74c3c", fontSize: "13px", marginTop: "8px" }}>
                        {multimediaError}
                      </div>
                    )}

                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                      <button onClick={() => setStep(2)} className="admin-btn-ghost" style={{ ...styles.btnSecondary, width: "100%" }}>
                        ← VOLVER
                      </button>
                      <button
                        onClick={() => setStep(4)}
                        disabled={uploadingIndex !== null}
                        className="admin-btn"
                        style={{
                          ...styles.btnNext,
                          background: "#2e7d32",
                          width: "100%",
                          opacity: uploadingIndex !== null ? 0.6 : 1,
                          cursor: uploadingIndex !== null ? "not-allowed" : "pointer",
                        }}
                      >
                        SIGUIENTE: SUSCRIPCIÓN →
                      </button>
                    </div>
                  </div>
                )}

                {/* PASO 4 */}
                {step === 4 && (
                  <div className="fade-in" style={{ background: "white", borderRadius: "12px", padding: "24px", border: "1px solid #eee" }}>
                    <h3 style={{ fontSize: "18px", color: "#1c1c18", marginBottom: "16px" }}>
                      Suscripción de {general.tipo}
                    </h3>
                    {(general.tipo === "comercio" || general.tipo === "evento") && (
                      <p style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>
                        Membresía opcional para {general.tipo === "comercio" ? "comercios" : "eventos privados/comerciales"}.
                      </p>
                    )}
                    {(general.tipo === "hospedaje" || general.tipo === "productor") && (
                      <p style={{ fontSize: "12px", color: "#b85c2a", marginBottom: "12px" }}>
                        Suscripción obligatoria para {general.tipo === "hospedaje" ? "hospedajes" : "productores"}.
                      </p>
                    )}
                    {![ "comercio", "evento", "hospedaje", "productor" ].includes(general.tipo) && (
                      <p style={{ fontSize: "12px", color: "#999", marginBottom: "12px", fontStyle: "italic" }}>
                        Este tipo de entidad no requiere suscripción.
                      </p>
                    )}
                    {[ "comercio", "evento", "hospedaje", "productor" ].includes(general.tipo) && (
                      <>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <div style={{ flex: 1, marginBottom: "10px" }}>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Inicio suscripción</label>
                            <input type="date" style={styles.input} value={especifico.fecha_inicio_suscripcion || ""} onChange={(e) => onFieldChange("fecha_inicio_suscripcion", e.target.value)} />
                          </div>
                          <div style={{ flex: 1, marginBottom: "10px" }}>
                            <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Fin suscripción</label>
                            <input type="date" style={styles.input} value={especifico.fecha_fin_suscripcion || ""} onChange={(e) => onFieldChange("fecha_fin_suscripcion", e.target.value)} />
                          </div>
                        </div>
                        <div style={{ marginBottom: "10px" }}>
                          <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Estado de suscripción</label>
                          <select style={styles.input} value={especifico.estado_pago || ""} onChange={(e) => onFieldChange("estado_pago", e.target.value)}>
                            <option value="">{general.tipo === "evento" ? "Sin membresía (evento libre)" : "Seleccionar..."}</option>
                            <option value="al_dia">Al día</option>
                            <option value="atrasado">Atrasado</option>
                          </select>
                        </div>
                      </>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
                      <button onClick={() => setStep(3)} className="admin-btn-ghost" style={{ ...styles.btnSecondary, width: "100%" }}>
                        ← VOLVER
                      </button>
                      <button
                        onClick={guardarEntidad}
                        disabled={loading || uploadingIndex !== null}
                        className="admin-btn"
                        style={{
                          ...styles.btnPrimary,
                          opacity: loading || uploadingIndex !== null ? 0.6 : 1,
                          cursor: loading || uploadingIndex !== null ? "not-allowed" : "pointer",
                          background: "#2e7d32",
                          width: "100%",
                        }}
                      >
                        {loading ? "GUARDANDO…" : editingEntityId ? "ACTUALIZAR ENTIDAD" : "CREAR ENTIDAD"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SOLICITUDES */}
            {view === "solicitudes" && (
              <div>
                <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f5f2eb", paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={styles.sectionTitle}>
                    <img src="/icons/mail.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
                    Solicitudes de Sello
                  </h2>
                  <button onClick={cargarSolicitudes} className="admin-btn" style={{ background: "#d4a017", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                    <img src="/icons/refresh.png" style={{ width: "14px", height: "14px" }} alt="" />
                    ACTUALIZAR
                  </button>
                </div>

                {solicitudesLoading ? (
                  <div style={{ color: "#888", fontSize: "14px", padding: "40px", textAlign: "center" }}>Cargando solicitudes…</div>
                ) : solicitudes.length === 0 ? (
                  <div style={{ color: "#888", fontSize: "14px", padding: "40px", textAlign: "center" }}>No hay solicitudes pendientes</div>
                ) : (
                  solicitudes.map((sol) => {
                    const esComercial = ["comercio", "hospedaje", "productor", "evento"].includes(sol.tipo);
                    return (
                      <div key={sol.id} style={{ background: "white", borderRadius: "12px", padding: "14px 18px", marginBottom: "8px", border: "1px solid #eee", display: "flex", alignItems: "center", gap: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)", color: "#000" }}>
                        <img src={`/icons/${sol.tipo}.png`} style={{ width: "28px", height: "28px", flexShrink: 0 }} alt="" />
                        <div style={{ flex: 1, color: "#000" }}>
                          <div style={{ fontWeight: 700, fontSize: "15px", color: "#000" }}>{sol.nombre}</div>
                          <div style={{ fontSize: "11px", color: "#666", textTransform: "capitalize", marginTop: "2px" }}>{sol.tipo}</div>
                          <div style={{ fontSize: "12px", marginTop: "4px", lineHeight: 1.5, color: "#000" }}>
                            <div style={{ color: "#000" }}>{sol.email || "—"}</div>
                            <div style={{ color: "#000" }}>{sol.razon_social || "—"}</div>
                            <div style={{ color: "#000" }}>{sol.cuit ? "CUIT: " + sol.cuit : "—"}</div>
                            <div style={{ color: "#000" }}>{sol.created_at ? new Date(sol.created_at).toLocaleDateString("es-AR") : "—"}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          <button
                            onClick={() => setSolicitudDetalle(sol)}
                            className="admin-btn-ghost"
                            style={{ ...styles.smallBtn("#863819"), display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, padding: "6px 14px", borderRadius: "8px" }}
                          >
                            👁 VER DETALLE
                          </button>
                          {sol.email && (
                            <a
                              href={buildMailtoUrl(sol)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="admin-btn-ghost"
                              style={{ ...styles.smallBtn("#2980b9"), textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, padding: "6px 14px", borderRadius: "8px" }}
                            >
                              <img src="/icons/mail.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                              MAIL
                            </a>
                          )}
                          <button
                            onClick={() => {
                              setApproveModal({ id: sol.id, tipo: sol.tipo, nombre: sol.nombre });
                              setApproveFechas({ inicio: "", fin: "", estado_pago: "al_dia" });
                            }}
                            className="admin-btn"
                            style={{ background: "#2e7d32", color: "white", border: "none", padding: "6px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                          >
                            ✓ APROBAR
                          </button>
                          <button
                            onClick={async () => {
                              const ok = await showConfirm(`¿Rechazar "${sol.nombre}"?`, "RECHAZAR");
                              if (!ok) return;
                              try {
                                const res = await authFetch(`/api/solicitudes/${sol.id}/rechazar`, {
                                  method: "POST",
                                  headers: authHeaders({ "Content-Type": "application/json" }),
                                });
                                if (res.ok) {
                                  showPopup("Solicitud rechazada", "success");
                                  cargarSolicitudes();
                                  if (sol.email) {
                                    const lines = [
                                      `Hola ${sol.nombre},`,
                                      "",
                                      "Lamentamos informarte que tu solicitud para el Sello Made in Chaco no ha sido aprobada en esta instancia.",
                                      "",
                                      "Cualquier consulta podés responder a este correo.",
                                      "",
                                      "Saludos,",
                                      "Equipo Made in Chaco",
                                    ];
                                    const subject = encodeURIComponent("Made in Chaco — Solicitud de Sello");
                                    const body = encodeURIComponent(lines.join("\n"));
                                    const url = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(sol.email)}&su=${subject}&body=${body}`;
                                    window.open(url, "_blank", "noopener,noreferrer");
                                  }
                                } else {
                                  const data = await res.json();
                                  showPopup(data.error || "Error al rechazar", "warning");
                                }
                              } catch {
                                showPopup("Error de conexión", "warning");
                              }
                            }}
                            className="admin-btn"
                            style={{ background: "#c62828", color: "white", border: "none", padding: "6px 14px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                          >
                            ✕ RECHAZAR
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Modal aprobar */}
                {approveModal && (() => {
                  const esComercial = ["comercio", "hospedaje", "productor", "evento"].includes(approveModal.tipo);
                  return (
                    <div style={{
                      position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000,
                      display: "flex", alignItems: "center", justifyContent: "center", padding: "20px",
                    }}
                      onClick={() => setApproveModal(null)}
                    >
                      <div style={{
                        background: "white", borderRadius: "16px", padding: "28px", maxWidth: "440px",
                        width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
                      }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: "0 0 8px", fontSize: "18px" }}>
                          Aprobar solicitud
                        </h3>
                        <p style={{ fontSize: "14px", color: "#555", marginBottom: "16px" }}>
                          {approveModal.nombre} ({approveModal.tipo})
                        </p>
                        {esComercial && (
                          <>
                            <p style={{ fontSize: "12px", color: "#666", marginBottom: "12px" }}>
                              Esta entidad requiere membresía. Establecé las fechas de suscripción:
                            </p>
                            <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Inicio</label>
                                <input type="date" style={styles.input} value={approveFechas.inicio} onChange={(e) => setApproveFechas((f) => ({ ...f, inicio: e.target.value }))} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Fin</label>
                                <input type="date" style={styles.input} value={approveFechas.fin} onChange={(e) => setApproveFechas((f) => ({ ...f, fin: e.target.value }))} />
                              </div>
                            </div>
                            <div style={{ marginBottom: "12px" }}>
                              <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>Estado de pago</label>
                              <select style={styles.input} value={approveFechas.estado_pago} onChange={(e) => setApproveFechas((f) => ({ ...f, estado_pago: e.target.value }))}>
                                <option value="al_dia">Al día</option>
                                <option value="atrasado">Atrasado</option>
                              </select>
                            </div>
                          </>
                        )}
                        {!esComercial && (
                          <p style={{ fontSize: "12px", color: "#888", marginBottom: "12px" }}>
                            Este tipo de entidad no requiere membresía.
                          </p>
                        )}
                        <div style={{ background: "#fff3e0", border: "1px solid #ffcc80", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px" }}>
                            <p style={{ fontSize: "12px", color: "#e65100", margin: 0, lineHeight: 1.4 }}>
                              ⚠ Esta entidad no se mostrará en el mapa hasta que la revises en la sección <strong style={{ color: "#e65100" }}>Entidades</strong> y actives manualmente "MAPA". Recordá revisar sus datos y ubicación primero.
                            </p>
                          </div>
                        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                          <button onClick={() => setApproveModal(null)} className="admin-btn" style={{ background: "white", color: "#555", border: "1px solid #ccc", padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
                            CANCELAR
                          </button>
                          <button
                            onClick={async () => {
                              if (esComercial && (!approveFechas.inicio || !approveFechas.fin)) {
                                showPopup("Completá las fechas de inicio y fin de suscripción.", "warning");
                                return;
                              }
                              if (esComercial && approveFechas.inicio && approveFechas.fin && new Date(approveFechas.inicio) >= new Date(approveFechas.fin)) {
                                showPopup("La fecha de inicio debe ser anterior a la fecha de fin.", "warning");
                                return;
                              }
                              try {
                                const body = {};
                                if (esComercial) {
                                  body.fecha_inicio_suscripcion = approveFechas.inicio;
                                  body.fecha_fin_suscripcion = approveFechas.fin;
                                  body.estado_pago = approveFechas.estado_pago;
                                }
                                const res = await authFetch(`/api/solicitudes/${approveModal.id}/aprobar`, {
                                  method: "POST",
                                  headers: authHeaders({ "Content-Type": "application/json" }),
                                  body: JSON.stringify(body),
                                });
                                if (res.ok) {
                                  showPopup(`"${approveModal.nombre}" aprobada — revisá sus datos y activá "MAPA" en Entidades`, "success");
                                  setApproveModal(null);
                                  cargarSolicitudes();
                                  cargarEntidades();
                                } else {
                                  const data = await res.json();
                                  showPopup(data.error || "Error al aprobar", "warning");
                                }
                              } catch {
                                showPopup("Error de conexión", "warning");
                              }
                            }}
                            className="admin-btn"
                            style={{ background: "#2e7d32", color: "white", border: "none", padding: "8px 18px", borderRadius: "8px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
                          >
                            ✓ APROBAR
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Modal detalle solicitud */}
                {solicitudDetalle && (() => {
                  const sol = solicitudDetalle;
                  const label = (s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
                  return (
                    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
                      onClick={() => setSolicitudDetalle(null)}
                    >
                      <div style={{ background: "white", borderRadius: "16px", padding: "28px", maxWidth: "640px", width: "100%", maxHeight: "85vh", overflowY: "auto", boxShadow: "0 8px 40px rgba(0,0,0,0.15)" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                          <h3 style={{ fontFamily: "Cinzel, serif", color: "#1c1c18", margin: 0, fontSize: "20px" }}>
                            Detalle de Solicitud
                          </h3>
                          <button onClick={() => setSolicitudDetalle(null)}
                            style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", padding: "4px 8px", borderRadius: "6px" }}
                          >✕</button>
                        </div>

                        <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                          {sol.imagen && (
                            <img src={sol.imagen} alt="" style={{ width: "80px", height: "80px", borderRadius: "12px", objectFit: "cover", flexShrink: 0, border: "1px solid #eee" }} />
                          )}
                          <div>
                            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1c1c18" }}>{sol.nombre}</div>
                            <div style={{ fontSize: "12px", color: "#863819", textTransform: "capitalize", fontWeight: 600, marginTop: "4px" }}>{sol.tipo}</div>
                            <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>#{sol.id} — {sol.created_at ? new Date(sol.created_at).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}</div>
                          </div>
                        </div>

                        {[
                          { label: "Contacto", fields: ["email", "sitio_web"] },
                          { label: "Información legal", fields: ["localidad_id", "razon_social", "cuit", "resumen", "direccion_escrita"] },
                          ...(sol.tipo === "comercio" ? [{ label: "Comercio", fields: ["rubro_especifico", "horario_apertura", "horario_cierre", "dias_abierto", "acepta_tarjetas"] }] : []),
                          ...(sol.tipo === "hospedaje" ? [{ label: "Hospedaje", fields: ["categoria_hospedaje", "servicios", "capacidad"] }] : []),
                          ...(sol.tipo === "productor" ? [{ label: "Productor", fields: ["tipo_producto", "metodos_produccion", "certificaciones", "biografia_larga"] }] : []),
                          ...(sol.tipo === "evento" ? [{ label: "Evento", fields: ["fecha_evento", "duracion_dias", "actividades_principales", "link_entradas"] }] : []),
                        ].map((section) => (
                          <div key={section.label} style={{ marginBottom: "16px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "#863819", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px", borderBottom: "1px solid #eee", paddingBottom: "4px" }}>{section.label}</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                              {section.fields.map((field) => {
                                let val = sol[field];
                                let fieldLabel = label(field);
                                if (field === "localidad_id") {
                                  const loc = localidades.find((l) => l.id === Number(val));
                                  val = loc ? loc.nombre : (val || "—");
                                  fieldLabel = "Localidad";
                                }
                                if (field === "acepta_tarjetas") val = val ? "Sí" : "No";
                                if (field === "fecha_evento" && val) val = new Date(val).toLocaleDateString("es-AR");
                                if (field === "capacidad" && val) val = `${val} personas`;
                                return (
                                  <div key={field}>
                                    <div style={{ fontSize: "10px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.3px" }}>{fieldLabel}</div>
                                    <div style={{ fontSize: "13px", color: "#000", wordBreak: "break-word" }}>{val || "—"}</div>
                                  </div>
                                );
                              })}
                            </div>
                            {sol.redes_sociales && section.label === "Contacto" && (
                              <div style={{ marginTop: "8px" }}>
                                <div style={{ fontSize: "10px", fontWeight: 700, color: "#999", textTransform: "uppercase", letterSpacing: "0.3px", marginBottom: "4px" }}>Redes sociales</div>
                                {(() => {
                                  const items = parseSocialList(sol.redes_sociales);
                                  if (items.length === 0) return <div style={{ fontSize: "13px", color: "#000" }}>—</div>;
                                  return items.map((item, i) => {
                                    const platform = SOCIAL_PLATFORMS.find((p) => p.value === item.type) || SOCIAL_PLATFORMS.find((p) => p.value === "otro");
                                    return (
                                      <div key={i} style={{ fontSize: "13px", color: "#000", marginBottom: "2px" }}>
                                        <span style={{ fontWeight: 600, color: "#555" }}>{platform ? platform.label : item.type}: </span>
                                        <span style={{ color: "#000" }}>{item.value}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* RECORRIDOS */}
            {view === "nuevo-recorrido" && (
              <div>
                <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f5f2eb", paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={styles.sectionTitle}>
                    <img src="/icons/route.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
                    Recorridos
                  </h2>
                  {!editingRecorridoId && (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={cargarRecorridos} className="admin-btn" style={{ background: "#d4a017", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                        <img src="/icons/refresh.png" style={{ width: "14px", height: "14px" }} alt="" />
                        ACTUALIZAR
                      </button>
                      <button
                        onClick={() => setEditingRecorridoId("new")}
                        className="admin-btn"
                        style={{ ...styles.btnPrimary, background: "#2e7d32" }}
                      >
                        + NUEVO
                      </button>
                    </div>
                  )}
                </div>

                {editingRecorridoId !== null ? (
                  /* --- FORM --- */
                  <div style={{ background: "white", borderRadius: "12px", padding: "24px", border: "1px solid #eee" }}>
                    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 300px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                          Nombre
                        </label>
                        <input
                          style={styles.input}
                          value={recForm.nombre}
                          onChange={(e) => setRecForm((f) => ({ ...f, nombre: e.target.value }))}
                          placeholder="Nombre del recorrido"
                        />
                      </div>
                      <div style={{ flex: "1 1 200px" }}>
                        <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                          Slug
                        </label>
                        <input
                          style={{ ...styles.input, color: "#863819", fontWeight: "bold" }}
                          value={recForm.slug}
                          readOnly
                          placeholder="url-amigable"
                        />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        Descripción
                      </label>
                      <textarea
                        style={{ ...styles.input, minHeight: "80px" }}
                        value={recForm.descripcion}
                        onChange={(e) => setRecForm((f) => ({ ...f, descripcion: e.target.value }))}
                        placeholder="Descripción del recorrido"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: "11px", fontWeight: 700, color: "#863819", display: "block", marginBottom: "4px", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                        Imagen de portada
                      </label>
                      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                        <input type="file" accept="image/jpeg,image/png,image/webp" hidden ref={recImagenRef} onChange={handleRecImagen} />
                        <button onClick={() => recImagenRef.current?.click()}
                          style={{ padding: "10px 16px", background: "#f5f2eb", border: "1px dashed #ccc", borderRadius: 8, cursor: "pointer", color: "#1c1c18", fontSize: 14, textAlign: "center" }}>
                          {recForm.imagen ? "CAMBIAR IMAGEN" : "SELECCIONAR IMAGEN"}
                        </button>
                        {recForm.imagen && (
                          <button onClick={() => setRecForm((f) => ({ ...f, imagen: "" }))}
                            style={{ padding: "6px 12px", background: "white", border: "1px solid #c0392b", borderRadius: 8, cursor: "pointer", color: "#c0392b", fontSize: 12, fontWeight: 600 }}>
                            QUITAR
                          </button>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: "#888", marginBottom: 8 }}>
                        Formatos: JPG, PNG, WebP — Resolución mínima: 800×600 px
                      </div>
                      {recForm.imagen && (
                        <div style={{ width: 240, height: 135, borderRadius: 8, overflow: "hidden", border: "1px solid #eee" }}>
                          <img src={recForm.imagen} alt="portada" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </div>
                      )}
                    </div>

                    {/* Pasos */}
                    <div style={{ marginTop: "24px" }}>
                      <h3 style={{ fontSize: "16px", color: "#1c1c18", marginBottom: "12px" }}>Pasos del recorrido</h3>

                      {/* Search entities */}
                      <div style={{ position: "relative", marginBottom: "12px" }}>
                        <input
                          style={styles.input}
                          placeholder="Buscar entidad para agregar como paso..."
                          value={pasoSearch}
                          onChange={(e) => {
                            const q = e.target.value;
                            setPasosearch(q);
                            if (q.length < 2) { setPasoResults([]); return; }
                            const lower = q.toLowerCase();
                            setPasoResults(
                              allEntities.filter(
                                (ent) =>
                                  ent.nombre.toLowerCase().includes(lower) &&
                                  !recPasos.find((p) => p.entidad_id === ent.id),
                              ),
                            );
                          }}
                        />
                        {pasoResults.length > 0 && (
                          <div style={{
                            position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                            background: "white", border: "1px solid #eee", borderRadius: "12px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.08)", maxHeight: 200, overflowY: "auto",
                          }}>
                            {pasoResults.map((r) => (
                              <div
                                key={r.id}
                                onClick={() => {
                                  setRecPasos((prev) => [...prev, {
                                    entidad_id: r.id, nombre: r.nombre, tipo: r.tipo, slug: r.slug,
                                    descripcion_paso: "", paso_orden: prev.length + 1,
                                  }]);
                                  setPasosearch("");
                                  setPasoResults([]);
                                }}
                                style={{
                                  padding: "10px 14px", cursor: "pointer", fontSize: 14, color: "#1c1c18",
                                  borderBottom: "1px solid #f5f2eb", display: "flex", justifyContent: "space-between", alignItems: "center",
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#f5f2eb"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                              >
                                <span style={{ color: "#1c1c18" }}>{r.nombre}</span>
                                <span style={{ fontSize: 11, color: colorMapAdmin[r.tipo] || "#888", textTransform: "capitalize" }}>{r.tipo}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Pasos list */}
                      {recPasos.length === 0 && (
                        <p style={{ color: "#999", fontSize: 13, textAlign: "center", margin: "20px 0" }}>
                          Sin pasos todavía. Buscá una entidad arriba para agregarla.
                        </p>
                      )}
                      {recPasos.map((p, i) => (
                        <div key={p.entidad_id} style={{
                          display: "flex", gap: 8, alignItems: "center",
                          padding: "10px 12px", marginBottom: 6,
                          background: "#f5f2eb", borderRadius: 10,
                        }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: "50%",
                            background: colorMapAdmin[p.tipo] || "#863819",
                            color: "white", display: "flex", alignItems: "center",
                            justifyContent: "center", fontSize: 12, fontWeight: 700, flexShrink: 0,
                          }}>
                            {i + 1}
                          </span>
                          <span style={{ flex: "0 0 auto", fontSize: 14, fontWeight: 600, color: "#1c1c18", minWidth: 80 }}>{p.nombre}</span>
                          <input
                            placeholder="descripción del paso"
                            value={p.descripcion_paso}
                            onChange={(e) => {
                              const next = [...recPasos];
                              next[i] = { ...next[i], descripcion_paso: e.target.value };
                              setRecPasos(next);
                            }}
                            style={{
                              flex: 1, minWidth: 120, padding: "6px 10px", borderRadius: 6,
                              border: "1px solid #ddd", fontSize: 12, color: "#1c1c18",
                              background: "white",
                            }}
                          />
                          {i > 0 && (
                            <button
                              onClick={() => {
                                const next = [...recPasos];
                                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                                next.forEach((n, idx) => { n.paso_orden = idx + 1; });
                                setRecPasos(next);
                              }}
                              style={{ background: "none", border: "none", color: "#863819", cursor: "pointer", fontSize: 16, padding: 4 }}
                              title="Subir"
                            >
                              ↑
                            </button>
                          )}
                          {i < recPasos.length - 1 && (
                            <button
                              onClick={() => {
                                const next = [...recPasos];
                                [next[i], next[i + 1]] = [next[i + 1], next[i]];
                                next.forEach((n, idx) => { n.paso_orden = idx + 1; });
                                setRecPasos(next);
                              }}
                              style={{ background: "none", border: "none", color: "#863819", cursor: "pointer", fontSize: 16, padding: 4 }}
                              title="Bajar"
                            >
                              ↓
                            </button>
                          )}
                          <button onClick={() => setRecPasos((prev) => prev.filter((_, idx) => idx !== i))}
                            style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 16, padding: 4 }}>
                            ✕
                          </button>
                        </div>
                      ))}

                      {/* Buttons */}
                      <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
                        <button onClick={() => { resetRecForm(); }}
                          className="admin-btn-ghost"
                          style={{ ...styles.btnSecondary }}>
                          CANCELAR
                        </button>
                        <button onClick={guardarRecorrido}
                          disabled={recSaving}
                          className="admin-btn"
                          style={{
                            ...styles.btnPrimary,
                            background: recSaving ? "#999" : "#2e7d32",
                            cursor: recSaving ? "not-allowed" : "pointer",
                          }}>
                          {recSaving ? "GUARDANDO…" : editingRecorridoId && editingRecorridoId !== "new" ? "ACTUALIZAR RECORRIDO" : "CREAR RECORRIDO"}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* --- LIST --- */
                  <>
                    {recorridos.length === 0 && (
                      <div style={{ color: "#888", fontSize: "14px", padding: "40px", textAlign: "center" }}>
                        No hay recorridos todavía
                      </div>
                    )}
                    {recorridos.map((r) => (
                      <div key={r.id} style={styles.entityCard}>
                        <div style={{
                          width: "10px", height: "10px", borderRadius: "50%",
                          background: "#863819", flexShrink: 0,
                        }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: "15px", color: "#1c1c18" }}>
                            {r.nombre}
                          </div>
                          <div style={{ fontSize: "11px", color: "#999" }}>
                            {r.total_pasos || 0} paso{(r.total_pasos || 0) !== 1 ? "s" : ""}
                          </div>
                        </div>
                        <button
                          onClick={() => cargarRecorridoParaEditar(r)}
                          className="admin-btn-ghost"
                          style={styles.smallBtn("#863819")}
                        >
                          <img src="/icons/edit.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                          EDITAR
                        </button>
                        <button
                          onClick={() => eliminarRecorrido(r.id, r.nombre)}
                          className="admin-btn-danger"
                          style={styles.smallBtn("#c0392b")}
                        >
                          <img src="/icons/delete.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                          ELIMINAR
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* PALABRAS */}
            {view === "palabras" && <PalabrasView authFetch={authFetch} showConfirm={showConfirm} showPopup={showPopup} />}

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
                    <button onClick={cargarLocalidades} className="admin-btn" style={{ background: "#d4a017", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                      <img src="/icons/refresh.png" style={{ width: "14px", height: "14px" }} alt="" />
                      ACTUALIZAR
                    </button>
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
                <div style={{ background: "white", borderRadius: "12px", border: "1px solid #eee", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 160px 160px 80px", gap: "40px", padding: "16px 16px 9px", fontWeight: 800, fontSize: "13px", textTransform: "uppercase", borderBottom: "1px solid #d4cfc4", background: "#f0ede8", borderRadius: "8px 8px 0 0" }}>
                    <div style={{ color: "#1c1c18" }}>Ciudad</div>
                    <div style={{ color: "#1c1c18" }}>Habitantes</div>
                    <div style={{ color: "#1c1c18" }}>Fecha Fundación</div>
                    <div style={{ color: "#1c1c18" }}>Gentilicio</div>
                    <div style={{ color: "#1c1c18" }}>Cabecera</div>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "8px 16px 16px" }}>
                    {localidades.map((loc) => (
                      <LocalidadRow
                        key={loc.id}
                        loc={loc}
                        values={editValues[loc.id]}
                        onChange={(field, val) => handleEditChange(loc.id, field, val)}
                      />
                    ))}
                    {localidades.length === 0 && (
                      <div style={{ color: "#888", fontSize: "14px", padding: "20px", textAlign: "center" }}>
                        No hay localidades cargadas.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Popup */}
      {popup && (
        <div
          style={{
            position: "fixed",
            top: popup.isConfirm ? "50%" : "24px",
            left: "50%",
            transform: popup.isConfirm ? "translate(-50%, -50%)" : "translateX(-50%)",
            zIndex: 10000,
            background: popup.isConfirm
              ? "white"
              : popup.type === "error"
                ? "#fdecea"
                : popup.type === "warning"
                  ? "#fff3e0"
                  : "#e8f5e9",
            color: popup.isConfirm ? "#000" : "#1c1c18",
            padding: popup.isConfirm ? "32px" : "14px 24px",
            borderRadius: "14px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
            minWidth: popup.isConfirm ? "360px" : "auto",
            textAlign: "center",
            fontFamily: "Merriweather, serif",
            fontSize: "14px",
            fontWeight: 500,
          }}
        >
          {popup.isConfirm ? (
            <>
              <p style={{ margin: "0 0 20px", fontSize: "15px", lineHeight: 1.5, color: "#000" }}>
                {popup.message}
              </p>
              <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button
                    className="admin-btn"
                    onClick={() => {
                      pendingConfirm.current?.(true);
                      setPopup(null);
                      pendingConfirm.current = null;
                    }}
                    style={{
                      padding: "10px 28px",
                      background: popup.confirmLabel === "ELIMINAR" ? "#863819" : "#2e7d32",
                      color: "white",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: 700,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    {popup.confirmLabel || "ELIMINAR"}
                  </button>
                  <button
                    className="admin-btn-ghost"
                    onClick={() => {
                      pendingConfirm.current?.(false);
                      setPopup(null);
                      pendingConfirm.current = null;
                    }}
                    style={{
                      padding: "10px 28px",
                      background: "#f0ede8",
                      color: "#555",
                      border: "none",
                      borderRadius: "10px",
                      fontWeight: 600,
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                  CANCELAR
                </button>
              </div>
            </>
          ) : (
            <>{popup.message}</>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── Dashboard View ─── */
function DashboardView({ authFetch }) {
  const [resumen, setResumen] = useState(null);
  const [diario, setDiario] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [r, d] = await Promise.all([
        authFetch("/api/analytics/resumen", { headers: authHeaders() }),
        authFetch("/api/analytics/diario?dias=30", { headers: authHeaders() }),
      ]);
      if (r.ok) setResumen(await r.json());
      if (d.ok) setDiario(await d.json());
    } catch { /* ignore */ }
    setCargando(false);
  }, [authFetch]);

  useEffect(() => {
    cargarDatos();
    const timeout = setTimeout(() => {
      setResumen((prev) => prev ?? { totales: 0, hoy: 0, semana: 0, mes: 0, porTipo: [], top10: [] });
      setDiario((prev) => prev ?? []);
    }, 8000);
    return () => clearTimeout(timeout);
  }, [cargarDatos]);

  if (!resumen) {
    return <div style={{ padding: 40, textAlign: "center", color: "#888" }}>Cargando dashboard…</div>;
  }

  const maxVisitas = Math.max(...(resumen.top10?.map((e) => e.visitas) || [1]));
  const maxDiario = Math.max(...(diario?.map((d) => d.total) || [1]));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
          <img src="/icons/todos.png" style={{ width: 26, height: 26, marginRight: 10, verticalAlign: "middle" }} alt="" />
          Dashboard
        </h2>
        <button onClick={cargarDatos} disabled={cargando} className="admin-btn" style={{
          background: "#d4a017", color: "white", border: "none", padding: "8px 16px",
          borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: "6px", opacity: cargando ? 0.5 : 1,
        }}>
          <img src="/icons/refresh.png" style={{ width: 14, height: 14 }} alt="" />
          {cargando ? "ACTUALIZANDO…" : "ACTUALIZAR"}
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Visitas totales", value: resumen.totales },
          { label: "Hoy", value: resumen.hoy },
          { label: "Última semana", value: resumen.semana },
          { label: "Último mes", value: resumen.mes },
        ].map((s) => (
          <div key={s.label} style={{
            background: "white", borderRadius: 12, border: "1px solid #eee",
            padding: "20px 24px",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#863819", marginBottom: 8, letterSpacing: "0.5px" }}>
              {s.label}
            </div>
            <div style={{ fontSize: 36, fontWeight: 800, color: "#1c1c18" }}>
              {s.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        {/* Top 10 entidades */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#863819", margin: "0 0 16px", letterSpacing: "0.5px" }}>
            Top 10 entidades más visitadas
          </h3>
          {resumen.top10?.length === 0 ? (
            <div style={{ color: "#888", fontSize: 13 }}>Sin datos aún</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {resumen.top10?.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, fontSize: 10, fontWeight: 700,
                    color: "white", display: "flex", alignItems: "center", justifyContent: "center",
                    background: colorMapAdmin[e.tipo] || "#888",
                  }}>
                    {e.visitas}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {e.nombre}
                  </div>
                  <div style={{ width: "60%", background: "#f0ede8", borderRadius: 6, height: 10, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 6,
                      background: colorMapAdmin[e.tipo] || "#888",
                      width: `${(e.visitas / maxVisitas) * 100}%`,
                      transition: "width 0.5s ease",
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eventos por tipo */}
        <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#863819", margin: "0 0 16px", letterSpacing: "0.5px" }}>
            Eventos por tipo
          </h3>
          {resumen.porTipo?.length === 0 ? (
            <div style={{ color: "#888", fontSize: 13 }}>Sin datos aún</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {resumen.porTipo?.map((t, i) => {
                const colors = ["#863819", "#d4a017", "#4caf50", "#2196f3", "#9c27b0", "#e91e63", "#ff5722", "#795548"];
                const max = Math.max(...resumen.porTipo.map((x) => x.cantidad));
                return (
                  <div key={t.tipo} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 14, height: 14, borderRadius: "50%", background: colors[i % colors.length], flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: "#333" }}>{t.tipo.replace(/_/g, " ")}</div>
                    <div style={{ width: "50%", background: "#f0ede8", borderRadius: 6, height: 10, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 6,
                        background: colors[i % colors.length],
                        width: `${(t.cantidad / max) * 100}%`,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#555", minWidth: 32, textAlign: "right" }}>
                      {t.cantidad}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Daily chart */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20, marginBottom: 32 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, textTransform: "uppercase", color: "#863819", margin: "0 0 16px", letterSpacing: "0.5px" }}>
          Visitas diarias (últimos 30 días)
        </h3>
        {!diario || diario.length === 0 ? (
          <div style={{ color: "#888", fontSize: 13 }}>Sin datos aún</div>
        ) : (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 140, paddingTop: 8 }}>
            {diario.map((d, i) => (
              <div
                key={d.fecha}
                style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx(null)}
              >
                {hoverIdx === i && d.total > 0 && (
                  <div style={{
                    position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
                    background: "#1c1c18", color: "white", fontSize: 11, fontWeight: 700,
                    padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap", zIndex: 10,
                    pointerEvents: "none", marginBottom: 4,
                  }}>
                    {d.total} visita{d.total !== 1 ? "s" : ""}
                  </div>
                )}
                <div style={{
                  width: "100%", borderRadius: "4px 4px 0 0",
                  background: "#863819",
                  height: `${(d.total / maxDiario) * 100}%`,
                  minHeight: d.total > 0 ? 4 : 0,
                  transition: "height 0.3s ease",
                  opacity: hoverIdx === i ? 1 : 0.8,
                }} />
                <div style={{ fontSize: 9, color: "#888", transform: "rotate(-45deg)", whiteSpace: "nowrap", marginTop: 4 }}>
                  {new Date(d.fecha).toLocaleDateString("es", { day: "2-digit", month: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Palabras View ─── */
function PalabrasView({ authFetch, showConfirm, showPopup }) {
  const [palabras, setPalabras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [nuevaPalabra, setNuevaPalabra] = useState("");
  const [nuevoSignificado, setNuevoSignificado] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [editandoPalabra, setEditandoPalabra] = useState("");
  const [editandoSignificado, setEditandoSignificado] = useState("");
  const [adding, setAdding] = useState(false);

  const cargarPalabras = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/palabras");
      if (res.ok) setPalabras(await res.json());
    } catch {} finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { cargarPalabras(); }, [cargarPalabras]);

  const agregarPalabra = async () => {
    if (!nuevaPalabra.trim()) return;
    setAdding(true);
    try {
      const res = await authFetch("/api/palabras", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          palabra: nuevaPalabra.trim(),
          significado: nuevoSignificado.trim() || undefined,
        }),
      });
      if (res.ok) {
        setNuevaPalabra("");
        setNuevoSignificado("");
        cargarPalabras();
      }
    } catch {} finally {
      setAdding(false);
    }
  };

  const actualizarPalabra = async (id) => {
    if (!editandoPalabra.trim()) return;
    try {
      const res = await authFetch(`/api/palabras/${id}`, {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          palabra: editandoPalabra.trim(),
          significado: editandoSignificado.trim() || undefined,
        }),
      });
      if (res.ok) {
        setEditandoId(null);
        setEditandoPalabra("");
        setEditandoSignificado("");
        cargarPalabras();
      }
    } catch {}
  };

  const eliminarPalabra = async (id, palabra) => {
    const ok = await showConfirm(`¿Eliminar "${palabra}"?`, "ELIMINAR");
    if (!ok) return;
    try {
      const res = await authFetch(`/api/palabras/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) cargarPalabras();
    } catch {}
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
          <img src="/icons/edit.png" style={{ width: 26, height: 26, marginRight: 10, verticalAlign: "middle" }} alt="" />
          Palabras regionales
        </h2>
        <button onClick={cargarPalabras} disabled={loading} className="admin-btn" style={{ background: "#d4a017", color: "white", border: "none", padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", opacity: loading ? 0.5 : 1 }}>
          <img src="/icons/refresh.png" style={{ width: "14px", height: "14px" }} alt="" />
          {loading ? "CARGANDO…" : "ACTUALIZAR"}
        </button>
      </div>

      <div style={{ background: "white", borderRadius: 12, border: "1px solid #eee", padding: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            style={{ ...styles.input, marginBottom: 0, flex: 1 }}
            placeholder="Palabra o frase chaqueña..."
            value={nuevaPalabra}
            onChange={(e) => setNuevaPalabra(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregarPalabra()}
          />
          <button
            onClick={agregarPalabra}
            disabled={adding || !nuevaPalabra.trim()}
            className="admin-btn"
            style={{
              background: "#2e7d32", color: "white", border: "none",
              padding: "10px 20px", borderRadius: 12, fontWeight: 700,
              fontSize: 14, cursor: "pointer", whiteSpace: "nowrap",
              opacity: adding || !nuevaPalabra.trim() ? 0.5 : 1,
            }}
          >
            {adding ? "AGREGANDO…" : "+ AGREGAR"}
          </button>
        </div>
        <textarea
          style={{ ...styles.input, marginBottom: 0, width: "100%", boxSizing: "border-box", minHeight: 60, resize: "vertical" }}
          placeholder="Significado (opcional)"
          value={nuevoSignificado}
          onChange={(e) => setNuevoSignificado(e.target.value)}
        />
      </div>

      {palabras.length === 0 && !loading && (
        <div style={{ color: "#888", fontSize: 14, padding: 40, textAlign: "center" }}>
          No hay palabras todavía. Agregá la primera arriba.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {palabras.map((p) => (
          <div key={p.id} style={styles.entityCard}>
            {editandoId === p.id ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={{ flex: 1, padding: "8px 12px", border: "1px solid #863819", borderRadius: 8, fontSize: 14, color: "#1c1c18", outline: "none" }}
                    value={editandoPalabra}
                    onChange={(e) => setEditandoPalabra(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) actualizarPalabra(p.id);
                      if (e.key === "Escape") { setEditandoId(null); setEditandoPalabra(""); setEditandoSignificado(""); }
                    }}
                    autoFocus
                  />
                  <button onClick={() => actualizarPalabra(p.id)} className="admin-btn" style={{ background: "#2e7d32", color: "white", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                    GUARDAR
                  </button>
                  <button onClick={() => { setEditandoId(null); setEditandoPalabra(""); setEditandoSignificado(""); }} className="admin-btn-ghost" style={{ padding: "8px 14px", background: "white", border: "1px solid #ccc", borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: "pointer", color: "#555" }}>
                    CANCELAR
                  </button>
                </div>
                <textarea
                  style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13, color: "#1c1c18", outline: "none", minHeight: 50, resize: "vertical" }}
                  placeholder="Significado (opcional)"
                  value={editandoSignificado}
                  onChange={(e) => setEditandoSignificado(e.target.value)}
                />
              </div>
            ) : (
              <>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#1c1c18" }}>{p.palabra}</div>
                  {p.significado && (
                    <div style={{ fontSize: 12, color: "#888", marginTop: 4, lineHeight: 1.4 }}>{p.significado}</div>
                  )}
                </div>
                <button onClick={() => { setEditandoId(p.id); setEditandoPalabra(p.palabra); setEditandoSignificado(p.significado || ""); }} className="admin-btn-ghost" style={styles.smallBtn("#863819")}>
                  <img src="/icons/edit.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: 4 }} alt="" />
                  EDITAR
                </button>
                <button onClick={() => eliminarPalabra(p.id, p.palabra)} className="admin-btn-danger" style={styles.smallBtn("#c0392b")}>
                  <img src="/icons/delete.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: 4 }} alt="" />
                  ELIMINAR
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  mainLayout: {
    width: "100%",
    minHeight: "100vh",
    background: "#f5f2eb",
    display: "flex",
    fontFamily: "Merriweather, serif",
    padding: "10px",
    boxSizing: "border-box",
    gap: "10px",
  },
  sidebar: {
    width: "240px",
    minWidth: "240px",
    height: "calc(100vh - 40px)",
    background: "white",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid #eee",
    position: "sticky",
    top: "20px",
    boxSizing: "border-box",
    borderRadius: "12px",
  },
  sidebarHeader: {
    padding: "24px 20px 16px",
    borderBottom: "1px solid #f0ede8",
  },
  sidebarNav: {
    padding: "12px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
  },
  navBtn: {
    width: "100%",
    padding: "12px 16px",
    border: "none",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    textAlign: "left",
    transition: "all 0.15s",
  },
  logoutBtn: {
    width: "100%",
    padding: "14px 20px",
    border: "none",
    borderTop: "1px solid #f0ede8",
    background: "transparent",
    color: "#863819",
    fontWeight: 700,
    fontSize: "13px",
    cursor: "pointer",
    textAlign: "center",
  },
  contentArea: { flex: 1, padding: "20px 0 20px 20px", display: "flex", flexDirection: "column" },
  viewContainer: { width: "100%", flex: 1, display: "flex", flexDirection: "column", overflow: "auto", paddingRight: "20px" },
  sectionTitle: {
    fontFamily: "Cinzel, serif",
    color: "#1c1c18",
    marginBottom: "10px",
    fontSize: "28px",
  },
  entityCard: {
    background: "white",
    borderRadius: "12px",
    padding: "14px 18px",
    marginBottom: "8px",
    border: "1px solid #eee",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.03)",
  },
  smallBtn: (color) => ({
    padding: "6px 12px",
    background: "white",
    border: `1px solid ${color}`,
    color,
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "11px",
    whiteSpace: "nowrap",
    transition: "0.15s",
  }),
  stepperNav: {
    display: "flex",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "24px",
    alignItems: "center",
  },
  dot: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    fontSize: "14px",
  },
  input: {
    width: "100%",
    padding: "14px",
    marginBottom: "12px",
    border: "1px solid #eee",
    borderRadius: "12px",
    outline: "none",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  btnNext: {
    padding: "14px 20px",
    background: "#863819",
    color: "white",
    border: "none",
    borderRadius: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  btnPrimary: {
    padding: "12px 24px",
    background: "#863819",
    color: "white",
    border: "none",
    borderRadius: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
  },
  btnSecondary: {
    padding: "14px 20px",
    background: "white",
    color: "#863819",
    border: "1px solid #863819",
    borderRadius: "15px",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: "14px",
    whiteSpace: "nowrap",
  },
  principalBadge: {
    position: "absolute",
    top: "8px",
    right: "8px",
    fontSize: "10px",
    background: "#863819",
    color: "white",
    padding: "2px 8px",
    borderRadius: "10px",
    fontWeight: "bold",
    zIndex: 1,
  },
};

const LocalidadRow = ({ loc, values, onChange }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 160px 160px 80px", gap: "40px", padding: "10px 0", fontSize: "14px", borderBottom: "1px solid #f5f2eb", alignItems: "center" }}>
    <div style={{ fontWeight: 600, color: "#1c1c18" }}>{loc.nombre}</div>
    <div>
      <input
        type="number"
        style={{ width: "100%", padding: "4px 6px", border: "1px solid #eee", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", color: "#1c1c18" }}
        value={values?.habitantes ?? loc.habitantes?.toString() ?? ""}
        onChange={(e) => onChange("habitantes", e.target.value)}
      />
    </div>
    <div>
      <input
        type="date"
        style={{ width: "100%", padding: "4px 6px", border: "1px solid #eee", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", color: "#1c1c18" }}
        value={values?.fecha_fundacion ?? loc.fecha_fundacion ?? ""}
        onChange={(e) => onChange("fecha_fundacion", e.target.value)}
      />
    </div>
    <div>
      <input
        style={{ width: "100%", padding: "4px 6px", border: "1px solid #eee", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", color: "#1c1c18" }}
        value={values?.gentilicio ?? loc.gentilicio ?? ""}
        onChange={(e) => onChange("gentilicio", e.target.value)}
      />
    </div>
    <div style={{ fontSize: "12px", color: loc.es_cabecera ? "#2e7d32" : "#999" }}>
      {loc.es_cabecera ? "Sí" : "No"}
    </div>
  </div>
);
