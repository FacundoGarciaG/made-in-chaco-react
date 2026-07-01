import { HeroComponent } from "../components/HeroComponent";
import { PalabraDelDia } from "../components/PalabraDelDia";
import { SEO } from "../components/SEO";

export const HomePage = () => {
  return (
    <>
      <SEO title="Inicio" />
      <HeroComponent />
      <PalabraDelDia />
    </>
  );
};
