import pool from "../config/db.js";
import { cloudinary, publicIdDesdeUrl } from "../config/cloudinary.js";
import { crearNotificacion } from "../routes/notificaciones.js";
import { sendEmail } from "../services/mailer.js";
import { logger } from "../config/logger.js";

export async function ejecutarCronEntidades() {
  // 1. Eliminar entidades vencidas hace 90+ días
  const { rows: vencidas } = await pool.query(
    `SELECT e.id, e.nombre, e.perfil_id, e.imagen, e.icono, p.email AS perfil_email
     FROM entidades e
     LEFT JOIN perfiles p ON e.perfil_id = p.id
     WHERE e.fecha_fin_suscripcion IS NOT NULL
       AND e.fecha_fin_suscripcion < CURRENT_DATE - INTERVAL '90 days'`,
  );

  for (const ent of vencidas) {
    // Delete multimedia from Cloudinary
    const { rows: multimedia } = await pool.query(
      "SELECT public_id FROM multimedia WHERE entidad_id = $1 AND public_id IS NOT NULL AND public_id != ''",
      [ent.id],
    );
    for (const m of multimedia) {
      if (m.public_id) {
        try { await cloudinary.v2.uploader.destroy(m.public_id, { invalidate: true }); } catch {}
      }
    }

    // Delete portada
    if (ent.imagen) {
      const pid = publicIdDesdeUrl(ent.imagen);
      if (pid) try { await cloudinary.v2.uploader.destroy(pid); } catch {}
    }

    // Delete icono
    if (ent.icono) {
      const pid = publicIdDesdeUrl(ent.icono);
      if (pid) try { await cloudinary.v2.uploader.destroy(pid); } catch {}
    }

    await pool.query("DELETE FROM entidades WHERE id = $1", [ent.id]);

    if (ent.perfil_id) {
      await crearNotificacion(
        ent.perfil_id,
        "entidad_eliminada",
        "Entidad eliminada por vencimiento",
        `"${ent.nombre}" fue eliminada porque su suscripción venció hace más de 90 días.`,
        null,
      );
      if (ent.perfil_email) {
        await sendEmail(
          ent.perfil_email,
          "Tu entidad en Made in Chaco fue eliminada por vencimiento",
          `Hola,\n\n"${ent.nombre}" fue eliminada del directorio de Made in Chaco porque su suscripción venció hace más de 90 días.\n\nSi querés reactivarla, contactanos a madeinchacoargentina@gmail.com.\n\nSaludos,\nEquipo de Made in Chaco`,
        );
      }
    }
  }

  // 2. Notificar entidades que vencen en menos de 3 días (87-89 días vencidas)
  const { rows: porVencer } = await pool.query(
    `SELECT e.id, e.nombre, e.perfil_id, p.email AS perfil_email
     FROM entidades e
     LEFT JOIN perfiles p ON e.perfil_id = p.id
     WHERE e.perfil_id IS NOT NULL
       AND e.fecha_fin_suscripcion IS NOT NULL
       AND e.fecha_fin_suscripcion < CURRENT_DATE - INTERVAL '87 days'
       AND e.fecha_fin_suscripcion >= CURRENT_DATE - INTERVAL '90 days'`,
  );

  for (const ent of porVencer) {
    await crearNotificacion(
      ent.perfil_id,
      "entidad_por_eliminar",
      "Entidad próxima a eliminarse",
      `"${ent.nombre}" será eliminada automáticamente en menos de 3 días porque su suscripción venció hace más de 87 días. Renová tu suscripción para mantenerla visible.`,
      ent.id,
    );
    if (ent.perfil_email) {
      await sendEmail(
        ent.perfil_email,
        "Tu entidad en Made in Chaco será eliminada pronto",
        `Hola,\n\n"${ent.nombre}" será eliminada automáticamente del directorio de Made in Chaco en menos de 3 días porque su suscripción venció hace más de 87 días.\n\nRenová tu suscripción para mantenerla visible. Si ya la renovaste, ignorá este mensaje.\n\nSaludos,\nEquipo de Made in Chaco`,
      );
    }
  }

  return { eliminadas: vencidas.length, porVencer: porVencer.length };
}
