import { create } from "zustand";

const useMapStore = create((set, get) => ({
  // Shared state — single source of truth
  searchTerm: "",
  filtro: "todos",
  filtroLocalidad: "",
  recorridoActivo: null,
  panelOpen: false,
  headerVisible: false,
  darkMode: localStorage.getItem("made-in-chaco-dark-mode") === "true",

  // Internal non-serializable refs (needed by mapUtils & Footer outside React)
  _mapInstance: null,
  _geolocateControl: null,

  // Action tokens — incremented to trigger effects reliably
  _searchSelectToken: 0,
  _resetMapToken: 0,
  _recorridoFlyToken: 0,

  // ─── Setters ──────────────────────────────────────────

  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setFiltro: (filtro) => set({ filtro }),
  setFiltroLocalidad: (filtroLocalidad) => set({ filtroLocalidad }),
  setRecorridoActivo: (recorridoActivo) => set({ recorridoActivo }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setHeaderVisible: (headerVisible) => set({ headerVisible }),
  setDarkMode: (darkMode) => {
    localStorage.setItem("made-in-chaco-dark-mode", darkMode);
    set({ darkMode });
  },
  setMapInstance: (_mapInstance) => set({ _mapInstance }),
  setGeolocateControl: (_geolocateControl) => set({ _geolocateControl }),

  // ─── Action triggers (called by Header, consumed by Map) ───

  triggerSearchSelect: (term) =>
    set({ searchTerm: term, _searchSelectToken: get()._searchSelectToken + 1 }),

  triggerResetMap: () =>
    set({ _resetMapToken: get()._resetMapToken + 1 }),

  triggerRecorridoFly: () =>
    set({ _recorridoFlyToken: get()._recorridoFlyToken + 1 }),
}));

export { useMapStore };
