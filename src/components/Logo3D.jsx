import { useRef, useEffect, useMemo } from "react";

function Particles() {
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 60; i++) {
      const radius = 20 + Math.random() * 45;
      const theta = Math.random() * 360;
      const x = 50 + radius * Math.cos((theta * Math.PI) / 180);
      const y = 50 + radius * Math.sin((theta * Math.PI) / 180) * 0.6;
      arr.push({
        left: `${x}%`,
        top: `${y}%`,
        size: 1.5 + Math.random() * 3,
        opacity: 0.15 + Math.random() * 0.35,
        delay: Math.random() * 6,
        duration: 3 + Math.random() * 4,
        drift: -4 + Math.random() * 8,
      });
    }
    return arr;
  }, []);

  return (
    <div className="logo3d-particles" aria-hidden="true">
      {particles.map((p, i) => (
        <span
          key={i}
          className="logo3d-particle"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

export const Logo3D = ({ src }) => {
  const containerRef = useRef(null);
  const logoRef = useRef(null);
  const rafRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = containerRef.current;
    const logo = logoRef.current;
    if (!el || !logo) return;

    const onMouse = (e) => {
      const rect = el.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const animate = () => {
      const cur = currentRef.current;
      const tgt = mouseRef.current;
      cur.x += (tgt.y * 12 - cur.x) * 0.06;
      cur.y += (tgt.x * 18 - cur.y) * 0.06;
      logo.style.setProperty("--rx", `${cur.x}deg`);
      logo.style.setProperty("--ry", `${cur.y}deg`);
      rafRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouse);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouse);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="logo3d-container">
      <Particles />
      <div ref={logoRef} className="logo3d-logo">
        <img src={src} alt="Made in Chaco" draggable={false} />
      </div>
    </div>
  );
};
