import { useEffect, useRef } from "react";

export function CursorGlow() {
  const glowRef = useRef(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    let x = -100, y = -100;
    let targetX = -100, targetY = -100;

    const onMouse = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const animate = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      glow.style.transform = `translate(${x - 75}px, ${y - 75}px)`;
      requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouse);
    requestAnimationFrame(animate);

    return () => window.removeEventListener("mousemove", onMouse);
  }, []);

  return (
    <div
      ref={glowRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 150,
        height: 150,
        borderRadius: "50%",
        background:
          "radial-gradient(circle, rgba(134,56,25,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
        zIndex: 9999,
        transition: "opacity 0.3s ease",
      }}
    />
  );
}
