import { useEffect, useRef } from "react";

export function useMapHeaderSync({
  setTerminoBusqueda,
  setFiltro,
  setFiltroLocalidad,
  setRecorridoActivo,
  setPanelOpen,
  onSearchSelect,
  onRecorridoFly,
  onResetMap,
}) {
  const onSearchSelectRef = useRef(onSearchSelect);
  onSearchSelectRef.current = onSearchSelect;

  const onRecorridoFlyRef = useRef(onRecorridoFly);
  onRecorridoFlyRef.current = onRecorridoFly;

  const onResetMapRef = useRef(onResetMap);
  onResetMapRef.current = onResetMap;

  useEffect(() => {
    const handler = (e) => {
      setTerminoBusqueda(e.detail);
    };
    window.addEventListener("header-search", handler);
    return () => window.removeEventListener("header-search", handler);
  }, [setTerminoBusqueda]);

  useEffect(() => {
    const handler = (e) => setFiltro(e.detail);
    window.addEventListener("header-filter", handler);
    return () => window.removeEventListener("header-filter", handler);
  }, [setFiltro]);

  useEffect(() => {
    const handler = (e) => setFiltroLocalidad(e.detail);
    window.addEventListener("header-localidad", handler);
    return () => window.removeEventListener("header-localidad", handler);
  }, [setFiltroLocalidad]);

  useEffect(() => {
    const handler = (e) => setRecorridoActivo(e.detail);
    window.addEventListener("header-recorrido", handler);
    return () => window.removeEventListener("header-recorrido", handler);
  }, [setRecorridoActivo]);

  useEffect(() => {
    const handler = (e) => setPanelOpen(e.detail.open);
    window.addEventListener("header-panel", handler);
    return () => window.removeEventListener("header-panel", handler);
  }, [setPanelOpen]);

  useEffect(() => {
    const handler = async (e) => {
      await onSearchSelectRef.current(e);
    };
    window.addEventListener("header-search-select", handler);
    return () => window.removeEventListener("header-search-select", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      onRecorridoFlyRef.current();
    };
    window.addEventListener("header-recorrido-fly", handler);
    return () => window.removeEventListener("header-recorrido-fly", handler);
  }, []);

  useEffect(() => {
    const handler = () => {
      onResetMapRef.current();
    };
    window.addEventListener("header-reset-map", handler);
    return () => window.removeEventListener("header-reset-map", handler);
  }, []);
}
