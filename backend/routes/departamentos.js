import { Router } from "express";
import pool from "../config/db.js";

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
    console.error("Error GET /departamentos:", err);
    res.status(500).json({ error: "Error al obtener departamentos" });
  }
});

export default router;
