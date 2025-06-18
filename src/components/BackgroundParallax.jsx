import { useParallax } from "../hooks/useParallax";
import chacoImage from "../assets/imagenes/ecosistema_pn_chaco.jpg";

export const BackgroundParallax = () => {
  const offsetY = useParallax(0.4);

  return (
    <div
      style={{
        backgroundImage: `url(${chacoImage})`,
        backgroundSize: "cover",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        opacity: 1 - offsetY / 1000,
      }}
    />
  );
};
