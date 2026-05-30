import { useState, useEffect, useRef, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "../styles/AdminPanel.css";
import { useAuth } from "../context/AuthContext";
import { validarArchivo, validarFormato, INFO_FORMATOS } from "../utils/mediaValidation";
import { subirArchivo, subirImagen } from "./uploadService";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const getToken = () => localStorage.getItem("made_in_chaco_token");
const authHeaders = (extra = {}) => {
  const token = getToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
};

const colorMapAdmin = {
  artesano: "#ff5722",
  gastronomia: "#4caf50",
  comercio: "#2196f3",
  evento: "#9c27b0",
  patrimonio: "#795548",
  personalidad: "#e91e63",
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

function SocialMediaManager({ value, onChange }) {
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
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#555", marginBottom: 6 }}>Redes sociales</label>
      {list.map((item, i) => (
        <div key={i}>
          <div style={{ display: "flex", gap: 6, marginBottom: 2, alignItems: "center" }}>
            <select value={item.type} onChange={(e) => update(i, "type", e.target.value)}
              style={{ flex: "0 0 130px", padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13, color: "#1c1c18", background: "white" }}>
              {SOCIAL_PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <input value={item.value} onChange={(e) => update(i, "value", e.target.value)} placeholder={item.type === "whatsapp" ? "Código país + número, ej: 5491123456789" : "usuario / URL"}
              style={{ flex: 1, padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc", fontSize: 13, color: "#1c1c18", background: "white" }} />
            <button onClick={() => remove(i)}
              style={{ background: "none", border: "none", color: "#c62828", cursor: "pointer", fontSize: 16, padding: "4px 6px" }}>
              ✕
            </button>
          </div>
          {item.type === "whatsapp" && item.value && <div style={{ fontSize: 11, color: whatsappError(item.value) ? "#c62828" : "#2e7d32", margin: "0 0 4px 136px" }}>{whatsappError(item.value) || "Número válido"}</div>}
        </div>
      ))}
      <button onClick={add}
        style={{ padding: "6px 14px", background: "#f5f2eb", border: "1px dashed #ccc", borderRadius: 6, cursor: "pointer", color: "#555", fontSize: 13 }}>
        + Agregar red social
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
        return fetch(`/api/localidades/${loc.id}`, {
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
      const res = await fetch("/api/localidades");
      if (res.ok) setLocalidades(await res.json());
    } catch {}
  };

  const cargarEntidades = async () => {
    try {
      const res = await fetch("/api/entidades");
      if (res.ok) setAllEntities(await res.json());
    } catch {}
  };

  const cargarRecorridos = async () => {
    try {
      const res = await fetch("/api/recorridos");
      if (res.ok) setRecorridos(await res.json());
    } catch {}
  };

  useEffect(() => {
    cargarLocalidades();
    cargarEntidades();
    cargarRecorridos();
  }, []);

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
      map.current.flyTo({ center: [loc.longitud, loc.latitud], zoom: 10 });
      marker.current?.setLngLat([loc.longitud, loc.latitud]);
    }
  };

  // --- GUARDAR ---
  const guardarEntidad = async () => {
    setMultimediaError("");

    if (!multimediaItems[0]?.url_recurso) {
      setMultimediaError("Agregá una foto principal para el encabezado");
      setStep(3);
      return;
    }

    for (const item of multimediaItems) {
      const hasUrl = item.url_recurso && item.url_recurso.trim();
      const hasTitle = item.titulo_alternativo && item.titulo_alternativo.trim();
      if (hasUrl && !hasTitle) {
        setMultimediaError("Completá el título del recurso multimedia");
        setStep(3);
        return;
      }
    }

    setLoading(true);
    let createdEntityId = null;
    try {
      const payload = { ...general, imagen: multimediaItems[0].url_recurso };
      if (editingEntityId) {
        const r1 = await fetch(
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
        const r2 = await fetch(
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
        const multimediaExistentes = await fetch(
          `/api/entidades/${editingEntityId}/multimedia`,
        );
        const datosMulti = await multimediaExistentes.json();
        if (multimediaExistentes.ok) {
          for (const m of datosMulti) {
            await fetch(`/api/multimedia/${m.id}`, {
              method: "DELETE",
              headers: authHeaders(),
            });
          }
        }
        for (const item of multimediaItems) {
          if (!item.url_recurso) continue;
          const { entidades_etiquetadas, ...itemData } = item;
          const resM = await fetch(`/api/multimedia`, {
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
              await fetch(
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
        await fetch(`/api/entidades/${editingEntityId}/conexiones`, {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(conexiones),
        });
      } else {
        const r1 = await fetch("/api/entidades", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(payload),
        });
        const d1 = await r1.json();
        if (!r1.ok) throw new Error(d1.error);
        const id = d1.id;
        createdEntityId = id;
        const r2 = await fetch(
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
          const resM = await fetch(`/api/multimedia`, {
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
              await fetch(
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
        await fetch(`/api/entidades/${id}/conexiones`, {
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
        await fetch(`/api/entidades/${createdEntityId}`, {
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
      const res = await fetch(`/api/entidades/${id}`);
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
          "biografia_larga", "tecnica_principal",
          "materiales_usados", "anios_experiencia", "taller_abierto",
          "fotos_galeria_url", "comunidad_etnica", "redes_sociales",
        ],
        gastronomia: [
          "historia_plato", "ingredientes_clave",
          "receta_destacada", "establecimientos_donde_probar",
        ],
        comercio: [
          "razon_social", "cuit", "rubro_especifico",
          "sitio_web",
          "horario_apertura", "horario_cierre",
          "dias_abierto", "redes_sociales",
          "acepta_tarjetas", "fecha_inicio_suscripcion",
          "fecha_fin_suscripcion", "estado_pago",
        ],
        personalidad: [
          "nombre_completo", "apodo", "biografia_resumida",
          "profesion", "fecha_nacimiento", "foto_perfil_url",
          "es_referente_comunidad", "comunidad_etnica",
          "contacto", "redes_sociales",
        ],
        patrimonio: [
          "año_referencia", "estilo_arquitectonico",
          "declaratoria_oficial", "estado_conservacion",
        ],
        evento: [
          "fecha_evento", "duracion_dias",
          "actividades_principales", "es_itinerante",
          "link_entradas",
        ],
      };
      const esp = {};
      (fieldsMap[data.tipo] || []).forEach((f) => {
        let val = data[f];
        if ((f === "fecha_inicio_suscripcion" || f === "fecha_fin_suscripcion" || f === "fecha_evento" || f === "fecha_nacimiento") && val) {
          const d = new Date(val);
          if (!isNaN(d.getTime())) val = d.toISOString().split("T")[0];
        }
        if (val != null) esp[f] = val;
      });
      setEspecifico(esp);

      try {
        const resMulti = await fetch(
          `/api/entidades/${id}/multimedia`,
        );
        const dataMulti = await resMulti.json();
        if (resMulti.ok && dataMulti.length > 0) {
          const tagsMap = {};
          const ids = dataMulti.map((m) => m.id).filter(Boolean);
          if (ids.length > 0) {
            try {
              const resTags = await fetch(
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
      } catch {
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

      // Cargar conexiones
      try {
        const resC = await fetch(
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

  // --- ELIMINAR ---
  const eliminarEntidad = async (id, nombre) => {
    const confirmed = await showConfirm(
      `¿Eliminar "${nombre}"? No se puede deshacer.`,
      "ELIMINAR",
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/entidades/${id}`, {
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
      const res = await fetch(
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
      const res = await fetch(
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
      const res = await fetch(`/api/recorridos/${r.slug}`);
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
        const r1 = await fetch(`/api/recorridos/${editingRecorridoId}`, {
          method: "PUT",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(recForm),
        });
        if (!r1.ok) throw new Error("Error al actualizar");
        await fetch(`/api/recorridos/${editingRecorridoId}/pasos`, {
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
        const r1 = await fetch("/api/recorridos", {
          method: "POST",
          headers: authHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(recForm),
        });
        if (!r1.ok) throw new Error("Error al crear");
        const data = await r1.json();
        await fetch(`/api/recorridos/${data.id}/pasos`, {
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
      const res = await fetch(`/api/recorridos/${id}`, {
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
      if (img.width < 800 || img.height < 600) {
        showPopup(`Resolución muy baja: ${img.width}×${img.height}. Mínimo: 800×600 px. Formatos: JPG, PNG, WebP.`, "error");
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
                Inicio suscripción
              </label>
              <input
                type="date"
                style={styles.input}
                value={especifico.fecha_inicio_suscripcion || ""}
                onChange={(e) => onFieldChange("fecha_inicio_suscripcion", e.target.value)}
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
                Fin suscripción
              </label>
              <input
                type="date"
                style={styles.input}
                value={especifico.fecha_fin_suscripcion || ""}
                onChange={(e) => onFieldChange("fecha_fin_suscripcion", e.target.value)}
              />
            </div>
          </div>
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
              Estado de suscripción
            </label>
            <select
              style={styles.input}
              value={especifico.estado_pago || ""}
              onChange={(e) => onFieldChange("estado_pago", e.target.value)}
            >
              <option value="">Seleccionar...</option>
              <option value="al_dia">Al día</option>
              <option value="atrasado">Atrasado</option>
            </select>
          </div>
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
          <DetailField field="contacto" fieldVal={especifico.contacto} onFieldChange={onFieldChange} label="Contacto" placeholder="Teléfono o email" />
          <SocialMediaManager value={especifico.redes_sociales} onChange={(v) => onFieldChange("redes_sociales", v)} />
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
          <DetailField field="fecha_evento" fieldVal={especifico.fecha_evento} onFieldChange={onFieldChange} label="Fecha del evento" type="date" placeholder="" />
          <DetailField field="duracion_dias" fieldVal={especifico.duracion_dias} onFieldChange={onFieldChange} label="Duración (días)" type="number" placeholder="Ej: 1" />
          <DetailField field="actividades_principales" fieldVal={especifico.actividades_principales} onFieldChange={onFieldChange} label="Actividades principales" type="textarea" placeholder="Ej: ferias, talleres, espectáculos..." />
          <DetailField field="es_itinerante" fieldVal={especifico.es_itinerante} onFieldChange={onFieldChange} label="Evento itinerante" type="select" options={[{ value: "true", label: "Sí" }, { value: "false", label: "No" }]} />
          <DetailField field="link_entradas" fieldVal={especifico.link_entradas} onFieldChange={onFieldChange} label="Link a compra de entradas" placeholder="https://..." />
        </>
      ),
    };

    const render = fields[tipo];
    return render ? render() : <p style={{ color: "#999" }}>Sin campos específicos</p>;
  };

  // --- RENDER ---
  return (
    <div className="admin-container">
      <div style={styles.mainLayout}>
        {/* SIDEBAR */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <img src="/src/assets/imagenes/logo-madeinchaco.png" alt="Made in Chaco" style={{ width: "100%", maxWidth: "180px", display: "block", marginBottom: "8px" }} />
            <div style={{ fontSize: "15px", color: "#1c1c18", marginTop: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
              <img src="/src/assets/icons/user.png" style={{ width: "18px", height: "18px" }} alt="" />
              {user?.username || "Admin"}
            </div>
          </div>
          <div style={styles.sidebarNav}>
            {[
              { id: "entidades", label: "Entidades", icon: "/src/assets/icons/book.png" },
              { id: "nuevo-editar", label: "Nueva Entidad", icon: "/src/assets/icons/add.png" },
              { id: "nuevo-recorrido", label: "Recorridos", icon: "/src/assets/icons/route.png" },
              { id: "nuevo-recorrido-form", label: "Nuevo Recorrido", icon: "/src/assets/icons/add.png" },
              { id: "localidades", label: "Localidades", icon: "/src/assets/icons/location.png" },
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
            <img src="/src/assets/icons/logout.png" style={{ width: "16px", height: "16px", marginRight: "8px", verticalAlign: "middle" }} alt="" />
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
                    <img src="/src/assets/icons/book.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
                    Entidades
                  </h2>
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
                  };
                  const tipoOrden = ["artesano", "gastronomia", "comercio", "evento", "patrimonio", "personalidad"];
                  return tipoOrden.map((tipo) => {
                    const items = grupos[tipo];
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={tipo} style={{ marginBottom: "24px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", padding: "0 4px" }}>
                          <img src={`/src/assets/icons/${tipo}.png`} style={{ width: "20px", height: "20px" }} alt="" />
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
                                {e.tipo === "evento" && e.fecha_evento && (() => {
                                  const diff = Math.ceil((new Date(e.fecha_evento) - new Date(new Date().toDateString())) / 86400000);
                                  if (diff < 0) return <span style={{ fontSize: "10px", fontWeight: 700, background: "#e74c3c", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>VENCIDO</span>;
                                  if (diff <= 7) return <span style={{ fontSize: "10px", fontWeight: 700, background: "#f39c12", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>PRONTO ({diff}d)</span>;
                                  return <span style={{ fontSize: "10px", fontWeight: 700, background: "#2e7d32", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>FALTAN {diff}d</span>;
                                })()}
                              </div>
                              <div style={{ fontSize: "11px", color: "#999", textTransform: "capitalize" }}>
                                {e.tipo}
                              </div>
                            </div>
                            <button
                              onClick={() => cargarEntidadParaEditar(e.id)}
                              className="admin-btn-ghost"
                              style={styles.smallBtn("#863819")}
                            >
                              <img src="/src/assets/icons/edit.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                              EDITAR
                            </button>
                            <button
                              onClick={() => abrirConexModal(e)}
                              className="admin-btn-ghost"
                              style={styles.smallBtn("#2e7d32")}
                            >
                              <img src="/src/assets/icons/link.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                              CONEXIÓN
                            </button>
                            <button
                              onClick={() => eliminarEntidad(e.id, e.nombre)}
                              className="admin-btn-danger"
                              style={styles.smallBtn("#c0392b")}
                            >
                              <img src="/src/assets/icons/delete.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                              ELIMINAR
                            </button>
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
                          <img src="/src/assets/icons/link.png" style={{ width: "20px", height: "20px", verticalAlign: "middle", marginRight: 8 }} alt="" />
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
                      <><img src="/src/assets/icons/edit.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" /> Editar: {general.nombre || "..."}</>
                    ) : (
                      <><img src="/src/assets/icons/add.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" /> Nueva Entidad</>
                    )}
                  </h2>
                </div>

                {/* Stepper */}
                <div style={styles.stepperNav}>
                  {["Datos", "Detalles", "Multimedia"].map((label, idx) => {
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
                        {stepNum < 3 && (
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
                              const r = await fetch(
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
                                  map.current.flyTo({ center: [lon, lat], zoom: 14 });
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
                        if (general.tipo === "comercio") {
                          const required = [
                            ["razon_social", "Razón social"],
                            ["cuit", "CUIT"],
                            ["rubro_especifico", "Rubro específico"],
                            ["horario_apertura", "Horario apertura"],
                            ["horario_cierre", "Horario cierre"],
                            ["estado_pago", "Estado de suscripción"],
                          ];
                          const missing = required.filter(([k]) => !especifico[k]?.trim());
                          if (missing.length > 0) {
                            setDetailError("Completá los campos requeridos: " + missing.map(([,l]) => l).join(", "));
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

                            <div className="media-url-or">o ingresá una URL</div>

                            <input
                              style={styles.input}
                              placeholder="URL del recurso (Cloudinary o externa)"
                              value={item.url_recurso}
                              onChange={(e) =>
                                handleMultimediaChange(i, "url_recurso", e.target.value)
                              }
                            />
                          </div>

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
                                    {["artesano", "gastronomía", "comercio", "evento", "patrimonio", "personalidad"].map((t) => (
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
                                      const typeOrder = ["artesano", "gastronomía", "comercio", "evento", "patrimonio", "personalidad"];
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
                        onClick={guardarEntidad}
                        disabled={loading}
                        className="admin-btn"
                        style={{
                          ...styles.btnPrimary,
                          opacity: loading ? 0.6 : 1,
                          cursor: loading ? "not-allowed" : "pointer",
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

            {/* RECORRIDOS */}
            {view === "nuevo-recorrido" && (
              <div>
                <div style={{ position: "sticky", top: 0, zIndex: 10, background: "#f5f2eb", paddingBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h2 style={styles.sectionTitle}>
                    <img src="/src/assets/icons/route.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
                    Recorridos
                  </h2>
                  {!editingRecorridoId && (
                    <button
                      onClick={() => setEditingRecorridoId("new")}
                      className="admin-btn"
                      style={{ ...styles.btnPrimary, background: "#2e7d32" }}
                    >
                      + NUEVO
                    </button>
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
                          <img src="/src/assets/icons/edit.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                          EDITAR
                        </button>
                        <button
                          onClick={() => eliminarRecorrido(r.id, r.nombre)}
                          className="admin-btn-danger"
                          style={styles.smallBtn("#c0392b")}
                        >
                          <img src="/src/assets/icons/delete.png" style={{ width: "14px", height: "14px", verticalAlign: "middle", marginRight: "4px" }} alt="" />
                          ELIMINAR
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* LOCALIDADES */}
            {view === "localidades" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <h2 style={{ ...styles.sectionTitle, marginBottom: 0 }}>
                    <img src="/src/assets/icons/location.png" style={{ width: "26px", height: "26px", marginRight: "10px", verticalAlign: "middle" }} alt="" />
                    Localidades
                  </h2>
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
