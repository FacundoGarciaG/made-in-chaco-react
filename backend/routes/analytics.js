import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

async function tableExists() {
  const { rows } = await pool.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events')`,
  );
  return rows[0].exists;
}

// POST /api/analytics/track — log an event (no auth, called from frontend)
router.post("/analytics/track", async (req, res) => {
  try {
    const { tipo, entidad_id, slug } = req.body;
    if (!tipo) return res.status(400).json({ error: "tipo es requerido" });

    await pool.query(
      `INSERT INTO analytics_events (tipo, entidad_id, slug) VALUES ($1, $2, $3)`,
      [tipo, entidad_id || null, slug || null],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /analytics/track:", err);
    res.status(500).json({ error: "Error al registrar evento" });
  }
});

// GET /api/analytics/resumen — aggregated stats (auth)
router.get("/analytics/resumen", authMiddleware, async (_req, res) => {
  try {
    if (!(await tableExists())) {
      return res.json({ totales: 0, hoy: 0, semana: 0, mes: 0, porTipo: [], top10: [] });
    }

    const results = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM analytics_events`),
      pool.query(`SELECT COUNT(*)::int AS total FROM analytics_events WHERE created_at >= CURRENT_DATE`),
      pool.query(`SELECT COUNT(*)::int AS total FROM analytics_events WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*)::int AS total FROM analytics_events WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'`),
      pool.query(`SELECT tipo, COUNT(*)::int AS cantidad FROM analytics_events GROUP BY tipo ORDER BY cantidad DESC`),
      pool.query(`SELECT e.id, e.nombre, e.tipo, COUNT(*)::int AS visitas
                   FROM analytics_events a
                   JOIN entidades e ON e.id = a.entidad_id
                   WHERE a.entidad_id IS NOT NULL
                   GROUP BY e.id, e.nombre, e.tipo
                   ORDER BY visitas DESC
                   LIMIT 10`),
    ]);

    res.json({
      totales: results[0].rows[0].total,
      hoy: results[1].rows[0].total,
      semana: results[2].rows[0].total,
      mes: results[3].rows[0].total,
      porTipo: results[4].rows,
      top10: results[5].rows,
    });
  } catch (err) {
    console.error("Error GET /analytics/resumen:", err);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
});

// GET /api/analytics/diario?dias=30 — daily breakdown (auth)
router.get("/analytics/diario", authMiddleware, async (req, res) => {
  try {
    if (!(await tableExists())) {
      return res.json([]);
    }

    const dias = Math.min(parseInt(req.query.dias) || 30, 90);
    const { rows } = await pool.query(
      `WITH fechas AS (
         SELECT generate_series(
           CURRENT_DATE - $1::interval,
           CURRENT_DATE,
           '1 day'
         )::date AS fecha
       )
       SELECT
         f.fecha,
         COALESCE(COUNT(a.id), 0)::int AS total,
         COALESCE(COUNT(a.id) FILTER (WHERE a.tipo = 'visita_entidad'), 0)::int AS visitas,
         COALESCE(COUNT(a.id) FILTER (WHERE a.tipo = 'click_mapa'), 0)::int AS clicks_mapa
       FROM fechas f
       LEFT JOIN analytics_events a ON DATE(a.created_at) = f.fecha
       GROUP BY f.fecha
       ORDER BY f.fecha ASC`,
      [`${dias} days`],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /analytics/diario:", err);
    res.status(500).json({ error: "Error al obtener diario" });
  }
});

export default router;
