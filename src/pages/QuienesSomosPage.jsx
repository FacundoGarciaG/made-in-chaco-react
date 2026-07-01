import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/QuienesSomos.css";
import { SelloModal } from "../components/SelloModal";
import { SEO } from "../components/SEO";

const VALORES = [
  { num: "01", title: "Identidad", desc: "Celebramos lo nuestro, lo auténtico, lo chaqueño. Cada historia es un ladrillo en la construcción de nuestra cultura." },
  { num: "02", title: "Comunidad", desc: "Creemos en el poder de la unión. Una red que crece y se fortalece con cada persona que se suma." },
  { num: "03", title: "Visibilidad", desc: "Damos herramientas para que cada emprendimiento, cada rincón, cada historia tenga su lugar en el mapa." },
  { num: "04", title: "Sustentabilidad", desc: "Fomentamos un desarrollo económico consciente que valora lo local y cuida el futuro de la provincia." },
];

const STATS = [
  { num: "200+", label: "Entidades mapeadas" },
  { num: "50+", label: "Localidades relevadas" },
  { num: "12", label: "Categorías" },
  { num: "1", label: "Provincia, mil historias" },
];

export const QuienesSomosPage = () => {
  const navigate = useNavigate();
  const [showSelloModal, setShowSelloModal] = useState(false);
  const sectionsRef = useRef([]);
  const cardsRef = useRef([]);
  const statsRef = useRef([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.15 },
    );

    sectionsRef.current.forEach((el) => el && observer.observe(el));
    cardsRef.current.forEach((el) => el && observer.observe(el));
    statsRef.current.forEach((el) => el && observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <article>
      <SEO title="Quiénes Somos" description="Conocé al equipo detrás de Made in Chaco y nuestra misión de visibilizar la identidad chaqueña." />
      {/* ── HERO ── */}
      <section
        className="quienes-hero"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          background: "linear-gradient(165deg, #f8f5f0 0%, #ede6dc 40%, #e8d5c4 100%)",
          overflow: "hidden",
          padding: "0 40px",
        }}
      >
        {/* Decorative corner */}
        <div style={{
          position: "absolute", top: -80, left: -80, width: 300, height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(134,56,25,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", bottom: -120, right: -60, width: 400, height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(134,56,25,0.05) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <span style={{
            fontSize: 13, fontWeight: 600, letterSpacing: "0.15em",
            color: "#863819", textTransform: "uppercase",
            display: "inline-block", marginBottom: 24,
          }}>
            Made in Chaco
          </span>
          <h1 className="quienes-hero-title" style={{
            fontFamily: "Cinzel, serif", color: "#1c1c18",
            margin: 0,
            fontSize: "clamp(48px, 8vw, 96px)",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}>
            Quiénes Somos
          </h1>
          <div className="quienes-hero-line" style={{
            height: 3, width: 80,
            background: "#863819",
            margin: "32px auto",
            borderRadius: 2,
          }} />
          <p className="quienes-hero-sub" style={{
            color: "#666", fontSize: "clamp(17px, 2vw, 21px)",
            lineHeight: 1.6, maxWidth: 580, margin: "0 auto",
            fontWeight: 400, letterSpacing: "-0.01em",
          }}>
            Un mapa interactivo que visibiliza el talento, la cultura y el
            emprendedurismo de la provincia del Chaco, Argentina.
          </p>
        </div>

        {/* Scroll hint */}
        <div className="quienes-scroll-hint" style={{
          position: "absolute", bottom: 40, left: "50%", marginLeft: -10,
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: 8, opacity: 0.4,
        }}>
          <span style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: "#863819", fontWeight: 500 }}>Deslizá</span>
          <svg width="20" height="28" viewBox="0 0 20 28" fill="none" style={{ display: "block" }}>
            <rect x="1" y="1" width="18" height="26" rx="9" stroke="#863819" strokeWidth="2" />
            <circle cx="10" cy="8" r="2.5" fill="#863819" />
          </svg>
        </div>
      </section>

      {/* ── EL PROYECTO ── */}
      <section
        ref={(el) => sectionsRef.current[0] = el}
        className="quienes-section-reveal"
        style={{
          padding: "120px 40px 100px",
          background: "#fff",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <span style={{
            fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
            color: "#863819", textTransform: "uppercase", display: "inline-block", marginBottom: 16,
          }}>
            — El proyecto
          </span>
          <p style={{
            color: "#1a1a1a", fontSize: "clamp(20px, 2.4vw, 28px)",
            lineHeight: 1.55, fontWeight: 350, letterSpacing: "-0.02em",
            margin: 0,
          }}>
            Creamos un mapa interactivo donde chaqueños y chaqueñas pueden
            geolocalizar sus emprendimientos, comercios, servicios y expresiones
            culturales. Cada punto en el mapa cuenta una historia y representa el
            orgullo de lo hecho en nuestra provincia.
          </p>
        </div>
      </section>

      {/* ── DEL CHACO AL MUNDO ── */}
      <section
        ref={(el) => sectionsRef.current[1] = el}
        className="quienes-section-reveal"
        style={{
          padding: "120px 40px",
          background: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <span style={{
            fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
            color: "#863819", textTransform: "uppercase", display: "inline-block", marginBottom: 16,
          }}>
            — Del Chaco al mundo
          </span>
          <h2 style={{
            fontFamily: "Cinzel, serif", color: "#1c1c18",
            fontSize: "clamp(28px, 3.6vw, 42px)", fontWeight: 600,
            letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 0 48px",
            maxWidth: 600,
          }}>
            Una identidad que trasciende fronteras
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 40,
          }}>
            {[
              {
                ring: "Región",
                desc: "Que el NEA y toda la región reconozcan al Chaco como un polo de talento, cultura y producción auténtica.",
                color: "#863819",
              },
              {
                ring: "País",
                desc: "Llevar el nombre de nuestra provincia a cada rincón de Argentina, mostrando lo que tenemos para ofrecer.",
                color: "#a0522d",
              },
              {
                ring: "Mundo",
                desc: "Que el mundo descubra el Chaco. Que cada emprendimiento chaqueño pueda contar su historia más allá de las fronteras.",
                color: "#c4956a",
              },
            ].map((item) => (
              <div key={item.ring} style={{
                position: "relative",
                paddingLeft: 28,
                borderLeft: `2px solid ${item.color}20`,
              }}>
                <div style={{
                  position: "absolute", left: -5, top: 2,
                  width: 8, height: 8,
                  borderRadius: "50%",
                  background: item.color,
                }} />
                <div style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
                  color: item.color, textTransform: "uppercase",
                  marginBottom: 8,
                }}>
                  {item.ring}
                </div>
                <p style={{
                  fontSize: 16, lineHeight: 1.7, color: "#555",
                  letterSpacing: "-0.01em", margin: 0,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div style={{
            marginTop: 64,
            padding: "32px 40px",
            background: "#faf8f6",
          }}>
            <p style={{
              fontSize: 17, lineHeight: 1.7, color: "#1a1a1a",
              letterSpacing: "-0.01em", margin: 0, fontWeight: 400,
            }}>
              Creemos que lo local puede ser global. Cada punto en nuestro mapa es una
              ventana al mundo, una invitación a descubrir el Chaco desde cualquier
              lugar. Porque lo hecho acá merece ser visto allá.
            </p>
          </div>
        </div>
      </section>

      {/* ── MISIÓN ── */}
      <section
        ref={(el) => sectionsRef.current[2] = el}
        className="quienes-section-reveal"
        style={{
          padding: "100px 40px",
          background: "#f8f5f0",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{
          position: "absolute", top: "50%", right: -60, width: 300, height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(134,56,25,0.04) 0%, transparent 70%)",
          pointerEvents: "none",
          transform: "translateY(-50%)",
        }} />
        <div style={{ maxWidth: 680, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div style={{
            fontSize: 48, lineHeight: 0.8, color: "#863819", opacity: 0.15,
            fontFamily: "Georgia, serif", marginBottom: -10,
          }}>"</div>
          <p style={{
            color: "#1c1c18", fontSize: "clamp(22px, 2.6vw, 32px)",
            lineHeight: 1.5, fontWeight: 380, letterSpacing: "-0.02em",
            fontStyle: "italic", margin: 0,
          }}>
            Promover el consumo local, fortalecer la identidad chaqueña y conectar
            a la comunidad con el valor único de lo que se produce, crea y vive
            en cada rincón de la provincia.
          </p>
          <div style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 2, background: "#863819" }} />
            <span style={{ fontSize: 14, color: "#863819", fontWeight: 500, letterSpacing: "0.04em" }}>
              Nuestra misión
            </span>
          </div>
        </div>
      </section>

      {/* ── VALORES ── */}
      <section style={{
        padding: "120px 40px 100px",
        background: "#fff",
        textAlign: "center",
      }}>
        <span style={{
          fontSize: 12, fontWeight: 600, letterSpacing: "0.12em",
          color: "#863819", textTransform: "uppercase", display: "inline-block", marginBottom: 16,
        }}>
          — Nuestros valores
        </span>
        <h2 style={{
          fontFamily: "Cinzel, serif", color: "#1c1c18",
          fontSize: "clamp(32px, 4vw, 48px)", fontWeight: 600,
          letterSpacing: "-0.03em", lineHeight: 1.1, margin: "0 auto 64px",
          maxWidth: 500,
        }}>
          Lo que nos define
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 24,
          maxWidth: 1080,
          margin: "0 auto",
        }}>
          {VALORES.map((v, i) => (
            <div
              key={v.num}
              ref={(el) => cardsRef.current[i] = el}
              className="quienes-card"
              style={{
                padding: "48px 32px 40px",
                background: "#faf8f6",
                textAlign: "left",
                borderRadius: 0,
                cursor: "default",
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
                color: "#863819", opacity: 0.3,
                display: "block", marginBottom: 24,
              }}>
                {v.num}
              </span>
              <h3 style={{
                fontSize: 18, fontWeight: 600, color: "#1c1c18",
                letterSpacing: "-0.02em", margin: "0 0 12px",
              }}>
                {v.title}
              </h3>
              <p style={{
                fontSize: 15, lineHeight: 1.6, color: "#777",
                letterSpacing: "-0.01em", margin: 0,
              }}>
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{
        padding: "80px 40px",
        background: "#1c1c18",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", width: 600, height: 600,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 40,
          maxWidth: 900,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
        }}>
          {STATS.map((s, i) => (
            <div
              key={s.num}
              ref={(el) => statsRef.current[i] = el}
              className="quienes-stat"
              style={{
                textAlign: "center",
                transitionDelay: `${i * 0.12}s`,
              }}
            >
              <div style={{
                fontSize: "clamp(36px, 4vw, 52px)",
                fontWeight: 600,
                color: "#e8d5c4",
                letterSpacing: "-0.03em",
                lineHeight: 1,
                marginBottom: 8,
              }}>
                {s.num}
              </div>
              <div style={{
                fontSize: 14, color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.03em", fontWeight: 400,
              }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        padding: "100px 40px",
        background: "#fff",
        textAlign: "center",
      }}>
        <h2 style={{
          fontFamily: "Cinzel, serif", color: "#1c1c18",
          fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 600,
          letterSpacing: "-0.03em", lineHeight: 1.15, margin: "0 auto 16px",
          maxWidth: 500,
        }}>
          Formá parte del mapa
        </h2>
        <p style={{
          color: "#777", fontSize: 17, lineHeight: 1.6,
          maxWidth: 440, margin: "0 auto 48px",
          letterSpacing: "-0.01em",
        }}>
          Si tenés un emprendimiento, comercio o expresión cultural, sumate a la
          red y mostrale al mundo lo que hace único al Chaco.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setShowSelloModal(true)}
            style={{
              fontFamily: "inherit",
              fontSize: 15, fontWeight: 500,
              letterSpacing: "0.02em",
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: "14px 0",
              color: "#1a1a1a",
              borderBottom: "1px solid #1a1a1a",
              transition: "opacity 0.25s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.5"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Solicitar sello →
          </button>
          <button
            onClick={() => navigate("/descubre")}
            style={{
              fontFamily: "inherit",
              fontSize: 15, fontWeight: 500,
              letterSpacing: "0.02em",
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: "14px 0",
              color: "#1a1a1a",
              borderBottom: "1px solid #1a1a1a",
              transition: "opacity 0.25s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.5"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
          >
            Explorar el mapa →
          </button>
        </div>
        <div style={{ marginTop: 64 }}>
          <button
            onClick={() => navigate("/")}
            style={{
              fontFamily: "inherit",
              fontSize: 16,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              cursor: "pointer",
              border: "none",
              background: "none",
              padding: 0,
              color: "#aaa",
              transition: "color 0.25s ease",
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = "#1a1a1a"}
            onMouseLeave={(e) => e.currentTarget.style.color = "#aaa"}
          >
            Volver al inicio <span style={{ fontSize: "1.1em", display: "inline-block" }}>↑</span>
          </button>
        </div>
      </section>

      <SelloModal
        isOpen={showSelloModal}
        onClose={() => setShowSelloModal(false)}
      />
    </article>
  );
};
