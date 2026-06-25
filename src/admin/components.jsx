import { useState, useEffect, useMemo, useRef } from "react";
import { styles, parseSocialList } from "./helpers";
import { SOCIAL_PLATFORMS, COMUNIDADES_ETNICAS } from "./constants";

export function DetailField({ field, fieldVal, onFieldChange, label, type = "text", options, placeholder }) {
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
}

export function GastronomiaSelector({ value, onChange, allEntities }) {
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
}

export function SocialMediaManager({ value, onChange, label = "Redes sociales y contacto" }) {
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

export const LocalidadRow = ({ loc, values, onChange }) => (
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
