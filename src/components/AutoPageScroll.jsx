import { useEffect } from "react";

const SCROLL_SPEED = 2; // píxeles por tick
const INTERVAL_MS = 30; // ms entre scrolls (~66px/s, crawl cinematográfico)

export const AutoPageScroll = ({ isActive, onStop, blockScroll }) => {
  // Bloquear scroll mientras blockScroll sea true
  useEffect(() => {
    if (!blockScroll) return;

    const preventScroll = (e) => {
      e.preventDefault();
    };

    window.addEventListener("wheel", preventScroll, { passive: false });

    return () => {
      window.removeEventListener("wheel", preventScroll);
    };
  }, [blockScroll]);

  // Auto-scroll cuando isActive es true
  useEffect(() => {
    if (!isActive) return;

    let isStopped = false;

    const intervalId = setInterval(() => {
      if (!isStopped) {
        window.scrollBy(0, SCROLL_SPEED);
      }
    }, INTERVAL_MS);

    const handleStop = () => {
      if (isStopped) return;
      isStopped = true;
      clearInterval(intervalId);
      onStop?.();
    };

    // Click sobre la página -> frena el autoscroll
    document.addEventListener("click", handleStop, { once: true });
    // Wheel / touch también frenan para mejor UX
    document.addEventListener("wheel", handleStop, { once: true });
    document.addEventListener("touchstart", handleStop, { once: true });

    return () => {
      if (!isStopped) {
        clearInterval(intervalId);
      }
      document.removeEventListener("click", handleStop);
      document.removeEventListener("wheel", handleStop);
      document.removeEventListener("touchstart", handleStop);
    };
  }, [isActive, onStop]);

  return null; // componente invisible, solo lógica
};
