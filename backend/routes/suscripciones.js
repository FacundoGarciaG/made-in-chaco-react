import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { crearNotificacion } from "./notificaciones.js";
import { getIO } from "../services/socket.js";
import { logger } from "../config/logger.js";

const router = Router();

const tiposConMembresia = ["comercio", "hospedaje", "productor", "evento"];

router.post("/suscripciones/adquirir", authMiddleware, async (req, res) => {
  try {
    let { entidad_id, entidad_ids, plan_id, dias_personalizados, precio_personalizado } = req.body;

    if (entidad_id && !entidad_ids) {
      entidad_ids = [entidad_id];
    }

    if (!entidad_ids || entidad_ids.length === 0) {
      return res.status(400).json({ error: "entidad_ids es requerido" });
    }

    if (plan_id) {
      const { rows: planRows } = await pool.query(
        "SELECT * FROM planes WHERE id = $1 AND activo = true",
        [plan_id],
      );
      if (planRows.length === 0) {
        return res.status(400).json({ error: "Plan no válido o inactivo" });
      }
      const plan = planRows[0];
      if (entidad_ids.length > plan.entidades_incluidas) {
        return res.status(400).json({
          error: `Este plan permite hasta ${plan.entidades_incluidas} entidades`,
        });
      }
    }

    const { rows: entRows } = await pool.query(
      `SELECT id, tipo, perfil_id, fecha_inicio_suscripcion, fecha_fin_suscripcion
       FROM entidades WHERE id = ANY($1)`,
      [entidad_ids],
    );

    if (entRows.length !== entidad_ids.length) {
      return res.status(404).json({ error: "Una o más entidades no encontradas" });
    }

    for (const ent of entRows) {
      if (ent.perfil_id !== req.user.id) {
        return res.status(403).json({ error: `No autorizado sobre la entidad ${ent.id}` });
      }
      if (!tiposConMembresia.includes(ent.tipo)) {
        return res.status(400).json({ error: `La entidad "${ent.nombre}" no requiere suscripción` });
      }
    }

    let planNombre, duracionDias, precio;

    if (dias_personalizados) {
      planNombre = "Personalizado";
      duracionDias = parseInt(dias_personalizados);
      precio = parseFloat(precio_personalizado);
      if (!duracionDias || duracionDias < 1) {
        return res.status(400).json({ error: "Días inválidos" });
      }
      if (!precio || precio < 1) {
        return res.status(400).json({ error: "Precio inválido" });
      }
    } else {
      if (!plan_id) {
        return res.status(400).json({ error: "plan_id es requerido" });
      }
      const { rows: planRows } = await pool.query(
        "SELECT * FROM planes WHERE id = $1 AND activo = true",
        [plan_id],
      );
      if (planRows.length === 0) {
        return res.status(400).json({ error: "Plan no válido o inactivo" });
      }
      const plan = planRows[0];
      planNombre = plan.nombre;
      duracionDias = plan.duracion_dias;
      precio = plan.precio;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    for (const ent of entRows) {
      const finActual = ent.fecha_fin_suscripcion
        ? new Date(ent.fecha_fin_suscripcion)
        : null;

      let inicio = null;
      let fin;

      if (finActual && finActual >= hoy) {
        fin = new Date(finActual);
        fin.setDate(fin.getDate() + duracionDias);
      } else {
        inicio = hoy;
        fin = new Date(hoy);
        fin.setDate(fin.getDate() + duracionDias);
      }

      const finStr = fin.toISOString().split("T")[0];
      const setClauses = ["plan_tipo = $1", "estado_pago = 'al_dia'", "visible = true"];
      const params = [planNombre];
      let pIdx = 2;

      if (inicio) {
        setClauses.push(`fecha_inicio_suscripcion = $${pIdx++}`);
        params.push(inicio.toISOString().split("T")[0]);
      }

      setClauses.push(`fecha_fin_suscripcion = $${pIdx++}`);
      params.push(finStr);
      params.push(ent.id);

      await pool.query(
        `UPDATE entidades SET ${setClauses.join(", ")} WHERE id = $${pIdx++}`,
        params,
      );

      await pool.query(
        `INSERT INTO pagos (perfil_id, entidad_id, plan_id, monto, metodo_pago, estado, fecha_inicio, fecha_fin)
         VALUES ($1, $2, $3, $4, 'simulado', 'aprobado', $5, $6)`,
        [req.user.id, ent.id, plan_id || null, precio, inicio ? inicio.toISOString().split("T")[0] : ent.fecha_inicio_suscripcion, finStr],
      );
    }

    getIO()?.emit("entidad:change");

    res.json({
      ok: true,
      message: `Suscripción activada: ${planNombre}`,
      entidades_actualizadas: entRows.length,
    });
  } catch (err) {
    logger.error("Error POST /suscripciones/adquirir:", err);
    res.status(500).json({ error: "Error al adquirir suscripción" });
  }
});

router.get("/suscripciones/mis-pagos", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, pl.nombre AS plan_nombre, e.nombre AS entidad_nombre, e.slug AS entidad_slug
       FROM pagos p
       LEFT JOIN planes pl ON p.plan_id = pl.id
       LEFT JOIN entidades e ON p.entidad_id = e.id
       WHERE p.perfil_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error GET /suscripciones/mis-pagos:", err);
    res.status(500).json({ error: "Error al obtener pagos" });
  }
});

router.get("/suscripciones/entidad/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, tipo, plan_tipo, fecha_inicio_suscripcion,
              fecha_fin_suscripcion, estado_pago
       FROM entidades WHERE id = $1 AND perfil_id = $2`,
      [req.params.id, req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada" });
    }
    res.json(rows[0]);
  } catch (err) {
    logger.error("Error GET /suscripciones/entidad/:id:", err);
    res.status(500).json({ error: "Error al obtener suscripción" });
  }
});

router.post("/suscripciones/reclamar-devolucion/:entidad_id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, perfil_id, estado_pago, nombre FROM entidades WHERE id = $1",
      [req.params.entidad_id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada" });
    }
    if (rows[0].perfil_id !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }
    if (rows[0].estado_pago !== "al_dia") {
      return res.status(400).json({ error: "Esta entidad no tiene una suscripción activa" });
    }

    await pool.query(
      `UPDATE entidades SET estado_pago = 'reembolso_solicitado' WHERE id = $1`,
      [req.params.entidad_id],
    );

    getIO()?.emit("entidad:change");
    getIO()?.emit("devolucion:change");

    await crearNotificacion(
      req.user.id,
      "devolucion_solicitada",
      "Devolución solicitada",
      `Solicitaste la devolución del pago de "${rows[0].nombre}". El administrador revisará tu solicitud.`,
      parseInt(req.params.entidad_id),
    );

    res.json({ ok: true, message: "Solicitud de devolución enviada. El administrador la revisará." });
  } catch (err) {
    logger.error("Error POST /suscripciones/reclamar-devolucion:", err);
    res.status(500).json({ error: "Error al solicitar devolución" });
  }
});

router.get("/suscripciones/devoluciones", authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.nombre, e.tipo, e.plan_tipo, e.estado_pago,
              e.fecha_inicio_suscripcion, e.fecha_fin_suscripcion,
              p.nombre AS perfil_nombre, p.email AS perfil_email
       FROM entidades e
       LEFT JOIN perfiles p ON e.perfil_id = p.id
       WHERE e.estado_pago = 'reembolso_solicitado'
       ORDER BY e.nombre ASC`,
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error GET /suscripciones/devoluciones:", err);
    res.status(500).json({ error: "Error al obtener solicitudes de devolución" });
  }
});

router.get("/suscripciones/devoluciones/count", authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM entidades WHERE estado_pago = 'reembolso_solicitado'`,
    );
    res.json({ count: rows[0].count });
  } catch (err) {
    logger.error("Error GET /suscripciones/devoluciones/count:", err);
    res.status(500).json({ error: "Error al contar devoluciones" });
  }
});

router.post("/suscripciones/aprobar-devolucion/:entidad_id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, perfil_id, estado_pago, nombre FROM entidades WHERE id = $1",
      [req.params.entidad_id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Entidad no encontrada" });
    if (rows[0].estado_pago !== "reembolso_solicitado") {
      return res.status(400).json({ error: "Esta entidad no tiene una devolución solicitada" });
    }

    await pool.query(
      `UPDATE entidades SET
        estado_pago = 'cancelado',
        plan_tipo = NULL,
        fecha_inicio_suscripcion = NULL,
        fecha_fin_suscripcion = NULL
       WHERE id = $1`,
      [req.params.entidad_id],
    );

    getIO()?.emit("entidad:change");
    getIO()?.emit("devolucion:change");

    await crearNotificacion(
      rows[0].perfil_id,
      "devolucion_aprobada",
      "Devolución aprobada",
      `La devolución del pago de "${rows[0].nombre}" fue aprobada. Nos vamos a comunicar con vos para completar el proceso de devolución.`,
      parseInt(req.params.entidad_id),
    );

    res.json({ ok: true, message: "Devolución aprobada, suscripción cancelada" });
  } catch (err) {
    logger.error("Error POST /suscripciones/aprobar-devolucion:", err);
    res.status(500).json({ error: "Error al aprobar devolución" });
  }
});

router.post("/suscripciones/rechazar-devolucion/:entidad_id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, perfil_id, estado_pago, nombre FROM entidades WHERE id = $1",
      [req.params.entidad_id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Entidad no encontrada" });
    if (rows[0].estado_pago !== "reembolso_solicitado") {
      return res.status(400).json({ error: "Esta entidad no tiene una devolución solicitada" });
    }

    await pool.query(
      `UPDATE entidades SET estado_pago = 'al_dia' WHERE id = $1`,
      [req.params.entidad_id],
    );

    getIO()?.emit("entidad:change");
    getIO()?.emit("devolucion:change");

    await crearNotificacion(
      rows[0].perfil_id,
      "devolucion_rechazada",
      "Devolución rechazada",
      `La solicitud de devolución del pago de "${rows[0].nombre}" fue rechazada. La suscripción continúa activa.`,
      parseInt(req.params.entidad_id),
    );

    res.json({ ok: true, message: "Devolución rechazada, suscripción continúa activa" });
  } catch (err) {
    logger.error("Error POST /suscripciones/rechazar-devolucion:", err);
    res.status(500).json({ error: "Error al rechazar devolución" });
  }
});

router.get("/suscripciones/todas", authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT ON (e.id)
              e.id AS entidad_id, e.nombre AS entidad_nombre, e.tipo,
              e.plan_tipo, e.estado_pago, e.fecha_inicio_suscripcion,
              e.fecha_fin_suscripcion, e.perfil_id,
              p.nombre AS perfil_nombre, p.email AS perfil_email,
              pg.monto AS ultimo_monto, pg.created_at AS ultimo_pago,
              pl.nombre AS plan_nombre
       FROM entidades e
       LEFT JOIN perfiles p ON e.perfil_id = p.id
       LEFT JOIN pagos pg ON pg.entidad_id = e.id
       LEFT JOIN planes pl ON pl.id = pg.plan_id
       WHERE e.plan_tipo IS NOT NULL
          OR e.estado_pago IS NOT NULL
          OR pg.id IS NOT NULL
       ORDER BY e.id, pg.created_at DESC NULLS LAST`,
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error GET /suscripciones/todas:", err);
    res.status(500).json({ error: "Error al obtener suscripciones" });
  }
});

export default router;
