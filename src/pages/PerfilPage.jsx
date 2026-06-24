import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import { SelloModal } from "../components/SelloModal";
import { useSocketEvent } from "../hooks/useSocket";
import { useNotificationContext } from "../context/NotificationContext";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

const sSection = {
  padding: "100px 40px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const sContainer = {
  maxWidth: 720,
  width: "100%",
};

const sLabel = {
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#863819",
  marginBottom: 8,
};

const sField = {
  position: "relative",
  marginBottom: 48,
  paddingTop: 28,
};

const sInput = {
  width: "100%",
  padding: "6px 0",
  fontSize: 24,
  fontWeight: 400,
  letterSpacing: "-0.02em",
  border: "none",
  borderBottom: "1px solid #e8e8e8",
  background: "transparent",
  color: "#1a1a1a",
  fontFamily: "inherit",
  outline: "none",
  borderRadius: 0,
  transition: "border-color 0.25s ease",
  boxSizing: "border-box",
};

const sTextarea = {
  ...sInput,
  resize: "vertical",
  minHeight: 60,
};

const sDateInput = {
  ...sInput,
  fontSize: 20,
  letterSpacing: "0.02em",
  color: "#1a1a1a",
  textTransform: "uppercase",
};

const sFloatingLabel = (focused, filled) => ({
  position: "absolute",
  left: 0,
  top: focused || filled ? 0 : 34,
  fontSize: focused || filled ? 13 : 24,
  fontWeight: focused || filled ? 500 : 400,
  letterSpacing: focused || filled ? "0.06em" : "-0.02em",
  textTransform: focused || filled ? "uppercase" : "none",
  color: focused ? "#863819" : "#aaa",
  pointerEvents: "none",
  transition: "all 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
});

const sDivider = {
  width: 40,
  height: 3,
  background: "#863819",
  borderRadius: 2,
  marginBottom: 48,
};

const FloatingInput = ({ label, value, onChange, type = "text", autoFocus = false, inputStyle }) => {
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  return (
    <div style={sField}>
      <input
        ref={inputRef}
        type={type}
        style={{ ...sInput, ...inputStyle }}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
      />
      <label style={sFloatingLabel(focused, !!value)}>{label}</label>
    </div>
  );
};

const WhatsAppField = ({ prefix, number, onPrefixChange, onNumberChange }) => {
  const [focused, setFocused] = useState(false);
  const filled = !!number;
  return (
    <div style={sField}>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
        <select
          value={prefix}
          onChange={(e) => onPrefixChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            ...sInput,
            width: "auto",
            minWidth: "90px",
            flexShrink: 0,
            cursor: "pointer",
            appearance: "none",
            background: "transparent",
            paddingRight: "16px",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23aaa'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 0 center",
          }}
        >
          <option value="+54">🇦🇷 +54</option>
          <option value="+55">🇧🇷 +55</option>
          <option value="+595">🇵🇾 +595</option>
          <option value="+598">🇺🇾 +598</option>
          <option value="+56">🇨🇱 +56</option>
          <option value="+591">🇧🇴 +591</option>
          <option value="+51">🇵🇪 +51</option>
          <option value="+593">🇪🇨 +593</option>
          <option value="+57">🇨🇴 +57</option>
          <option value="+58">🇻🇪 +58</option>
          <option value="+1">🇺🇸 +1</option>
          <option value="+34">🇪🇸 +34</option>
          <option value="+39">🇮🇹 +39</option>
          <option value="+49">🇩🇪 +49</option>
          <option value="+33">🇫🇷 +33</option>
          <option value="+44">🇬🇧 +44</option>
          <option value="+52">🇲🇽 +52</option>
          <option value="+86">🇨🇳 +86</option>
          <option value="+81">🇯🇵 +81</option>
        </select>
        <div style={{ flex: 1, position: "relative" }}>
          <input
            type="tel"
            value={number}
            onChange={(e) => onNumberChange(e.target.value.replace(/\D/g, ""))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={sInput}
          />
          <label style={{ ...sFloatingLabel(focused, filled), top: focused || filled ? -28 : 6, zIndex: 1 }}>WhatsApp</label>
        </div>
      </div>
    </div>
  );
};

const FloatingTextarea = ({ label, value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);

  return (
    <div style={sField}>
      <textarea
        ref={ref}
        style={sTextarea}
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
      <label style={sFloatingLabel(focused, !!value)}>{label}</label>
    </div>
  );
};

const FloatingDate = ({ label, value, onChange }) => {
  return (
    <div style={sField}>
      <input
        type="date"
        style={sDateInput}
        value={value || ""}
        onChange={onChange}
      />
      <label style={{
        position: "absolute",
        left: 0,
        top: 0,
        fontSize: 13,
        fontWeight: 500,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        color: "#aaa",
        pointerEvents: "none",
      }}>{label}</label>
    </div>
  );
};

const LocationAutocomplete = ({ label, value, onChange, onLocationSelect }) => {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 3 || !open) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=place,locality&access_token=${MAPBOX_TOKEN}&language=es`,
        );
        const data = await res.json();
        setResults(data.features || []);
      } catch {
        setResults([]);
      }
    }, 350);
  }, [query, open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback((feature) => {
    const placeName = feature.place_name;
    setQuery(placeName);
    onChange(placeName);
    setOpen(false);

    const context = feature.context || [];
    let country = "";
    let region = "";
    for (const ctx of context) {
      if (ctx.id.startsWith("country")) country = ctx.short_code?.toUpperCase() || ctx.text;
      if (ctx.id.startsWith("region")) region = ctx.text;
    }
    if (onLocationSelect) onLocationSelect({ country, region });
  }, [onChange, onLocationSelect]);

  return (
    <div style={{ ...sField, position: "relative" }} ref={wrapperRef}>
      <input
        type="text"
        style={sInput}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      <label style={sFloatingLabel(focused || !!query, !!query)}>{label}</label>

      {open && results.length > 0 && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          background: "#fff",
          border: "1px solid #eee",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          zIndex: 100,
          maxHeight: 200,
          overflowY: "auto",
          marginTop: 4,
        }}>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              style={{
                display: "block",
                width: "100%",
                padding: "10px 14px",
                textAlign: "left",
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                color: "#1a1a1a",
                fontFamily: "inherit",
                borderBottom: "1px solid #f5f5f5",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f8f5f0"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {r.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CountryAutocomplete = ({ label, value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2 || !open) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=country&access_token=${MAPBOX_TOKEN}&language=es`,
        );
        const data = await res.json();
        setResults(data.features || []);
      } catch { setResults([]); }
    }, 350);
  }, [query, open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback((feature) => {
    setQuery(feature.text);
    onChange(feature.text);
    setOpen(false);
  }, [onChange]);

  return (
    <div style={{ ...sField, position: "relative" }} ref={wrapperRef}>
      <input
        type="text"
        style={sInput}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        autoComplete="off"
      />
      <label style={sFloatingLabel(focused || !!query, !!query)}>{label}</label>
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#fff", border: "1px solid #eee", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", zIndex: 100,
          maxHeight: 200, overflowY: "auto", marginTop: 4,
        }}>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              style={{
                display: "block", width: "100%", padding: "10px 14px",
                textAlign: "left", border: "none", background: "transparent",
                cursor: "pointer", fontSize: 14, color: "#1a1a1a",
                fontFamily: "inherit", borderBottom: "1px solid #f5f5f5",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f8f5f0"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {r.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const RegionAutocomplete = ({ label, value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2 || !open) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?types=region&access_token=${MAPBOX_TOKEN}&language=es`,
        );
        const data = await res.json();
        setResults(data.features || []);
      } catch { setResults([]); }
    }, 350);
  }, [query, open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback((feature) => {
    setQuery(feature.text);
    onChange(feature.text);
    setOpen(false);
  }, [onChange]);

  return (
    <div style={{ ...sField, position: "relative" }} ref={wrapperRef}>
      <input
        type="text"
        style={sInput}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        autoComplete="off"
      />
      <label style={sFloatingLabel(focused || !!query, !!query)}>{label}</label>
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#fff", border: "1px solid #eee", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", zIndex: 100,
          maxHeight: 200, overflowY: "auto", marginTop: 4,
        }}>
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => handleSelect(r)}
              style={{
                display: "block", width: "100%", padding: "10px 14px",
                textAlign: "left", border: "none", background: "transparent",
                cursor: "pointer", fontSize: 14, color: "#1a1a1a",
                fontFamily: "inherit", borderBottom: "1px solid #f5f5f5",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f8f5f0"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {r.place_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SEXOS = [
  "Masculino", "Femenino", "No binario",
  "Prefiero no decirlo", "Otro",
];

const SexoCombobox = ({ value, onChange, label = "Sexo" }) => {
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [filtered, setFiltered] = useState(SEXOS);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setFiltered(SEXOS.filter((s) => s.toLowerCase().includes(value.toLowerCase())));
  }, [value]);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div style={{ ...sField, position: "relative" }} ref={wrapperRef}>
      <input
        type="text"
        style={sInput}
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onBlur={() => setFocused(false)}
        autoComplete="off"
      />
      <label style={sFloatingLabel(focused || !!value, !!value)}>{label}</label>
      {open && filtered.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0,
          background: "#fff", border: "1px solid #eee", borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)", zIndex: 100,
          maxHeight: 200, overflowY: "auto", marginTop: 4,
        }}>
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { onChange(s); setOpen(false); }}
              style={{
                display: "block", width: "100%", padding: "10px 14px",
                textAlign: "left", border: "none", background: "transparent",
                cursor: "pointer", fontSize: 14, color: "#1a1a1a",
                fontFamily: "inherit", borderBottom: "1px solid #f5f5f5",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#f8f5f0"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const AvatarWithOverlay = ({ avatarUrl, nombre, uploadingAvatar, onChangeClick, onRemoveClick }) => {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{ position: "relative", flexShrink: 0, width: 120, height: 120, cursor: "pointer" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt="Avatar"
          style={{
            width: 120, height: 120, borderRadius: "50%", objectFit: "cover",
            border: "2px solid #e8e8e8", display: "block",
          }}
        />
      ) : (
        <div style={{
          width: 120, height: 120, borderRadius: "50%",
          background: "#e8e0d4", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 40, fontWeight: 600,
          color: "#a09080", fontFamily: "Cinzel, serif",
          border: "2px solid #e8e8e8",
        }}>
          {(nombre || "?").charAt(0).toUpperCase()}
        </div>
      )}

      <div style={{
        position: "absolute", inset: 0, borderRadius: "50%",
        background: "rgba(0,0,0,0.55)",
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", gap: 6,
        opacity: hover ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}>
        <button
          type="button"
          onClick={onChangeClick}
          style={{
            fontFamily: "inherit", fontSize: 12, fontWeight: 600,
            letterSpacing: "0.04em", cursor: "pointer",
            border: "none", background: "none", padding: "2px 0",
            color: "#fff",
            transition: "opacity 0.2s ease",
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.6"}
          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
        >
          {uploadingAvatar ? "SUBIR..." : "CAMBIAR"}
        </button>
        {avatarUrl && (
          <button
            type="button"
            onClick={onRemoveClick}
            style={{
              fontFamily: "inherit", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.04em", cursor: "pointer",
              border: "none", background: "none", padding: "2px 0",
              color: "#e57373",
              transition: "opacity 0.2s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.6"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            ELIMINAR
          </button>
        )}
      </div>
    </div>
  );
};

export const PerfilPage = () => {
  const { perfil, logout, getToken, isAuthenticated } = useAuthPublico();
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [profesion, setProfesion] = useState("");
  const [bio, setBio] = useState("");
  const [nacionalidad, setNacionalidad] = useState("");
  const [pais, setPais] = useState("");
  const [provincia, setProvincia] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [fechaNac, setFechaNac] = useState("");
  const [sexo, setSexo] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarPublicId, setAvatarPublicId] = useState("");
  const [whatsappPrefix, setWhatsappPrefix] = useState("+54");
  const [whatsapp, setWhatsapp] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [msg, setMsg] = useState("");
  const [savedUnverified, setSavedUnverified] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [section, setSection] = useState("profile");
  const [entidades, setEntidades] = useState([]);
  const [loadingEntidades, setLoadingEntidades] = useState(false);
  const [cancellingId, setCancellingId] = useState(null);
  const [cancellingLoading, setCancellingLoading] = useState(false);
  const [cancelSubId, setCancelSubId] = useState(null);
  const [cancellingSub, setCancellingSub] = useState(false);
  const [aceptoPolitica, setAceptoPolitica] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [loadingFavoritos, setLoadingFavoritos] = useState(false);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loadingNotificaciones, setLoadingNotificaciones] = useState(false);
  const [deletingNotif, setDeletingNotif] = useState(new Set());
  const [tourStep, setTourStep] = useState(null);
  const sidebarRef = useRef(null);
  const [showSelloModal, setShowSelloModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteEmail, setDeleteEmail] = useState("");
  const [deleteEntityConfirm, setDeleteEntityConfirm] = useState(null);
  const [deletingEntity, setDeletingEntity] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [planes, setPlanes] = useState([]);
  const [planPersonalizado, setPlanPersonalizado] = useState(null);
  const [loadingPlanes, setLoadingPlanes] = useState(false);
  const [pagos, setPagos] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [planModal, setPlanModal] = useState(null);
  const [adquiriendo, setAdquiriendo] = useState(false);
  const [customDias, setCustomDias] = useState(1);

  const { unreadCount, fetchUnreadCount } = useNotificationContext();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/iniciar-sesion", { replace: true });
      return;
    }
    if (perfil && !loaded) {
      setNombre(perfil.nombre || "");
      setProfesion(perfil.profesion || "");
      setBio(perfil.bio || "");
      setNacionalidad(perfil.nacionalidad || "");
      setPais(perfil.pais || "");
      setProvincia(perfil.provincia || "");
      setLocalidad(perfil.localidad || "");
      setFechaNac(perfil.fecha_nacimiento ? perfil.fecha_nacimiento.split("T")[0] : "");
      setSexo(perfil.sexo || "");
      setAvatarUrl(perfil.avatar_url || "");
      setAvatarPublicId(perfil.avatar_public_id || "");
      const wa = perfil.whatsapp || "";
      setWhatsapp(wa);
      const match = wa.match(/^(\+\d+)\s*/);
      if (match) setWhatsappPrefix(match[1]);
      setLoaded(true);
    }
  }, [isAuthenticated, perfil, navigate, loaded]);

  const savingRef = useRef(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (savingRef.current) return;

    const missing = [];
    if (!nombre.trim()) missing.push("Nombre completo");
    if (!profesion.trim()) missing.push("Profesión / oficio");
    if (!bio.trim()) missing.push("Biografía");
    if (!nacionalidad.trim()) missing.push("Nacionalidad");
    if (!pais.trim()) missing.push("País");
    if (!provincia.trim()) missing.push("Provincia / Estado");
    if (!localidad.trim()) missing.push("Localidad");
    if (!sexo.trim()) missing.push("Sexo");
    if (!fechaNac.trim()) missing.push("Fecha de nacimiento");

    if (missing.length > 0) {
      setMsg("Completá todos los campos: " + missing.join(", "));
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          nombre,
          profesion,
          bio,
          localidad,
          pais,
          provincia,
          nacionalidad,
          fecha_nacimiento: fechaNac || null,
          sexo,
          avatar_url: avatarUrl,
          avatar_public_id: avatarPublicId,
          whatsapp,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data = await res.json();
      localStorage.setItem("made_in_chaco_perfil", JSON.stringify(data));
      if (!data.verified) {
        setSavedUnverified(true);
      } else {
        setMsg("Perfil actualizado");
      }
    } catch {
      setMsg("Error al guardar");
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  };

  const handleLocationSelect = useCallback(({ country, region }) => {
    if (country) setPais(country);
    if (region) setProvincia(region);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("archivo", file);
      const res = await fetch("/api/upload-public", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Error al subir imagen");
      const data = await res.json();
      setAvatarUrl(data.url);
      setAvatarPublicId(data.public_id || "");
      const stored = JSON.parse(localStorage.getItem("made_in_chaco_perfil") || "{}");
      localStorage.setItem("made_in_chaco_perfil", JSON.stringify({ ...stored, avatar_url: data.url, avatar_public_id: data.public_id || "" }));
      await fetch("/api/auth/perfil", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ avatar_url: data.url, avatar_public_id: data.public_id || "" }),
      });
    } catch {
      setMsg("Error al subir foto");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    const prevId = avatarPublicId;
    setAvatarUrl("");
    setAvatarPublicId("");
    const stored = JSON.parse(localStorage.getItem("made_in_chaco_perfil") || "{}");
    localStorage.setItem("made_in_chaco_perfil", JSON.stringify({ ...stored, avatar_url: "", avatar_public_id: "" }));
    try {
      await fetch("/api/auth/avatar", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      // if delete fails, still clean local state
    }
  };

  const fetchEntidades = useCallback(async () => {
    setLoadingEntidades(true);
    try {
      const res = await fetch("/api/mis-entidades", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setEntidades(await res.json());
    } catch {} finally {
      setLoadingEntidades(false);
    }
  }, [getToken]);

  const fetchFavoritos = useCallback(async () => {
    setLoadingFavoritos(true);
    try {
      const res = await fetch("/api/mis-favoritos", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setFavoritos(await res.json());
    } catch {} finally {
      setLoadingFavoritos(false);
    }
  }, [getToken]);

  const fetchNotificaciones = useCallback(async () => {
    setLoadingNotificaciones(true);
    try {
      const res = await fetch("/api/notificaciones/verificar-suscripciones", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setNotificaciones(await res.json());
    } catch {} finally {
      setLoadingNotificaciones(false);
    }
  }, [getToken]);

  const fetchPlanes = useCallback(async () => {
    setLoadingPlanes(true);
    try {
      const [res, resPers] = await Promise.all([
        fetch("/api/planes"),
        fetch("/api/planes/personalizado"),
      ]);
      if (res.ok) {
        const data = await res.json();
        setPlanes(data.filter(p => p.nombre !== "Personalizado"));
      }
      if (resPers.ok) setPlanPersonalizado(await resPers.json());
    } catch {} finally {
      setLoadingPlanes(false);
    }
  }, []);

  const fetchPagos = useCallback(async () => {
    setLoadingPagos(true);
    try {
      const res = await fetch("/api/suscripciones/mis-pagos", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) setPagos(await res.json());
    } catch {} finally {
      setLoadingPagos(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (section === "solicitudes" || section === "entidades" || section === "suscripciones") {
      fetchEntidades();
    }
    if (section === "favoritos") {
      fetchFavoritos();
    }
    if (section === "notificaciones") {
      fetchNotificaciones();
    }
    if (section === "suscripciones") {
      fetchPlanes();
      fetchPagos();
    }
  }, [section, fetchEntidades, fetchFavoritos, fetchNotificaciones, fetchPlanes, fetchPagos]);

  useSocketEvent("notificacion:nueva", () => {
    fetchNotificaciones();
  });

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 5000);
    return () => clearTimeout(t);
  }, [msg]);

  const handleCancelConfirm = async () => {
    if (!cancellingId) return;
    setCancellingLoading(true);
    try {
      const res = await fetch(`/api/mis-entidades/${cancellingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) fetchEntidades();
    } catch {}
    setCancellingLoading(false);
    setCancellingId(null);
  };

  const ESTADOS_SELLO = {
    pendiente: { label: "Pendiente", color: "#f9a825", bg: "#fff8e1" },
    aprobado: { label: "Aprobado", color: "#2e7d32", bg: "#e8f5e9" },
    rechazado: { label: "Rechazado", color: "#c62828", bg: "#ffebee" },
  };

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
    comercio: "Comercio",
    hospedaje: "Hospedaje",
    productor: "Productor",
    evento: "Evento",
  };

  const tiposConMembresia = Object.keys(TIPOS_LABEL);

  const suscripcionStatus = (e) => {
    if (e.estado_pago === "reembolso_solicitado") {
      return { label: "En revisión", color: "#e65100", bg: "#fff3e0" };
    }
    if (!e.fecha_fin_suscripcion) return null;
    const d = new Date();
    const hoyStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const inicioStr = e.fecha_inicio_suscripcion?.split("T")[0];
    const finStr = e.fecha_fin_suscripcion.split("T")[0];
    if (inicioStr && hoyStr < inicioStr) {
      const days = Math.ceil((new Date(inicioStr + 'T00:00:00') - new Date(hoyStr + 'T00:00:00')) / 86400000);
      return { label: `Comienza en ${days}d`, color: "#f39c12", bg: "#fff8e1" };
    }
    if (hoyStr > finStr) {
      return { label: "Vencida", color: "#c62828", bg: "#ffebee" };
    }
    const daysLeft = Math.ceil((new Date(finStr + 'T23:59:59') - new Date(hoyStr + 'T00:00:00')) / 86400000);
    if (daysLeft <= 30) {
      return { label: `Por vencer (${daysLeft}d)`, color: "#e65100", bg: "#fff3e0" };
    }
    return { label: "Activa", color: "#2e7d32", bg: "#e8f5e9" };
  };

  const necesitaSuscripcion = (e) => {
    if (e.estado_sello !== "aprobado") return false;
    if (!tiposConMembresia.includes(e.tipo)) return false;
    return true;
  };

  const enMapa = (e) => {
    if (e.estado_sello !== "aprobado" || !e.visible) return false;
    if (!e.latitud || !e.longitud) return false;

    const suscValida = () => {
      if (!e.fecha_fin_suscripcion) return true;
      const d = new Date();
      const hoyStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const inicioStr = e.fecha_inicio_suscripcion?.split("T")[0];
      const finStr = e.fecha_fin_suscripcion.split("T")[0];
      if (inicioStr && hoyStr < inicioStr) return false;
      if (hoyStr > finStr) return false;
      return true;
    };

    if (e.tipo === "comercio" || e.tipo === "hospedaje" || e.tipo === "productor") {
      return (e.estado_pago === "al_dia" || e.estado_pago === "reembolso_solicitado") && suscValida();
    }

    if (e.tipo === "evento") {
      if (e.fecha_evento) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const ev = new Date(e.fecha_evento.split("T")[0]);
        if (ev < hoy) return false;
      }
      return (e.estado_pago === "al_dia" || e.estado_pago === "reembolso_solicitado") && suscValida();
    }

    return true;
  };

  if (!isAuthenticated || !perfil) return null;

  if (savedUnverified) {
    return (
      <div style={{ background: "#f5f2e8", minHeight: "100vh", fontFamily: "Epilogue, sans-serif", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ maxWidth: 480, margin: "0 auto" }}>
            <p style={sLabel}>Cuenta creada</p>
            <div style={{ marginTop: 48 }}>
              <h2 style={{
                fontFamily: "Cinzel, serif", fontSize: 26, fontWeight: 600,
                color: "#1c1c18", margin: "0 0 12px", letterSpacing: "-0.02em",
              }}>
                Revisá tu email
              </h2>
              <p style={{ color: "#666", lineHeight: 1.7, fontSize: 15, maxWidth: 400, margin: "0 auto" }}>
                Guardamos tus datos correctamente. Te enviamos un enlace de confirmación a
              </p>
              <p style={{
                color: "#1c1c18", fontSize: 15, fontWeight: 600, marginTop: 8,
                letterSpacing: "-0.01em",
              }}>
                {perfil.email}
              </p>
              <p style={{ color: "#999", fontSize: 13, marginTop: 20 }}>
                ¿No lo encontrás? Revisá la carpeta de spam.
              </p>
              <button
                onClick={() => {
                  logout();
                  navigate("/", { replace: true });
                }}
                style={{
                  marginTop: 40, padding: "14px 48px", background: "#863819",
                  color: "#fff", border: "none", borderRadius: 8,
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                  fontFamily: "inherit", letterSpacing: "0.06em",
                }}
              >
                CERRAR SESIÓN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const SIDEBAR_SECTIONS = [
    { key: "profile", label: "Mi Perfil", icon: "→" },
    { key: "notificaciones", label: "Notificaciones", icon: "→" },
    { key: "solicitar-sello", label: "Solicitar sello", icon: "→" },
    { key: "solicitudes", label: "Mis Solicitudes", icon: "→" },
    { key: "entidades", label: "Mis Entidades", icon: "→" },
    { key: "suscripciones", label: "Planes", icon: "→" },
    { key: "favoritos", label: "Mis Favoritos", icon: "→" },
  ];

  const sSidebarItem = (isActive) => ({
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: isActive ? 600 : 400,
    letterSpacing: "-0.01em",
    cursor: "pointer",
    border: "none",
    borderBottom: "1px solid #eee",
    background: isActive ? "#e8e4da" : "transparent",
    padding: "14px 16px",
    borderRadius: "6px 0 0 6px",
    color: isActive ? "#111" : "#555",
    textAlign: "left",
    width: "100%",
    transition: "all 0.2s ease",
  });

  const sEstadoBadge = (estado) => {
    const cfg = ESTADOS_SELLO[estado] || { label: estado, color: "#888", bg: "#f5f5f5" };
    return {
      display: "inline-block",
      padding: "4px 12px",
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.04em",
      color: cfg.color,
      background: cfg.bg,
      borderRadius: 4,
    };
  };

  return (
    <div style={{ background: "#f5f2e8", height: "100vh", overflow: "hidden", fontFamily: "Epilogue, sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        .perfil-content::-webkit-scrollbar {
          width: 6px;
        }
        .perfil-content::-webkit-scrollbar-track {
          background: #f5f2e8;
        }
        .perfil-content::-webkit-scrollbar-thumb {
          background: #d4cfc3;
          border-radius: 3px;
        }
        .perfil-content::-webkit-scrollbar-thumb:hover {
          background: #bbb5a8;
        }
      `}</style>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarChange}
        style={{ display: "none" }}
      />

      <div style={{ flex: 1, overflow: "hidden", display: "flex", gap: 0, padding: "140px 40px 40px" }}>
        {/* Sidebar */}
        <div ref={sidebarRef} style={{ width: 240, flexShrink: 0, borderRight: "2px solid #e8e4da", paddingRight: 40, overflow: "hidden", wordBreak: "break-word" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <AvatarWithOverlay
              avatarUrl={avatarUrl}
              nombre={nombre}
              uploadingAvatar={uploadingAvatar}
              onChangeClick={() => fileInputRef.current?.click()}
              onRemoveClick={handleRemoveAvatar}
            />
            <div style={{ textAlign: "center", width: "100%" }}>
              <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 600, color: "#1c1c18", margin: 0, letterSpacing: "-0.02em" }}>
                {nombre || "Mi Perfil"}
              </h3>
              <p style={{ color: "#888", fontSize: 13, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{perfil.email}</p>
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {SIDEBAR_SECTIONS.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => s.key === "solicitar-sello" ? setShowSelloModal(true) : setSection(s.key)}
                style={sSidebarItem(section === s.key)}
                onMouseEnter={(e) => { if (section !== s.key) e.currentTarget.style.color = "#999"; }}
                onMouseLeave={(e) => { if (section !== s.key) e.currentTarget.style.color = "#555"; }}
              >
                {s.label}
                {s.key === "notificaciones" && unreadCount > 0 && (
                  <span style={{
                    display: "inline-block", width: 8, height: 8, borderRadius: "50%",
                    background: "#863819", marginLeft: 8, verticalAlign: "middle",
                  }} />
                )}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: "14px 0",
              color: "#555",
              borderBottom: "1px solid #e57373",
              marginTop: 32,
              transition: "opacity 0.2s ease",
              width: "100%",
              textAlign: "center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#999"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; }}
          >
            CERRAR SESIÓN
          </button>
        </div>

        {/* Content */}
        <div className="perfil-content" style={{ flex: 1, minWidth: 0, paddingLeft: 60, paddingRight: 40, overflowY: "auto" }}>
            {perfil && !perfil.verified && (
            <div style={{
              background: "#fff8e1", border: "1px solid #f0dca0", borderRadius: 10,
              padding: "16px 20px", marginBottom: 24,
              fontSize: 13, color: "#1c1c18", lineHeight: 1.5,
            }}>
              <strong style={{ color: "#1c1c18" }}>Completá tus datos para activar tu cuenta</strong>
              <p style={{ margin: "4px 0 0", color: "#1c1c18" }}>
                Completá la información de tu perfil y presioná <strong style={{ color: "#1c1c18" }}>Guardar</strong>. Te enviaremos un enlace de confirmación a <strong style={{ color: "#1c1c18" }}>{perfil.email}</strong> para verificar tu cuenta.
              </p>
            </div>
          )}
          {msg && (
            <div style={{
              position: "fixed",
              top: 100,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 2000,
              background: msg.includes("Error") ? "#ffebee" : "#e8f5e9",
              border: `1px solid ${msg.includes("Error") ? "#ef9a9a" : "#a5d6a7"}`,
              borderRadius: 12, padding: "16px 24px",
              fontSize: 14, color: "#000", lineHeight: 1.5,
              display: "flex", justifyContent: "space-between", alignItems: "center",
              boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
              maxWidth: 480, width: "90%",
            }}>
              <span style={{ color: "#000" }}>{msg}</span>
              <button
                type="button"
                onClick={() => setMsg("")}
                style={{
                  fontFamily: "inherit", fontSize: 16, cursor: "pointer",
                  border: "none", background: "none", color: "#000", padding: "0 0 0 16px",
                  opacity: 0.5,
                }}
              >
                ✕
              </button>
            </div>
          )}
          {section === "profile" && (
              <>
                <div style={sDivider} />
                <h2 style={{
                  fontFamily: "Cinzel, serif", fontSize: 26, fontWeight: 600,
                  color: "#1c1c18", margin: "0 0 32px", letterSpacing: "-0.02em",
                }}>
                  Mi Perfil
                </h2>
                <form onSubmit={handleSave} style={{ width: "100%" }}>
                  <FloatingInput label="Nombre completo *" value={nombre} onChange={(e) => setNombre(e.target.value)} />
                  <FloatingInput label="Profesión / oficio *" value={profesion} onChange={(e) => setProfesion(e.target.value)} />
                  <WhatsAppField
                    prefix={whatsappPrefix}
                    number={whatsapp.replace(/^\+\d+\s*/, "")}
                    onPrefixChange={(p) => {
                      const n = whatsapp.replace(/^\+\d+\s*/, "");
                      setWhatsappPrefix(p);
                      setWhatsapp(p + " " + n);
                    }}
                    onNumberChange={(n) => setWhatsapp(whatsappPrefix + " " + n)}
                  />
                  <FloatingTextarea label="Biografía *" value={bio} onChange={(e) => setBio(e.target.value)} />

                  <div style={{ height: 24 }} />

                  <CountryAutocomplete label="Nacionalidad *" value={nacionalidad} onChange={setNacionalidad} />
                  <CountryAutocomplete label="País de residencia *" value={pais} onChange={setPais} />
                  <RegionAutocomplete label="Provincia / Estado *" value={provincia} onChange={setProvincia} />

                  <LocationAutocomplete
                    label="Localidad *"
                    value={localidad}
                    onChange={setLocalidad}
                    onLocationSelect={handleLocationSelect}
                  />

                  <SexoCombobox label="Sexo *" value={sexo} onChange={setSexo} />

                  <FloatingDate label="Fecha de nacimiento *" value={fechaNac} onChange={(e) => setFechaNac(e.target.value)} />

                  <div style={{ display: "flex", gap: 32, marginTop: 56, alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={handleSave}
                      style={{
                        fontFamily: "inherit",
                        fontSize: 15,
                        fontWeight: 500,
                        letterSpacing: "0.02em",
                        cursor: "pointer",
                        border: "none",
                        background: "none",
                        padding: "14px 0",
                        color: "#888",
                        borderBottom: "1px solid #90a88a",
                        transition: "opacity 0.25s ease",
                      }}
                      onMouseEnter={(e) => { if (!saving) e.currentTarget.style.opacity = "0.5"; }}
                      onMouseLeave={(e) => { if (!saving) e.currentTarget.style.opacity = "1"; }}
                    >
                      {saving ? "GUARDANDO..." : "GUARDAR"}
                    </button>
                  </div>

                  {msg && (
                    <p style={{
                      marginTop: 24,
                      fontSize: 13,
                      letterSpacing: "0.02em",
                      color: msg.includes("Perfil") ? "#506441" : "#d32f2f",
                    }}>
                      {msg.includes("Perfil") ? "✓ " : "✗ "}{msg}
                    </p>
                  )}

                  <div style={{ borderTop: "1px solid #e0dcd0", marginTop: 48, paddingTop: 32 }}>
                    <button
                      type="button"
                      onClick={() => { setDeleteConfirm(true); setDeleteEmail(""); }}
                      style={{
                        fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                        cursor: "pointer", border: "2px solid #c62828",
                        background: "transparent", color: "#c62828",
                        padding: "12px 32px", borderRadius: 8,
                        letterSpacing: "0.04em", transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#c62828"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#c62828"; }}
                    >
                      ELIMINAR CUENTA
                    </button>
                  </div>
                </form>
              </>
            )}

            {section === "solicitudes" && (
              <>
                <div style={sDivider} />
                <h2 style={{
                  fontFamily: "Cinzel, serif", fontSize: 26, fontWeight: 600,
                  color: "#1c1c18", margin: "0 0 32px", letterSpacing: "-0.02em",
                }}>
                  Mis Solicitudes
                </h2>
                {loadingEntidades ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>Cargando...</p>
                ) : entidades.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>
                    Todavía no solicitaste ningún sello.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {entidades.map((e) => {
                      const estado = ESTADOS_SELLO[e.estado_sello] || { label: e.estado_sello || "Sin estado", color: "#888", bg: "#f5f5f5" };
                      return (
                        <div key={e.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "16px 20px", border: "1px solid #e0dcd0", borderRadius: 10,
                          background: "#fcf9f4", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                              {e.icono && (
                                <img src={e.icono} alt="" style={{ width: 16, height: 16, borderRadius: 2, objectFit: "contain" }} />
                              )}
                              <span style={{ fontSize: 13, color: TIPO_COLOR[e.tipo] || "#555", fontWeight: 500, letterSpacing: "0.04em" }}>
                                {TIPOS_LABEL[e.tipo] || e.tipo}
                              </span>
                              <span style={sEstadoBadge(e.estado_sello)}>{estado.label}</span>
                            </div>
                            <p style={{ fontSize: 16, fontWeight: 500, color: "#1c1c18", margin: 0 }}>{e.nombre}</p>
                            <p style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                              {new Date(e.created_at).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => window.open(`/entidad/${e.slug}`, "_blank")}
                              style={{
                                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                                padding: "8px 16px", borderRadius: 6, color: "#555",
                                whiteSpace: "nowrap", transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f2e8"; e.currentTarget.style.borderColor = "#bbb"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#ddd"; }}
                            >
                              Ver
                            </button>
                            {e.estado_sello === "pendiente" && (
                              <button
                                type="button"
                                onClick={() => setCancellingId(e.id)}
                                style={{
                                  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                  cursor: "pointer", border: "1px solid #e57373", background: "transparent",
                                  padding: "8px 16px", borderRadius: 6, color: "#e57373",
                                  whiteSpace: "nowrap", transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#ffebee"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {section === "entidades" && (
              <>
                <div style={sDivider} />
                <h2 style={{
                  fontFamily: "Cinzel, serif", fontSize: 26, fontWeight: 600,
                  color: "#1c1c18", margin: "0 0 32px", letterSpacing: "-0.02em",
                }}>
                  Mis Entidades
                </h2>
                {loadingEntidades ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>Cargando...</p>
                ) : entidades.filter((e) => e.estado_sello === "aprobado").length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>
                    No tenés entidades aprobadas todavía.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {entidades
                      .filter((e) => e.estado_sello === "aprobado")
                      .map((e) => (
                         <div key={e.id} style={{
                           display: "flex", alignItems: "center", justifyContent: "space-between",
                           padding: "16px 20px", border: "1px solid #e0dcd0", borderRadius: 10,
                          background: "#fcf9f4", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                         }}>
                           <div>
                             <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              {e.icono && (
                                <img src={e.icono} alt="" style={{ width: 16, height: 16, borderRadius: 2, objectFit: "contain" }} />
                              )}
                              <span style={{ fontSize: 13, color: TIPO_COLOR[e.tipo] || "#555", fontWeight: 500, letterSpacing: "0.04em" }}>
                                {TIPOS_LABEL[e.tipo] || e.tipo}
                              </span>
                              {(() => {
                                const st = suscripcionStatus(e);
                                return st ? (
                                  <span style={{
                                    fontSize: 11, fontWeight: 600, padding: "2px 8px",
                                    borderRadius: 4, color: st.color, background: st.bg,
                                    letterSpacing: "0.02em",
                                  }}>
                                    {st.label}
                                  </span>
                                ) : null;
                              })()}
                              {e.tiene_solicitud_pendiente && (
                                <span style={{
                                  fontSize: 11, fontWeight: 600, padding: "2px 8px",
                                  borderRadius: 4, color: "#7b1fa2", background: "#f3e5f5",
                                  letterSpacing: "0.02em",
                                }}>
                                  En revisión
                                </span>
                              )}
                              <span style={{
                                fontSize: 11, fontWeight: 600, padding: "2px 8px",
                                borderRadius: 4,
                                color: enMapa(e) ? "#1565c0" : "#999",
                                background: enMapa(e) ? "#e3f2fd" : "#f5f5f5",
                                letterSpacing: "0.02em",
                              }}>
                                {enMapa(e) ? "En mapa" : "No visible"}
                              </span>
                            </div>
                            <p style={{ fontSize: 16, fontWeight: 500, color: "#1c1c18", margin: 0 }}>{e.nombre}</p>
                            {e.resumen && (
                              <p style={{ fontSize: 13, color: "#888", marginTop: 4, maxWidth: 400, lineHeight: 1.4 }}>
                                {e.resumen}
                              </p>
                            )}
                            {e.updated_at && (
                              <p style={{ fontSize: 11, color: "#aaa", marginTop: 6, letterSpacing: "-0.01em" }}>
                                Última actualización: {new Date(e.updated_at).toLocaleDateString("es-AR", { year: "numeric", month: "long", day: "numeric" })}
                              </p>
                            )}
                            {e.fecha_inicio_suscripcion && e.fecha_fin_suscripcion && (
                              <p style={{ fontSize: 11, color: "#6b5b4e", marginTop: 4, letterSpacing: "-0.01em" }}>
                                Suscripción: {new Date(e.fecha_inicio_suscripcion.split("T")[0]).toLocaleDateString("es-AR")} → {new Date(e.fecha_fin_suscripcion.split("T")[0]).toLocaleDateString("es-AR")}
                              </p>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              onClick={() => window.open(`/entidad/${e.slug}`, "_blank")}
                              style={{
                                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                                padding: "8px 16px", borderRadius: 6, color: "#555",
                                whiteSpace: "nowrap", transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f2e8"; e.currentTarget.style.borderColor = "#bbb"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#ddd"; }}
                            >
                              Ver
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/entidad/${e.id}/editar`)}
                              style={{
                                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                                padding: "8px 16px", borderRadius: 6, color: "#555",
                                whiteSpace: "nowrap", transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f2e8"; e.currentTarget.style.borderColor = "#bbb"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#ddd"; }}
                            >
                              Editar
                            </button>
                            {tiposConMembresia.includes(e.tipo) && e.estado_pago !== "reembolso_solicitado" && (
                              <button
                                type="button"
                                onClick={() => setSection("suscripciones")}
                                style={{
                                  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                  cursor: "pointer", border: "1px solid #f9a825", background: "transparent",
                                  padding: "8px 16px", borderRadius: 6, color: "#f9a825",
                                  whiteSpace: "nowrap", transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#fff8e1"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              >
                                {e.estado_pago === "al_dia" && e.fecha_fin_suscripcion ? "Renovar" : "Suscribir"}
                              </button>
                            )}
                            {e.estado_pago === "al_dia" && e.fecha_fin_suscripcion && (
                              <button
                                type="button"
                                onClick={() => setCancelSubId(e.id)}
                                style={{
                                  fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                  cursor: "pointer", border: "1px solid #e57373", background: "transparent",
                                  padding: "8px 16px", borderRadius: 6, color: "#e57373",
                                  whiteSpace: "nowrap", transition: "all 0.2s ease",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "#ffebee"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                              >
                                Reclamar devolución
                              </button>
                            )}
                            {e.estado_pago === "reembolso_solicitado" && (
                              <span style={{
                                fontSize: 12, fontWeight: 600, color: "#e65100",
                                padding: "8px 0", whiteSpace: "nowrap",
                              }}>
                                Devolución solicitada
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => setDeleteEntityConfirm(e)}
                              style={{
                                fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                                cursor: "pointer", border: "1px solid #e57373", background: "transparent",
                                padding: "8px 16px", borderRadius: 6, color: "#c62828",
                                whiteSpace: "nowrap", transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = "#ffebee"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}

            {section === "notificaciones" && (
              <>
                <div style={sDivider} />
                <h2 style={{
                  fontFamily: "Cinzel, serif", fontSize: 26, fontWeight: 600,
                  color: "#1c1c18", margin: "0 0 32px", letterSpacing: "-0.02em",
                }}>
                  Notificaciones
                </h2>
                {loadingNotificaciones ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>Cargando...</p>
                ) : notificaciones.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>
                    No tenés notificaciones.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {notificaciones.length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch("/api/notificaciones/leer-todas", {
                            method: "POST",
                            headers: { Authorization: `Bearer ${getToken()}` },
                          });
                          setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
                          fetchUnreadCount();
                        }}
                        style={{
                          alignSelf: "flex-end",
                          fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", border: "none", background: "transparent",
                          padding: "4px 0", color: "#863819", textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Marcar todas como leídas
                      </button>
                    )}
                    {notificaciones.length > 0 && (
                      <button
                        type="button"
                        onClick={async () => {
                          await fetch("/api/notificaciones", {
                            method: "DELETE",
                            headers: { Authorization: `Bearer ${getToken()}` },
                          });
                          setNotificaciones([]);
                          fetchUnreadCount();
                        }}
                        style={{
                          alignSelf: "flex-end",
                          fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                          cursor: "pointer", border: "none", background: "transparent",
                          padding: "4px 0", color: "#e57373", textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        Eliminar todas
                      </button>
                    )}
                    {(() => {
                      const ICON_MAP = {
                        bienvenida: "👋",
                        sello_aprobado: "✓",
                        sello_rechazado: "✕",
                        edicion_aprobada: "✓",
                        edicion_rechazada: "✕",
                        suscripcion_por_vencer: "!",
                        suscripcion_vencida: "!",
                        mapa_no_visible: "◌",
                        devolucion_solicitada: "⟳",
                        devolucion_aprobada: "✓",
                        devolucion_rechazada: "✕",
                      };
                      const COLOR_MAP = {
                        bienvenida: "#863819",
                        sello_aprobado: "#2e7d32",
                        edicion_aprobada: "#2e7d32",
                        sello_rechazado: "#c62828",
                        edicion_rechazada: "#c62828",
                        suscripcion_por_vencer: "#f9a825",
                        suscripcion_vencida: "#c62828",
                        mapa_no_visible: "#888",
                        devolucion_solicitada: "#e65100",
                        devolucion_aprobada: "#2e7d32",
                        devolucion_rechazada: "#c62828",
                      };
                      return notificaciones.map((n) => (
                        <div
                          key={n.id}
                          onClick={async () => {
                            if (deletingNotif.has(n.id)) return;
                            if (n.tipo === "bienvenida") {
                              setTourStep(0);
                              setSection("notificaciones");
                              if (!n.leida) {
                                await fetch(`/api/notificaciones/${n.id}/leer`, {
                                  method: "POST",
                                  headers: { Authorization: `Bearer ${getToken()}` },
                                });
                                setNotificaciones((prev) => prev.map((x) => x.id === n.id ? { ...x, leida: true } : x));
                                fetchUnreadCount();
                              }
                              return;
                            }
                            if (!n.leida) {
                              await fetch(`/api/notificaciones/${n.id}/leer`, {
                                method: "POST",
                                headers: { Authorization: `Bearer ${getToken()}` },
                              });
                              setNotificaciones((prev) => prev.map((x) => x.id === n.id ? { ...x, leida: true } : x));
                              fetchUnreadCount();
                            }
                          }}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 12,
                            padding: "14px 18px", border: "1px solid #eee",
                            borderRadius: 8, cursor: deletingNotif.has(n.id) ? "default" : "pointer",
                            background: n.leida ? "#fff" : "#fdfaf5",
                            transition: "all 0.3s ease",
                            opacity: deletingNotif.has(n.id) ? 0 : (n.leida ? 0.7 : 1),
                            transform: deletingNotif.has(n.id) ? "translateX(40px)" : "translateX(0)",
                          }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: (COLOR_MAP[n.tipo] || "#863819") + "18",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 14, fontWeight: 700, flexShrink: 0,
                            color: COLOR_MAP[n.tipo] || "#863819",
                          }}>
                            {ICON_MAP[n.tipo] || "•"}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1c18", margin: 0 }}>
                                {n.titulo}
                              </p>
                              <span style={{ fontSize: 11, color: "#aaa", whiteSpace: "nowrap", marginLeft: 8 }}>
                                {new Date(n.created_at).toLocaleDateString("es-AR")}
                              </span>
                            </div>
                            <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0", lineHeight: 1.4 }}>
                              {n.mensaje}
                            </p>
                            {n.entidad_slug && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`/entidad/${n.entidad_slug}`, "_blank");
                                }}
                                style={{
                                  fontFamily: "inherit", fontSize: 12, fontWeight: 500,
                                  cursor: "pointer", border: "none", background: "transparent",
                                  padding: "4px 0", marginTop: 6, color: "#863819",
                                }}
                              >
                                Ver entidad →
                              </button>
                            )}
                          </div>
                          {!n.leida && (
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#863819", flexShrink: 0, marginTop: 6 }} />
                          )}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              setDeletingNotif((prev) => new Set(prev).add(n.id));
                              try {
                                await fetch(`/api/notificaciones/${n.id}`, {
                                  method: "DELETE",
                                  headers: { Authorization: `Bearer ${getToken()}` },
                                });
                              } catch {}
                              setTimeout(() => {
                                setNotificaciones((prev) => prev.filter((x) => x.id !== n.id));
                                setDeletingNotif((prev) => { const next = new Set(prev); next.delete(n.id); return next; });
                                fetchUnreadCount();
                              }, 300);
                            }}
                            style={{
                              fontFamily: "inherit", fontSize: 14, fontWeight: 400,
                              cursor: "pointer", border: "none", background: "transparent",
                              padding: "2px 4px", color: "#ccc", flexShrink: 0,
                              lineHeight: 1,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = "#c62828"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = "#ccc"; }}
                          >
                            ✕
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </>
            )}

            {section === "suscripciones" && (
              <>
                <div style={sDivider} />
                <h2 style={{
                  fontFamily: "Cinzel, serif", fontSize: 26, fontWeight: 600,
                  color: "#1c1c18", margin: "0 0 8px", letterSpacing: "-0.02em",
                }}>
                  Planes y Suscripciones
                </h2>
                <p style={{ color: "#888", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
                  Elegí un plan para activar o renovar la suscripción de tus entidades.
                  Con la suscripción activa, tu comercio, hospedaje, producto o evento
                  aparece en el mapa de Made in Chaco.
                </p>

                {loadingPlanes ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>Cargando planes...</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20, marginBottom: 48 }}>
                    {planes.map((plan) => (
                      <div key={plan.id} style={{
                        border: "2px solid #e0dcd0", borderRadius: 12,
                        padding: "28px 24px", background: "#fcf9f4",
                        display: "flex", flexDirection: "column",
                        transition: "border-color 0.2s ease",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}>
                        <h3 style={{
                          fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 600,
                          color: "#1c1c18", margin: "0 0 4px",
                        }}>
                          {plan.nombre}
                        </h3>
                        <p style={{ color: "#666", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px", flex: 1 }}>
                          {plan.descripcion}
                        </p>
                        <div style={{ marginBottom: 16 }}>
                          <span style={{
                            fontSize: 28, fontWeight: 700, color: "#863819",
                            fontFamily: "Cinzel, serif",
                          }}>
                            ${Number(plan.precio).toLocaleString("es-AR")}
                          </span>
                          <span style={{ color: "#888", fontSize: 13, marginLeft: 6 }}>
                            / {plan.duracion_dias}días
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
                          {plan.entidades_incluidas > 1
                            ? `Hasta ${plan.entidades_incluidas} entidades`
                            : "1 entidad"}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const entitiesToShow = entidades.filter(necesitaSuscripcion);
                            if (entitiesToShow.length === 0) {
                              setMsg("No tenés entidades aprobadas que requieran suscripción.");
                              return;
                            }
                            setPlanModal({ plan, entidades: entitiesToShow, entidadesSeleccionadas: [], mostrarActivas: false });
                          }}
                          style={{
                            fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                            cursor: "pointer", border: "none", background: "#863819",
                            padding: "12px 24px", borderRadius: 8, color: "#fff",
                            letterSpacing: "0.04em", transition: "opacity 0.2s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                        >
                          ADQUIRIR
                        </button>
                      </div>
                    ))}
                    {planPersonalizado?.activo && (() => {
                      const precioPorDia = Number(planPersonalizado.precio);
                      const precioCalculado = customDias * precioPorDia;
                      return (
                        <div style={{
                          border: "2px solid #e0dcd0", borderRadius: 12,
                          padding: "28px 24px", background: "#fcf9f4",
                          display: "flex", flexDirection: "column",
                          transition: "border-color 0.2s ease",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        }}>
                          <h3 style={{
                            fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 600,
                            color: "#1c1c18", margin: "0 0 4px",
                          }}>
                            {planPersonalizado.nombre}
                          </h3>
                          <p style={{ color: "#666", fontSize: 13, lineHeight: 1.5, margin: "0 0 16px", flex: 1 }}>
                            {planPersonalizado.descripcion || "Elegí la cantidad de días para tu suscripción personalizada."}
                          </p>
                          <div style={{ marginBottom: 12 }}>
                            <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 4 }}>
                              Cantidad de días
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={customDias}
                              onChange={(e) => setCustomDias(Math.max(1, parseInt(e.target.value) || 1))}
                              style={{
                                width: "100%", padding: "10px 12px", borderRadius: 8,
                                border: "2px solid #e0dcd0", fontSize: 16, fontWeight: 600,
                                color: "#1c1c18", fontFamily: "inherit", boxSizing: "border-box",
                                background: "#fff",
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: 16 }}>
                            <span style={{
                              fontSize: 28, fontWeight: 700, color: "#863819",
                              fontFamily: "Cinzel, serif",
                            }}>
                              ${precioCalculado.toLocaleString("es-AR")}
                            </span>
                            <span style={{ color: "#888", fontSize: 13, marginLeft: 6 }}>
                              ({customDias}d × ${precioPorDia.toLocaleString("es-AR")}/día)
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#888", marginBottom: 20 }}>
                            1 entidad
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const entitiesToShow = entidades.filter(necesitaSuscripcion);
                              if (entitiesToShow.length === 0) {
                                setMsg("No tenés entidades aprobadas que requieran suscripción.");
                                return;
                              }
                              setPlanModal({
                                plan: {
                                  id: null,
                                  nombre: `Personalizado (${customDias} días)`,
                                  precio: precioCalculado,
                                  duracion_dias: customDias,
                                  entidades_incluidas: 1,
                                },
                                entidades: entitiesToShow,
                                entidadesSeleccionadas: [],
                                mostrarActivas: false,
                              });
                            }}
                            style={{
                              fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                              cursor: "pointer", border: "none", background: "#863819",
                              padding: "12px 24px", borderRadius: 8, color: "#fff",
                              letterSpacing: "0.04em", transition: "opacity 0.2s ease",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                          >
                            ADQUIRIR
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <h3 style={{
                  fontFamily: "Cinzel, serif", fontSize: 18, fontWeight: 600,
                  color: "#1c1c18", margin: "0 0 20px", letterSpacing: "-0.02em",
                }}>
                  Historial de pagos
                </h3>
                {loadingPagos ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>Cargando...</p>
                ) : pagos.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>
                    Todavía no realizaste ningún pago.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {pagos.map((p) => (
                      <div key={p.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 18px", border: "1px solid #e0dcd0", borderRadius: 8,
                        background: "#fcf9f4",
                      }}>
                        <div>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#1c1c18", margin: 0 }}>
                            {p.plan_nombre}
                          </p>
                          <p style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
                            {p.entidad_nombre}
                          </p>
                          <p style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>
                            {new Date(p.fecha_inicio).toLocaleDateString("es-AR")} → {new Date(p.fecha_fin).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: "#506441", margin: 0 }}>
                            ${Number(p.monto).toLocaleString("es-AR")}
                          </p>
                          <p style={{ fontSize: 11, color: "#2e7d32", marginTop: 2 }}>
                            {new Date(p.created_at).toLocaleDateString("es-AR")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {section === "favoritos" && (
              <>
                <div style={sDivider} />
                <h2 style={{
                  fontFamily: "Cinzel, serif", fontSize: 26, fontWeight: 600,
                  color: "#1c1c18", margin: "0 0 32px", letterSpacing: "-0.02em",
                }}>
                  Mis Favoritos
                </h2>
                {loadingFavoritos ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>Cargando...</p>
                ) : favoritos.length === 0 ? (
                  <p style={{ color: "#aaa", fontSize: 14 }}>
                    No tenés favoritos guardados todavía.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {favoritos.map((f) => (
                      <div key={f.id} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "16px 20px", border: "1px solid #e0dcd0", borderRadius: 10,
                        background: "#fcf9f4", boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, color: "#999", fontWeight: 500, letterSpacing: "0.04em" }}>
                              <span style={{ color: TIPO_COLOR[f.entidad_tipo] || "#999" }}>{f.entidad_id ? (f.entidad_tipo || "Entidad") : "Recorrido"}</span>
                            </span>
                          </div>
                          <p style={{ fontSize: 16, fontWeight: 500, color: "#1c1c18", margin: 0 }}>
                            {f.entidad_nombre || f.recorrido_nombre}
                          </p>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => window.open(f.entidad_id ? `/entidad/${f.entidad_slug}` : `/recorrido/${f.recorrido_slug}`, "_blank")}
                            style={{
                              fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                              cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                              padding: "8px 16px", borderRadius: 6, color: "#555",
                              whiteSpace: "nowrap", transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f2e8"; e.currentTarget.style.borderColor = "#bbb"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#ddd"; }}
                          >
                            Ver
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch(`/api/favoritos/${f.id}`, {
                                  method: "DELETE",
                                  headers: { Authorization: `Bearer ${getToken()}` },
                                });
                                if (res.ok) fetchFavoritos();
                              } catch {}
                            }}
                            style={{
                              fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                              cursor: "pointer", border: "1px solid #e57373", background: "transparent",
                              padding: "8px 16px", borderRadius: 6, color: "#e57373",
                              whiteSpace: "nowrap", transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "#ffebee"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {cancellingId && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1001, fontFamily: "Epilogue, sans-serif",
          }} onClick={() => !cancellingLoading && setCancellingId(null)}>
            <div style={{
              background: "#fff", padding: "40px", maxWidth: 420, width: "90%",
              borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              textAlign: "center",
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#ffebee",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, margin: "0 auto 16px",
              }}>⚠️</div>
              <h3 style={{
                fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 600,
                color: "#c62828", margin: "0 0 12px", letterSpacing: "-0.02em",
              }}>
                Cancelar solicitud
              </h3>
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
                ¿Estás seguro de que querés cancelar esta solicitud? Esta acción es <strong style={{ color: "#c62828" }}>permanente e irreversible</strong>.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setCancellingId(null)}
                  disabled={cancellingLoading}
                  style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 500,
                    cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                    padding: "10px 24px", borderRadius: 8, color: "#555",
                  }}
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={handleCancelConfirm}
                  disabled={cancellingLoading}
                  style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    cursor: cancellingLoading ? "not-allowed" : "pointer",
                    border: "none", background: cancellingLoading ? "#e0dcd0" : "#c62828",
                    padding: "10px 24px", borderRadius: 8, color: cancellingLoading ? "#aaa" : "#fff",
                    letterSpacing: "0.04em",
                  }}
                >
                  {cancellingLoading ? "CANCELANDO..." : "CANCELAR SOLICITUD"}
                </button>
              </div>
            </div>
          </div>
        )}

        {tourStep !== null && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            zIndex: 999, display: "flex", alignItems: "flex-start", justifyContent: "center",
            paddingTop: "15vh", fontFamily: "Epilogue, sans-serif",
          }} onClick={() => setTourStep(null)}>
            <div style={{
              background: "#fff", padding: "36px 40px 28px", maxWidth: 480, width: "90%",
              borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              textAlign: "center", position: "relative",
            }} onClick={(e) => e.stopPropagation()}>
              {tourStep === 0 && (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#86381918", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px" }}>
                    👋
                  </div>
                  <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 600, color: "#1c1c18", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                    ¡Bienvenido a tu panel!
                  </h3>
                  <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
                    Este es tu centro de gestión. Te mostraremos las secciones para que puedas aprovecharlas al máximo.
                  </p>
                </>
              )}
              {tourStep === 1 && (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#ff980018", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px" }}>
                    🔔
                  </div>
                  <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 600, color: "#1c1c18", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                    Notificaciones
                  </h3>
                  <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
                    Acá recibirás alertas sobre aprobaciones, rechazos, ediciones, y el estado de tus suscripciones. Todo lo que pasa con tus entidades, en un solo lugar.
                  </p>
                </>
              )}
              {tourStep === 2 && (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#2196f318", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px" }}>
                    📋
                  </div>
                  <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 600, color: "#1c1c18", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                    Mis Solicitudes
                  </h3>
                  <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
                    Seguí el estado de tus solicitudes para obtener el sello Made in Chaco. Podés ver si están pendientes, aprobadas o rechazadas.
                  </p>
                </>
              )}
              {tourStep === 3 && (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#4caf5018", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px" }}>
                    🏪
                  </div>
                  <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 600, color: "#1c1c18", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                    Mis Entidades
                  </h3>
                  <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
                    Administrá todas tus entidades, editá sus datos, controlá el estado de tu suscripción y la visibilidad en el mapa.
                  </p>
                </>
              )}
              {tourStep === 4 && (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#e91e6318", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px" }}>
                    ❤️
                  </div>
                  <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 600, color: "#1c1c18", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                    Mis Favoritos
                  </h3>
                  <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
                    Guardá tus entidades y recorridos favoritos para acceder a ellos rápidamente desde cualquier lugar.
                  </p>
                </>
              )}
              {tourStep === 5 && (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "#86381918", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, margin: "0 auto 16px" }}>
                    ✨
                  </div>
                  <h3 style={{ fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 600, color: "#1c1c18", margin: "0 0 12px", letterSpacing: "-0.02em" }}>
                    ¡Todo listo!
                  </h3>
                  <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, margin: "0 0 28px" }}>
                    Ya conocés todas las secciones. Explorá cada una y sacale el máximo provecho a tu panel de perfil.
                  </p>
                </>
              )}
              <div style={{ display: "flex", gap: 12, justifyContent: "center", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#bbb" }}>
                  {tourStep + 1} / 6
                </span>
                <div style={{ flex: 1 }} />
                {tourStep < 5 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setTourStep(null)}
                      style={{
                        fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                        cursor: "pointer", border: "none", background: "transparent",
                        padding: "8px 16px", color: "#888",
                      }}
                    >
                      Saltar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = tourStep + 1;
                        if (next === 1) setSection("notificaciones");
                        else if (next === 2) setSection("solicitudes");
                        else if (next === 3) setSection("entidades");
                        else if (next === 4) setSection("favoritos");
                        setTourStep(next);
                      }}
                      style={{
                        fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                        cursor: "pointer", border: "none", background: "#863819",
                        padding: "10px 28px", borderRadius: 8, color: "#fff",
                        letterSpacing: "0.04em",
                      }}
                    >
                      Siguiente
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setTourStep(null);
                      setSection("notificaciones");
                    }}
                    style={{
                      fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                      cursor: "pointer", border: "none", background: "#863819",
                      padding: "10px 28px", borderRadius: 8, color: "#fff",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Finalizar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {deleteConfirm && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1001, fontFamily: "Epilogue, sans-serif",
          }} onClick={() => !deletingAccount && setDeleteConfirm(false)}>
            <div style={{
              background: "#fff", padding: "40px", maxWidth: 420, width: "90%",
              borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              textAlign: "center",
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#ffebee",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, margin: "0 auto 16px",
              }}>⚠️</div>
              <h3 style={{
                fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 600,
                color: "#c62828", margin: "0 0 12px", letterSpacing: "-0.02em",
              }}>
                ¿Eliminar cuenta?
              </h3>
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>
                Esta acción es <strong style={{ color: "#c62828" }}>permanente e irreversible</strong>.
              </p>
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
                Se eliminarán todos tus datos, entidades y contenido asociado.
              </p>
              <p style={{ color: "#555", fontSize: 13, margin: "0 0 8px", textAlign: "left" }}>
                Escribí <strong>{perfil.email}</strong> para confirmar:
              </p>
              <input
                type="text"
                value={deleteEmail}
                onChange={(e) => setDeleteEmail(e.target.value)}
                placeholder={perfil.email}
                style={{
                  width: "100%", padding: "10px 14px", fontSize: 14,
                  border: "2px solid #e0dcd0", borderRadius: 8,
                  fontFamily: "inherit", outline: "none", color: "#1c1c18",
                  background: "#fcf9f4", boxSizing: "border-box",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#c62828"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#e0dcd0"; }}
              />
              <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28 }}>
                <button
                  type="button"
                  onClick={() => { setDeleteConfirm(false); setDeleteEmail(""); }}
                  disabled={deletingAccount}
                  style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 500,
                    cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                    padding: "10px 24px", borderRadius: 8, color: "#555",
                  }}
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setDeletingAccount(true);
                    try {
                      const res = await fetch("/api/auth/perfil", {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${getToken()}` },
                      });
                      if (res.ok) {
                        logout();
                        navigate("/", { replace: true });
                      } else {
                        alert("Error al eliminar la cuenta");
                      }
                    } catch {
                      alert("Error de conexión");
                    } finally {
                      setDeletingAccount(false);
                    }
                  }}
                  disabled={deleteEmail !== perfil.email || deletingAccount}
                  style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    cursor: deleteEmail !== perfil.email || deletingAccount ? "not-allowed" : "pointer",
                    border: "none", background: deleteEmail !== perfil.email || deletingAccount ? "#e0dcd0" : "#c62828",
                    padding: "10px 24px", borderRadius: 8, color: deleteEmail !== perfil.email || deletingAccount ? "#aaa" : "#fff",
                    letterSpacing: "0.04em",
                  }}
                >
                  {deletingAccount ? "ELIMINANDO..." : "ELIMINAR"}
                </button>
              </div>
            </div>
          </div>
        )}
        {deleteEntityConfirm && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1001, fontFamily: "Epilogue, sans-serif",
          }} onClick={() => !deletingEntity && setDeleteEntityConfirm(null)}>
            <div style={{
              background: "#fff", padding: "40px", maxWidth: 420, width: "90%",
              borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              textAlign: "center",
            }} onClick={(e) => e.stopPropagation()}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#ffebee",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 24, margin: "0 auto 16px",
              }}>⚠️</div>
              <h3 style={{
                fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 600,
                color: "#c62828", margin: "0 0 12px", letterSpacing: "-0.02em",
              }}>
                ¿Eliminar entidad?
              </h3>
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7, margin: "0 0 8px" }}>
                Vas a eliminar <strong style={{ color: "#c62828" }}>{deleteEntityConfirm.nombre}</strong>.
              </p>
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7, margin: "0 0 24px" }}>
                Esta acción es <strong style={{ color: "#c62828" }}>permanente e irreversible</strong>.
                Se eliminarán todos los datos, imágenes y contenido asociado.
              </p>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => setDeleteEntityConfirm(null)}
                  disabled={deletingEntity}
                  style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 500,
                    cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                    padding: "10px 24px", borderRadius: 8, color: "#555",
                  }}
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setDeletingEntity(true);
                    try {
                      const res = await fetch(`/api/entidades/${deleteEntityConfirm.id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${getToken()}` },
                      });
                      if (res.ok) {
                        const respuesta = await fetch("/api/mis-entidades", { headers: { Authorization: `Bearer ${getToken()}` } });
                        if (respuesta.ok) setEntidades(await respuesta.json());
                        setDeleteEntityConfirm(null);
                      } else {
                        alert("Error al eliminar la entidad");
                      }
                    } catch {
                      alert("Error de conexión");
                    } finally {
                      setDeletingEntity(false);
                    }
                  }}
                  disabled={deletingEntity}
                  style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    cursor: deletingEntity ? "not-allowed" : "pointer",
                    border: "none", background: deletingEntity ? "#e0dcd0" : "#c62828",
                    padding: "10px 24px", borderRadius: 8, color: deletingEntity ? "#aaa" : "#fff",
                    letterSpacing: "0.04em",
                  }}
                >
                  {deletingEntity ? "ELIMINANDO..." : "ELIMINAR"}
                </button>
              </div>
            </div>
          </div>
        )}

        {cancelSubId && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1001, fontFamily: "Epilogue, sans-serif",
          }} onClick={() => !cancellingSub && (setCancelSubId(null), setAceptoPolitica(false))}>
            <div style={{
              background: "#fff", padding: "40px", maxWidth: 460, width: "90%",
              borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
              textAlign: "left",
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{
                fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 600,
                color: "#c62828", margin: "0 0 12px", letterSpacing: "-0.02em",
              }}>
                Reclamar devolución
              </h3>
              <p style={{ color: "#666", fontSize: 14, lineHeight: 1.7, margin: "0 0 20px" }}>
                Solicitá la devolución del pago. La suscripción quedará en revisión y el administrador evaluará tu solicitud.
              </p>
              <div style={{
                background: "#fff8e1", border: "1px solid #ffcc80", borderRadius: 10,
                padding: "14px 16px", marginBottom: 20, fontSize: 13, lineHeight: 1.6, color: "#333",
              }}>
                <strong style={{ color: "#e65100" }}>Política de devolución</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "#333" }}>
                  <li style={{ color: "#333" }}><strong style={{ color: "#333" }}>Plazo:</strong> solo se aceptan reclamos dentro de los primeros 7 días desde la compra.</li>
                  <li style={{ color: "#333" }}><strong style={{ color: "#333" }}>Causales válidos:</strong> error en la carga, el usuario no entendió el servicio, baja voluntaria inmediata.</li>
                  <li style={{ color: "#333" }}><strong style={{ color: "#333" }}>No aplica:</strong> si la entidad ya estuvo visible en el mapa por más de 7 días, o si el usuario ya usó el servicio.</li>
                </ul>
              </div>
              <label style={{
                display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                marginBottom: 24, fontSize: 13, color: "#555", lineHeight: 1.4,
              }}>
                <input
                  type="checkbox"
                  checked={aceptoPolitica}
                  onChange={(e) => setAceptoPolitica(e.target.checked)}
                  style={{ width: 18, height: 18, cursor: "pointer", accentColor: "#c62828" }}
                />
                <span style={{ color: "#333" }}>Leí y acepto la política de devolución</span>
              </label>
              <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => { setCancelSubId(null); setAceptoPolitica(false); }}
                  disabled={cancellingSub}
                  style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 500,
                    cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                    padding: "10px 24px", borderRadius: 8, color: "#555",
                  }}
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  disabled={cancellingSub || !aceptoPolitica}
                  onClick={async () => {
                    setCancellingSub(true);
                    try {
                      const res = await fetch(`/api/suscripciones/reclamar-devolucion/${cancelSubId}`, {
                        method: "POST",
                        headers: { Authorization: `Bearer ${getToken()}` },
                      });
                      if (res.ok) {
                        fetchEntidades();
                        setMsg("Solicitud de devolución enviada. El administrador la revisará.");
                      } else {
                        const data = await res.json();
                        setMsg(data.error || "Error al solicitar devolución");
                      }
                    } catch {
                      setMsg("Error de conexión");
                    } finally {
                      setCancellingSub(false);
                      setCancelSubId(null);
                      setAceptoPolitica(false);
                    }
                  }}
                  style={{
                    fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                    cursor: cancellingSub || !aceptoPolitica ? "not-allowed" : "pointer",
                    border: "none", background: cancellingSub || !aceptoPolitica ? "#e0dcd0" : "#c62828",
                    padding: "10px 24px", borderRadius: 8, color: cancellingSub || !aceptoPolitica ? "#aaa" : "#fff",
                    letterSpacing: "0.04em",
                  }}
                >
                  {cancellingSub ? "ENVIANDO..." : "SOLICITAR DEVOLUCIÓN"}
                </button>
              </div>
            </div>
          </div>
        )}

        {planModal && (
          <div style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1001, fontFamily: "Epilogue, sans-serif",
          }} onClick={() => !adquiriendo && setPlanModal(null)}>
            <div style={{
              background: "#fff", padding: "40px", maxWidth: 520, width: "90%",
              borderRadius: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{
                fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: 600,
                color: "#1c1c18", margin: "0 0 4px", letterSpacing: "-0.02em",
              }}>
                {planModal.plan ? "Confirmar suscripción" : "Seleccionar plan"}
              </h3>
              <p style={{ color: "#888", fontSize: 13, margin: "0 0 24px", lineHeight: 1.5 }}>
                {planModal.plan
                  ? `Estás por adquirir el plan ${planModal.plan.nombre}. Elegí la entidad para activarlo o renovarlo.`
                  : "Elegí un plan desde la sección de planes para tu entidad."}
              </p>

              {planModal.plan && (
                <div style={{
                  border: "2px solid #e0dcd0", borderRadius: 10,
                  padding: "16px 20px", background: "#fcf9f4", marginBottom: 20,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: "#1c1c18" }}>
                      {planModal.plan.nombre}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#863819" }}>
                      ${Number(planModal.plan.precio).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                    {planModal.plan.duracion_dias} días de visibilidad
                  </p>
                  <p style={{ fontSize: 11, color: "#888", marginTop: 8, lineHeight: 1.4 }}>
                    Si la entidad ya tiene una suscripción activa, la nueva se extiende desde la fecha de vencimiento actual.
                  </p>
                </div>
              )}

              {planModal.plan && planModal.plan.entidades_incluidas > 1 ? (
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1c1c18", marginBottom: 8 }}>
                  Seleccioná hasta {planModal.plan.entidades_incluidas} entidades:
                  <span style={{ fontWeight: 400, marginLeft: 8, color: "#863819" }}>
                    {planModal.entidadesSeleccionadas.length}/{planModal.plan.entidades_incluidas}
                  </span>
                </p>
              ) : (
                <p style={{ fontSize: 13, fontWeight: 600, color: "#1c1c18", marginBottom: 8 }}>
                  Seleccioná una entidad:
                </p>
              )}
               <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24, maxHeight: 280, overflowY: "auto" }}>
                  {planModal.entidades.length === 0 ? (
                    <p style={{ color: "#aaa", fontSize: 13 }}>
                      No hay entidades disponibles. Necesitás tener una entidad aprobada.
                    </p>
                  ) : (() => {
                    const maxEnt = planModal.plan ? planModal.plan.entidades_incluidas : 1;
                    const isMulti = maxEnt > 1;
                    const prioritarias = planModal.entidades.filter((e) => {
                      if (!e.fecha_fin_suscripcion) return true;
                      const d = new Date();
                      const hoyStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                      const finStr = e.fecha_fin_suscripcion.split("T")[0];
                      return hoyStr >= finStr;
                    });
                    const activas = planModal.entidades.filter((e) => {
                      if (!e.fecha_fin_suscripcion) return false;
                      const d = new Date();
                      const hoyStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                      const finStr = e.fecha_fin_suscripcion.split("T")[0];
                      return hoyStr < finStr;
                    });
                    const toggleEntidad = (id) => {
                      if (isMulti) {
                        const sel = planModal.entidadesSeleccionadas;
                        if (sel.includes(id)) {
                          setPlanModal({ ...planModal, entidadesSeleccionadas: sel.filter((x) => x !== id) });
                        } else if (sel.length < maxEnt) {
                          setPlanModal({ ...planModal, entidadesSeleccionadas: [...sel, id] });
                        }
                      } else {
                        setPlanModal({ ...planModal, entidadesSeleccionadas: [id] });
                      }
                    };
                    const isChecked = (id) => planModal.entidadesSeleccionadas.includes(id);
                    return (
                      <>
                        {prioritarias.map((ent) => {
                          const st = suscripcionStatus(ent);
                          const checked = isChecked(ent.id);
                          const atLimit = isMulti && !checked && planModal.entidadesSeleccionadas.length >= maxEnt;
                          return (
                            <label key={ent.id} style={{
                              display: "flex", alignItems: "center", gap: 12,
                              padding: "12px 16px", border: "1px solid #eee", borderRadius: 8,
                              cursor: planModal.plan && !atLimit ? "pointer" : "default",
                              background: checked ? "#fdfaf5" : "#fff",
                              transition: "background 0.2s ease",
                            }}>
                              <input
                                type={isMulti ? "checkbox" : "radio"}
                                name="entidad-suscripcion"
                                disabled={!planModal.plan || atLimit}
                                checked={checked}
                                onChange={() => toggleEntidad(ent.id)}
                                style={{ accentColor: "#863819" }}
                              />
                              <div style={{ flex: 1 }}>
                                <span style={{ fontSize: 14, fontWeight: 500, color: "#1c1c18", display: "block" }}>
                                  {ent.nombre}
                                </span>
                                <span style={{ fontSize: 12, color: TIPO_COLOR[ent.tipo] || "#888" }}>
                                  {TIPOS_LABEL[ent.tipo] || ent.tipo}
                                  {st && (
                                    <span style={{ color: st.color, marginLeft: 8 }}>
                                      — {st.label}
                                    </span>
                                  )}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                        {activas.length > 0 && (
                          <>
                            <button
                              type="button"
                              onClick={() => setPlanModal({ ...planModal, mostrarActivas: !planModal.mostrarActivas })}
                              style={{
                                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                                cursor: "pointer", border: "none", background: "transparent",
                                padding: "8px 4px", color: "#863819", textAlign: "left",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {planModal.mostrarActivas ? "▲ Ocultar activas" : `▼ Ver activas (${activas.length})`}
                            </button>
                            {planModal.mostrarActivas && activas.map((ent) => {
                              const st = suscripcionStatus(ent);
                              const checked = isChecked(ent.id);
                              const atLimit = isMulti && !checked && planModal.entidadesSeleccionadas.length >= maxEnt;
                              return (
                                <label key={ent.id} style={{
                                  display: "flex", alignItems: "center", gap: 12,
                                  padding: "12px 16px", border: "1px solid #eee", borderRadius: 8,
                                  cursor: planModal.plan && !atLimit ? "pointer" : "default",
                                  background: checked ? "#fdfaf5" : "#fff",
                                  transition: "background 0.2s ease",
                                }}>
                                  <input
                                    type={isMulti ? "checkbox" : "radio"}
                                    name="entidad-suscripcion"
                                    disabled={!planModal.plan || atLimit}
                                    checked={checked}
                                    onChange={() => toggleEntidad(ent.id)}
                                    style={{ accentColor: "#863819" }}
                                  />
                                  <div style={{ flex: 1 }}>
                                    <span style={{ fontSize: 14, fontWeight: 500, color: "#1c1c18", display: "block" }}>
                                      {ent.nombre}
                                    </span>
                                    <span style={{ fontSize: 12, color: TIPO_COLOR[ent.tipo] || "#888" }}>
                                      {TIPOS_LABEL[ent.tipo] || ent.tipo}
                                      {st && (
                                        <span style={{ color: st.color, marginLeft: 8 }}>
                                          — {st.label}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setPlanModal(null)}
                  disabled={adquiriendo}
                  style={{
                    fontFamily: "inherit", fontSize: 13, fontWeight: 500,
                    cursor: "pointer", border: "1px solid #ddd", background: "transparent",
                    padding: "10px 24px", borderRadius: 8, color: "#555",
                  }}
                >
                  CANCELAR
                </button>
                {planModal.plan && (
                  <button
                    type="button"
                    disabled={planModal.entidadesSeleccionadas.length === 0 || adquiriendo}
                    onClick={async () => {
                      if (planModal.entidadesSeleccionadas.length === 0) return;
                      setAdquiriendo(true);
                      try {
                        const res = await fetch("/api/suscripciones/adquirir", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${getToken()}`,
                          },
                          body: JSON.stringify({
                            entidad_ids: planModal.entidadesSeleccionadas,
                            plan_id: planModal.plan.id,
                            ...(planModal.plan.id === null && {
                              dias_personalizados: planModal.plan.duracion_dias,
                              precio_personalizado: planModal.plan.precio,
                            }),
                          }),
                        });
                        const data = await res.json();
                        if (res.ok) {
                          setPlanModal(null);
                          fetchEntidades();
                          fetchPagos();
                          setMsg(data.message || "Suscripción activada correctamente");
                        } else {
                          setMsg(data.error || "Error al adquirir suscripción");
                        }
                      } catch {
                        setMsg("Error de conexión");
                      } finally {
                        setAdquiriendo(false);
                      }
                    }}
                    style={{
                      fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                      cursor: (planModal.entidadesSeleccionadas.length === 0 || adquiriendo) ? "not-allowed" : "pointer",
                      border: "none",
                      background: (planModal.entidadesSeleccionadas.length === 0 || adquiriendo) ? "#e0dcd0" : "#863819",
                      padding: "10px 28px", borderRadius: 8,
                      color: (planModal.entidadesSeleccionadas.length === 0 || adquiriendo) ? "#aaa" : "#fff",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {adquiriendo ? "PROCESANDO..." : "CONFIRMAR PAGO"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <SelloModal isOpen={showSelloModal} onClose={() => setShowSelloModal(false)} />
      </div>
  );
};
