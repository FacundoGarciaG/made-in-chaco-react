import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { getIO } from "../services/socket.js";
import { logger } from "../config/logger.js";

const router = Router();

export async function crearNotificacion(perfilId, tipo, titulo, mensaje, entidadId, datos) {
  try {
    const { rows: perfiles } = await pool.query("SELECT id FROM perfiles WHERE id = $1", [perfilId]);
    if (perfiles.length === 0) return;

    const { rows } = await pool.query(
      `INSERT INTO notificaciones (perfil_id, tipo, titulo, mensaje, entidad_id, datos)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, created_at`,
      [perfilId, tipo, titulo, mensaje, entidadId || null, datos ? JSON.stringify(datos) : null],
    );
    const notif = rows[0];
    getIO()?.to(`perfil:${perfilId}`).emit("notificacion:nueva", {
      id: notif.id,
      perfil_id: perfilId,
      tipo,
      titulo,
      mensaje,
      entidad_id: entidadId || null,
      datos: datos || null,
      leida: false,
      created_at: notif.created_at,
    });
  } catch (err) {
    logger.error("Error al crear notificacion:", err);
  }
}

router.get("/notificaciones", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, e.nombre AS entidad_nombre, e.slug AS entidad_slug
       FROM notificaciones n
       LEFT JOIN entidades e ON n.entidad_id = e.id
       WHERE n.perfil_id = $1
       ORDER BY n.created_at DESC
       LIMIT 100`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error GET /notificaciones:", err);
    res.status(500).json({ error: "Error al cargar notificaciones" });
  }
});

router.post("/notificaciones/:id/leer", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE notificaciones SET leida = true WHERE id = $1 AND perfil_id = $2",
      [id, req.user.id],
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error("Error POST /notificaciones/leer:", err);
    res.status(500).json({ error: "Error al marcar notificacion" });
  }
});

router.post("/notificaciones/leer-todas", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notificaciones SET leida = true WHERE perfil_id = $1 AND leida = false",
      [req.user.id],
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error("Error POST /notificaciones/leer-todas:", err);
    res.status(500).json({ error: "Error al marcar notificaciones" });
  }
});

router.delete("/notificaciones", authMiddleware, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM notificaciones WHERE perfil_id = $1",
      [req.user.id],
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error("Error DELETE /notificaciones:", err);
    res.status(500).json({ error: "Error al eliminar notificaciones" });
  }
});

router.delete("/notificaciones/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM notificaciones WHERE id = $1 AND perfil_id = $2 RETURNING id",
      [req.params.id, req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Notificación no encontrada" });
    }
    res.json({ ok: true });
  } catch (err) {
    logger.error("Error DELETE /notificaciones/:id:", err);
    res.status(500).json({ error: "Error al eliminar notificación" });
  }
});

router.get("/notificaciones/unread-count", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notificaciones WHERE perfil_id = $1 AND leida = false",
      [req.user.id],
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    logger.error("Error GET /notificaciones/unread-count:", err);
    res.status(500).json({ error: "Error al obtener conteo" });
  }
});

router.post("/notificaciones/verificar-suscripciones", authMiddleware, async (req, res) => {
  try {
    // Solo para perfiles públicos (admin no tiene perfil en la tabla perfiles)
    if (req.user.tipo !== "publico") {
      return res.json({ ok: true, message: "Solo para perfiles públicos" });
    }

    const { rows: entities } = await pool.query(
      `SELECT id, nombre, fecha_inicio_suscripcion, fecha_fin_suscripcion
       FROM entidades
       WHERE perfil_id = $1 AND estado_sello = 'aprobado' AND visible = true`,
      [req.user.id],
    );

    const hoyStr = new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

    for (const ent of entities) {
      if (!ent.fecha_fin_suscripcion) continue;

      const finDate = new Date(ent.fecha_fin_suscripcion);
      const finStr = `${finDate.getFullYear()}-${String(finDate.getMonth()+1).padStart(2,'0')}-${String(finDate.getDate()).padStart(2,'0')}`;

      const diffDays = Math.ceil((new Date(finStr + 'T23:59:59') - new Date(hoyStr + 'T00:00:00')) / (1000 * 60 * 60 * 24));

      if (diffDays === -1) {
        const { rows: existing } = await pool.query(
          "SELECT id FROM notificaciones WHERE perfil_id = $1 AND entidad_id = $2 AND tipo = 'suscripcion_vencida'",
          [req.user.id, ent.id],
        );
        if (existing.length === 0) {
          await crearNotificacion(
            req.user.id,
            "suscripcion_vencida",
            "Suscripción vencida",
            `La suscripción de "${ent.nombre}" ha vencido. La entidad ya no se muestra en el mapa.`,
            ent.id,
          );
        }
      } else if (diffDays === 10 || diffDays === 5 || diffDays === 1) {
        const tipo = `suscripcion_por_vencer_${diffDays}`;
        const mensaje = diffDays === 1
          ? `La suscripción de "${ent.nombre}" vence mañana. Renová para mantenerla visible en el mapa.`
          : `La suscripción de "${ent.nombre}" vence en ${diffDays} días. Renová para mantenerla visible en el mapa.`;
        const { rows: existing } = await pool.query(
          "SELECT id FROM notificaciones WHERE perfil_id = $1 AND entidad_id = $2 AND tipo = $3",
          [req.user.id, ent.id, tipo],
        );
        if (existing.length === 0) {
          await crearNotificacion(
            req.user.id,
            tipo,
            "Suscripción próxima a vencer",
            mensaje,
            ent.id,
          );
        }
      }
    }

    const { rows } = await pool.query(
      `SELECT n.*, e.nombre AS entidad_nombre, e.slug AS entidad_slug
       FROM notificaciones n
       LEFT JOIN entidades e ON n.entidad_id = e.id
       WHERE n.perfil_id = $1
       ORDER BY n.created_at DESC
       LIMIT 100`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error POST /notificaciones/verificar-suscripciones:", err);
    res.status(500).json({ error: "Error al verificar suscripciones" });
  }
});

export default router;
