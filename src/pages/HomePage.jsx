import { HeroComponent } from "../components/HeroComponent";
import { PalabraDelDia } from "../components/PalabraDelDia";
import { EntidadDelDia } from "../components/EntidadDelDia";
import { SEO } from "../components/SEO";

export const HomePage = () => {
  return (
    <>
      <SEO title="Inicio" />
      <HeroComponent />
      <PalabraDelDia />
      <EntidadDelDia />
    </>
  );
};
