import { Router } from "express";
import pool from "../config/db.js";
import { buildSetClause } from "../config/helpers.js";
import { authMiddleware } from "../middleware/auth.js";
import { getIO } from "../services/socket.js";
import { logger } from "../config/logger.js";

const router = Router();

// GET /api/localidades
router.get("/localidades", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT l.*, d.nombre AS departamento_nombre
       FROM localidades l
       LEFT JOIN departamentos d ON l.departamento_id = d.id
       ORDER BY l.nombre ASC`,
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error GET /localidades:", err);
    res.status(500).json({ error: "Error al obtener localidades" });
  }
});

// PUT /api/localidades/:id
router.put("/localidades/:id", authMiddleware, async (req, res) => {
  try {
    const built = buildSetClause(req.body, 1);
    if (!built) return res.json({ ok: true });

    await pool.query(
      `UPDATE localidades SET ${built.clause} WHERE id = $${built.values.length + 1}`,
      [...built.values, req.params.id],
    );
    getIO()?.emit("localidad:change");
    res.json({ ok: true });
  } catch (err) {
    logger.error("Error PUT /localidades/:id:", err);
    res.status(500).json({ error: "Error al actualizar localidad" });
  }
});

export default router;
