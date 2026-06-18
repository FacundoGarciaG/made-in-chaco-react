import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

export async function crearNotificacion(perfilId, tipo, titulo, mensaje, entidadId) {
  try {
    await pool.query(
      `INSERT INTO notificaciones (perfil_id, tipo, titulo, mensaje, entidad_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [perfilId, tipo, titulo, mensaje, entidadId || null],
    );
  } catch (err) {
    console.error("Error al crear notificacion:", err);
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
    console.error("Error GET /notificaciones:", err);
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
    console.error("Error POST /notificaciones/leer:", err);
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
    console.error("Error POST /notificaciones/leer-todas:", err);
    res.status(500).json({ error: "Error al marcar notificaciones" });
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
    console.error("Error DELETE /notificaciones/:id:", err);
    res.status(500).json({ error: "Error al eliminar notificación" });
  }
});

router.post("/notificaciones/verificar-suscripciones", authMiddleware, async (req, res) => {
  try {
    const { rows: entities } = await pool.query(
      `SELECT id, nombre, fecha_inicio_suscripcion, fecha_fin_suscripcion
       FROM entidades
       WHERE perfil_id = $1 AND estado_sello = 'aprobado' AND visible = true`,
      [req.user.id],
    );

    const today = new Date();
    const hoyStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    for (const ent of entities) {
      if (!ent.fecha_fin_suscripcion) continue;

      const finDate = new Date(ent.fecha_fin_suscripcion);
      const finStr = `${finDate.getFullYear()}-${String(finDate.getMonth()+1).padStart(2,'0')}-${String(finDate.getDate()).padStart(2,'0')}`;

      const diffDays = Math.ceil((new Date(finStr + 'T23:59:59') - new Date(hoyStr + 'T00:00:00')) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
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
      } else if (diffDays <= 30) {
        const { rows: existing } = await pool.query(
          "SELECT id FROM notificaciones WHERE perfil_id = $1 AND entidad_id = $2 AND tipo = 'suscripcion_por_vencer'",
          [req.user.id, ent.id],
        );
        if (existing.length === 0) {
          await crearNotificacion(
            req.user.id,
            "suscripcion_por_vencer",
            "Suscripción próxima a vencer",
            `La suscripción de "${ent.nombre}" vence en ${diffDays} días. Renová para mantenerla visible en el mapa.`,
            ent.id,
          );
        }
      }
    }

    const { rows: existingBienvenida } = await pool.query(
      "SELECT id FROM notificaciones WHERE perfil_id = $1 AND tipo = 'bienvenida'",
      [req.user.id],
    );
    if (existingBienvenida.length === 0) {
      await crearNotificacion(
        req.user.id,
        "bienvenida",
        "¡Bienvenido a Made in Chaco!",
        "Descubrí cómo funciona tu panel de perfil. Hacé clic para comenzar un recorrido guiado por las secciones.",
        null,
      );
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
    console.error("Error POST /notificaciones/verificar-suscripciones:", err);
    res.status(500).json({ error: "Error al verificar suscripciones" });
  }
});

export default router;
