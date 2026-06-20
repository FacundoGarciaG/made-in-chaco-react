import { Router } from "express";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { buildSetClause } from "../config/helpers.js";
import { authMiddleware } from "../middleware/auth.js";
import { crearNotificacion } from "./notificaciones.js";
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
`SELECT e.*, p.nombre AS perfil_nombre, p.email AS perfil_email, p.whatsapp AS perfil_whatsapp
        FROM entidades e
        LEFT JOIN perfiles p ON e.perfil_id = p.id
        ORDER BY e.nombre ASC`,
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

// POST /api/solicitar-sello — público (opcionalmente autenticado)
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

    // Opcionalmente extraer perfil_id del token si el usuario está autenticado
    let perfilId = null;
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      try {
        const token = header.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "made-in-chaco-secret-dev");
        perfilId = decoded.id;
      } catch {
        // Token inválido o expirado — seguir sin perfil_id
      }
    }

    const slug = nombre
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ ]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") + "-" + Date.now();

    const { rows } = await pool.query(
      `INSERT INTO entidades (tipo, nombre, slug, resumen, localidad_id,
        latitud, longitud, visible, estado_sello, imagen, direccion_escrita, perfil_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id`,
      [
        tipo, nombre, slug, resumen || "",
        localidad_id || null, latitud || null, longitud || null,
        false, "pendiente", imagen || "", direccion_escrita || "", perfilId,
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
    const { tipo, nombre, slug, resumen, localidad_id, latitud, longitud, visible, imagen, biografia_larga, icono } = req.body;

    // Delete old icono from Cloudinary if it changed
    if (icono) {
      const { rows: old } = await pool.query("SELECT icono FROM entidades WHERE id = $1", [req.params.id]);
      if (old[0]?.icono && old[0].icono !== icono) {
        try {
          const u = new URL(old[0].icono);
          const segments = u.pathname.split("/");
          let vi = -1;
          for (let i = 0; i < segments.length; i++) { if (/^v\d+$/.test(segments[i])) { vi = i; break; } }
          if (vi !== -1) {
            const pid = segments.slice(vi + 1).join("/");
            await cloudinary.v2.uploader.destroy(pid.substring(0, pid.lastIndexOf(".")));
          }
        } catch {}
      }
    }

    await pool.query(
      `UPDATE entidades SET tipo = $1, nombre = $2, slug = $3, resumen = $4,
        localidad_id = $5, latitud = $6, longitud = $7, visible = $8,
        imagen = $9, biografia_larga = $10, icono = $11
       WHERE id = $12`,
      [
        tipo, nombre, slug, resumen || "", localidad_id || null,
        latitud || null, longitud || null, visible !== false,
        imagen || "", biografia_larga || "", icono || "", req.params.id,
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
    const { rows: ent } = await pool.query(
      "SELECT perfil_id, imagen, icono FROM entidades WHERE id = $1",
      [req.params.id],
    );
    if (ent.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada" });
    }
    const isAdmin = !req.user.tipo || req.user.tipo !== "publico";
    if (ent[0].perfil_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ error: "No autorizado" });
    }

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

    // Delete portada from Cloudinary
    if (ent[0]?.imagen) {
      try {
        const u = new URL(ent[0].imagen);
        const segments = u.pathname.split("/");
        let vi = -1;
        for (let i = 0; i < segments.length; i++) { if (/^v\d+$/.test(segments[i])) { vi = i; break; } }
        if (vi !== -1) {
          const pid = segments.slice(vi + 1).join("/");
          await cloudinary.v2.uploader.destroy(pid.substring(0, pid.lastIndexOf(".")));
        }
      } catch {}
    }

    // Delete icono from Cloudinary
    if (rows[0].icono) {
      try {
        const u = new URL(rows[0].icono);
        const segments = u.pathname.split("/");
        let vi = -1;
        for (let i = 0; i < segments.length; i++) { if (/^v\d+$/.test(segments[i])) { vi = i; break; } }
        if (vi !== -1) {
          const pid = segments.slice(vi + 1).join("/");
          await cloudinary.v2.uploader.destroy(pid.substring(0, pid.lastIndexOf(".")));
        }
      } catch {}
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
      `SELECT id, nombre, slug, tipo, latitud, longitud, imagen, resumen, icono,
               horario_apertura, horario_cierre, dias_abierto,
              fecha_evento, localidad_id
       FROM entidades
       WHERE visible = true AND latitud IS NOT NULL AND longitud IS NOT NULL
         AND (tipo != 'comercio' OR ((estado_pago = 'al_dia' OR estado_pago = 'reembolso_solicitado') AND (fecha_fin_suscripcion IS NULL OR fecha_fin_suscripcion >= CURRENT_DATE) AND (fecha_inicio_suscripcion IS NULL OR fecha_inicio_suscripcion <= CURRENT_DATE)))
         AND (tipo != 'hospedaje' OR ((estado_pago = 'al_dia' OR estado_pago = 'reembolso_solicitado') AND (fecha_fin_suscripcion IS NULL OR fecha_fin_suscripcion >= CURRENT_DATE) AND (fecha_inicio_suscripcion IS NULL OR fecha_inicio_suscripcion <= CURRENT_DATE)))
         AND (tipo != 'productor' OR ((estado_pago = 'al_dia' OR estado_pago = 'reembolso_solicitado') AND (fecha_fin_suscripcion IS NULL OR fecha_fin_suscripcion >= CURRENT_DATE) AND (fecha_inicio_suscripcion IS NULL OR fecha_inicio_suscripcion <= CURRENT_DATE)))
         AND (tipo != 'evento' OR (fecha_evento IS NULL OR fecha_evento >= CURRENT_DATE))
          AND (tipo != 'evento' OR perfil_id IS NULL OR ((estado_pago = 'al_dia' OR estado_pago = 'reembolso_solicitado') AND (fecha_fin_suscripcion IS NULL OR fecha_fin_suscripcion >= CURRENT_DATE) AND (fecha_inicio_suscripcion IS NULL OR fecha_inicio_suscripcion <= CURRENT_DATE)))`,
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
       `       SELECT e.id, e.tipo, e.nombre, e.slug, e.resumen, e.localidad_id, e.email,
               (e.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires' as created_at, e.imagen, e.direccion_escrita, e.redes_sociales,
               e.razon_social, e.cuit, e.rubro_especifico, e.horario_apertura,
               e.horario_cierre, e.dias_abierto, e.sitio_web, e.acepta_tarjetas,
               e.categoria_hospedaje, e.servicios, e.capacidad, e.biografia_larga,
               e.tipo_producto, e.metodos_produccion, e.certificaciones,
               e.fecha_evento, e.duracion_dias, e.actividades_principales,
               e.link_entradas, e.fecha_inicio_suscripcion, e.fecha_fin_suscripcion,
                e.estado_pago, e.latitud, e.longitud, e.icono,
               p.nombre AS perfil_nombre, p.email AS perfil_email, p.whatsapp AS perfil_whatsapp
        FROM entidades e
        LEFT JOIN perfiles p ON e.perfil_id = p.id
        WHERE e.visible = false AND e.estado_sello = 'pendiente'
        ORDER BY e.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /solicitudes:", err);
    res.status(500).json({ error: "Error al obtener solicitudes" });
  }
});

// POST /api/solicitudes/:id/aprobar — aprobar solicitud (sin suscripción)
router.post("/solicitudes/:id/aprobar", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows: entRows } = await pool.query(
      "SELECT tipo, perfil_id, nombre FROM entidades WHERE id = $1",
      [id],
    );
    if (entRows.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada" });
    }

    const ent = entRows[0];

    await pool.query(
      "UPDATE entidades SET visible = false, estado_sello = 'aprobado' WHERE id = $1",
      [id],
    );

    if (ent.perfil_id) {
      await crearNotificacion(ent.perfil_id, "sello_aprobado", "Sello aprobado", `¡Felicidades! Tu solicitud de sello para "${ent.nombre}" ha sido aprobada. No olvides adquirir un plan de suscripción desde tu perfil para que ${ent.nombre} aparezca en el mapa de Made in Chaco.`, parseInt(id));
    }

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
    const { rows: entPre } = await pool.query("SELECT imagen, icono FROM entidades WHERE id = $1", [id]);

    await pool.query(
      "UPDATE entidades SET estado_sello = 'rechazado' WHERE id = $1",
      [id],
    );

    // Delete multimedia from Cloudinary
    const { rows: mm } = await pool.query(
      "SELECT public_id FROM multimedia WHERE entidad_id = $1 AND public_id IS NOT NULL AND public_id != ''",
      [id],
    );
    for (const m of mm) {
      try { await cloudinary.v2.uploader.destroy(m.public_id); } catch {}
    }

    // Delete portada from Cloudinary
    if (entPre[0]?.imagen) {
      try {
        const u = new URL(entPre[0].imagen);
        const segments = u.pathname.split("/");
        let vi = -1;
        for (let i = 0; i < segments.length; i++) { if (/^v\d+$/.test(segments[i])) { vi = i; break; } }
        if (vi !== -1) {
          const pid = segments.slice(vi + 1).join("/");
          await cloudinary.v2.uploader.destroy(pid.substring(0, pid.lastIndexOf(".")));
        }
      } catch {}
    }

    // Delete icono from Cloudinary
    if (entPre[0]?.icono) {
      try {
        const u = new URL(entPre[0].icono);
        const segments = u.pathname.split("/");
        let vi = -1;
        for (let i = 0; i < segments.length; i++) { if (/^v\d+$/.test(segments[i])) { vi = i; break; } }
        if (vi !== -1) {
          const pid = segments.slice(vi + 1).join("/");
          await cloudinary.v2.uploader.destroy(pid.substring(0, pid.lastIndexOf(".")));
        }
      } catch {}
    }

    const { rows: entProp } = await pool.query("SELECT perfil_id, nombre FROM entidades WHERE id = $1", [id]);
    if (entProp[0]?.perfil_id) {
      await crearNotificacion(entProp[0].perfil_id, "sello_rechazado", "Sello rechazado", `Tu solicitud de sello para "${entProp[0].nombre}" no ha sido aprobada en esta instancia.`, parseInt(id));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /solicitudes/:id/rechazar:", err);
    res.status(500).json({ error: "Error al rechazar solicitud" });
  }
});

// DELETE /api/mis-entidades/:id — cancelar solicitud pendiente del propio usuario
router.delete("/mis-entidades/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT perfil_id, estado_sello, imagen, icono FROM entidades WHERE id = $1",
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada" });
    }
    if (rows[0].perfil_id !== req.user.id) {
      return res.status(403).json({ error: "No autorizado" });
    }
    if (rows[0].estado_sello !== "pendiente") {
      return res.status(400).json({ error: "Solo se pueden cancelar solicitudes pendientes" });
    }

    // Delete multimedia from Cloudinary
    const { rows: mm } = await pool.query(
      "SELECT public_id FROM multimedia WHERE entidad_id = $1 AND public_id IS NOT NULL AND public_id != ''",
      [req.params.id],
    );
    for (const m of mm) {
      try { await cloudinary.v2.uploader.destroy(m.public_id); } catch {}
    }

    // Delete portada from Cloudinary
    if (rows[0].imagen) {
      try {
        const u = new URL(rows[0].imagen);
        const segments = u.pathname.split("/");
        let vi = -1;
        for (let i = 0; i < segments.length; i++) { if (/^v\d+$/.test(segments[i])) { vi = i; break; } }
        if (vi !== -1) {
          const pid = segments.slice(vi + 1).join("/");
          await cloudinary.v2.uploader.destroy(pid.substring(0, pid.lastIndexOf(".")));
        }
      } catch {}
    }

    await pool.query("DELETE FROM entidades WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error DELETE /mis-entidades/:id:", err);
    res.status(500).json({ error: "Error al cancelar solicitud" });
  }
});

// --- SOLICITUDES DE EDICIÓN ---

// GET /api/entidades/:id/editar — datos completos para el formulario de edición (dueño)
router.get("/entidades/:id/editar", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM entidades WHERE id = $1 AND perfil_id = $2`,
      [req.params.id, req.user.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada o no autorizada" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error GET /entidades/:id/editar:", err);
    res.status(500).json({ error: "Error al cargar entidad" });
  }
});

// POST /api/entidades/:id/solicitar-edicion — enviar solicitud de edición
router.post("/entidades/:id/solicitar-edicion", authMiddleware, async (req, res) => {
  try {
    const { rows: ent } = await pool.query(
      "SELECT id, perfil_id FROM entidades WHERE id = $1 AND perfil_id = $2",
      [req.params.id, req.user.id],
    );
    if (ent.length === 0) {
      return res.status(404).json({ error: "Entidad no encontrada o no autorizada" });
    }
    const { rows } = await pool.query(
      `INSERT INTO solicitudes_edicion (entidad_id, perfil_id, datos, estado)
       VALUES ($1, $2, $3, 'pendiente') RETURNING id`,
      [req.params.id, req.user.id, JSON.stringify(req.body)],
    );
    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error("Error POST /entidades/:id/solicitar-edicion:", err);
    res.status(500).json({ error: "Error al solicitar edición" });
  }
});

// GET /api/solicitudes-edicion — admin: listar solicitudes pendientes
router.get("/solicitudes-edicion", authMiddleware, async (req, res) => {
  const isAdmin = !req.user.tipo || req.user.tipo !== "publico";
  if (!isAdmin) return res.status(403).json({ error: "Solo administradores" });
  try {
    const { rows } = await pool.query(
      `SELECT se.*, e.tipo, e.nombre AS entidad_nombre, e.slug AS entidad_slug,
               p.email AS perfil_email, p.nombre AS perfil_nombre,
               owner.email AS owner_email, owner.nombre AS owner_nombre,
               row_to_json(e.*)::jsonb AS entidad_actual
        FROM solicitudes_edicion se
        LEFT JOIN entidades e ON se.entidad_id = e.id
        LEFT JOIN perfiles p ON se.perfil_id = p.id
        LEFT JOIN perfiles owner ON e.perfil_id = owner.id
        WHERE se.estado = 'pendiente'
        ORDER BY se.created_at DESC`,
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /solicitudes-edicion:", err);
    res.status(500).json({ error: "Error al cargar solicitudes" });
  }
});

// POST /api/solicitudes-edicion/:id/aprobar — admin: aprobar edición y aplicar cambios
router.post("/solicitudes-edicion/:id/aprobar", authMiddleware, async (req, res) => {
  const isAdmin = !req.user.tipo || req.user.tipo !== "publico";
  if (!isAdmin) return res.status(403).json({ error: "Solo administradores" });
  try {
    const { rows } = await pool.query(
      "SELECT * FROM solicitudes_edicion WHERE id = $1 AND estado = 'pendiente'",
      [req.params.id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }
    const solicitud = rows[0];
    const datos = solicitud.datos;

    // Apply base fields
    const baseFields = ["nombre", "resumen", "email", "direccion_escrita", "latitud", "longitud", "localidad_id", "imagen", "biografia_larga", "redes_sociales", "icono"];
    const dateFields = ["fecha_evento"];
    const baseUpdates = [];
    const baseValues = [];
    let idx = 1;
    for (const field of baseFields) {
      if (datos[field] !== undefined) {
        baseUpdates.push(`${field} = $${idx++}`);
        baseValues.push(dateFields.includes(field) && datos[field] === "" ? null : datos[field]);
      }
    }
    if (baseUpdates.length > 0) {
      baseValues.push(solicitud.entidad_id);
      await pool.query(
        `UPDATE entidades SET ${baseUpdates.join(", ")} WHERE id = $${idx}`,
        baseValues,
      );
    }

    // Apply type-specific fields via buildSetClause
    const campos = { ...datos };
    for (const f of baseFields) delete campos[f];
    delete campos.imagen_anterior;
    delete campos.multimedia;
    for (const f of dateFields) {
      if (campos[f] === "") campos[f] = null;
    }
    const built = buildSetClause(campos, 1);
    if (built) {
      await pool.query(
        `UPDATE entidades SET ${built.clause} WHERE id = $${built.values.length + 1}`,
        [...built.values, solicitud.entidad_id],
      );
    }

    // Create multimedia records if provided
    if (Array.isArray(datos.multimedia) && datos.multimedia.length > 0) {
      const mmInsert = "INSERT INTO multimedia (entidad_id, url_recurso, titulo_alternativo, descripcion_recurso, tipo_recurso, thumbnail_url, public_id) VALUES ";
      const mmValues = [];
      const mmParams = [];
      let mmIdx = 1;
      for (const item of datos.multimedia) {
        if (item.url_recurso) {
          mmParams.push(`($${mmIdx++}, $${mmIdx++}, $${mmIdx++}, $${mmIdx++}, $${mmIdx++}, $${mmIdx++}, $${mmIdx++})`);
          mmValues.push(solicitud.entidad_id, item.url_recurso, item.titulo_alternativo || null, item.descripcion_recurso || null, item.tipo_recurso || "foto", item.thumbnail_url || null, item.public_id || null);
        }
      }
      if (mmParams.length > 0) {
        await pool.query(mmInsert + mmParams.join(", "), mmValues);
      }
    }

    await pool.query(
      "UPDATE solicitudes_edicion SET estado = 'aprobado', updated_at = NOW() WHERE id = $1",
      [req.params.id],
    );

    const { rows: ownerRows } = await pool.query(
      "SELECT p.id, e.nombre AS entidad_nombre FROM entidades e LEFT JOIN perfiles p ON e.perfil_id = p.id WHERE e.id = $1",
      [solicitud.entidad_id],
    );
    if (ownerRows[0]?.id) {
      await crearNotificacion(ownerRows[0].id, "edicion_aprobada", "Edición aprobada", `Los cambios propuestos para "${ownerRows[0].entidad_nombre}" han sido aprobados y aplicados.`, solicitud.entidad_id);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /solicitudes-edicion/:id/aprobar:", err);
    res.status(500).json({ error: "Error al aprobar edición" });
  }
});

// POST /api/solicitudes-edicion/:id/rechazar — admin: rechazar edición
router.post("/solicitudes-edicion/:id/rechazar", authMiddleware, async (req, res) => {
  const isAdmin = !req.user.tipo || req.user.tipo !== "publico";
  if (!isAdmin) return res.status(403).json({ error: "Solo administradores" });
  try {
    const { rows: solRows } = await pool.query(
      "SELECT entidad_id FROM solicitudes_edicion WHERE id = $1 AND estado = 'pendiente'",
      [req.params.id],
    );

    await pool.query(
      "UPDATE solicitudes_edicion SET estado = 'rechazado', updated_at = NOW() WHERE id = $1 AND estado = 'pendiente'",
      [req.params.id],
    );

    if (solRows.length > 0) {
      const { rows: ownerRows } = await pool.query(
        "SELECT p.id, e.nombre AS entidad_nombre FROM entidades e LEFT JOIN perfiles p ON e.perfil_id = p.id WHERE e.id = $1",
        [solRows[0].entidad_id],
      );
      if (ownerRows[0]?.id) {
        await crearNotificacion(ownerRows[0].id, "edicion_rechazada", "Edición rechazada", `Los cambios propuestos para "${ownerRows[0].entidad_nombre}" no fueron aprobados.`, solRows[0].entidad_id);
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error POST /solicitudes-edicion/:id/rechazar:", err);
    res.status(500).json({ error: "Error al rechazar edición" });
  }
});

// PATCH /api/entidades/:id/visible — toggle visibilidad en el mapa
router.patch("/entidades/:id/visible", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { visible } = req.body;
    const { rows: oldRows } = await pool.query("SELECT visible, perfil_id, nombre FROM entidades WHERE id = $1", [id]);
    await pool.query(
      "UPDATE entidades SET visible = $1 WHERE id = $2",
      [visible, id],
    );

    if (!visible && oldRows[0]?.perfil_id && oldRows[0]?.visible) {
      await crearNotificacion(oldRows[0].perfil_id, "mapa_no_visible", "Entidad oculta del mapa", `"${oldRows[0].nombre}" ya no se muestra en el mapa.`, parseInt(id));
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error PATCH /entidades/:id/visible:", err);
    res.status(500).json({ error: "Error al cambiar visibilidad" });
  }
});

// GET /api/mis-entidades — entidades del perfil del usuario autenticado
router.get("/mis-entidades", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT e.id, e.tipo, e.nombre, e.slug, e.resumen, e.localidad_id, e.email,
               e.estado_sello, e.visible, e.created_at, e.imagen, e.direccion_escrita,
               e.fecha_inicio_suscripcion, e.fecha_fin_suscripcion,
               e.latitud, e.longitud, e.estado_pago, e.updated_at, e.icono,
               CASE WHEN se.id IS NOT NULL THEN true ELSE false END AS tiene_solicitud_pendiente
        FROM entidades e
        LEFT JOIN solicitudes_edicion se ON se.entidad_id = e.id AND se.estado = 'pendiente'
        WHERE e.perfil_id = $1
        ORDER BY e.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /mis-entidades:", err);
    res.status(500).json({ error: "Error al obtener entidades" });
  }
});

// --- FAVORITOS ---

// GET /api/mis-favoritos — favoritos del usuario autenticado
router.get("/mis-favoritos", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT f.id, f.entidad_id, f.recorrido_id, f.created_at,
              e.nombre AS entidad_nombre, e.tipo AS entidad_tipo, e.slug AS entidad_slug,
              r.nombre AS recorrido_nombre, r.slug AS recorrido_slug
       FROM favoritos f
       LEFT JOIN entidades e ON f.entidad_id = e.id
       LEFT JOIN recorridos r ON f.recorrido_id = r.id
       WHERE f.perfil_id = $1
       ORDER BY f.created_at DESC`,
      [req.user.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /mis-favoritos:", err);
    res.status(500).json({ error: "Error al obtener favoritos" });
  }
});

// GET /api/favoritos/check — verificar si una entidad/recorrido está en favoritos
router.get("/favoritos/check", authMiddleware, async (req, res) => {
  try {
    const { entidad_id, recorrido_id } = req.query;
    if (!entidad_id && !recorrido_id) {
      return res.status(400).json({ error: "entidad_id o recorrido_id requerido" });
    }
    const { rows } = await pool.query(
      `SELECT id FROM favoritos WHERE perfil_id = $1 AND
        (($2::int IS NOT NULL AND entidad_id = $2) OR ($3::int IS NOT NULL AND recorrido_id = $3))`,
      [req.user.id, entidad_id || null, recorrido_id || null],
    );
    if (rows.length > 0) {
      res.json({ favorited: true, id: rows[0].id });
    } else {
      res.json({ favorited: false });
    }
  } catch (err) {
    console.error("Error GET /favoritos/check:", err);
    res.status(500).json({ error: "Error al verificar favorito" });
  }
});

// POST /api/favoritos — agregar favorito
router.post("/favoritos", authMiddleware, async (req, res) => {
  try {
    const { entidad_id, recorrido_id } = req.body;
    if (!entidad_id && !recorrido_id) {
      return res.status(400).json({ error: "entidad_id o recorrido_id requerido" });
    }
    const { rows } = await pool.query(
      "INSERT INTO favoritos (perfil_id, entidad_id, recorrido_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id",
      [req.user.id, entidad_id || null, recorrido_id || null],
    );
    const id = rows.length > 0 ? rows[0].id : null;
    res.status(201).json({ ok: true, id });
  } catch (err) {
    console.error("Error POST /favoritos:", err);
    res.status(500).json({ error: "Error al guardar favorito" });
  }
});

// DELETE /api/favoritos/:id — eliminar favorito
router.delete("/favoritos/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "DELETE FROM favoritos WHERE id = $1 AND perfil_id = $2 RETURNING id",
      [req.params.id, req.user.id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Favorito no encontrado" });
    res.json({ ok: true });
  } catch (err) {
    console.error("Error DELETE /favoritos/:id:", err);
    res.status(500).json({ error: "Error al eliminar favorito" });
  }
});

export default router;
