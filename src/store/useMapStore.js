import { create } from "zustand";

const HISTORICAL_KEYS = ["reduccion", "fortin", "ruta_tanino", "ruta_algodon", "territorio"];

const HISTORICAL_LABELS = {
  reduccion: "Reducciones",
  fortin: "Fortines",
  ruta_tanino: "Rutas del Tanino",
  ruta_algodon: "Rutas del Algodón",
  territorio: "Territorios Originarios",
};

const HISTORICAL_COLORS = {
  reduccion: "#B8860B",
  fortin: "#8B0000",
  ruta_tanino: "#654321",
  ruta_algodon: "#C8A951",
  territorio: "#8B4513",
};

const capasIniciales = Object.fromEntries(HISTORICAL_KEYS.map((k) => [k, false]));

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

  // Capas históricas
  capasHistoricas: { ...capasIniciales },
  añoHistorico: 1980,
  añoMin: 1500,
  añoMax: 2024,
  timelinePlaying: false,
  historicalPanelOpen: false,

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

  setCapasHistoricas: (capasHistoricas) => set({ capasHistoricas }),
  toggleCapaHistorica: (capa) =>
    set((state) => ({
      capasHistoricas: { ...state.capasHistoricas, [capa]: !state.capasHistoricas[capa] },
    })),
  setAñoHistorico: (añoHistorico) => set({ añoHistorico }),
  setRangoAños: (añoMin, añoMax) => set({ añoMin, añoMax }),
  setTimelinePlaying: (timelinePlaying) => set({ timelinePlaying }),
  setHistoricalPanelOpen: (historicalPanelOpen) => set({ historicalPanelOpen }),

  // ─── Action triggers (called by Header, consumed by Map) ───

  triggerSearchSelect: (term) =>
    set({ searchTerm: term, _searchSelectToken: get()._searchSelectToken + 1 }),

  triggerResetMap: () =>
    set({ _resetMapToken: get()._resetMapToken + 1 }),

  triggerRecorridoFly: () =>
    set({ _recorridoFlyToken: get()._recorridoFlyToken + 1 }),
}));

export { useMapStore, HISTORICAL_KEYS, HISTORICAL_LABELS, HISTORICAL_COLORS };
