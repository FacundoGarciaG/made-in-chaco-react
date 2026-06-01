import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

router.post("/contacto", async (req, res) => {
  try {
    const { nombre, email, asunto, mensaje } = req.body;

    if (!nombre?.trim() || !email?.trim() || !asunto?.trim() || !mensaje?.trim()) {
      return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: "Email inválido" });
    }

    await pool.query(
      `INSERT INTO contacto_mensajes (nombre, email, asunto, mensaje) VALUES ($1, $2, $3, $4)`,
      [nombre.trim(), email.trim(), asunto.trim(), mensaje.trim()],
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error al guardar mensaje de contacto:", err);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
});

export default router;
