import { useEffect, useRef } from "react";
import { useMapStore, HISTORICAL_KEYS, HISTORICAL_LABELS, HISTORICAL_COLORS } from "../../store/useMapStore";
import "../../styles/HistoricalPanel.css";

export const HistoricalPanel = () => {
  const capasHistoricas = useMapStore((s) => s.capasHistoricas);
  const toggleCapaHistorica = useMapStore((s) => s.toggleCapaHistorica);
  const añoHistorico = useMapStore((s) => s.añoHistorico);
  const setAñoHistorico = useMapStore((s) => s.setAñoHistorico);
  const añoMin = useMapStore((s) => s.añoMin);
  const añoMax = useMapStore((s) => s.añoMax);
  const setRangoAños = useMapStore((s) => s.setRangoAños);
  const timelinePlaying = useMapStore((s) => s.timelinePlaying);
  const setTimelinePlaying = useMapStore((s) => s.setTimelinePlaying);
  const darkMode = useMapStore((s) => s.darkMode);
  const historicalPanelOpen = useMapStore((s) => s.historicalPanelOpen);
  const setHistoricalPanelOpen = useMapStore((s) => s.setHistoricalPanelOpen);

  const intervalRef = useRef(null);

  const anyActive = Object.values(capasHistoricas).some(Boolean);

  useEffect(() => {
    fetch("/api/capas-historicas/rangos")
      .then((r) => r.json())
      .then((data) => {
        setRangoAños(data.año_min, data.año_max);
        setAñoHistorico(data.año_max);
      })
      .catch(() => {});
  }, [setRangoAños, setAñoHistorico]);

  useEffect(() => {
    if (timelinePlaying) {
      intervalRef.current = setInterval(() => {
        const state = useMapStore.getState();
        let next = state.añoHistorico + 5;
        if (next > state.añoMax) {
          next = state.añoMin;
        }
        useMapStore.getState().setAñoHistorico(next);
      }, 200);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timelinePlaying]);

  const años = [];
  for (let y = añoMin; y <= añoMax; y += 50) {
    años.push(y);
  }

  if (!historicalPanelOpen) return null;

  return (
    <div className={`historical-panel ${darkMode ? "historical-panel--dark" : ""}`}>
      <div className="historical-panel__header">
        <span className="historical-panel__title">MAPA HISTÓRICO</span>
        <button
          className="historical-panel__close"
          onClick={() => setHistoricalPanelOpen(false)}
          type="button"
          aria-label="Cerrar"
        >
          ✕
        </button>
      </div>

      <div className="historical-panel__layers">
        {HISTORICAL_KEYS.map((key) => (
          <button
            key={key}
            className={`historical-layer-btn ${capasHistoricas[key] ? "historical-layer-btn--active" : ""}`}
            style={{
              "--layer-color": HISTORICAL_COLORS[key],
              borderLeftColor: capasHistoricas[key] ? HISTORICAL_COLORS[key] : "transparent",
            }}
            onClick={() => toggleCapaHistorica(key)}
            type="button"
          >
            <span
              className="historical-layer-btn__dot"
              style={{ background: HISTORICAL_COLORS[key] }}
            />
            <span className="historical-layer-btn__label">{HISTORICAL_LABELS[key]}</span>
          </button>
        ))}
      </div>

      {anyActive && (
        <div className="historical-panel__timeline">
          <div className="historical-panel__timeline-header">
            <span className="historical-panel__timeline-year">{añoHistorico}</span>
            <button
              className="historical-panel__play-btn"
              onClick={() => setTimelinePlaying(!timelinePlaying)}
              type="button"
              title={timelinePlaying ? "Pausar" : "Reproducir"}
            >
              {timelinePlaying ? "⏸" : "▶"}
            </button>
          </div>
          <div className="historical-panel__slider-wrapper">
            <input
              type="range"
              min={añoMin}
              max={añoMax}
              value={añoHistorico}
              onChange={(e) => setAñoHistorico(parseInt(e.target.value, 10))}
              className="historical-panel__slider"
            />
            <div className="historical-panel__marks">
              {años.map((y) => (
                <span
                  key={y}
                  className="historical-panel__mark"
                  style={{
                    left: `${((y - añoMin) / (añoMax - añoMin)) * 100}%`,
                  }}
                >
                  {y}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
