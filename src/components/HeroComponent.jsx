import "../styles/HeroComponent.css";
import backgroundVideo from "../assets/videos/231933_small.mp4";
import { NavLink } from "react-router-dom";

export const HeroComponent = () => {
  return (
    <>
      <section className="hero">
        <div className="hero-text">
          <h5>Chaco, su gente y su tierra: Cultura, Tradición y Creatividad</h5>
          <h1>MADE IN CHACO</h1>
          <p>
            Explora las historias, sonidos y colores que hacen único al secreto
            de Argentina
          </p>
          <NavLink to="/descubre" className="discover-link" aria-current="page">
            Descubre mas
          </NavLink>
        </div>
        <video autoPlay muted loop className="video">
          <source src={backgroundVideo} type="video/mp4" />
          Tu navegador no soporta video.
        </video>
      </section>
      <div className="icons">
        <a href="#">
          <i className="ri-instagram-line"></i>
        </a>
        <a href="#">
          <i className="ri-youtube-line"></i>
        </a>
      </div>
    </>
  );
};
