import { Router } from "express";
import nodemailer from "nodemailer";
import pool from "../config/db.js";

const router = Router();

const mailReady =
  process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS;

let transporter = null;
if (mailReady) {
  transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: process.env.MAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });
}

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

    if (transporter) {
      transporter
        .sendMail({
          from: `"${nombre}" <${process.env.MAIL_USER}>`,
          replyTo: email.trim(),
          to: process.env.MAIL_USER,
          subject: `[Contacto Web] ${asunto.trim()}`,
          html: `
            <p><strong>Nombre:</strong> ${nombre.trim()}</p>
            <p><strong>Email:</strong> ${email.trim()}</p>
            <p><strong>Asunto:</strong> ${asunto.trim()}</p>
            <hr>
            <p>${mensaje.trim().replace(/\n/g, "<br>")}</p>
          `,
        })
        .catch((e) => console.warn("Mail no enviado:", e.message));
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error al enviar mensaje de contacto:", err);
    res.status(500).json({ error: "Error al enviar el mensaje" });
  }
});

export default router;
