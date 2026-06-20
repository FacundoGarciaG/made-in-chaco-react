import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

const isAdmin = (req) => !req.user.tipo || req.user.tipo !== "publico";

// GET /api/admin/perfiles — list all public profiles
router.get("/admin/perfiles", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const { search } = req.query;
    let query = `
      SELECT
        p.id, p.email, p.nombre, p.avatar_url, p.localidad,
        p.pais, p.profesion, p.verified, p.baneado, p.created_at, p.whatsapp,
        COALESCE(e.cant, 0)::int AS entidades_count
      FROM perfiles p
      LEFT JOIN (
        SELECT perfil_id, COUNT(*) AS cant
        FROM entidades
        WHERE perfil_id IS NOT NULL
        GROUP BY perfil_id
      ) e ON e.perfil_id = p.id
    `;
    const params = [];

    if (search && search.trim()) {
      query += ` WHERE (p.nombre ILIKE $1 OR p.email ILIKE $1)`;
      params.push(`%${search.trim()}%`);
    }

    query += ` ORDER BY p.created_at DESC`;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Error GET /admin/perfiles:", err);
    res.status(500).json({ error: "Error al obtener perfiles" });
  }
});

// GET /api/admin/perfiles/:id — single profile with entities
router.get("/admin/perfiles/:id", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const { id } = req.params;

    const { rows: perfiles } = await pool.query(
      `SELECT id, email, nombre, avatar_url, profesion, bio, localidad, pais,
              provincia, nacionalidad, fecha_nacimiento, sexo, avatar_public_id,
              google_id, verified, baneado, created_at, updated_at, whatsapp
       FROM perfiles WHERE id = $1`,
      [id],
    );

    if (perfiles.length === 0) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    const { rows: entidades } = await pool.query(
      `SELECT id, tipo, nombre, slug, resumen, imagen, visible, estado_sello,
              plan_tipo, fecha_inicio_suscripcion, fecha_fin_suscripcion,
              estado_pago, fecha_evento, duracion_dias, created_at
       FROM entidades WHERE perfil_id = $1
       ORDER BY created_at DESC`,
      [id],
    );

    res.json({ perfil: perfiles[0], entidades });
  } catch (err) {
    console.error("Error GET /admin/perfiles/:id:", err);
    res.status(500).json({ error: "Error al obtener perfil" });
  }
});

// PUT /api/admin/perfiles/:id/ban — toggle ban status
router.put("/admin/perfiles/:id/ban", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const { id } = req.params;
    const { baneado } = req.body;

    if (typeof baneado !== "boolean") {
      return res.status(400).json({ error: "baneado debe ser true o false" });
    }

    const { rows } = await pool.query(
      `UPDATE perfiles SET baneado = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, nombre, baneado`,
      [baneado, id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Perfil no encontrado" });
    }

    // Update visibility of all entities owned by this user
    await pool.query(
      `UPDATE entidades SET visible = $1 WHERE perfil_id = $2`,
      [baneado ? false : true, id],
    );

    const { rows: entidades } = await pool.query(
      `SELECT id, nombre, visible FROM entidades WHERE perfil_id = $1`,
      [id],
    );

    res.json({ ...rows[0], entidades_actualizadas: entidades });
  } catch (err) {
    console.error("Error PUT /admin/perfiles/:id/ban:", err);
    res.status(500).json({ error: "Error al actualizar perfil" });
  }
});

export default router;
