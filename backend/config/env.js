import "dotenv/config";

const REQUIRED = [
  "DATABASE_URL",
  "JWT_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
];

export function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Faltan variables de entorno requeridas: ${missing.join(", ")}. Revisá el archivo .env`,
    );
  }
}

export const JWT_SECRET = process.env.JWT_SECRET;

export const JWT_EXPIRY = {
  admin: "24h",
  publico: "30d",
};
