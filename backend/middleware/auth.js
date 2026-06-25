import jwt from "jsonwebtoken";
import pool from "../config/db.js";

const JWT_SECRET = process.env.JWT_SECRET || "made-in-chaco-secret-dev";

export const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token requerido" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Solo para perfiles públicos: verificar que no esté soft-deleteado
    if (decoded.tipo === "publico") {
      const { rows } = await pool.query(
        "SELECT id FROM perfiles WHERE id = $1 AND deleted_at IS NULL",
        [decoded.id],
      );
      if (rows.length === 0) {
        return res.status(403).json({ error: "Cuenta desactivada o en proceso de eliminación" });
      }
    }

    next();
  } catch {
    return res.status(401).json({ error: "Token inválido o expirado" });
  }
};
