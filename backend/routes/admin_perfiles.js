import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function extractPublicId(url) {
  try {
    const u = new URL(url);
    const segments = u.pathname.split("/");
    let versionIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (/^v\d+$/.test(segments[i])) {
        versionIdx = i;
        break;
      }
    }
    if (versionIdx === -1) return null;
    return segments.slice(versionIdx + 1).join("/").replace(/\.[^.]+$/, "");
  } catch {
    return null;
  }
}

const router = Router();

const isAdmin = (req) => !req.user.tipo || req.user.tipo !== "publico";

// GET /api/admin/perfiles — list all public profiles
router.get("/admin/perfiles", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    const { search, incluir_eliminados } = req.query;
    let query = `
      SELECT
        p.id, p.email, p.nombre, p.avatar_url, p.localidad,
        p.pais, p.profesion, p.verified, p.baneado, p.deleted_at, p.created_at, p.whatsapp,
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
    const conditions = [];

    if (search && search.trim()) {
      conditions.push(`(p.nombre ILIKE $${params.length + 1} OR p.email ILIKE $${params.length + 1})`);
      params.push(`%${search.trim()}%`);
    }

    if (incluir_eliminados !== "true") {
      conditions.push(`p.deleted_at IS NULL`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
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
              google_id, verified, baneado, deleted_at, created_at, updated_at, whatsapp
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

// POST /api/admin/perfiles/purge — borrado definitivo de perfiles con +30 días de eliminados
router.post("/admin/perfiles/purge", authMiddleware, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: "Acceso denegado" });
    }

    // Perfiles con deleted_at > 30 días
    const { rows: perfiles } = await pool.query(
      `SELECT id FROM perfiles
       WHERE deleted_at IS NOT NULL
         AND deleted_at < NOW() - INTERVAL '30 days'`,
    );

    if (perfiles.length === 0) {
      return res.json({ ok: true, purgados: 0 });
    }

    const ids = perfiles.map((p) => p.id);

    // Limpiar Cloudinary: multimedia de todas las entidades de estos perfiles
    const { rows: entidades } = await pool.query(
      `SELECT id, imagen FROM entidades WHERE perfil_id = ANY($1)`,
      [ids],
    );

    for (const ent of entidades) {
      const { rows: mm } = await pool.query(
        "SELECT public_id FROM multimedia WHERE entidad_id = $1 AND public_id IS NOT NULL",
        [ent.id],
      );
      for (const m of mm) {
        try { await cloudinary.v2.uploader.destroy(m.public_id); } catch {}
      }

      if (ent.imagen) {
        const publicId = extractPublicId(ent.imagen);
        if (publicId) {
          try { await cloudinary.v2.uploader.destroy(publicId); } catch {}
        }
      }
    }

    // Limpiar avatares de Cloudinary
    const { rows: avatares } = await pool.query(
      "SELECT avatar_public_id FROM perfiles WHERE id = ANY($1) AND avatar_public_id IS NOT NULL",
      [ids],
    );
    for (const a of avatares) {
      try { await cloudinary.v2.uploader.destroy(a.avatar_public_id); } catch {}
    }

    // Borrado definitivo — cascada de BD elimina entidades, multimedia, etc.
    await pool.query("DELETE FROM perfiles WHERE id = ANY($1)", [ids]);

    res.json({ ok: true, purgados: perfiles.length });
  } catch (err) {
    console.error("Error purge perfiles:", err);
    res.status(500).json({ error: "Error al purgar perfiles" });
  }
});

export default router;
