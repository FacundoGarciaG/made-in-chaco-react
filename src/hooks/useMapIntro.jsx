import { useRef, useCallback } from "react";

export function useMapIntro({ mapRef, disableMapInteractions, enableMapInteractions, onIntroComplete }) {
  const introStartedRef = useRef(false);
  const audioRef = useRef(null);

  const triggerIntro = useCallback(() => {
    const map = mapRef.current;
    if (!map || introStartedRef.current) return;
    introStartedRef.current = true;

    disableMapInteractions();

    const audio = new Audio("/audios/Intro.wav");
    audio.volume = 0.7;
    audioRef.current = audio;

    const canvas = map.getCanvas();
    canvas.style.filter = "grayscale(1)";
    canvas.style.transition = "filter 0.1s linear";

    const onMove = () => {
      const progress = Math.min(map.getZoom() / 7, 1);
      canvas.style.filter = `grayscale(${1 - progress})`;
    };
    map.on("move", onMove);

    const timerId = setTimeout(() => {
      audio
        .play()
        .then(() => {})
        .catch(() => {
          setTimeout(() => audio.play().catch(() => { audioRef.current = null; }), 200);
        });

      map.flyTo({
        center: [-60.44, -26.05],
        zoom: 7,
        speed: 0.2,
        curve: 1.5,
        essential: true,
      });
    }, 500);

    map.once("moveend", () => {
      canvas.style.filter = "grayscale(0)";
      canvas.style.transition = "none";
      map.off("move", onMove);

      enableMapInteractions();

      if (map.getLayer("capa-puntos")) {
        map.setLayoutProperty("capa-puntos", "visibility", "visible");
        map.setPaintProperty("capa-puntos", "icon-opacity", 1);
      }

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      if (onIntroComplete) onIntroComplete();
    });
  }, [mapRef, disableMapInteractions, enableMapInteractions, onIntroComplete]);

  const cleanupAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
  }, []);

  return { introStartedRef, triggerIntro, cleanupAudio };
}
