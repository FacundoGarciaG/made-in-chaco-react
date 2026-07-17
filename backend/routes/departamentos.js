import { Router } from "express";
import pool from "../config/db.js";
import { logger } from "../config/logger.js";

const router = Router();

// GET /api/departamentos — devuelve lista con geometría en GeoJSON
router.get("/departamentos", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre,
        ST_AsGeoJSON(geom)::jsonb AS geometry
       FROM departamentos
       ORDER BY nombre ASC`,
    );
    res.json({
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        geometry: r.geometry,
        properties: { id: r.id, nombre: r.nombre },
      })),
    });
  } catch (err) {
    logger.error("Error GET /departamentos:", err);
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
});

// GET /api/provincia — devuelve el contorno unificado de toda la provincia
router.get("/provincia", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT ST_AsGeoJSON(ST_Union(geom))::jsonb AS geometry
      FROM departamentos
    `);
    res.json({
      type: "Feature",
      geometry: rows[0].geometry,
      properties: { nombre: "Chaco" },
    });
  } catch (err) {
    logger.error("Error GET /provincia:", err);
    res.status(500).json({ error: "Error al obtener provincia" });
  }
});

export default router;
