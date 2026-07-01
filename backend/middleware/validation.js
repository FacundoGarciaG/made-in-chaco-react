import { body, validationResult } from "express-validator";

export function validar(req, res, next) {
  const errs = validationResult(req);
  if (!errs.isEmpty()) {
    return res.status(400).json({ error: errs.array().map((e) => e.msg).join(". ") });
  }
  next();
}

const sanitizar = (campo) => body(campo).trim().escape();

export const registroRules = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  body("password").isLength({ min: 6, max: 128 }).withMessage("La contraseña debe tener entre 6 y 128 caracteres"),
  sanitizar("nombre").optional(),
  sanitizar("whatsapp").optional(),
  validar,
];

export const loginRules = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  body("password").notEmpty().withMessage("Contraseña requerida"),
  validar,
];

export const adminLoginRules = [
  sanitizar("username").notEmpty().withMessage("Usuario requerido"),
  body("password").notEmpty().withMessage("Contraseña requerida"),
  validar,
];

export const contactoRules = [
  sanitizar("nombre").isLength({ min: 2, max: 100 }).withMessage("Nombre requerido (2-100 caracteres)"),
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  sanitizar("asunto").isLength({ min: 3, max: 200 }).withMessage("Asunto requerido (3-200 caracteres)"),
  sanitizar("mensaje").isLength({ min: 10, max: 5000 }).withMessage("Mensaje requerido (10-5000 caracteres)"),
  validar,
];

export const perfilRules = [
  sanitizar("nombre").optional(),
  sanitizar("bio").optional(),
  sanitizar("whatsapp").optional(),
  sanitizar("sitio_web").optional().isURL().withMessage("URL inválida"),
  validar,
];

export const emailOnlyRules = [
  body("email").isEmail().normalizeEmail().withMessage("Email inválido"),
  validar,
];

export const resetPasswordRules = [
  body("token").notEmpty().withMessage("Token requerido"),
  body("password").isLength({ min: 6, max: 128 }).withMessage("La contraseña debe tener entre 6 y 128 caracteres"),
  validar,
];

const HTML_TAGS = /<[^>]*>/g;
export function sanitizarHtml(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const out = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    out[k] = typeof v === "string" ? v.replace(HTML_TAGS, "") : sanitizarHtml(v);
  }
  return out;
}
