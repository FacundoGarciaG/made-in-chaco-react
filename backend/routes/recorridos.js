import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

// GET /api/recorridos
router.get("/recorridos", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, COUNT(p.id)::int AS total_pasos
       FROM recorridos r
       LEFT JOIN pasos_recorrido p ON r.id = p.recorrido_id
       GROUP BY r.id
       ORDER BY r.nombre ASC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /recorridos:", err);
    res.status(500).json({ error: "Error al obtener recorridos" });
  }
});

// GET /api/recorridos/:slug
router.get("/recorridos/:slug", async (req, res) => {
  try {
    const { rows: recorridos } = await pool.query(
      "SELECT * FROM recorridos WHERE slug = $1",
      [req.params.slug],
    );
    if (recorridos.length === 0) {
      return res.status(404).json({ error: "No encontrado" });
    }

    const recorrido = recorridos[0];

    const { rows: pasos } = await pool.query(
      `SELECT p.*, e.nombre, e.slug, e.tipo, e.imagen,
        e.latitud, e.longitud, e.resumen
       FROM pasos_recorrido p
       JOIN entidades e ON p.entidad_id = e.id
       WHERE p.recorrido_id = $1
       ORDER BY p.paso_orden ASC`,
      [recorrido.id],
    );

    recorrido.pasos = pasos;
    res.json(recorrido);
  } catch (err) {
    console.error("Error GET /recorridos/:slug:", err);
    res.status(500).json({ error: "Error al obtener recorrido" });
  }
});

// POST /api/recorridos
router.post("/recorridos", authMiddleware, async (req, res) => {
  try {
    const { nombre, descripcion, slug, imagen } = req.body;
    if (!nombre || !slug) {
      return res.status(400).json({ error: "nombre y slug requeridos" });
    }

    const { rows } = await pool.query(
      "INSERT INTO recorridos (nombre, descripcion, slug, imagen) VALUES ($1, $2, $3, $4) RETURNING id",
      [nombre, descripcion || "", slug, imagen || ""],
    );

    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error("Error POST /recorridos:", err);
    res.status(500).json({ error: "Error al crear recorrido" });
  }
});

// PUT /api/recorridos/:id
router.put("/recorridos/:id", authMiddleware, async (req, res) => {
  try {
    const { nombre, descripcion, slug, imagen } = req.body;
    await pool.query(
      "UPDATE recorridos SET nombre = $1, descripcion = $2, slug = $3, imagen = $4 WHERE id = $5",
      [nombre, descripcion || "", slug, imagen || "", req.params.id],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error PUT /recorridos/:id:", err);
    res.status(500).json({ error: "Error al actualizar recorrido" });
  }
});

// DELETE /api/recorridos/:id
router.delete("/recorridos/:id", authMiddleware, async (req, res) => {
  try {
    await pool.query("DELETE FROM recorridos WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error DELETE /recorridos/:id:", err);
    res.status(500).json({ error: "Error al eliminar recorrido" });
  }
});

// POST /api/recorridos/:id/pasos
router.post("/recorridos/:id/pasos", authMiddleware, async (req, res) => {
  try {
    const recorridoId = parseInt(req.params.id);
    const pasos = req.body;

    await pool.query("DELETE FROM pasos_recorrido WHERE recorrido_id = $1", [recorridoId]);

    for (const paso of pasos) {
      if (!paso.entidad_id) continue;
      await pool.query(
        "INSERT INTO pasos_recorrido (recorrido_id, entidad_id, descripcion_paso, paso_orden) VALUES ($1, $2, $3, $4)",
        [recorridoId, paso.entidad_id, paso.descripcion_paso || "", paso.paso_orden || 0],
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /recorridos/:id/pasos:", err);
    res.status(500).json({ error: "Error al guardar pasos" });
  }
});

export default router;
