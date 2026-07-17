import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { logger } from "../config/logger.js";

const router = Router();

const CAMPOS = [
  "id", "palabra", "slug", "significado", "etimologia",
  "idioma_origen", "ejemplos", "audio_url", "categoria",
  "approved", "created_at", "updated_at",
];

const LISTAR_CAMPOS = [
  "id", "palabra", "slug", "significado", "etimologia",
  "idioma_origen", "categoria", "created_at",
].join(", ");

const DETALLE_CAMPOS = CAMPOS.join(", ");

function generarSlug(palabra, id) {
  let slug = palabra
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúüñ\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!slug) slug = `palabra-${id || Date.now()}`;
  return slug;
}

router.get("/palabras", async (req, res) => {
  try {
    const { categoria, idioma_origen, q, approved } = req.query;
    const conditions = [];
    const values = [];
    let idx = 1;

    if (categoria) {
      conditions.push(`categoria = $${idx++}`);
      values.push(categoria);
    }
    if (idioma_origen) {
      conditions.push(`idioma_origen = $${idx++}`);
      values.push(idioma_origen);
    }
    if (q) {
      conditions.push(`(palabra ILIKE $${idx} OR significado ILIKE $${idx})`);
      values.push(`%${q}%`);
      idx++;
    }
    if (approved === "true" || approved === "false") {
      conditions.push(`approved = $${idx++}`);
      values.push(approved === "true");
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT ${LISTAR_CAMPOS} FROM palabras_chaco ${where} ORDER BY palabra ASC`,
      values,
    );
    res.json(rows);
  } catch (err) {
    logger.error("Error fetching palabras:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.get("/palabras/random", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${DETALLE_CAMPOS} FROM palabras_chaco WHERE approved = true ORDER BY RANDOM() LIMIT 1`,
    );
    if (rows.length === 0) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    logger.error("Error fetching random palabra:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.get("/palabras/del-dia", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ${DETALLE_CAMPOS} FROM palabras_chaco
       WHERE approved = true
       ORDER BY md5(id::text || CURRENT_DATE::text)
       LIMIT 1`,
    );
    if (rows.length === 0) return res.json(null);
    res.json(rows[0]);
  } catch (err) {
    logger.error("Error fetching palabra del día:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.get("/palabras/:id", async (req, res) => {
  try {
    const param = req.params.id;
    const esNumero = /^\d+$/.test(param);
    const query = esNumero
      ? `SELECT ${DETALLE_CAMPOS} FROM palabras_chaco WHERE id = $1`
      : `SELECT ${DETALLE_CAMPOS} FROM palabras_chaco WHERE slug = $1`;
    const { rows } = await pool.query(query, [esNumero ? parseInt(param) : param]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Palabra no encontrada" });
    }
    res.json(rows[0]);
  } catch (err) {
    logger.error("Error fetching palabra:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.post("/palabras", authMiddleware, async (req, res) => {
  try {
    const { palabra, significado, etimologia, idioma_origen, ejemplos, audio_url, categoria } = req.body;
    if (!palabra || !palabra.trim()) {
      return res.status(400).json({ error: "La palabra es requerida" });
    }
    const { rows: insertResult } = await pool.query(
      `INSERT INTO palabras_chaco (palabra, significado, etimologia, idioma_origen, ejemplos, audio_url, categoria)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        palabra.trim(),
        significado?.trim() || null,
        etimologia?.trim() || null,
        idioma_origen || null,
        ejemplos ? JSON.stringify(ejemplos) : "[]",
        audio_url || null,
        categoria || "palabra",
      ],
    );
    const id = insertResult[0].id;
    const slug = generarSlug(palabra, id);
    await pool.query("UPDATE palabras_chaco SET slug = $1 WHERE id = $2", [slug, id]);
    const { rows } = await pool.query(
      `SELECT ${DETALLE_CAMPOS} FROM palabras_chaco WHERE id = $1`,
      [id],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error("Error creating palabra:", err);
    if (err.code === "23505") {
      return res.status(409).json({ error: "Ya existe una palabra con ese slug" });
    }
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.put("/palabras/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { palabra, significado, etimologia, idioma_origen, ejemplos, audio_url, categoria } = req.body;
    if (!palabra || !palabra.trim()) {
      return res.status(400).json({ error: "La palabra es requerida" });
    }
    const slug = generarSlug(palabra, parseInt(id));
    const { rows } = await pool.query(
      `UPDATE palabras_chaco SET
        palabra = $1, significado = $2, etimologia = $3,
        idioma_origen = $4, ejemplos = $5, audio_url = $6,
        categoria = $7, slug = $8, updated_at = NOW()
       WHERE id = $9 RETURNING ${DETALLE_CAMPOS}`,
      [
        palabra.trim(), significado?.trim() || null,
        etimologia?.trim() || null, idioma_origen || null,
        ejemplos ? JSON.stringify(ejemplos) : "[]",
        audio_url || null, categoria || "palabra",
        slug, id,
      ],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Palabra no encontrada" });
    }
    res.json(rows[0]);
  } catch (err) {
    logger.error("Error updating palabra:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.delete("/palabras/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      "DELETE FROM palabras_chaco WHERE id = $1",
      [id],
    );
    if (rowCount === 0) {
      return res.status(404).json({ error: "Palabra no encontrada" });
    }
    res.json({ message: "Palabra eliminada" });
  } catch (err) {
    logger.error("Error deleting palabra:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
