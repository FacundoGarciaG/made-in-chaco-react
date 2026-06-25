import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { cloudinary } from "../config/cloudinary.js";

const router = Router();

// GET /api/entidades/:id/multimedia
router.get("/entidades/:id/multimedia", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM multimedia WHERE entidad_id = $1 ORDER BY es_principal DESC, id ASC`,
      [req.params.id],
    );
    res.json(rows);
  } catch (err) {
    console.error("Error GET /entidades/:id/multimedia:", err);
    res.status(500).json({ error: "Error al obtener multimedia" });
  }
});

// POST /api/multimedia
router.post("/multimedia", authMiddleware, async (req, res) => {
  try {
    const {
      entidad_id, url_recurso, titulo_alternativo,
      descripcion_recurso, tipo_recurso, es_principal, thumbnail_url,
      public_id,
    } = req.body;

    if (!entidad_id || !url_recurso || !tipo_recurso) {
      return res.status(400).json({ error: "entidad_id, url_recurso y tipo_recurso son requeridos" });
    }

    const { rows } = await pool.query(
      `INSERT INTO multimedia (entidad_id, url_recurso, titulo_alternativo,
        descripcion_recurso, tipo_recurso, es_principal, thumbnail_url, public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        entidad_id, url_recurso, titulo_alternativo || "",
        descripcion_recurso || "", tipo_recurso,
        es_principal === true || es_principal === 1, thumbnail_url || "",
        public_id || "",
      ],
    );

    res.status(201).json({ id: rows[0].id });
  } catch (err) {
    console.error("Error POST /multimedia:", err);
    res.status(500).json({ error: "Error al crear multimedia" });
  }
});

async function eliminarDeCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.v2.uploader.destroy(publicId, { invalidate: true });
  } catch (err) {
    console.warn("Cloudinary delete warning:", err.message);
  }
}

// DELETE /api/multimedia/:id
router.delete("/multimedia/:id", authMiddleware, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT public_id FROM multimedia WHERE id = $1",
      [req.params.id],
    );
    if (rows.length > 0) {
      await eliminarDeCloudinary(rows[0].public_id);
    }
    await pool.query("DELETE FROM multimedia WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Error DELETE /multimedia/:id:", err);
    res.status(500).json({ error: "Error al eliminar multimedia" });
  }
});

// ========== ENTITY TAGGING ON MULTIMEDIA ==========

// GET /api/multimedia/etiquetas?multimedia_ids=1,2,3
router.get("/multimedia/etiquetas", async (req, res) => {
  try {
    const ids = req.query.multimedia_ids;
    if (!ids) return res.json({});

    const idList = ids.split(",").map(Number).filter(Boolean);
    if (idList.length === 0) return res.json({});

    const { rows } = await pool.query(
      `SELECT me.multimedia_id, me.entidad_id, me.timestamp_inicio, me.timestamp_fin,
        e.nombre, e.slug, e.tipo
       FROM multimedia_etiquetas me
       JOIN entidades e ON me.entidad_id = e.id
       WHERE me.multimedia_id = ANY($1)`,
      [idList],
    );

    const grouped = {};
    for (const row of rows) {
      if (!grouped[row.multimedia_id]) grouped[row.multimedia_id] = [];
      grouped[row.multimedia_id].push({
        entidad_id: row.entidad_id,
        nombre: row.nombre,
        slug: row.slug,
        tipo: row.tipo,
        timestamp_inicio: row.timestamp_inicio,
        timestamp_fin: row.timestamp_fin,
      });
    }

    res.json(grouped);
  } catch (err) {
    console.error("Error GET /multimedia/etiquetas:", err);
    res.status(500).json({ error: "Error al obtener etiquetas" });
  }
});

// PUT /api/multimedia/:id/etiquetas
router.put("/multimedia/:id/etiquetas", authMiddleware, async (req, res) => {
  try {
    const multimediaId = parseInt(req.params.id);
    const etiquetas = req.body;

    const { rows: existing } = await pool.query(
      "SELECT id FROM multimedia WHERE id = $1",
      [multimediaId],
    );
    if (existing.length === 0) {
      return res.status(404).json({ error: "Multimedia no encontrado" });
    }

    await pool.query("DELETE FROM multimedia_etiquetas WHERE multimedia_id = $1", [multimediaId]);

    for (const et of etiquetas) {
      if (!et.entidad_id) continue;
      await pool.query(
        `INSERT INTO multimedia_etiquetas (multimedia_id, entidad_id, timestamp_inicio, timestamp_fin)
         VALUES ($1, $2, $3, $4)`,
        [multimediaId, et.entidad_id, et.timestamp_inicio || null, et.timestamp_fin || null],
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("Error PUT /multimedia/:id/etiquetas:", err);
    res.status(500).json({ error: "Error al guardar etiquetas" });
  }
});

export default router;
