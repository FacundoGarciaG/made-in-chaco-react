import "../styles/HeroComponent.css";
import backgroundVideo from "../assets/videos/231933_small.mp4";
import logoHero from "../assets/imagenes/logo-madeinchaco.png";
import { useRef, useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";

export const HeroComponent = () => {
  const [hovering, setHovering] = useState(false);
  const timeoutRef = useRef(null);
  const heroLogoRef = useRef(null);
  const btnRef = useRef(null);
  const navigate = useNavigate();

  const startRedirect = () => {
    setHovering(true);
    timeoutRef.current = setTimeout(() => {
      navigate("/descubre");
    }, 2000); //duration
  };

  const cancelRedirect = () => {
    setHovering(false);
    clearTimeout(timeoutRef.current);
  };
  // Efecto 3D tilt: la imagen sigue el mouse en toda la página
  useEffect(() => {
    const el = heroLogoRef.current;
    if (!el) return;
    const handleMouseMove = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const rotateX = ((e.clientY - h / 2) / (h / 2)) * -6;
      const rotateY = ((e.clientX - w / 2) / (w / 2)) * 6;
      el.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

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
        <div className="hero-text">
          <h5>Chaco, su gente y su tierra</h5>
          <h1 ref={heroLogoRef}>
            <img src={logoHero} alt="Made in Chaco" className="hero-logo-img" />
          </h1>
          <p>
            Explora las historias, sonidos y colores que hacen único al secreto
            de Argentina
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
            onClick={() => navigate("/descubre")}
          >
            <span>Navegar</span>
          </button>
        </div>
        <video autoPlay muted loop className="video">
          <source src={backgroundVideo} type="video/mp4" />
          Tu navegador no soporta video.
        </video>
      </section>
      <div className="icons">
        <NavLink
          to="https://www.instagram.com/madeinchacoargentina/"
          target="_blank"
        >
          <i className="ri-instagram-line"></i>
        </NavLink>

        <NavLink
          to="https://www.youtube.com/@MadeinChacoArgentina"
          target="_blank"
        >
          <i className="ri-youtube-line"></i>
        </NavLink>
      </div>
    </>
  );
};
