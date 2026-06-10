import { Router } from "express";
import pool from "../config/db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/palabras", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, palabra, significado, created_at FROM palabras_chaco ORDER BY created_at DESC",
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching palabras:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.get("/palabras/random", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, palabra, significado FROM palabras_chaco ORDER BY RANDOM() LIMIT 1",
    );
    if (rows.length === 0) {
      return res.json({ palabra: null });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching random palabra:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.get("/palabras/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "SELECT id, palabra, significado, created_at FROM palabras_chaco WHERE id = $1",
      [id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Palabra no encontrada" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching palabra:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.post("/palabras", authMiddleware, async (req, res) => {
  try {
    const { palabra, significado } = req.body;
    if (!palabra || !palabra.trim()) {
      return res.status(400).json({ error: "La palabra es requerida" });
    }
    const { rows } = await pool.query(
      "INSERT INTO palabras_chaco (palabra, significado) VALUES ($1, $2) RETURNING id, palabra, significado, created_at",
      [palabra.trim(), significado?.trim() || null],
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating palabra:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

router.put("/palabras/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { palabra, significado } = req.body;
    if (!palabra || !palabra.trim()) {
      return res.status(400).json({ error: "La palabra es requerida" });
    }
    const { rows } = await pool.query(
      "UPDATE palabras_chaco SET palabra = $1, significado = $2 WHERE id = $3 RETURNING id, palabra, significado, created_at",
      [palabra.trim(), significado?.trim() || null, id],
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Palabra no encontrada" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error("Error updating palabra:", err);
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
    console.error("Error deleting palabra:", err);
    res.status(500).json({ error: "Error del servidor" });
  }
});

export default router;
