import { useEffect } from "react";
import { HeroComponent } from "../components/HeroComponent";
import { PalabraDelDia } from "../components/PalabraDelDia";
import { EntidadDelDia } from "../components/EntidadDelDia";
import { CursorGlow } from "../components/CursorGlow";
import { SEO } from "../components/SEO";

export const HomePage = () => {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <>
      <CursorGlow />
      <SEO title="Inicio" />
      <HeroComponent />
      <PalabraDelDia />
      <EntidadDelDia />
    </>
  );
};
