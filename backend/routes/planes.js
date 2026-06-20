import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/planes", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM planes WHERE activo = true ORDER BY precio ASC",
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /planes:", err);
    res.status(500).json({ error: "Error al obtener planes" });
  }
});

router.get("/planes/personalizado", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM planes WHERE nombre = 'Personalizado' LIMIT 1",
    );
    if (rows.length === 0) return res.status(404).json({ error: "Plan personalizado no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /planes/personalizado:", err);
    res.status(500).json({ error: "Error al obtener plan personalizado" });
  }
});

router.get("/planes/admin", authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM planes ORDER BY precio ASC");
    res.json(rows);
  } catch (err) {
    console.error("Error GET /planes/admin:", err);
    res.status(500).json({ error: "Error al obtener planes" });
  }
});

router.get("/planes/:id", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM planes WHERE id = $1", [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: "Plan no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /planes/:id:", err);
    res.status(500).json({ error: "Error al obtener plan" });
  }
});

router.post("/planes", authMiddleware, async (req, res) => {
  try {
    const { nombre, descripcion, precio, duracion_dias, entidades_incluidas } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO planes (nombre, descripcion, precio, duracion_dias, entidades_incluidas)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [nombre, descripcion, precio, duracion_dias, entidades_incluidas || 1],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error POST /planes:", err);
    res.status(500).json({ error: "Error al crear plan" });
  }
});

router.put("/planes/:id", authMiddleware, async (req, res) => {
  try {
    const { nombre, descripcion, precio, duracion_dias, entidades_incluidas, activo } = req.body;
    const { rows } = await pool.query(
      `UPDATE planes SET nombre = $1, descripcion = $2, precio = $3, duracion_dias = $4,
       entidades_incluidas = $5, activo = $6 WHERE id = $7 RETURNING *`,
      [nombre, descripcion, precio, duracion_dias, entidades_incluidas, activo, req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Plan no encontrado" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error PUT /planes/:id:", err);
    res.status(500).json({ error: "Error al actualizar plan" });
  }
});

router.delete("/planes/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM planes WHERE id = $1 RETURNING *",
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Plan no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Error DELETE /planes/:id:", err);
    res.status(500).json({ error: "Error al eliminar plan" });
  }
});

export default router;
