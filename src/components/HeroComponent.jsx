import "../styles/HeroComponent.css";
import backgroundVideo from "../assets/videos/231933_small.mp4";
import logoHero from "../assets/imagenes/madeinchacoclaro.png";
import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Logo3D } from "./Logo3D";
import { TextScramble } from "./TextScramble";
import { useMapStore } from "../store/useMapStore";

export const HeroComponent = () => {
  const [hovering, setHovering] = useState(false);
  const timeoutRef = useRef(null);
  const btnRef = useRef(null);
  const navigate = useNavigate();
  const setHeaderVisible = useMapStore((s) => s.setHeaderVisible);
  const [entidadCount, setEntidadCount] = useState(null);
  const countRef = useRef(null);
  const [displayCount, setDisplayCount] = useState(0);
  const counted = useRef(false);
  const animRef = useRef(null);

  useEffect(() => {
    fetch("/api/entidades")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) setEntidadCount(data.length);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (entidadCount === null || counted.current) return;
    const el = countRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true;
        const startTime = performance.now();
        const duration = 2000;

        const animate = (now) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplayCount(Math.floor(eased * entidadCount));
          if (progress < 1) {
            animRef.current = requestAnimationFrame(animate);
          }
        };

        animRef.current = requestAnimationFrame(animate);
      }
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => {
      observer.disconnect();
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [entidadCount]);

  const startRedirect = () => {
    setHovering(true);
    timeoutRef.current = setTimeout(() => {
      sessionStorage.removeItem("return-to-map");
      setHeaderVisible(false);
      navigate("/descubre");
    }, 2000);
  };

  const cancelRedirect = () => {
    setHovering(false);
    clearTimeout(timeoutRef.current);
  };

  // Efecto imán en el botón Navegar
  useEffect(() => {
    const el = btnRef.current;
    if (!el) return;
    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -15;
      const rotateY = ((x - centerX) / centerX) * 15;
      el.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };
    const handleMouseLeave = () => {
      el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg)';
    };
    el.addEventListener("mousemove", handleMouseMove);
    el.addEventListener("mouseleave", handleMouseLeave);
    return () => {
      el.removeEventListener("mousemove", handleMouseMove);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <>
      <section className="hero">
        <Logo3D src={logoHero} />
        <div className="hero-text">
          <div className="hero-logo-spacer" />
          <p>
            <TextScramble text="Historias, sonidos y colores del secreto de Argentina" />
          </p>
        </div>

        <div className="hero-btn-wrapper">
          <button
            ref={btnRef}
            className={`discover-link ${hovering ? "hovering" : ""}`}
            onMouseEnter={startRedirect}
            onMouseLeave={cancelRedirect}
            onTouchStart={startRedirect}
            onTouchEnd={cancelRedirect}
            onClick={() => { sessionStorage.removeItem("return-to-map"); setHeaderVisible(false); navigate("/descubre"); }}
          >
            <span>Descubrir el mapa →</span>
          </button>
          <p className="hero-hint">Presioná o mantené el mouse 2 segundos para explorar</p>
        </div>
        <div className="hero-badge" ref={countRef}>
          {entidadCount !== null ? `${displayCount}+ entidades mapeadas` : "Cargando..."}
        </div>
        <video autoPlay muted loop className="video">
          <source src={backgroundVideo} type="video/mp4" />
          Tu navegador no soporta video.
        </video>
      </section>
    </>
  );
};
