import "../styles/ProjectPage.css";

import { useEffect, useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { animate, stagger } from "motion";
import { splitText } from "motion-plus";
import { BackgroundParallax } from "../components/BackgroundParallax";
import { useParallax } from "../hooks/useParallax";

export const ProjectPage = () => {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll();
  const offset = useParallax(0.4);
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const fadeIn = (delay = 0) => ({
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 0.9,
      y: 0,
      transition: { duration: 0.8, delay },
    },
  });

  useEffect(() => {
    document.fonts.ready.then(() => {
      if (!containerRef.current) return;

      // Make the container visible once fonts are loaded
      containerRef.current.style.visibility = "visible";
      const { words } = splitText(containerRef.current.querySelector("p"));

      // Animation code will go here

      animate(
        words,
        { opacity: [0, 1], y: [200, 0] },
        {
          type: "spring",
          duration: 3,
          bounce: 0,
          delay: stagger(0.2),
        }
      );
    });
  }, []);

  return (
    <>
      <BackgroundParallax />
      <section className="project-container" ref={containerRef}>
        <motion.p
          className="project-intro"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn(0.3)}
        >
          Made in Chaco es un proyecto cultural, educativo y de identidad
          territorial que busca documentar, visibilizar y difundir de forma
          moderna y accesible la riqueza cultural, histórica, artística y social
          de la provincia del Chaco.
        </motion.p>

        <p
          className="project-intro"
          style={{
            transform: `translateY(${1200 - offset}px)`,
          }}
        >
          El proyecto propone el desarrollo de una enciclopedia web interactiva,
          de acceso libre y gratuito, que recoja saberes, oficios, lenguas,
          gastronomía, expresiones artísticas y patrimonio intangible de las
          comunidades chaqueñas.
        </p>
        <div
          className="item-project"
          style={{
            transform: `translateX(${offset / 2 - 600}px)`,
          }}
        >
          <h2>Objetivos</h2>
          <h3>Objetivo general</h3>
          <p className="project-text">
            Crear una plataforma digital multimedia que funcione como
            repositorio abierto y actualizado de la cultura viva del Chaco,
            potenciando además la actividad comercial y turística local.
          </p>
          <h3>Objetivos específicos</h3>
          <p>
            Relevar información de todo el territorio provincial a través de
            mapas interactivos y nodos temáticos.
          </p>
          <p>
            Incorporar contenidos audiovisuales, textos, entrevistas, archivos
            históricos y colaboraciones comunitarias.
          </p>
          <p>
            Promover el conocimiento y la valoración del patrimonio chaqueño
            tanto en habitantes locales como en visitantes y turistas.
          </p>
          <p>
            Dar visibilidad a emprendimientos comerciales, gastronómicos,
            culturales y turísticos mediante secciones específicas de difusión.
          </p>
          <p>
            Fomentar el acceso al conocimiento de estudiantes, investigadores,
            docentes y ciudadanos en general.
          </p>
        </div>
        <div
          className="item-project"
          style={{
            transform: `translateY(${1500 - offset}px)`,
          }}
        >
          <h2>Justificación</h2>
          <p>
            El Chaco es una provincia de gran riqueza cultural y natural, pero
            muchas de sus expresiones y saberes permanecen fragmentados o poco
            difundidos. Este proyecto propone una fusión entre lo moderno y lo
            tradicional, utilizando herramientas digitales para conectar
            historias, territorios y saberes a través de un enfoque
            participativo e inclusivo.
          </p>
          <p>
            En un contexto donde el turismo cultural y la educación digital
            están en expansión, Made in Chaco se posiciona como una propuesta
            innovadora, identitaria y con alto potencial de impacto social y
            educativo.
          </p>
          <p>
            identitaria y con alto potencial de impacto social y educativo. El
            proyecto no solo apunta a la conservación cultural, sino también al
            desarrollo económico de la región, mediante la articulación con el
            sector comercial y turístico. Made in Chaco se plantea como una
            plataforma dinámica donde la identidad se convierte también en motor
            de actividad económica, incluyendo:
          </p>
          <ul className="project-list">
            <li>Publicaciones y guías de comercios locales</li>
            <li>Recomendaciones gastronómicas regionales</li>
            <li>Calendarios de eventos</li>
            <li>Promoción de alojamientos y circuitos turísticos</li>
            <li>Publicaciones y guías de comercios locales</li>
          </ul>
        </div>

        <div
          className="item-project"
          style={{
            transform: `translateX(${offset / 2 - 1000}px)`,
          }}
        >
          <h2>Descripción del proyecto</h2>
          <p>
            El sitio web funcionará como una enciclopedia digital interactiva,
            con una estructura de navegación clara e intuitiva. Estará dividido
            en secciones temáticas como:
          </p>
          <ul className="project-list">
            <li>Historia y memoria colectiva</li>
            <li>Oficios tradicionales</li>
            <li>Comunidades indígenas (qom, wichí, moqoit)</li>
            <li>Gastronomía local</li>
            <li>Música y artes visuales</li>
            <li>Festividades populares</li>
            <li>Territorio y naturaleza</li>
            <li>Cultura urbana actual</li>
          </ul>
          <p>
            Los contenidos serán presentados en distintos formatos (texto,
            video, fotografía, podcast, ilustración), y organizados
            geográficamente en un mapa interactivo que funcionará como eje
            visual de navegación.
          </p>
        </div>
        <div
          className="item-project"
          style={{
            transform: `translateX(${1300 - offset / 2}px)`,
          }}
        >
          <h2>Público destinatario</h2>
          <ul className="project-list">
            <li>Población chaqueña en general</li>
            <li>Estudiantes, docentes e investigadores</li>
            <li>Turistas nacionales e internacionales</li>
            <li>Organismos públicos, museos, bibliotecas</li>
            <li>Medios de comunicación y productores culturales</li>
          </ul>
        </div>
        <div
          className="item-project"
          style={{
            transform: `translateY(${3000 - offset}px)`,
          }}
        >
          <h2>Alcance y etapas</h2>
          <p>El proyecto prevé una ejecución en etapas:</p>
          <ul className="project-list">
            <li>Desarrollo de identidad visual y plataforma digital</li>
            <li>Relevamiento de contenidos por nodos territoriales</li>
            <li>Producción y carga de contenidos digitales</li>
            <li>Lanzamiento web y campañas de difusión local</li>
            <li>
              Alianzas con escuelas, universidades, instituciones culturales
            </li>
          </ul>
        </div>
        <div className="item-project">
          <h2>Impacto esperado</h2>
          <ul className="project-list">
            <li>Revalorización del patrimonio inmaterial chaqueño.</li>
            <li>Integración digital del conocimiento territorial.</li>
            <li>Visibilización de artistas, comunidades y oficios locales.</li>
            <li>Promoción del turismo cultural responsable.</li>
            <li>Impulso al consumo local y al comercio regional.</li>
            <li>
              Fomento de la actividad económica en pueblos y ciudades a través
              de la conexión entre identidad, territorio y servicios.
            </li>
            <li>Generación de identidad y orgullo provincial.</li>
          </ul>
        </div>
        <div className="item-project">
          <h3>Solicitamos apoyo institucional para:</h3>
          <ul className="project-list">
            <li>
              Declarar el proyecto de interés cultural, educativo y turístico.
            </li>
            <li>
              Financiar parte del desarrollo web y de producción audiovisual.
            </li>
            <li>
              Facilitar el acceso a archivos, bibliotecas y recursos
              provinciales.
            </li>
            <li>
              Promover el proyecto a través de los canales oficiales del
              gobierno.
            </li>
            <li>
              Establecer un vínculo con municipios y áreas culturales
              descentralizadas.
            </li>
          </ul>
        </div>

        <motion.div
          className="scroll-down"
          initial={{ transform: "translateY(-100px)" }}
          animate={{ transform: "translateY(0px)" }}
          transition={{ type: "spring" }}
        >
          <a href="#">
            <i className="ri-arrow-down-wide-line"></i>
          </a>
        </motion.div>

        <motion.div className="progress" style={{ scaleX, originX: 0 }} />
      </section>
    </>
  );
};
