import { useState, useEffect, useRef, useMemo } from "react";

export default function TagSelector({ value, onChange, suggestions, placeholder = "Escribí o seleccioná..." }) {
  const [inputVal, setInputVal] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const selectedItems = useMemo(
    () => (value || "").split(",").map((s) => s.trim()).filter(Boolean),
    [value],
  );

  const isSelected = (name) => selectedItems.some((s) => s.toLowerCase() === name.toLowerCase());

  const filtered = useMemo(
    () => suggestions.filter(
      (s) =>
        !isSelected(s) &&
        s.toLowerCase().includes(inputVal.toLowerCase()),
    ),
    [suggestions, inputVal, selectedItems],
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
      if (!isSelected(inputVal.trim())) {
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
          placeholder={selectedItems.length === 0 ? placeholder : ""}
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
          {filtered.map((s) => (
            <div
              key={s}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#1c1c18",
                borderBottom: "1px solid #f5f2eb",
                transition: "background 0.1s",
              }}
              onClick={() => addItem(s)}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f2eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              {s}
            </div>
          ))}
          {inputVal.trim() && !isSelected(inputVal.trim()) && (
            <div
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: "14px",
                color: "#2e7d32",
                fontWeight: 600,
                borderTop: "1px solid #f5f2eb",
              }}
              onClick={() => addItem(inputVal.trim())}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f2eb")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              + Agregar "{inputVal.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}