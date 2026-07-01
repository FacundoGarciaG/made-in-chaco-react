import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ContactPage.css";
import { ContactMapBackground } from "../components/ContactMapBackground";
import { SEO } from "../components/SEO";

const STEPS = [
  { num: 1, label: "Datos" },
  { num: 2, label: "Asunto" },
  { num: 3, label: "Mensaje" },
  { num: 4, label: "Confirmar" },
];

export const ContactPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nombre: "", email: "", asunto: "", mensaje: "" });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const canGoNext = () => {
    if (step === 1) return form.nombre.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    if (step === 2) return form.asunto.trim();
    if (step === 3) return form.mensaje.trim();
    return true;
  };

  const next = () => {
    setError("");
    if (!canGoNext()) {
      if (step === 1) setError("Completá tu nombre y un email válido");
      else if (step === 2) setError("Escribí un asunto");
      else if (step === 3) setError("Escribí un mensaje");
      return;
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prev = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar el mensaje");
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const mapStep = success || (step === 4 && submitting) ? 5 : step;

  return (
    <div className="contact-page">
      <SEO title="Contacto" description="Comunicate con el equipo de Made in Chaco. Consultas, sugerencias y colaboraciones." />
      {!success && (
        <div className="steps-bar">
          {STEPS.map((s, i) => (
            <span key={s.num}>
              <span className={`step-dot ${step > s.num ? "done" : step === s.num ? "active" : ""}`} />
              {i < STEPS.length - 1 && <span className={`step-line ${step > s.num ? "done" : ""}`} />}
            </span>
          ))}
        </div>
      )}

      <div className="contact-form-side">
        {success ? (
          <div className="success-screen">
            <div className="success-icon">✓</div>
            <h2>Mensaje enviado</h2>
            <p>Gracias por escribirnos, {form.nombre}. Te vamos a responder a la brevedad.</p>
            <button className="btn btn-primary btn-up" onClick={() => navigate("/")}>Volver al inicio</button>
          </div>
        ) : (
          <div className="step-container">
            {step === 1 && (
              <div className="step-content" key="step1">
                <h2>Tus datos</h2>
                <p className="step-hint">Decinos quién sos para poder responderte.</p>
                <div className="floating-group">
                  <input id="nombre" name="nombre" type="text" value={form.nombre} onChange={handleChange} placeholder=" " />
                  <label htmlFor="nombre">Nombre</label>
                </div>
                <div className="floating-group">
                  <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder=" " />
                  <label htmlFor="email">Email</label>
                </div>
                {error && <div className="error-msg">{error}</div>}
                <div className="btn-row">
                  <button className="btn btn-primary" onClick={next}>Siguiente</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="step-content" key="step2">
                <h2>¿Sobre qué querés hablarnos?</h2>
                <p className="step-hint">Un asunto nos ayuda a encaminar tu mensaje.</p>
                <div className="floating-group">
                  <input id="asunto" name="asunto" type="text" value={form.asunto} onChange={handleChange} placeholder=" " autoFocus />
                  <label htmlFor="asunto">Asunto</label>
                </div>
                {error && <div className="error-msg">{error}</div>}
                <div className="btn-row">
                  <button className="btn btn-ghost" onClick={prev}>Atrás</button>
                  <button className="btn btn-primary" onClick={next}>Siguiente</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="step-content" key="step3">
                <h2>Tu mensaje</h2>
                <p className="step-hint">Contanos lo que necesites, con confianza.</p>
                <div className="floating-group">
                  <textarea id="mensaje" name="mensaje" value={form.mensaje} onChange={handleChange} placeholder=" " autoFocus />
                  <label htmlFor="mensaje">Mensaje</label>
                </div>
                {error && <div className="error-msg">{error}</div>}
                <div className="btn-row">
                  <button className="btn btn-ghost" onClick={prev}>Atrás</button>
                  <button className="btn btn-primary" onClick={next}>Revisar</button>
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="step-content" key="step4">
                <h2>Revisá tu mensaje</h2>
                <p className="step-hint">Todo listo. Verificá los datos antes de enviar.</p>
                <div className="review-list">
                  <div className="review-item">
                    <span className="review-item-label">Nombre</span>
                    <span className="review-item-value">{form.nombre}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-item-label">Email</span>
                    <span className="review-item-value">{form.email}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-item-label">Asunto</span>
                    <span className="review-item-value">{form.asunto}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-item-label">Mensaje</span>
                    <span className="review-item-value">{form.mensaje}</span>
                  </div>
                </div>
                {error && <div className="error-msg">{error}</div>}
                <div className="btn-row">
                  <button className="btn btn-ghost" onClick={prev}>Atrás</button>
                  <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Enviando..." : "Enviar mensaje"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="contact-map-side">
        <ContactMapBackground step={mapStep} />
      </div>
    </div>
  );
};
