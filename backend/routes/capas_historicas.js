import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

// GET /api/capas-historicas — devuelve GeoJSON de capas históricas
// Query params opcionales:
//   capa: filtrar por tipo (reduccion, fortin, ruta_tanino, ruta_algodon, territorio)
//   año:  filtrar por año (features con año_desde <= año <= año_hasta)
router.get("/capas-historicas", async (req, res) => {
  try {
    const { capa, año } = req.query;

    let query = `
      SELECT id, capa, nombre, descripcion, año_desde, año_hasta, color,
        ST_AsGeoJSON(geom)::jsonb AS geometry
      FROM capas_historicas
    `;
    const params = [];
    const conditions = [];

    if (capa) {
      conditions.push(`capa = $${params.length + 1}`);
      params.push(capa);
    }

    if (año) {
      const anioNum = parseInt(año, 10);
      if (!isNaN(anioNum)) {
        conditions.push(`año_desde <= $${params.length + 1}`);
        params.push(anioNum);
        conditions.push(`año_hasta >= $${params.length + 1}`);
        params.push(anioNum);
      }
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY capa, año_desde ASC";

    const { rows } = await pool.query(query, params);

    const geojson = {
      type: "FeatureCollection",
      features: rows.map((r) => ({
        type: "Feature",
        geometry: r.geometry,
        properties: {
          id: r.id,
          capa: r.capa,
          nombre: r.nombre,
          descripcion: r.descripcion,
          año_desde: r.año_desde,
          año_hasta: r.año_hasta,
          color: r.color,
        },
      })),
    };

    res.json(geojson);
  } catch (err) {
    console.error("Error GET /capas-historicas:", err);
    res.status(500).json({ error: "Error al obtener capas históricas" });
  }
});

// GET /api/capas-historicas/rangos — devuelve año mínimo y máximo
router.get("/capas-historicas/rangos", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT MIN(año_desde) AS año_min, MAX(año_hasta) AS año_max
      FROM capas_historicas
    `);
    res.json({
      año_min: rows[0].año_min || 1500,
      año_max: rows[0].año_max || 2024,
    });
  } catch (err) {
    console.error("Error GET /capas-historicas/rangos:", err);
    res.status(500).json({ error: "Error al obtener rangos" });
  }
});

export default router;
