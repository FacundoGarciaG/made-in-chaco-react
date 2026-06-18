import "../styles/ProjectPage.css";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { AutoPageScroll } from "../components/AutoPageScroll";
import { ProjectMapBackground } from "../components/ProjectMapBackground";
import { useNavigate } from "react-router-dom";
import logoHero from "../assets/imagenes/logo-madeinchaco.png";

export const ProjectPage = () => {
  const navigate = useNavigate();
  const [autoScroll, setAutoScroll] = useState(false);
  const [showResumeHint, setShowResumeHint] = useState(false);
  const hintTimerRef = useRef(null);
  const startedRef = useRef(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  const stopAutoScroll = useCallback(() => {
    setAutoScroll(false);
  }, []);

  const resumeAutoScroll = useCallback(() => {
    setShowResumeHint(false);
    setAutoScroll(true);
  }, []);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    setTimeout(() => {
      setAutoScroll(true);
    }, 800);
  }, []);

  // Fondo negro en body/html mientras esté en esta página
  useEffect(() => {
    const prevBodyBg = document.body.style.backgroundColor;
    const prevHtmlBg = document.documentElement.style.backgroundColor;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;
    document.body.style.backgroundColor = "#0a0a0a";
    document.documentElement.style.backgroundColor = "#0a0a0a";
    document.documentElement.style.overscrollBehavior = "none";
    return () => {
      document.body.style.backgroundColor = prevBodyBg;
      document.documentElement.style.backgroundColor = prevHtmlBg;
      document.documentElement.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  // Mostrar hint a los 5s de pausado
  useEffect(() => {
    if (autoScroll) {
      setShowResumeHint(false);
      return;
    }

    hintTimerRef.current = setTimeout(() => {
      setShowResumeHint(true);
    }, 5000);

    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [autoScroll]);

  return (
    <div className="project-page">
      <div className="project-map-wrapper">
        <ProjectMapBackground scrollYProgress={scrollYProgress} />
        <div className="project-map-overlay" />
      </div>

      <AutoPageScroll
        isActive={autoScroll}
        onStop={stopAutoScroll}
        onResume={resumeAutoScroll}
        blockScroll={false}
      />

      <section id="project-resume" className="project-container project-container--with-ending">
        <p className="project-intro">
          Made in Chaco es un proyecto cultural, educativo y de identidad
          territorial que busca documentar, visibilizar y difundir de forma
          moderna y accesible la riqueza cultural, histórica, artística y social
          de la provincia del Chaco.
        </p>

        <motion.p
          className="project-intro"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          El proyecto propone el desarrollo de una enciclopedia web interactiva,
          de acceso libre y gratuito, que recoja saberes, oficios, lenguas,
          gastronomía, expresiones artísticas y patrimonio intangible de las
          comunidades chaqueñas.
        </motion.p>
        <motion.div
          className="item-project"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
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
        </motion.div>
        <motion.div
          className="item-project justification"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
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
            El proyecto no solo apunta a la conservación cultural, sino también
            al desarrollo económico de la región, mediante la articulación con
            el sector comercial y turístico. Made in Chaco se plantea como una
            plataforma dinámica donde la identidad se convierte también en motor
            de actividad económica, transformando el sentido de pertenencia
            territorial en un valor de mercado que beneficia directamente a los
            productores, comerciantes y prestadores de servicios locales.
          </p>
        </motion.div>

        <motion.div
          className="item-project"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
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
        </motion.div>
        <motion.div
          className="item-project"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        >
          <h2>Público destinatario</h2>
          <ul className="project-list">
            <li>Población chaqueña en general</li>
            <li>Estudiantes, docentes e investigadores</li>
            <li>Turistas nacionales e internacionales</li>
            <li>Organismos públicos, museos, bibliotecas</li>
            <li>Medios de comunicación y productores culturales</li>
          </ul>
        </motion.div>
        <motion.div
          className="item-project"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
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
        </motion.div>
        <motion.div
          className="item-project"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        >
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
        </motion.div>
        <motion.div
          className="item-project"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
        >
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
        </motion.div>

        <div className="project-ending" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <img src={logoHero} alt="Made in Chaco" className="project-ending-logo" />
        </div>

        <motion.div className="progress" style={{ scaleX, originX: 0 }} />
      </section>

      {showResumeHint && (
        <div className="resume-hint" onClick={resumeAutoScroll}>
          <img src="/icons/touch.png" className="resume-hint-icon" />
          <span>Hacé click en la pantalla para reanudar</span>
        </div>
      )}
    </div>
  );
};
