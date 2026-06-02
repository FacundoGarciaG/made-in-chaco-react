import { useNavigate } from "react-router-dom";

export const SelloModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="sello-modal-overlay" onClick={onClose}>
      <div className="sello-modal" onClick={(e) => e.stopPropagation()}>
        <button className="sello-modal-close" onClick={onClose}>×</button>
        <h2 className="sello-modal-title">Solicitar Sello</h2>
        <p className="sello-modal-text">
          El <strong>Sello Made in Chaco</strong> es una distinción oficial
          que reconoce y visibiliza a emprendedores, productores, artistas y
          prestadores de servicios de la provincia del Chaco.
        </p>
        <p className="sello-modal-text">
          Obtener este sello significa{" "}
          <strong>formar parte de un mapa interactivo</strong> donde tu
          emprendimiento será geolocalizado y descubierto por personas que
          valoran lo auténtico, lo local y lo chaqueño. Además, te integrás
          a una comunidad que promueve el consumo consciente y el desarrollo
          económico de la región.
        </p>
        <p className="sello-modal-text">
          <strong>Beneficios clave:</strong> presencia en el mapa oficial de
          la provincia, visibilidad para turistas y vecinos, conexión con
          otros actores locales, y la posibilidad de mostrar tu historia al
          mundo a través de tu perfil público.
        </p>
        <p className="sello-modal-text">
          Si te interesa pertenecer a esta red y dar a conocer tu trabajo,
          completá el formulario y pronto nos pondremos en contacto.
        </p>
        <div className="sello-modal-actions">
          <button
            className="sello-modal-btn sello-modal-btn--primary"
            onClick={() => {
              onClose();
              navigate("/solicitar-sello");
            }}
          >
            Aceptar
          </button>
          <button
            className="sello-modal-btn sello-modal-btn--secondary"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
