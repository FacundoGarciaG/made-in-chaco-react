import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const CAMPOS = [
  "id", "capa", "nombre", "descripcion",
  "año_desde", "año_hasta", "color",
  "ST_AsGeoJSON(geom)::jsonb AS geometry",
];

const LISTAR = CAMPOS.join(", ");

// GET /api/capas-historicas/admin — list all (admin)
router.get("/capas-historicas/admin", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${LISTAR} FROM capas_historicas ORDER BY capa, año_desde`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /capas-historicas/admin:", err);
    res.status(500).json({ error: "Error al listar capas históricas" });
  }
});

// GET /api/capas-historicas/admin/:id — get one
router.get("/capas-historicas/admin/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${LISTAR} FROM capas_historicas WHERE id = $1`,
      [req.params.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "No encontrada" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /capas-historicas/admin/:id:", err);
    res.status(500).json({ error: "Error al obtener capa histórica" });
  }
});

// POST /api/capas-historicas/admin — create
router.post("/capas-historicas/admin", authMiddleware, async (req, res) => {
  try {
    const { capa, nombre, descripcion, año_desde, año_hasta, color, geometry } = req.body;

    if (!capa || !nombre) {
      return res.status(400).json({ error: "capa y nombre son obligatorios" });
    }

    const { rows } = await pool.query(
      `INSERT INTO capas_historicas (capa, nombre, descripcion, año_desde, año_hasta, color, geom)
       VALUES ($1, $2, $3, $4, $5, $6,
         CASE WHEN $7::jsonb IS NOT NULL THEN ST_GeomFromGeoJSON($7::text) ELSE NULL END)
       RETURNING ${LISTAR}`,
      [capa, nombre, descripcion, año_desde, año_hasta, color, geometry || null],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error POST /capas-historicas/admin:", err);
    res.status(500).json({ error: "Error al crear capa histórica" });
  }
});

// PUT /api/capas-historicas/admin/:id — update
router.put("/capas-historicas/admin/:id", authMiddleware, async (req, res) => {
  try {
    const { capa, nombre, descripcion, año_desde, año_hasta, color, geometry } = req.body;

    if (!capa || !nombre) {
      return res.status(400).json({ error: "capa y nombre son obligatorios" });
    }

    const { rows } = await pool.query(
      `UPDATE capas_historicas SET
        capa = $1, nombre = $2, descripcion = $3,
        año_desde = $4, año_hasta = $5, color = $6,
        geom = CASE WHEN $7::jsonb IS NOT NULL THEN ST_GeomFromGeoJSON($7::text) ELSE geom END
       WHERE id = $8
       RETURNING ${LISTAR}`,
      [capa, nombre, descripcion, año_desde, año_hasta, color, geometry || null, req.params.id],
    );

    if (rows.length === 0) return res.status(404).json({ error: "No encontrada" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error PUT /capas-historicas/admin/:id:", err);
    res.status(500).json({ error: "Error al actualizar capa histórica" });
  }
});

// DELETE /api/capas-historicas/admin/:id — delete
router.delete("/capas-historicas/admin/:id", authMiddleware, async (req, res) => {
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM capas_historicas WHERE id = $1",
      [req.params.id],
    );
    if (rowCount === 0) return res.status(404).json({ error: "No encontrada" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Error DELETE /capas-historicas/admin/:id:", err);
    res.status(500).json({ error: "Error al eliminar capa histórica" });
  }
});

export default router;
