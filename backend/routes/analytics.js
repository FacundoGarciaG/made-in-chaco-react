import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { logger } from "../config/logger.js";

const router = Router();

async function tableExists() {
  const { rows } = await pool.query(
    `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'analytics_events')`,
  );
  return rows[0].exists;
}

async function getConfig(key) {
  try {
    const { rows } = await pool.query("SELECT value FROM site_config WHERE key = $1", [key]);
    const raw = rows[0]?.value ?? null;
    if (raw === null) return null;
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return raw; } }
    return raw;
  } catch {
    return null;
  }
}

async function setConfig(key, value) {
  await pool.query(
    "INSERT INTO site_config (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
    [key, JSON.stringify(value)],
  );
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
    logger.error("Error POST /analytics/track:", err);
    res.status(500).json({ error: "Error al registrar evento" });
  }
});

// GET /api/analytics/resumen — aggregated stats (auth)
// Optional ?periodo=dia|semana|mes to filter top10 to a specific period
router.get("/analytics/resumen", authMiddleware, async (req, res) => {
  try {
    if (!(await tableExists())) {
      return res.json({ totales: 0, hoy: 0, semana: 0, mes: 0, porTipo: [], top10: [] });
    }

    const periodo = req.query.periodo;
    let top10Filter = "";
    if (periodo === "dia") top10Filter = "AND a.created_at >= CURRENT_DATE";
    else if (periodo === "semana") top10Filter = "AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'";
    else if (periodo === "mes") top10Filter = "AND a.created_at >= CURRENT_DATE - INTERVAL '30 days'";

    const results = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM analytics_events WHERE tipo = 'visita_entidad'`),
      pool.query(`SELECT COUNT(*)::int AS total FROM analytics_events WHERE tipo = 'visita_entidad' AND created_at >= CURRENT_DATE`),
      pool.query(`SELECT COUNT(*)::int AS total FROM analytics_events WHERE tipo = 'visita_entidad' AND created_at >= CURRENT_DATE - INTERVAL '7 days'`),
      pool.query(`SELECT COUNT(*)::int AS total FROM analytics_events WHERE tipo = 'visita_entidad' AND created_at >= CURRENT_DATE - INTERVAL '30 days'`),
      pool.query(`SELECT tipo, COUNT(*)::int AS cantidad FROM analytics_events GROUP BY tipo ORDER BY cantidad DESC`),
      pool.query(`SELECT e.id, e.nombre, e.slug, e.tipo, COUNT(*)::int AS visitas
                   FROM analytics_events a
                   JOIN entidades e ON e.id = a.entidad_id
                   WHERE a.entidad_id IS NOT NULL AND a.tipo = 'visita_entidad' ${top10Filter}
                   GROUP BY e.id, e.nombre, e.slug, e.tipo
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
    logger.error("Error GET /analytics/resumen:", err);
    res.status(500).json({ error: "Error al obtener resumen" });
  }
});

// GET /api/analytics/entidad-del-dia — top entity visited today (public, no auth)
router.get("/analytics/entidad-del-dia", async (_req, res) => {
  try {
    if (!(await tableExists())) {
      return res.json(null);
    }

    const modo = await getConfig("entidad_dia_modo");

    if (modo === "off") return res.json(null);

    if (modo === "manual") {
      const entidadId = await getConfig("entidad_dia_entidad_id");
      if (!entidadId || entidadId === null) return res.json(null);
      const { rows } = await pool.query(
        `SELECT id, nombre, slug, tipo FROM entidades WHERE id = $1`,
        [entidadId],
      );
      if (rows.length === 0) return res.json(null);
      return res.json({ ...rows[0], visitas: 0 });
    }

    const { rows } = await pool.query(
      `SELECT e.id, e.nombre, e.slug, e.tipo, COUNT(*)::int AS visitas
       FROM analytics_events a
       JOIN entidades e ON e.id = a.entidad_id
       WHERE a.entidad_id IS NOT NULL AND a.tipo = 'visita_entidad' AND a.created_at >= CURRENT_DATE
       GROUP BY e.id, e.nombre, e.slug, e.tipo
       HAVING COUNT(*) > 3
       ORDER BY visitas DESC
       LIMIT 1`,
    );

    if (rows.length === 0) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    logger.error("Error GET /analytics/entidad-del-dia:", err);
    res.status(500).json({ error: "Error al obtener entidad del día" });
  }
});

// GET /api/admin/site-config — return all config keys (auth)
router.get("/admin/site-config", authMiddleware, async (_req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS site_config (
        key VARCHAR(50) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await pool.query(`
      INSERT INTO site_config (key, value) VALUES
        ('entidad_dia_modo', '"auto"'),
        ('entidad_dia_entidad_id', 'null')
      ON CONFLICT (key) DO NOTHING
    `);
    const { rows } = await pool.query("SELECT key, value FROM site_config");
    const config = {};
    for (const row of rows) {
      const raw = row.value;
      config[row.key] = (typeof raw === "string") ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw;
    }
    res.json(config);
  } catch (err) {
    logger.error("Error GET /admin/site-config:", err);
    res.status(500).json({ error: "Error al obtener configuración" });
  }
});

// PUT /api/admin/site-config — update a config key (auth)
router.put("/admin/site-config", authMiddleware, async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ error: "key es requerida" });
    await setConfig(key, value);
    res.json({ ok: true });
  } catch (err) {
    logger.error("Error PUT /admin/site-config:", err);
    res.status(500).json({ error: "Error al guardar configuración" });
  }
});

// GET /api/admin/entidades-buscar?q=&id= — search entities for manual selection (auth)
router.get("/admin/entidades-buscar", authMiddleware, async (req, res) => {
  try {
    const q = req.query.q || "";
    const id = req.query.id ? parseInt(req.query.id) : null;
    if (id) {
      const { rows } = await pool.query(
        `SELECT id, nombre, tipo FROM entidades WHERE id = $1`,
        [id],
      );
      return res.json(rows);
    }
    if (q.length < 1) return res.json([]);
    const { rows } = await pool.query(
      `SELECT id, nombre, tipo FROM entidades
       WHERE nombre ILIKE $1
       ORDER BY nombre ASC
       LIMIT 10`,
      [`%${q}%`],
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error GET /admin/entidades-buscar:", err);
    res.status(500).json({ error: "Error al buscar entidades" });
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
    logger.error("Error GET /analytics/diario:", err);
    res.status(500).json({ error: "Error al obtener diario" });
  }
});

export default router;
