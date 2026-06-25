import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

const CLOUDINARY_URL_RE = /^https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//;

export function publicIdDesdeUrl(url) {
  if (!url || !CLOUDINARY_URL_RE.test(url)) return null;
  const segmentos = url.split("/");
  const ultimos = segmentos.slice(7).join("/");
  return ultimos.replace(/\.[^.]+$/, "");
}
