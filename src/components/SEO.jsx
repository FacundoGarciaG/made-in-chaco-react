import { Helmet } from "react-helmet-async";

const SITE_NAME = "Made in Chaco";
const DEFAULT_DESC = "Descubrí la identidad chaqueña: emprendedores, cultura, turismo y tradiciones del Chaco.";
const SITE_URL = import.meta.env.VITE_SITE_URL || "https://madeinchaco.com.ar";

export function SEO({ title, description = DEFAULT_DESC, image, url }) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const pageUrl = url ? `${SITE_URL}${url}` : SITE_URL;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={pageUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      {image && <meta property="og:image" content={image} />}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image} />}
    </Helmet>
  );
}
