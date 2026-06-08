import { Router } from "express";
import pool from "../config/db.js";
import { buildSetClause } from "../config/helpers.js";
import { authMiddleware } from "../middleware/auth.js";
import cloudinary from "cloudinary";

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = Router();

// GET /api/entidades
router.get("/entidades", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM entidades ORDER BY nombre ASC",
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /entidades:", err);
    res.status(500).json({ error: "Error al obtener entidades" });
  }
});

// GET /api/entidad/:slug
router.get("/entidad/:slug", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM entidades WHERE slug = $1",
      [req.params.slug],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No encontrada" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /entidad/:slug:", err);
    res.status(500).json({ error: "Error al obtener entidad" });
  }
});

// GET /api/entidades/:id
router.get("/entidades/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM entidades WHERE id = $1",
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "No encontrada" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /entidades/:id:", err);
    res.status(500).json({ error: "Error al obtener entidad" });
  }
});

// POST /api/entidades
router.post("/entidades", authMiddleware, async (req, res) => {
  try {
    const {
      tipo, nombre, slug, resumen, localidad_id,
      latitud, longitud, visible, imagen, biografia_larga,
    } = req.body;

    if (!tipo || !nombre || !slug) {
      return res.status(400).json({ error: "tipo, nombre y slug son requeridos" });
    }

    const { rows } = await pool.query(
      `INSERT INTO entidades (tipo, nombre, slug, resumen, localidad_id,
        latitud, longitud, visible, imagen, biografia_larga)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        tipo, nombre, slug, resumen || "",
        localidad_id || null, latitud || null, longitud || null,
        visible !== false, imagen || "", biografia_larga || "",
      ],
    );

    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error("Error POST /entidades:", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Ya existe una entidad con ese slug" });
    }
    res.status(500).json({ error: "Error al crear entidad" });
  }
});

// POST /api/solicitar-sello — público, sin auth
router.post("/solicitar-sello", async (req, res) => {
  try {
    const { tipo, nombre, resumen, localidad_id, latitud, longitud, direccion_escrita, imagen, ...detalles } = req.body;

    if (!tipo || !nombre) {
      return res.status(400).json({ error: "tipo y nombre son requeridos" });
    }

    const tiposValidos = ["comercio", "hospedaje", "productor", "evento"];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: "Tipo de entidad no válido para el sello" });
    }

    const slug = nombre
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Date.now();

    const { rows } = await pool.query(
      `INSERT INTO entidades (tipo, nombre, slug, resumen, localidad_id,
        latitud, longitud, visible, estado_sello, imagen, direccion_escrita)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        tipo, nombre, slug, resumen || "",
        localidad_id || null, latitud || null, longitud || null,
        false, "pendiente", imagen || "", direccion_escrita || "",
      ],
    );

    const entityId = rows[0].id;

    // Guardar campos específicos del tipo
    const campos = { ...detalles };
    delete campos.tipo;
    // Filtrar valores vacíos y convertir booleanos
    const keys = Object.entries(campos)
      .filter(([_, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => {
        if ((k === "acepta_tarjetas" || k === "es_itinerante" || k === "taller_abierto" || k === "es_referente_comunidad") && typeof v === "string") {
          if (v === "true") return [k, true];
          if (v === "false") return [k, false];
          return null;
        }
        return [k, v];
      })
      .filter(Boolean);
    if (keys.length > 0) {
      const setClauses = keys.map(([k], i) => `${k} = $${i + 1}`).join(", ");
      const values = keys.map(([, v]) => v ?? null);
      await pool.query(
        `UPDATE entidades SET ${setClauses} WHERE id = $${keys.length + 1}`,
        [...values, entityId],
      );
    }

    res.status(201).json({ id: entityId, slug });
  } catch (err) {
    console.error("Error POST /solicitar-sello:", err);
    res.status(500).json({ error: `Error al procesar la solicitud: ${err.message}` });
  }
});

// PUT /api/entidades/:id
router.put("/entidades/:id", authMiddleware, async (req, res) => {
  try {
    const { tipo, nombre, slug, resumen, localidad_id, latitud, longitud, visible, imagen, biografia_larga } = req.body;
    await pool.query(
      `UPDATE entidades SET tipo = $1, nombre = $2, slug = $3, resumen = $4,
        localidad_id = $5, latitud = $6, longitud = $7, visible = $8,
        imagen = $9, biografia_larga = $10
       WHERE id = $11`,
      [
        tipo, nombre, slug, resumen || "", localidad_id || null,
        latitud || null, longitud || null, visible !== false,
        imagen || "", biografia_larga || "", req.params.id,
      ],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error PUT /entidades/:id:", err);
    res.status(500).json({ error: "Error al actualizar entidad" });
  }
});

// PUT /api/entidades/:id/detalles
router.put("/entidades/:id/detalles", authMiddleware, async (req, res) => {
  try {
    const campos = { ...req.body };
    delete campos.tipo;

    const built = buildSetClause(campos, 1);
    if (!built) return res.json({ ok: true });

    await pool.query(
      `UPDATE entidades SET ${built.clause} WHERE id = $${built.values.length + 1}`,
      [...built.values, req.params.id],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Error PUT /entidades/:id/detalles:", err);
    res.status(500).json({ error: "Error al actualizar detalles" });
  }
});

// POST /api/entidades/:id/detalles
router.post("/entidades/:id/detalles", authMiddleware, async (req, res) => {
  try {
    const campos = { ...req.body };
    delete campos.tipo;

    const built = buildSetClause(campos, 1);
    if (!built) return res.json({ ok: true });

    await pool.query(
      `UPDATE entidades SET ${built.clause} WHERE id = $${built.values.length + 1}`,
      [...built.values, req.params.id],
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /entidades/:id/detalles:", err);
    res.status(500).json({ error: "Error al guardar detalles" });
  }
});

// DELETE /api/entidades/:id
router.delete("/entidades/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT public_id FROM multimedia WHERE entidad_id = $1 AND public_id IS NOT NULL AND public_id != ''",
      [req.params.id],
    );
    for (const m of rows) {
      if (m.public_id) {
        try {
          await cloudinary.v2.uploader.destroy(m.public_id, { invalidate: true });
        } catch (e) {
          console.warn("Cloudinary delete warning:", e.message);
        }
      }
    }
    await pool.query("DELETE FROM entidades WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error DELETE /entidades/:id:", err);
    res.status(500).json({ error: "Error al eliminar entidad" });
  }
});

// --- CONEXIONES ---

// GET /api/entidades/:id/conexiones
router.get("/entidades/:id/conexiones", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
        e_o.nombre AS nombre_origen, e_o.tipo AS tipo_origen, e_o.slug AS slug_origen,
        e_d.nombre AS nombre_destino, e_d.tipo AS tipo_destino, e_d.slug AS slug_destino
       FROM conexiones c
       JOIN entidades e_o ON c.entidad_origen_id = e_o.id
       JOIN entidades e_d ON c.entidad_destino_id = e_d.id
       WHERE c.entidad_origen_id = $1 OR c.entidad_destino_id = $1`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /conexiones:", err);
    res.status(500).json({ error: "Error al obtener conexiones" });
  }
});

// POST /entidades/:id/conexiones
router.post("/entidades/:id/conexiones", authMiddleware, async (req, res) => {
  try {
    const entityId = parseInt(req.params.id);
    const nuevas = req.body;

    // Ensure tipo_relacion_inversa column exists (safe to run repeatedly)
    await pool.query(
      "ALTER TABLE conexiones ADD COLUMN IF NOT EXISTS tipo_relacion_inversa TEXT DEFAULT ''",
    );

    await pool.query(
      "DELETE FROM conexiones WHERE entidad_origen_id = $1 OR entidad_destino_id = $1",
      [entityId],
    );

    for (const conn of nuevas) {
      const destinoId = conn.entidad_destino_id || conn.entidad_id;
      if (!destinoId || destinoId === entityId) continue;
      await pool.query(
        "INSERT INTO conexiones (entidad_origen_id, entidad_destino_id, tipo_relacion, tipo_relacion_inversa) VALUES ($1, $2, $3, $4)",
        [entityId, destinoId, conn.tipo_relacion || "", conn.tipo_relacion_inversa || ""],
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /conexiones:", err);
    res.status(500).json({ error: "Error al guardar conexiones" });
  }
});

// --- RECORRIDOS DE UNA ENTIDAD ---

// GET /api/entidades/:id/recorridos
router.get("/entidades/:id/recorridos", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT r.id, r.nombre, r.slug, r.descripcion, r.imagen
       FROM recorridos r
       JOIN pasos_recorrido p ON r.id = p.recorrido_id
       WHERE p.entidad_id = $1`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /entidades/:id/recorridos:", err);
    res.status(500).json({ error: "Error al obtener recorridos" });
  }
});

// GET /api/mapa-puntos
router.get("/mapa-puntos", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, nombre, slug, tipo, latitud, longitud, imagen, resumen,
              horario_apertura, horario_cierre, dias_abierto,
              fecha_evento, localidad_id
       FROM entidades
       WHERE visible = true AND latitud IS NOT NULL AND longitud IS NOT NULL
         AND (tipo != 'comercio' OR (estado_pago = 'al_dia' AND (fecha_fin_suscripcion IS NULL OR fecha_fin_suscripcion >= CURRENT_DATE) AND (fecha_inicio_suscripcion IS NULL OR fecha_inicio_suscripcion <= CURRENT_DATE)))
         AND (tipo != 'hospedaje' OR (estado_pago = 'al_dia' AND (fecha_fin_suscripcion IS NULL OR fecha_fin_suscripcion >= CURRENT_DATE) AND (fecha_inicio_suscripcion IS NULL OR fecha_inicio_suscripcion <= CURRENT_DATE)))
         AND (tipo != 'productor' OR (estado_pago = 'al_dia' AND (fecha_fin_suscripcion IS NULL OR fecha_fin_suscripcion >= CURRENT_DATE) AND (fecha_inicio_suscripcion IS NULL OR fecha_inicio_suscripcion <= CURRENT_DATE)))
         AND (tipo != 'evento' OR (fecha_evento IS NULL OR fecha_evento >= CURRENT_DATE))
         AND (tipo != 'evento' OR estado_pago IS NULL OR (estado_pago = 'al_dia' AND (fecha_fin_suscripcion IS NULL OR fecha_fin_suscripcion >= CURRENT_DATE) AND (fecha_inicio_suscripcion IS NULL OR fecha_inicio_suscripcion <= CURRENT_DATE)))`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /mapa-puntos:", err);
    res.status(500).json({ error: "Error al obtener puntos del mapa" });
  }
});

// --- SOLICITUDES (revisión admin) ---

// GET /api/solicitudes — listar solicitudes pendientes
router.get("/solicitudes", authMiddleware, async (_req, res) => {
  try {
    const { rows } = await pool.query(
       `       SELECT id, tipo, nombre, slug, resumen, localidad_id, email,
               (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires' as created_at, imagen, direccion_escrita, redes_sociales,
              razon_social, cuit, rubro_especifico, horario_apertura,
              horario_cierre, dias_abierto, sitio_web, acepta_tarjetas,
              categoria_hospedaje, servicios, capacidad, biografia_larga,
              tipo_producto, metodos_produccion, certificaciones,
              fecha_evento, duracion_dias, actividades_principales,
              link_entradas, fecha_inicio_suscripcion, fecha_fin_suscripcion,
              estado_pago, latitud, longitud
       FROM entidades
       WHERE visible = false AND estado_sello = 'pendiente'
       ORDER BY created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /solicitudes:", err);
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
});

// POST /api/solicitudes/:id/aprobar — aprobar solicitud y activar membresía
router.post("/solicitudes/:id/aprobar", authMiddleware, async (req, res) => {
  try {
    const { fecha_inicio_suscripcion, fecha_fin_suscripcion, estado_pago } = req.body;
    const { id } = req.params;

    const updates = [];
    const values = [];
    let idx = 1;

    updates.push(`visible = $${idx++}`);
    values.push(false);
    updates.push(`estado_sello = $${idx++}`);
    values.push("aprobado");

    const tiposConMembresia = ["comercio", "hospedaje", "productor", "evento"];

    // Primero obtenemos el tipo de la entidad
    const { rows: entRows } = await pool.query(
      "SELECT tipo FROM entidades WHERE id = $1",
      [id],
    );
    if (entRows.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada" });
    }

    const tipo = entRows[0].tipo;

    if (tiposConMembresia.includes(tipo)) {
      if (fecha_inicio_suscripcion) {
        updates.push(`fecha_inicio_suscripcion = $${idx++}`);
        values.push(fecha_inicio_suscripcion);
      }
      if (fecha_fin_suscripcion) {
        updates.push(`fecha_fin_suscripcion = $${idx++}`);
        values.push(fecha_fin_suscripcion);
      }
      if (estado_pago) {
        updates.push(`estado_pago = $${idx++}`);
        values.push(estado_pago);
      }
    }

    values.push(id);
    await pool.query(
      `UPDATE entidades SET ${updates.join(", ")} WHERE id = $${idx}`,
      values,
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /solicitudes/:id/aprobar:", err);
    res.status(500).json({ error: "Error al aprobar solicitud" });
  }
});

// POST /api/solicitudes/:id/rechazar — rechazar solicitud
router.post("/solicitudes/:id/rechazar", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "UPDATE entidades SET estado_sello = 'rechazado' WHERE id = $1",
      [id],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /solicitudes/:id/rechazar:", err);
    res.status(500).json({ error: "Error al rechazar solicitud" });
  }
});

// PATCH /api/entidades/:id/visible — toggle visibilidad en el mapa
router.patch("/entidades/:id/visible", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { visible } = req.body;
    await pool.query(
      "UPDATE entidades SET visible = $1 WHERE id = $2",
      [visible, id],
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("Error PATCH /entidades/:id/visible:", err);
    res.status(500).json({ error: "Error al cambiar visibilidad" });
  }
});

export default router;
