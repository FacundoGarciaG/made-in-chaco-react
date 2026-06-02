import { useEffect, useRef } from "react";

const SCROLL_SPEED = 1;
const INTERVAL_MS = 30;

export const AutoPageScroll = ({ isActive, onStop, onResume, blockScroll }) => {
  const wasActiveRef = useRef(false);

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

  useEffect(() => {
    if (!isActive) return;

    wasActiveRef.current = true;
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

    document.addEventListener("click", handleStop, { once: true });
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

  // Reanudar con click cuando está pausado
  useEffect(() => {
    if (isActive || !wasActiveRef.current) return;

    const resume = () => {
      onResume?.();
    };

    document.addEventListener("click", resume, { once: true });
    return () => document.removeEventListener("click", resume);
  }, [isActive, onResume]);

  return null;
};
