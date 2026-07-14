import { useEffect } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { useNavigate, Link } from "react-router-dom";
import { useAuthPublico } from "../context/AuthPublicoContext";
import { HeroComponent } from "../components/HeroComponent";
import { PalabraDelDia } from "../components/PalabraDelDia";
import { EntidadDelDia } from "../components/EntidadDelDia";
import { CursorGlow } from "../components/CursorGlow";
import { SEO } from "../components/SEO";
import { HomeMapBlob } from "../components/HomeMapBlob";
import { HomePalabrasBlob } from "../components/HomePalabrasBlob";
import madeInChacoLogo from "../assets/imagenes/logo-madeinchaco.png";
import "../styles/HomePage.css";

const ScrollSection = ({ children, className = "", ...props }) => (
  <motion.div
    className={`scroll-section ${className}`}
    initial={{ opacity: 0, y: 80 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, amount: 0.15 }}
    transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
    {...props}
  >
    {children}
  </motion.div>
);

export const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthPublico();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      <CursorGlow />
      <SEO
        title="Inicio"
        description="Made in Chaco - Mapa interactivo del patrimonio cultural, emprendedor y turístico de la provincia del Chaco."
      />

      <motion.div className="home-scroll-progress" style={{ scaleX, originX: 0 }} />

      <HeroComponent />
      <PalabraDelDia />
      <EntidadDelDia />

      <div className="home-sections">
        <ScrollSection>
          <div className="scroll-section__content">
            <div className="scroll-section__text">
              <span className="scroll-section__tag">01 · EXPLORACIÓN</span>
              <h2 className="scroll-section__title">Un mapa <span className="scroll-section__title-accent">interactivo</span></h2>
              <p className="scroll-section__body">
                Recorré la provincia del Chaco a través de un mapa vivo con más de 14 categorías: artesanos, gastronomía, eventos, comunidades indígenas, naturaleza y mucho más. Cada punto es una historia esperando ser descubierta.
              </p>
              <button className="scroll-section__btn" onClick={() => navigate("/descubre")}>
                Explorar el mapa
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="scroll-section__media">
              <div className="blob blob--map">
                <HomeMapBlob />
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection>
          <div className="scroll-section__content">
            <div className="scroll-section__media">
              <div className="blob blob--book">
                <div className="blob__shape">
                  <HomePalabrasBlob />
                </div>
              </div>
            </div>
            <div className="scroll-section__text">
              <span className="scroll-section__tag">02 · PATRIMONIO</span>
              <h2 className="scroll-section__title">La <span className="scroll-section__title-accent">Colección</span></h2>
              <p className="scroll-section__body">
                Palabras, frases, dichos y expresiones que hacen única la identidad chaqueña. Una wikia colaborativa que documenta el habla popular, los modismos y la riqueza lingüística de nuestra provincia.
              </p>
              <button className="scroll-section__btn" onClick={() => navigate("/wikia")}>
                Descubrir palabras
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection>
          <div className="scroll-section__content">
            <div className="scroll-section__text">
              <span className="scroll-section__tag">03 · IDENTIDAD</span>
              <h2 className="scroll-section__title">Sello <span className="scroll-section__title-accent">Made in Chaco</span></h2>
              <p className="scroll-section__body">
                ¿Sos emprendedor, artesano o productor chaqueño? Obtené el sello que certifica tu origen y da visibilidad a tu emprendimiento. Conectá con otros actores locales y formá parte de este mapa cultural.
              </p>
              <button className="scroll-section__btn" onClick={() => navigate(isAuthenticated ? "/solicitar-sello" : "/iniciar-sesion")}>
                Solicitar el sello
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="scroll-section__media">
              <div className="blob blob--shield">
                <div className="blob__shape">
                  <img
                    src={madeInChacoLogo}
                    alt="Made in Chaco"
                    className="blob__logo"
                  />
                </div>
              </div>
            </div>
          </div>
        </ScrollSection>

        <ScrollSection>
          <div className="scroll-section__full">
            <span className="scroll-section__tag">04 · COMUNIDAD</span>
            <h2 className="scroll-section__title">Un proyecto <span className="scroll-section__title-accent">colaborativo</span></h2>
            <p className="scroll-section__body scroll-section__body--centered">
              Made in Chaco es una plataforma abierta que documenta, visibiliza y difunde la riqueza cultural, histórica, artística, emprendedora y turística de la provincia del Chaco. Un repositorio vivo de identidad chaqueña.
            </p>
            <div className="scroll-section__actions">
              <button className="scroll-section__btn" onClick={() => navigate("/proyecto")}>
                Conocer el proyecto
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </button>
              <Link to="/quienes-somos" className="scroll-section__btn scroll-section__btn--outline">
                Quiénes somos
              </Link>
            </div>
          </div>
        </ScrollSection>

        <div className="home-footer">
          <div className="home-footer__divider" />
          <p className="home-footer__text">Hecho con amor por chaqueños, para el mundo.</p>
          <div className="home-footer__icons">
            <a href="https://www.instagram.com/madeinchacoargentina/" target="_blank" rel="noopener noreferrer">
              <i className="ri-instagram-line"></i>
            </a>
            <a href="https://www.youtube.com/@MadeinChacoArgentina" target="_blank" rel="noopener noreferrer">
              <i className="ri-youtube-line"></i>
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
