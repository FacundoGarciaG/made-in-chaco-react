import { useRef, useCallback } from "react";

export function useMapRecorridos() {
  const recorridoLayerRef = useRef(null);
  const recorridoGlowLayerRef = useRef(null);
  const recorridoSourceRef = useRef(null);
  const recorridoRouteDataRef = useRef(null);
  const routeAnimRef = useRef(null);
  const prevRecorridoRef = useRef(null);
  const savedPuntosFilterRef = useRef(null);

  const limpiarRutaRecorrido = useCallback((map) => {
    if (routeAnimRef.current) {
      clearInterval(routeAnimRef.current);
      routeAnimRef.current = null;
    }
    if (
      recorridoGlowLayerRef.current &&
      map?.getLayer(recorridoGlowLayerRef.current)
    ) {
      map.removeLayer(recorridoGlowLayerRef.current);
      recorridoGlowLayerRef.current = null;
    }
    if (recorridoLayerRef.current && map?.getLayer(recorridoLayerRef.current)) {
      map.removeLayer(recorridoLayerRef.current);
      recorridoLayerRef.current = null;
    }
    if (
      recorridoSourceRef.current &&
      map?.getSource(recorridoSourceRef.current)
    ) {
      map.removeSource(recorridoSourceRef.current);
      recorridoSourceRef.current = null;
    }
    recorridoRouteDataRef.current = null;
  }, []);

  return {
    limpiarRutaRecorrido,
    recorridoRouteDataRef,
    savedPuntosFilterRef,
    prevRecorridoRef,
    recorridoLayerRef,
    recorridoGlowLayerRef,
    recorridoSourceRef,
    routeAnimRef,
  };
}
